import Notification from "../models/Notification.js";
import { sendNotificationToUser } from "./socketIO.js";
import { createError } from "./index.js";

/**
 * @description this function is used to create a single notification for a user, the function can be used in other routes for creating notifications
 * @param {string} userId - the id of the user to whom the notification will be sent
 * @param {string} title - the title of the notification
 * @param {string} message - the message of the notification
 * @returns {object} - the notification object that was created
 * @throws {null} - if the notification was not created successfully
 * @example
 * const notification = await createOneUserNotification(userId, title, message);
 * // notification will be the notification object that was created
 */
export const createOneUserNotification = async (userId, title, message, links) => {
    try {
        const notification = new Notification({
            userId: userId,
            title: title,
            message: message,
        })
        await notification.save();

        // send realtime notification to the user using socket.io
        sendNotificationToUser(userId, notification);
        return notification;
    } catch (err) {
        return null;
    }
}

/**
 * 
 * @description this function is used to create multiple notifications for multiple users, the function can be used in other routes for creating notifications
 * specially for admins to send notifications to multiple users at once
 * @param {*} userIds   - the ids of the users to whom the notification will be sent
 * @param {*} title     - the title of the notification
 * @param {*} message   - the message of the notification
 * @returns 
 */
export const createMultipleUserNotifications = async (userIds, title, message) => {
    try {
        const notifications = userIds.map(userId => {
            return new Notification({
                userId: userId,
                title: title,
                message: message,
            })
        })

        await Notification.insertMany(notifications);

        notifications.map(notification => {
            sendNotificationToUser(notification.userId, notification);
        })

        return notifications;
    } catch (err) {
        return null;
    }
}
