import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reservation Must Be Related To A Specific User'],
    },

    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: [true, 'Reservation Must Be Related To A Specific Property']
    },

    startDate: {
        type: Date,
        required: [true, 'You Should Specify The Start Date'],
        validate: {
            validator: function (value) {
                return value >= new Date(); // Ensure start date is today or in the future
            },
            message: 'Start date must be today or in the future',
        },
    },

    endDate: {
        type: Date,
        required: [true, 'You Should Specify The End Date'],
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date',
        },
    },

    totalFee: {
        type: mongoose.Schema.Types.Decimal128,
        required: [true, 'You Should Specify The Total Price'],
        validate: {
            validator: function (value) {
                return value > 0; // Ensure total price is positive
            },
            message: 'Total price must be a positive number',
        },
        get: (v) => parseFloat(v.toString()),
    },

    status: {
        type: String,
        /**
         * pending: when the reservation is created and waiting for confirmation or payment
         * confirmed: when the reservation is confirmed by the host or property owner
         * finished: when the reservation is completed and the user has checked out
         * cancelled: when the reservation is cancelled by either the user or the host
         */
        enum: {values:['pending', 'confirmed', 'finished', 'canceled'], message: '{VALUE} is not a valid status'},
        default: 'pending',
    },

    paymentToken: {
        type: String,
        // required: true
    },

    userPoints:{
        type: Number,
        default: 0,
    },

    hostPoints:{
        type: Number,
        default: 0,
    }
}, { timestamps: true, toJSON: { getters: true } });

export default mongoose.model('Reservation', ReservationSchema);