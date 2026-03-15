import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerProfile',
      required: true,
      unique: true, // one cart per customer
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    items: [
      {
        foodItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FoodItem',
          required: true,
        },
        name: { type: String, required: true },     // snapshot
        price: { type: Number, required: true },     // snapshot
        quantity: { type: Number, required: true, min: 1 },
        cookingInstructions: { type: String, default: '', trim: true, maxlength: 200 },
      },
    ],
  },
  { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
