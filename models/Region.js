import mongoose from 'mongoose';

const regionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'You Should Specify The Region Name'],
        lowercase: true,
    },
    cityId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: [true, 'You Should Specify The City That This Region Belongs To'],
    },
    coverPictureURL:{
        type: String,
        trim: true,
        lowercase: true,
    }
},{timestamps: true});


export default mongoose.model('Region', regionSchema);