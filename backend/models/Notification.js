import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['order', 'payment', 'delivery', 'group', 'leftover', 'admin', 'review', 'info', 'success', 'warning'],
      default: 'info',
    },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 400 },
    link: { type: String, default: null },   // frontend route
    read: { type: Boolean, default: false, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: null }, // extra payload
  },
  { timestamps: true }
);

// Compound index for fast per-user unread queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
