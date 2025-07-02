import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
   // define the schema for notifications
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },
   title: {
      type: String,
      required: true
   },
   message: {
      type: String,
      required: true
   },
   isRead: {
      type: Boolean,
      default: false
   },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);