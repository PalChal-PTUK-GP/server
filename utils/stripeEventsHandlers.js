import mongoose from "mongoose";
import Property from "../models/Property.js";
import Reservation from "../models/Reservation.js";
import { cancelPaymentIntent, processPaymentRefund } from "../routes/payments.js";
import { isAvailableDates } from "./date.js";
import { sendEmail } from "./emailService.js";
import { createError, createOneUserNotification } from "./index.js";
import { newReservationPlacedHTML, successPaymentHTML } from "./mailsContent.js";
import { hostNewReservationNotification, successPaymentNotification } from "./notificationsContent.js";
import Stripe from "stripe";

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


export const handlePaymentIntentCreated = async (paymentIntent) => {
    console.log("Payment Intent Created:");
    // Handle the payment intent created event
    // For example, you might want to save the payment intent ID in your database or notify the user
};

/**
 * 
 * @description this function is used to handle the payment intent succeeded event, it will check again if property is still available
 *  and update the reservation status to confirmed and send emails to the user and the property owner
 * @param {object} paymentIntent - the payment intent object that was created by stripe
 * @throws {Error} - if the reservation is not found or if there is an error while processing the payment intent
 * @param {*} paymentIntent 
 */

export const handlePaymentIntentSucceeded = async (paymentIntent) => {
    const reservationId = paymentIntent.metadata.reservationId; // Extract the reservation ID from the metadata

    try {
        // now before updating the reservation, we need to check if the property is still available by using isAvailableDates function
        const reservation = await Reservation.findById(reservationId)
            .populate("userId", "fullName email")
            .populate({
                path: "propertyId",
                select: "title owner numberOfReservations",
                populate: {
                    path: "owner",
                    model: "User",
                    select: "fullName email"
                }
            });

        // Check if the reservation dates are still available to solve synch issue 
        // (when two users try to book the same property at the same time by entering the payment page at the same time)
        const stillAvailable = await isAvailableDates(
            reservation.startDate,
            reservation.endDate,
            reservation.propertyId._id,
            reservation._id
        );

        if (stillAvailable) {
            await Reservation.findByIdAndUpdate(reservationId, { status: "confirmed" });
            await Property.findByIdAndUpdate(reservation.propertyId._id, { $inc: { numberOfReservations: 1 } });

            sendEmail(reservation.userId.email, "Payment Successful", '', successPaymentHTML(reservation));
            sendEmail(reservation.propertyId.owner.email, "New Reservation", '', newReservationPlacedHTML(reservation));
            createOneUserNotification(reservation.userId._id, "Payment Successful", successPaymentNotification(reservation));
            createOneUserNotification(reservation.propertyId.owner._id, "New Reservation", hostNewReservationNotification(reservation));

        } else {
            await Reservation.findByIdAndUpdate(reservation._id, { status: "canceled" });
            processPaymentRefund(paymentIntent.id)

            sendEmail(reservation.userId.email, "Payment Failed", '', `<p>Property is not available anymore, your payment will be refunded soon.</p>`);
            createOneUserNotification(reservation.userId._id, "Payment Failed", `<p>Property is not available anymore, your payment will be refunded soon.</p>`);
        }

    } catch (err) {
        const reservation = await Reservation.findById(reservationId);

        if(reservation.status != "confirmed"){
            processPaymentRefund(paymentIntent.id)
            createOneUserNotification(reservation.userId._id, "Payment Failed", `<p>Something Went Wrong While Processing Your Payment, Please Try again Later.</p>`);
        }
    }
};

export const handlePaymentIntentFailed = async (paymentIntent) => {
    console.log("Payment Intent Failed:");
    // Handle the payment intent failed event
    // For example, you might want to notify the user about the failure
};

export const handlePaymentIntentCanceled = async (paymentIntent) => {
    console.log("Payment Intent Canceled:");
    // Handle the payment intent canceled event
    // For example, you might want to update the order status in your database
};

export const handlePaymentMethodAttached = async (paymentIntent) => {
    console.log("Payment Method Attached:");
    // Handle the payment method attached event
    // For example, you might want to update the user's payment methods in your database
};

export const handleRefundCreated = async (paymentIntent) => {
    console.log("Refund Created:");
    // Handle the refund created event
    // For example, you might want to update the order status in your database
};

export const handleChargeRefunded = async (paymentIntent) => {
    console.log("Charge Refunded:");
    // Handle the charge refunded event
    // For example, you might want to update the order status in your database
};