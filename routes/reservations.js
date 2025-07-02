import express from 'express';
import { createError, errorHandler, verifyAdmin, verifyHost, verifyUser } from '../utils/utils.js';
import Reservation from '../models/Reservation.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import { getPaginatedReservations } from '../piplelines/reservations.js';
import mongoose from 'mongoose';

const router = express.Router();


/**
 * * @description: create a new reservation is done in the payments route 
 * * when creating a payment intent the reservation is created auatomatically with default status of pending
 * * @route POST /api/reservations/create-reservation
 * * @access Public
 * * @body {propertyId, startDate, endDate}
 * * @returns {paymentIntent} The reservation object
*/


/**
 * * @description: get a reservation by id
 * * @route GET /api/reservations/:id
 * * @access Public
 * * @params {id} - Reservation ID
 * * @returns {reservations} The reservations array
*/
router.get("/:id", verifyUser, async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const reservation = await Reservation.findById(id)
            .populate("userId", "username fullName email mobile profilePictureURL")
            .populate({
                path: "propertyId",
                populate: [
                    {
                        path: "owner",
                        select: "username fullName email mobile profilePictureURL"
                    }, {
                        path: "address.city",
                        select: "name",
                    }, {
                        path: "address.region",
                        select: "name",
                    }
                ],
                select: "-__v -createdAt -updatedAt -numberOfRatings -numberOfReservations -images"
            })

        if (!reservation) {
            throw createError(404, "Reservation not found")
        }

        if (reservation.userId._id.toString() == userId || req.user.role == 1 || reservation.propertyId.owner._id.toString() == userId) {
            return res.status(200).json(reservation);
        }
        throw createError(403, "You are not authorized to access this reservation")
    } catch (error) {
        errorHandler(error, next);
    }
})


/**
 * * @description: get all reservations for a Host On Specific Property
 * * @route GET /api/reservations/:propertyId/reservations
 * * @access Private
 * * @params {propertyId} - Property ID
 * * @returns {reservations} The reservations array
 */

router.get("/:propertyId/all", verifyHost, async (req, res, next) => {

    const { propertyId } = req.params;
    const userId = req.user.id;

    try {

        const property = await Property.findById(propertyId);

        if (!property) {
            throw createError(404, "Property not found")
        }
        if (property.owner.toString() !== userId) {
            throw createError(403, "You are not authorized to access this property reservations details")
        }

        const reservations = await Reservation.find({ propertyId, status: { $in: ['confirmed', 'finished'] } })
            .populate("userId", "username fullName email mobile profilePictureURL")
            .populate("propertyId", "title thumbnailURL owner").sort({ createdAt: -1 });
        return res.status(200).json(reservations);
    } catch (error) {
        errorHandler(error, next);
    }

})


/**
 * @description: get all reservations for a Host that are incoming in the future
 * * @route GET /api/reservations/host/incoming
 * * @access Private
 * * @returns {reservations} The reservations array 
 */

router.get("/host/incoming", verifyHost, async (req, res, next) => {
    const userId = req.user.id;

    try {
        const properties = await Property.find({ owner: userId });

        const reservations = await Reservation.find({
            propertyId: { $in: properties.map(property => property._id) },
            status: { $in: ['finished', 'confirmed'] },
            startDate: { $gte: new Date() }
        }).populate("userId", "username fullName email mobile profilePictureURL")
            .populate("propertyId", "title thumbnailURL owner").sort({ startDate: 1 });


        return res.status(200).json(reservations);
    } catch (error) {
        errorHandler(error, next);
    }


})

/**
 * * @description: get all reservations for a user
 * * @route GET /api/reservations
 * * @access Private
 */
router.get('/', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    try {
        const reservations = await Reservation.find({ userId, status: { $in: ['confirmed', 'finished'] } }).populate("propertyId", "title thumbnailURL").sort({ createdAt: -1 });

        res.status(200).json(reservations);

    } catch (err) {
        errorHandler(err, next)
    }

})


/**
 * * @description: set reservation status to finished
 * * @route PATCH /api/reservations/:id/finished
 * * @access Public
 * * @params {id} - Reservation ID
 * * @returns {reservation} The reservation object
 */
router.post("/:id/finished", verifyUser, async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const reservation = await Reservation.findById(id);

        if (!reservation) {
            throw createError(404, "Reservation not found")
        }

        if (reservation.userId.toString() !== userId && req.user.role !== 1) {
            throw createError(403, "You are not authorized to access this reservation")
        }

        if (reservation.status !== "confirmed") {
            throw createError(400, "You can only finish a confirmed reservation")
        }

        if (reservation.endDate > new Date()) {
            throw createError(400, "You can only finish a reservation after the end date")
        }

        await Reservation.findByIdAndUpdate(id, { status: "finished" }, { new: true });
        await User.findByIdAndUpdate(userId, { $inc: { totalRewardPoints: reservation.userPoints } });

        return res.status(200).json({ message: "Reservation status updated to finished Successfully, We Wish You Enjoyed Your Booking And Your Staying with Us, Thank You." });
    } catch (error) {
        errorHandler(error, next);
    }
})


/**
 * * * @description: get all reservations for all users
 * * * @route GET /api/reservations/all/admin
 * * * @access Admin
 * * * @returns {reservations} The reservations array
 * * * @throws {error} If the user is not authorized or if there is an error fetching the reservations
 */

router.get('/all/admin', verifyHost, async (req, res, next) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { owner, username, status, _id } = req.query;

    const filters = {};
    if (owner) {
        filters['propertyId.owner.username'] = { $regex: owner, $options: 'i' }; // Case-insensitive search
    }
    if (username) {
        filters['userId.username'] = { $regex: username, $options: 'i' }; // Case-insensitive search
    }
    if (status) {
        filters.status = { $regex: status, $options: 'i' }; // Case-insensitive search
    }
    if (_id && mongoose.Types.ObjectId.isValid(_id)) {
        filters._id = new mongoose.Types.ObjectId(_id)
    }

    try {
        const reservations = await Reservation.aggregate(getPaginatedReservations(filters, skip, limit))
        return res.status(200).json({ reservations: reservations[0].reservations, totalDocs: reservations[0].totalDocs[0].count });
    } catch (error) {
        errorHandler(error, next);
    }
})


/**
 * * * @description: update reservation status by id
 * * * @route PATCH /api/reservations/:id
 * * * @access Admin
 * * * @params {id} - Reservation ID
 * * * @body {status} - New status of the reservation (confirmed or cancelled)
 * * * @returns {reservation} The updated reservation object
 */

router.patch('/:id', verifyAdmin, async (req, res, next) => {
    const { id } = req.params;
    const { userPoints, hostPoints, status } = req.body;

    try {
        const reservation = await Reservation.findById(id);
        if (!reservation) {
            throw createError(404, "Reservation not found");
        }

        const updatedReservation = await Reservation.findByIdAndUpdate(id, { $set: { status, hostPoints, userPoints } }, { new: true });

        return res.status(200).json(updatedReservation);
    } catch (error) {
        errorHandler(error, next);
    }
})

export default router;