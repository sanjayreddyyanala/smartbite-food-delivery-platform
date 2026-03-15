import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    preferences: {
      favoriteCuisines: [
        {
          cuisine: { type: String },
          score: { type: Number, default: 0 },
        },
      ],
      favoriteCategories: [
        {
          category: { type: String },
          score: { type: Number, default: 0 },
        },
      ],
      priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        avg: { type: Number, default: 0 },
      },
      isVegPreferred: { type: Boolean, default: false },
      orderFrequency: {
        type: Map,
        of: Number,
        default: {},
      },
      lastUpdated: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const CustomerProfile = mongoose.model('CustomerProfile', customerProfileSchema);

export default CustomerProfile;
