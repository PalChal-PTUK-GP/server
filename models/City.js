import mongoose from 'mongoose';

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'City name is required'],
        unique: true,
    },
    coverPictureURL:{
        type: String,
        required: [true, 'Cover picture URL is required'],
        trim: true,
    }
},{timestamps: true});

const City = mongoose.model('City', citySchema);
export default City;