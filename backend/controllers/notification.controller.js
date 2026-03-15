import Notification from '../models/Notification.js';
import catchAsync from '../utils/catchAsync.js';

// ===== GET MY NOTIFICATIONS =====
// GET /api/notifications?read=&page=&limit=&sort=
export const getMyNotifications = catchAsync(async (req, res) => {
  const { read, page = 1, limit = 30, sort = 'newest' } = req.query;

  const filter = { recipient: req.user._id };
  if (read === 'true') filter.read = true;
  if (read === 'false') filter.read = false;

  const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort(sortOrder)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// ===== GET UNREAD COUNT ONLY =====
// GET /api/notifications/unread-count
export const getUnreadCount = catchAsync(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.status(200).json({ success: true, unreadCount: count });
});

// ===== MARK ONE AS READ =====
// PATCH /api/notifications/:id/read
export const markAsRead = catchAsync(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true }
  );
  res.status(200).json({ success: true });
});

// ===== MARK ALL AS READ =====
// PATCH /api/notifications/read-all
export const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.status(200).json({ success: true });
});

// ===== CLEAR ALL (delete) =====
// DELETE /api/notifications
export const clearAll = catchAsync(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  res.status(200).json({ success: true });
});
