import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearAll,
} from '../controllers/notification.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/', clearAll);

export default router;
