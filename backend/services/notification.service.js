import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

/**
 * Create a persisted notification and push it via socket to the recipient's
 * personal room (user:<userId>) if they are currently online.
 *
 * @param {string|ObjectId} userId  - The recipient's User._id
 * @param {{ type, title, message, link?, data? }} payload
 * @returns {Promise<Notification>}
 */
export const createNotification = async (userId, { type = 'info', title, message, link = null, data = null }) => {
  const notification = await Notification.create({
    recipient: userId,
    type,
    title,
    message,
    link,
    data,
  });

  // Real-time push to online user
  try {
    getIO().to(`user:${userId.toString()}`).emit('new-notification', {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      read: false,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    console.error('Socket emit new-notification failed:', err.message);
  }

  return notification;
};

/**
 * Create the same notification for multiple users (e.g. group members).
 * Silently skips duplicates.
 *
 * @param {Array<string|ObjectId>} userIds
 * @param {{ type, title, message, link?, data? }} payload
 */
export const createNotifications = async (userIds, payload) => {
  const unique = [...new Set(userIds.map((id) => id.toString()))];
  await Promise.all(unique.map((uid) => createNotification(uid, payload)));
};
