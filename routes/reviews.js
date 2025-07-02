import express from 'express';
import { createError, errorHandler, verifyUser } from '../utils/utils.js';
import Reservation from '../models/Reservation.js';
import Review from '../models/Review.js';
import Property from '../models/Property.js';
import mongoose from 'mongoose';

const router = express.Router();

const ALLOW_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * * @description Create a new review for a finished reservation only, only user who created the reservation can create a review during 7 days after the reservation is finished | adin can't create a review
 * * @route POST /api/reviews
 * * @access Public
 * * @returns {Object} review - The created review object
 * * @body {reservationId, comment, rating}
 * * @note ready to use
 */
router.post('/', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    let { reservationId, comment, rating } = req.body;

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        if (!reservationId) {
            throw new Error('Reservation ID is required');
        }
        if (!comment) {
            comment = ''
        }
        if (rating > 5 || !rating) {
            rating = 5
        }
        if (rating < 1) {
            rating = 1
        }

        const reservation = await Reservation.findById(reservationId).session(session);

        if (!reservation) {
            throw createError(400, 'Reservation not found');
        }
        if (reservation.userId.toString() !== userId) {
            throw createError(400, 'You are not authorized to review this reservation');
        }
        if (reservation.status !== 'finished') {
            throw createError(400, 'You can only review finished reservations');
        }
        if (reservation.updatedAt < Date.now() - ALLOW_TIME) {
            throw createError(400, 'You can only review reservations that are less than 7 days old');
        }

        const reviewExists = await Review.findOne({ reservationId }).session(session);

        if (reviewExists) {
            throw createError(400, 'You have already reviewed this reservation');
        }

        const review = new Review({
            reservationId,
            userId: reservation.userId,
            propertyId: reservation.propertyId,
            comment, rating
        });

        await review.save({ session });


        const property = await Property.findByIdAndUpdate(reservation.propertyId, { $inc: { numberOfRatings: 1 } }, { new: true })
            .session(session);

        let avgRating = null;

        if (property.numberOfRatings === 1) {
            avgRating = rating;
        } else {
            avgRating = (property.avgRating * (property.numberOfRatings - 1) + rating) / property.numberOfRatings;
        }

        await Property.findByIdAndUpdate(reservation.propertyId, { $set: { avgRating } }).session(session);

        const populatedReview = await Review.findById(review._id).populate('userId', 'username fullName profilePictureURL').session(session);

        await session.commitTransaction();
                
        res.status(201).json({ message: 'Review submitted successfully', review: populatedReview });
    } catch (err) {
        await session.abortTransaction();
        errorHandler(err, next)
    } finally {
        await session.endSession();
    }
})


/**
 * * @description update a review by ID | only user who created the review can update it or admin
 * * @route PUT /api/reviews/:id
 * * @access Public
 * * @params {id} - Review ID
 * * @body {comment, rating}
 * * @note it has to be modified, modify the avg rating and number of ratings for the property , and use transactions to make sure that the data is consistent, use findByIdAndUpdate instead of find then update then save (for performance reasons)
 * * @note not used right now, need to updated and tested
 */
router.put('/:id', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    const { comment, rating } = req.body;
    const reviewId = req.params.id;

    try {
        if (!comment) {
            comment = ''
        }
        if (rating > 5 || !rating) {
            rating = 5
        }
        if (rating < 1) {
            rating = 1
        }

        const review = await Review.findById(reviewId).populate('reservationId');

        if (!review) {
            throw createError(400, 'Review not found');
        }

        if (review.userId.toString() !== userId && req.user.role !== 1) {
            throw createError(400, 'You are not authorized to edit this review');
        }

        if (review.createdAt < Date.now() - ALLOW_TIME && req.user.role !== 1) {
            throw createError(400, 'You can only edit reviews that are less than 7 days old');
        }

        if (comment) review.comment = comment;
        if (rating) review.rating = rating;
        await review.save();

        res.status(200).json({ message: 'Review updated successfully', review });
    } catch (err) {
        errorHandler(err, next)
    }
})


/**
 * * @description Delete a review by ID | only user who created the review can delete it or admin, the user can delete his review only if the review is less than 7 days old
 * * @route DELETE /api/reviews/:id
 * * @access Public
 * * @params {id} - Review ID
 * * @note ready to use
 */
router.delete('/:id', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    const reviewId = req.params.id;

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const review = await Review.findById(reviewId).populate('reservationId').session(session);
        if (!review) {
            throw createError(400, 'Review not found');
        }
        if (review.reservationId.userId.toString() !== userId && req.user.role !== 1) {
            throw createError(400, 'You are not authorized to delete this review');
        }
        if (review.createdAt < Date.now() - ALLOW_TIME && req.user.role !== 1) {
            throw createError(400, 'You can only delete reviews that are less than 7 days old');
        }

        
        const property = await Property.findById(review.reservationId.propertyId).session(session);
        
        if (property.numberOfRatings === 1) {
            await Property.findByIdAndUpdate(review.reservationId.propertyId, { avgRating: 5 }).session(session);
        } else {
            await Property.findByIdAndUpdate(review.reservationId.propertyId, { $set: { avgRating: (property.avgRating * property.numberOfRatings - review.rating) / (property.numberOfRatings - 1) } }).session(session);
        }
        
        await Property.findByIdAndUpdate(review.reservationId.propertyId, { $inc: { numberOfRatings: -1 } }).session(session);
        await Review.findByIdAndDelete(reviewId).session(session);

        await session.commitTransaction();
        res.status(200).json({ message: 'Review deleted successfully' });
    } catch (err) {
        await session.abortTransaction();
        errorHandler(err, next)
    } finally {
        await session.endSession();
    }
})


/**
 * * @description Get all reviews for a specific reservation
 * * @route GET /api/reviews/:reservationId
 * * @access Public
 * * @params {reservationId} - Reservation ID
 * * @note ready to use
 */
router.get('/propertyReviews/:propertyId', async (req, res, next) => {
    const propertyId = req.params.propertyId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const reviews = await Review.find({ propertyId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'username fullName profilePictureURL');

        if (!reviews) {
            throw createError(400, 'No reviews found for this reservation');
        }
        res.status(200).json(reviews);
    } catch (err) {
        errorHandler(err, next)
    }
})


/**
 * * @description Get the review of a specific reservation for a specific user
 * * @route GET /api/reviews/:reservationId
 * * @access Public
 * * @params {reservationId} - Reservation ID
 * * @note ready to use
 */
router.get('/:reservationId', verifyUser, async (req, res, next) => {
    const reservationId = req.params.reservationId;
    const userId = req.user.id;
    try {
        const reviews = await Review.findOne({ reservationId }).populate('userId', 'username fullName profilePictureURL');
        if (!reviews) {
            throw createError(400, 'No reviews found for this reservation');
        }
        if (reviews.userId.toString() !== userId && req.user.role !== 1) {
            throw createError(400, 'You are not authorized to view this review');
        }
        res.status(200).json(reviews);
    } catch (err) {
        errorHandler(err, next)
    }
})


export default router;