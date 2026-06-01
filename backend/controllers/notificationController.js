import {
    getUserNotificationsService,
    markNotificationAsReadService,
    markAllNotificationsAsReadService
} from "../services/notificationService.js";

/* =========================
   GET USER NOTIFICATIONS
========================= */
export const getUserNotifications = async (req, res) => {
    try {
        const notifications = await getUserNotificationsService(req.user._id);

        res.json({
            success: true,
            data: notifications,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/* =========================
   MARK NOTIFICATION AS READ
========================= */
export const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await markNotificationAsReadService(req.params.id, req.user._id);

        res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        if (error.message === "Notification not found") {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/* =========================
   MARK ALL AS READ
========================= */
export const markAllAsRead = async (req, res) => {
    try {
        const result = await markAllNotificationsAsReadService(req.user._id);

        res.json({
            success: true,
            message: "All notifications marked as read",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
