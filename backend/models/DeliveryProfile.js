import mongoose from 'mongoose';

const deliveryProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      default: '',
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'bicycle'],
      default: 'bike',
    },
    licensePlate: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    currentLocation: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: null },
    },
    earnings: {
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
    totalDeliveries: {
      type: Number,
      default: 0,
    },
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

const DeliveryProfile = mongoose.model('DeliveryProfile', deliveryProfileSchema);

export default DeliveryProfile;
