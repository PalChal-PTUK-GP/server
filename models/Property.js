import mongoose, { mongo } from "mongoose";
import { Schema } from "mongoose";


const MAX_IMAGES = 10;
const MIN_IMAGES = 5;

const PropertySchema = new Schema({

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: { type: String, required: [true, 'Title is required'], minlength: [10, 'Title must be at least 10 characters long'], maxlength: [100, 'Title must be at most 100 characters long'] },

    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [100, 'Description must be at least 100 characters long'],
        maxlength: [1000, 'Description must be at most 1000 characters long'],
    },

    address: {
        city: {
            type: mongoose.Schema.Types.ObjectId, ref: 'City',
            required: [true, 'City is required'] 
        },
        region: {
            type: mongoose.Schema.Types.ObjectId, ref: 'Region',
            required: [true, 'Region is required']
        },
        street: { type: String, required: [true, 'Street is required'], maxlength: [30, 'Street must be at most 30 characters long'] },
    },

    location: {
        lng: { type: Number, required: [true, 'Longitude is required'], min: -180, max: 180 },
        lat: { type: Number, required: [true, 'Latitude is required'], min: -90, max: 90 },
    },

    type: {
        type: String,
        enum: { values: ['Apartment', 'House', 'Commercial', 'Chalet'], message: '{VALUE} is not supported' },
        default: 'Chalet',
        required: [true, 'Property type is required'],
    },

    rentFee: {
        type: mongoose.Schema.Types.Decimal128,
        get: value => parseFloat(value.toString()), // Convert to number on retrieval
        required: [true, 'Rent Fee is required'],
        min: [0, 'Price must be a positive number'],
    },

    thumbnailURL: String,

    images: {
        type: [String],
        validate: {
            validator: function (arr) {
                return arr.length >= MIN_IMAGES && arr.length <= MAX_IMAGES;
            },
            message: `Property must have between ${MIN_IMAGES} and ${MAX_IMAGES} images`
        }
    },

    numberOfRatings: { type: Number, default: 0, min: [0, 'Number of ratings must be a positive number'] },
    numberOfReservations: { type: Number, default: 0, min: [0, 'Number of reservations must be a positive number'] },
    avgRating: { type: Number, default: 5 },
 
    status: {
        type: String,
        enum: { values: ['Available', 'Reserved', 'Inactive', 'Suspended'], message: '{VALUE} is not supported' },
        default: 'Available',
        required: [true, 'Property status is required'],
    },

    amenities:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Amenity',
        default: [],
    }

}, { timestamps: true, toJSON: { getters: true } });

export default mongoose.model("Property", PropertySchema);