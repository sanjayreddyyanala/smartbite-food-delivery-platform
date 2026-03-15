import mongoose from 'mongoose';
import { GROUP_ORDER_STATUS, CART_PERMISSION } from '../constants/index.js';

const groupOrderSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    code: {
      type: String,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
    },
    status: {
      type: String,
      enum: Object.values(GROUP_ORDER_STATUS),
      default: GROUP_ORDER_STATUS.ACTIVE,
    },
    cartPermission: {
      type: String,
      enum: Object.values(CART_PERMISSION),
      default: CART_PERMISSION.OPEN,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        name: { type: String, required: true },
        isReady: { type: Boolean, default: false },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    items: [
      {
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        memberName: { type: String, required: true },
        foodItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FoodItem',
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String, default: '' },
      },
    ],
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    placedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    maxMembers: {
      type: Number,
      default: 10,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Helper to generate a random 6-char alphanumeric code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a unique 6-character alphanumeric code before saving
groupOrderSchema.pre('save', function () {
  if (!this.code) {
    this.code = generateCode();
  }
});

// TTL index — MongoDB will auto-delete expired sessions after some delay
// We also check expiresAt in the controller for immediate rejection
groupOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Partial unique index — only enforce code uniqueness for active/locked sessions
// This allows cancelled/expired/ordered groups to reuse codes freely
groupOrderSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED] },
    },
  }
);

const GroupOrder = mongoose.model('GroupOrder', groupOrderSchema);

// Static method: create with code collision retry
GroupOrder.createWithRetry = async function (data, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.create(data);
    } catch (err) {
      // If duplicate key error on code, retry with a new code
      if (err.code === 11000 && err.keyPattern?.code) {
        // Remove the code so pre-save generates a new one
        delete data.code;
        continue;
      }
      throw err; // Re-throw non-duplicate errors
    }
  }
  throw new Error('Failed to generate a unique group code after multiple attempts');
};

export default GroupOrder;
