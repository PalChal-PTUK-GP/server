import dotenv from 'dotenv';
import express from 'express';
import { Stripe } from 'stripe';
import { createError, errorHandler, verifyAdmin, verifyUser } from '../utils/utils.js';
import Property from '../models/Property.js';
import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import bodyParser from 'body-parser';
// import { sendEmail } from '../utils/emailService.js';
import {
    handlePaymentIntentCreated,
    handlePaymentIntentSucceeded,
    handlePaymentIntentFailed,
    handlePaymentIntentCanceled,
    handlePaymentMethodAttached,
    handleRefundCreated,
    handleChargeRefunded
} from '../utils/stripeEventsHandlers.js';
import User from '../models/User.js';
import { isAvailableDates } from '../utils/date.js';

dotenv.config();

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


/**
 * * @description: Create a reservation and a payment intent for that reservation
 * * @route POST /api/payments/create-payment-intent
 * * @access Private
 * * @body {propertyId, startDate, endDate}
 * * @returns {paymentIntent} The payment intent object from Stripe
 * * @throws {error} If the property is not found or if the property is already booked for the selected dates
 * * @throws {error} If the reservation cannot be created or if the payment intent cannot be created
 */
router.post('/create-payment-intent', verifyUser, async (req, res, next) => {
    const { propertyId, startDate, endDate } = req.body;
    const userId = req.user.id;
    const session = await mongoose.startSession();

    const sdate = (new Date(startDate))
    const edate = (new Date(endDate))

    const utcSdate = new Date(sdate.getTime() - sdate.getTimezoneOffset() * 60000); // Convert to UTC
    const utcEdate = new Date(edate.getTime() - edate.getTimezoneOffset() * 60000); // Convert to UTC

    try {
        session.startTransaction();

        const property = await Property.findById(propertyId).session(session);

        if (!property) {
            throw createError(404, "Property not found")
        }

        if (property.owner == userId) {
            throw createError(400, "You cannot book your own property")
        }

        if (sdate < Date.now() || edate < Date.now()) {
            throw createError(400, "You cannot book a property in the past")
        }
        if (sdate >= edate) {
            throw createError(400, "End date must be after start date")
        }

        if (property.status !== "Available") {
            throw createError(400, "Property is not available for booking")
        }

        const isAvailable = await isAvailableDates(utcSdate, utcEdate, propertyId, null);

        const user = await User.findById(userId).session(session);

        if(user.status == 'suspended'){
            throw createError(401, "Your account is suspended, you cannot book a property");
        }

        if (!isAvailable) {
            throw createError(400, "Property is already booked for the selected dates");
        }

        const totalFee = property.rentFee * ((edate - sdate) / (1000 * 60 * 60 * 24));

        const reservation = new Reservation({
            userId,
            propertyId,
            startDate: utcSdate,
            endDate: utcEdate,
            totalFee,
        });

        // Create a PaymentIntent with the specified amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalFee * 100, // amount in cents (or the smallest currency unit)
            currency: 'ils',
            customer: user.stripeCustomerId, // Use the Stripe customer ID from the user
            // Optionally, add metadata to link with booking ID
            metadata: { reservationId: reservation._id.toString(), propertyId: property._id.toString() },
        });

        reservation.paymentToken = paymentIntent.id;

        await reservation.save({ session });
        // Save the PaymentIntent data to your database if needed

        await session.commitTransaction();

        res.status(201).json({
            reservationId: reservation._id,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        await session.abortTransaction();
        errorHandler(error, next);
    } finally {
        await session.endSession();
    }

});

/**
 * * @description: Retrieve a payment intent details by its ID , this uses an api provided by stripe
 * * @route GET /api/payments/:paymentIntentId
 * * @access Public
 * * @params {paymentIntentId} The ID of the payment intent to retrieve
 * * @returns {paymentIntent} The payment intent object from Stripe
 * * @throws {error} If the payment intent is not found or if there is an error retrieving it
 */
router.get("/:paymentIntentId", verifyAdmin, async (req, res, next) => {
    const { paymentIntentId } = req.params;
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!paymentIntent) {
            return res.status(404).json({ error: "Payment Intent not found" });
        }
        res.status(200).json(paymentIntent);
    } catch (error) {
        errorHandler(error, next);
    }
});



/**
 * * @description: Refund a payment intent, we can allow the user to ask for a refund in reservation route, and then we can add route accessed by admin to approve the refund here
 * * @route POST /api/payments/refund
 * * @access Private
 * * @body {paymentIntentId, amount} The ID of the payment intent to refund and the amount to refund
 * * @returns {refund} The refund object from Stripe
 */
// router.post('/refund', verifyAdmin, async (req, res, next) => {
//     const { paymentIntentId, amount } = req.body;
//     try {
//         const refund = await stripe.refunds.create({
//             payment_intent: paymentIntentId,
//             amount: amount * 100, // amount in cents (or the smallest currency unit)
//         });
//         res.status(201).json(refund);
//     } catch (error) {
//         errorHandler(error, next);
//     }
// });


router.get('/info/:paymentIntentId', verifyAdmin, async (req, res, next) => {
    const { paymentIntentId } = req.params;
    const userId = req.user.id;
    try {
        
        const info = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge']
        });

        res.status(200).json(info);
    } catch (error) { 
        errorHandler(error, next);
    }
});

/**
 * * @description: Cancel a payment intent and update the reservation status to canceled
 * * @route POST /api/payments/cancel
 * * @access Private
 * * @body {reservationId} The ID of the reservation to cancel
 * * @returns {json} A JSON response indicating the cancellation status
 * * @throws {error} If the reservation is not found or if the user is not authorized to cancel it
 * * @note ready to use
 * * @note this route should be used by the user who created the reservation or by the admin
 */
router.post('/cancel', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    const { reservationId } = req.body;

    try {
        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            throw createError(404, "Reservation not found")
        }
        if (reservation.userId.toString() !== userId && req.user.role !== 1) {
            throw createError(403, "You are not authorized to cancel this reservation")
        }
        if (reservation.status !== "pending") {
            throw createError(400, "You can only cancel a pending reservation")
        }

        const canceledPaymentIntent = await stripe.paymentIntents.cancel(reservation.paymentToken);

        if (!canceledPaymentIntent) { throw createError(404, "Payment Intent not found") }

        reservation.status = "canceled";
        await reservation.save();

        res.status(200).json("You have canceled your payment intent successfully");
    } catch (error) {
        errorHandler(error, next);
    }
});


/**
 * * @description delete a reservation with the payment intent from stripe, when the user doesn't complete the payment and the reservation is not confirmed
 * * @route DELETE /api/payments/:reservationId
 * * @access Private
 * * @params {reservationId} The ID of the reservation to delete
 * * @returns {json} A JSON response indicating the deletion status
 */
router.delete('/:reservationId', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    const { reservationId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const reservation = await Reservation.findById(reservationId).session(session);

        if (!reservation) {
            throw createError(404, "Reservation not found")
        }
        if (reservation.userId.toString() !== userId && req.user.role !== 1) {
            throw createError(403, "You are not authorized to delete this reservation")
        }
        if (reservation.status !== "pending" && reservation.status !== "canceled") {
            throw createError(400, "You can only delete a pending reservation")
        }

        await stripe.paymentIntents.cancel(reservation.paymentToken);
        await reservation.deleteOne().session(session);
        await session.commitTransaction();

        res.status(200).json("You have deleted your payment intent successfully");
    } catch (error) {
        await session.abortTransaction();
        errorHandler(error, next);
    } finally {
        await session.endSession();
    }
})

export const processPaymentRefund = async (paymentIntentId) => {
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
        });
        return refund;
    } catch (error) {
        throw error;
    }
}

export const cancelPaymentIntent = async (paymentIntentId) => {
    try {
        const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        return canceledPaymentIntent;
    } catch (error) {
        throw error;
    }
}

/**
 * * @description: Handle Stripe webhook events
 * * @route POST /api/payments/webhook
 * * @access Private
 * * @body {event} The event object from Stripe
 * * @returns {json} A JSON response indicating receipt of the event
 * * @Comments_From_Stripe_Documentation
 * * Match the raw body to content type application/json
 * * If you are using Express v4 - v4.16 you need to use body-parser, not express, to retrieve the request body
 * * very important note, /webhook to to authorize the request with the stripe secret key, you need the body to be raw and not parsed by express.json()
 * * so we handled this in the index.js file middlewares
 */
router.post('/webhook', bodyParser.raw({ type: 'application/json  ' }), async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret); // Verify the webhook signature this will throw an error if the signature is invalid
        const paymentIntent = event.data.object; // Contains information about the payment intent

        switch (event.type) {
            case 'payment_intent.created':
                handlePaymentIntentCreated(paymentIntent);
                break;
            case 'payment_intent.succeeded':
                handlePaymentIntentSucceeded(paymentIntent);
                break;
            case 'payment_intent.payment_failed':
                handlePaymentIntentFailed(paymentIntent);
                break;
            case 'payment_intent.canceled':
                handlePaymentIntentCanceled(paymentIntent);
                break;
            case 'payment_method.attached':
                handlePaymentMethodAttached(paymentIntent);
                break;
            case 'refund.created':
                handleRefundCreated(paymentIntent);
                break;
            case 'charge.refunded':
                handleChargeRefunded(paymentIntent);
                break;
            default:
                console.log("unhandled event type from webhook", event.type);
        }

        // Return a response to acknowledge receipt of the event
        res.status(200).json({ received: true });

    } catch (error) {
        errorHandler(error, next);
    }


});

export default router;