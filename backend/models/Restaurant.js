import mongoose from 'mongoose';
import { DEFAULT_RESTAURANT_CATEGORIES, USER_STATUS } from '../constants/index.js';

const restaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one restaurant per owner
    },
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    cuisineType: {
      type: [String],
      default: [],
    },
    categories: {
      type: [String],
      default: DEFAULT_RESTAURANT_CATEGORIES,
    },
    phone: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String, // Cloudinary URL
      default: '',
    },
    images: {
      type: [String], // Array of Cloudinary URLs for gallery
      default: [],
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    openingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '22:00' },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    unsettledEarnings: {
      type: Number,
      default: 0,
    },
    totalPaidOut: {
      type: Number,
      default: 0,
    },
    lastPayoutAt: {
      type: Date,
      default: null,
    },
    popularItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodItem',
      },
    ],
    bankDetails: {
      accountHolderName: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifscCode: { type: String, default: '', trim: true, uppercase: true },
      bankName: { type: String, default: '', trim: true },
      upiId: { type: String, default: '', trim: true, lowercase: true },
    },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
