import mongoose from "mongoose";

const amenitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'You Should Specify The Amenity Name'],
    },
    icon:{
        type: String,
        required: [true, 'You Should Specify The Amenity Icon, SVG Image Is Preferred'],
        lowercase: true,
    }
},{timestamps: true});


export default mongoose.model('Amenity', amenitySchema);