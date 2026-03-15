import Notification from "../models/Notification.js";

/**
 * Creates a new notification for a specific user
 * @param {string} userId - ID of the user to notify
 * @param {string} message - Notification message content
 * @param {string} type - 'info', 'success', 'warning', or 'error'
 */
export const createNotificationService = async (userId, message, type = "info") => {
    try {
        const notification = await Notification.create({
            userId,
            message,
            type
        });
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        // Don't throw - notification failure shouldn't break the main flow
        return null;
    }
};

/**
 * Gets all notifications for a specific user, sorted newest first
 * @param {string} userId - User ID
 */
export const getUserNotificationsService = async (userId) => {
    return await Notification.find({ userId }).sort('-createdAt');
};

/**
 * Marks a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - ID of verifying user for security
 */
export const markNotificationAsReadService = async (notificationId, userId) => {
    const notification = await Notification.findOne({ _id: notificationId, userId });

    if (!notification) {
        throw new Error("Notification not found");
    }

    notification.isRead = true;
    await notification.save();
    return notification;
};

/**
 * Marks all of a user's notifications as read
 * @param {string} userId - User ID
 */
export const markAllNotificationsAsReadService = async (userId) => {
    await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
    );
    return { success: true };
};
