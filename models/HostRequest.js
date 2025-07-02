import mongoose from "mongoose";


const hostRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled"],
        default: "pending",
    },
    message: {
        type: String,
        default: "Your request is under review.",
    },
}, { timestamps: true });


export default mongoose.model("HostRequest", hostRequestSchema);