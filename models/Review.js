import mongoose from 'mongoose';


const reviewSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    propertyId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: [true, 'Property ID is required'],
    },
    reservationId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation',
        required: [true, 'Reservation ID is required'],
    },
    comment: {
        type: String,
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [0, 'Rating must be at least 0'],
        max: [5, 'Rating must be at most 5'],
    }
}, { timestamps: true , toJSON: { getters: true}});

export default mongoose.model('Review', reviewSchema);