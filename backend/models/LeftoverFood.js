import mongoose from 'mongoose';

const leftoverFoodSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description of leftover food is required'],
    },
    quantity: {
      type: String, // e.g., "5 kg", "30 portions"
      required: [true, 'Quantity is required'],
    },
    bestBefore: {
      type: Date,
      required: [true, 'Best before time is required'],
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'picked_up', 'expired'],
      default: 'available',
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NGOProfile',
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    claimOtp: {
      type: String, // plain text OTP
      default: null,
    },
    claimOtpExpiresAt: {
      type: Date,
      default: null,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const LeftoverFood = mongoose.model('LeftoverFood', leftoverFoodSchema);

export default LeftoverFood;
