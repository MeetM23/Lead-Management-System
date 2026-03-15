import express from 'express';
import {
    getUserNotifications,
    markNotificationAsRead,
    markAllAsRead
} from '../controllers/notificationController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
    .get(getUserNotifications)
    .put(markAllAsRead);

router.route('/:id')
    .put(markNotificationAsRead);

export default router;
