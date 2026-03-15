import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String, // Cloudinary URL
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    defaultQuantity: {
      type: Number,
      required: [true, 'Default quantity is required'],
      min: [1, 'Default quantity must be at least 1'],
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Auto-set isAvailable to false when availableQuantity hits 0
foodItemSchema.pre('save', function () {
  if (this.availableQuantity <= 0) {
    this.isAvailable = false;
  }
});

const FoodItem = mongoose.model('FoodItem', foodItemSchema);

export default FoodItem;
