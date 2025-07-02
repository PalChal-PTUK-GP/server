import mongoose from "mongoose";


const conversationSchema = new mongoose.Schema({
    members: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        required: true
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: false
    },
    lastMessage:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: false
    }
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);