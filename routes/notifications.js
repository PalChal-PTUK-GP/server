import express from "express";
import Notification from "../models/Notification.js";
import { createError, errorHandler, verifyAdmin, verifyUser } from "../utils/index.js";


const router = express.Router();

/**
 * * @description get all notifications for a user
 * * @returns {Array} - all notifications for the user
 * * @throws {Error} - if the user is not found or if the notifications are not found
 * * @route GET /api/notifications/all
 * * @access public
 */
router.get('/all', verifyUser, async (req, res) => {
    const page = parseInt(req.query.page) || 1; // default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // default to 10 notifications per page if not provided
    const skip = (page - 1) * limit; // calculate the number of notifications to skip
   
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalNotifications = await Notification.countDocuments({ userId });
        const totalPages = Math.ceil(totalNotifications / limit); // calculate the total number of pages
        res.status(200).json({notifications, totalPages, currentPage: page });
    } catch (err) {
        res.status(500).json(err);
    }
})


/**
 * * @description mark a notification as read
 * * @param {string} notificationId - the id of the notification to be marked as read
 * * @returns {object} - the notification object that was marked as read
 * * @throws {Error} - if the notification is not found or if the user is not allowed to access the notification
 * * @route PATCH /api/notifications/read/:notificatioId
 * * @access public
 */
router.patch('/markAsRead/:notificationId', verifyUser, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.notificationId;
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw createError(400, "Notification not found")
        }
        if (notification.userId.toString() !== userId) {
            throw createError(403, "You are not allowed to access this notification")
        }
        notification.isRead = true;
        await notification.save();
        res.status(200).json({ message: "Notification marked as read successfully" });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * @description Get unread notifications count
 * @route GET /api/notifications/unreadCount
 * @access Private
 */
router.get('/unreadCount', verifyUser, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });
        res.status(200).json({ unreadCount });
    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * * @description delete a notification
 * * @param {string} notificationId - the id of the notification to be deleted
 * * @returns {object} - the notification object that was deleted
 * * @throws {Error} - if the notification is not found or if the user is not allowed to access the notification
 * * @route DELETE /api/notifications/:notificationId
 * * @access public
 */
router.delete('/:notificationId', verifyAdmin, async (req, res, next) => {
    try {
        const notificationId = req.params.notificationId;
        const notification = await Notification.findByIdAndDelete(notificationId);
        if (!notification) throw createError(400, "Notification not found");
        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (err) {
        errorHandler(err);
    }
})

export default router;