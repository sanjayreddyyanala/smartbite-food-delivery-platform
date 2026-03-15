import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
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
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    restaurantRating: {
      type: Number,
      required: [true, 'Restaurant rating is required'],
      min: 1,
      max: 5,
    },
    restaurantReview: {
      type: String,
      default: '',
      maxlength: [500, 'Review cannot exceed 500 characters'],
      trim: true,
    },
    foodRatings: [
      {
        foodItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FoodItem',
          required: true,
        },
        name: { type: String, required: true },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        review: {
          type: String,
          default: '',
          maxlength: 300,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// One review per order
reviewSchema.index({ order: 1 }, { unique: true });
// Fast lookups by restaurant (for listing reviews)
reviewSchema.index({ restaurant: 1, createdAt: -1 });
// Fast lookups by customer (for "my reviews")
reviewSchema.index({ customer: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
