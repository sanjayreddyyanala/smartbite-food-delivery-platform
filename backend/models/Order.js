import mongoose from 'mongoose';
import { ORDER_STATUS } from '../constants/index.js';

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerProfile',
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryProfile',
      default: null,
    },
    items: [
      {
        foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        cookingInstructions: { type: String, default: '', trim: true, maxlength: 200 },
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
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'online'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refund_pending', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    groupOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupOrder',
      default: null,
    },
    isGroupOrder: {
      type: Boolean,
      default: false,
    },
    memberBreakdown: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        itemsTotal: Number,
        deliveryFeeShare: Number,
        totalShare: Number,
      },
    ],
    deliveryOtp: {
      type: String, // hashed 4-digit OTP for verification
      default: null,
    },
    deliveryOtpPlain: {
      type: String, // plaintext OTP shown to customer on dashboard
      default: null,
    },
    pickupCode: {
      type: String, // plaintext 4-digit numeric code shown to delivery partner at pickup
      default: null,
    },
    deliveryOtpExpiresAt: {
      type: Date,
      default: null,
    },

    // Status event timestamps
    placedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    preparingAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
