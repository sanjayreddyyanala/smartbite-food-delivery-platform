import Cart from '../models/Cart.js';
import FoodItem from '../models/FoodItem.js';
import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

const normalizeCookingInstructions = (instructions = '') => String(instructions || '').trim().slice(0, 200);

// ===== GET CART =====
export const getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ customer: req.profileId })
    .populate('restaurant', 'name coverImage isOnline')
    .populate('items.foodItem', 'image isAvailable availableQuantity')
    .lean();

  if (!cart) {
    cart = { customer: req.profileId, restaurant: null, items: [] };
  }

  res.status(200).json({
    success: true,
    cart,
  });
});

// ===== ADD ITEM TO CART =====
export const addToCart = catchAsync(async (req, res, next) => {
  const { foodItemId, quantity, cookingInstructions } = req.body;
  const normalizedInstructions = normalizeCookingInstructions(cookingInstructions);

  if (!foodItemId || !quantity || quantity < 1) {
    return next(new AppError('Please provide foodItemId and a valid quantity', 400));
  }

  // Find the food item and its restaurant
  const foodItem = await FoodItem.findById(foodItemId);
  if (!foodItem) {
    return next(new AppError('Food item not found', 404));
  }

  // Check availability
  if (!foodItem.isAvailable) {
    return next(new AppError('This food item is currently unavailable', 400));
  }

  // Check stock
  if (foodItem.availableQuantity < quantity) {
    return next(
      new AppError(
        `Only ${foodItem.availableQuantity} units of ${foodItem.name} available`,
        400
      )
    );
  }

  const restaurant = await Restaurant.findById(foodItem.restaurant);
  if (!restaurant || !restaurant.isOnline) {
    return next(new AppError('This restaurant is currently offline', 400));
  }

  // Get or create cart
  let cart = await Cart.findOne({ customer: req.profileId });

  if (!cart) {
    cart = new Cart({ customer: req.profileId, restaurant: null, items: [] });
  }

  // Check restaurant conflict
  if (cart.restaurant && cart.restaurant.toString() !== foodItem.restaurant.toString()) {
    return res.status(409).json({
      success: false,
      conflict: true,
      message: 'Your cart contains items from a different restaurant. Clear cart to add from this restaurant.',
      currentRestaurant: cart.restaurant,
      newRestaurant: foodItem.restaurant,
    });
  }

  // Set restaurant if cart was empty
  if (!cart.restaurant) {
    cart.restaurant = foodItem.restaurant;
  }

  // Check if item already in cart
  const existingItem = cart.items.find(
    (item) => item.foodItem.toString() === foodItemId
      && normalizeCookingInstructions(item.cookingInstructions) === normalizedInstructions
  );

  if (existingItem) {
    // Check total quantity doesn't exceed available
    const newQty = existingItem.quantity + quantity;
    if (newQty > foodItem.availableQuantity) {
      return next(
        new AppError(
          `Cannot add more. Only ${foodItem.availableQuantity} units available (${existingItem.quantity} in cart)`,
          400
        )
      );
    }
    existingItem.quantity = newQty;
  } else {
    cart.items.push({
      foodItem: foodItemId,
      name: foodItem.name,
      price: foodItem.price,
      quantity,
      cookingInstructions: normalizedInstructions,
    });
  }

  await cart.save();

  // Populate for response
  await cart.populate('restaurant', 'name coverImage isOnline');

  res.status(200).json({
    success: true,
    cart,
  });
});

// ===== UPDATE ITEM QUANTITY =====
export const updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity, cookingInstructions } = req.body;
  const hasQuantity = quantity !== undefined;
  const hasInstructions = cookingInstructions !== undefined;

  if (!hasQuantity && !hasInstructions) {
    return next(new AppError('Please provide quantity or cookingInstructions to update', 400));
  }

  if (hasQuantity && (!Number.isFinite(Number(quantity)) || Number(quantity) < 1)) {
    return next(new AppError('Please provide a valid quantity (minimum 1)', 400));
  }

  const cart = await Cart.findOne({ customer: req.profileId });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const item = cart.items.id(req.params.itemId);
  if (!item) {
    return next(new AppError('Item not found in cart', 404));
  }

  // Check available stock
  const foodItem = await FoodItem.findById(item.foodItem);
  if (foodItem && hasQuantity && Number(quantity) > foodItem.availableQuantity) {
    return next(
      new AppError(
        `Only ${foodItem.availableQuantity} units of ${foodItem.name} available`,
        400
      )
    );
  }

  if (hasQuantity) {
    item.quantity = Number(quantity);
  }

  if (hasInstructions) {
    item.cookingInstructions = normalizeCookingInstructions(cookingInstructions);
  }

  if (foodItem) {
    const duplicateItem = cart.items.find(
      (cartItem) => cartItem._id.toString() !== item._id.toString()
        && cartItem.foodItem.toString() === item.foodItem.toString()
        && normalizeCookingInstructions(cartItem.cookingInstructions) === normalizeCookingInstructions(item.cookingInstructions)
    );

    if (duplicateItem) {
      const mergedQuantity = duplicateItem.quantity + item.quantity;
      if (mergedQuantity > foodItem.availableQuantity) {
        return next(
          new AppError(
            `Cannot merge cart lines. Only ${foodItem.availableQuantity} units of ${foodItem.name} available`,
            400
          )
        );
      }

      duplicateItem.quantity = mergedQuantity;
      cart.items.pull({ _id: item._id });
    }
  }

  await cart.save();

  res.status(200).json({
    success: true,
    cart,
  });
});

// ===== REMOVE ITEM FROM CART =====
export const removeCartItem = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ customer: req.profileId });
  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const item = cart.items.id(req.params.itemId);
  if (!item) {
    return next(new AppError('Item not found in cart', 404));
  }

  cart.items.pull({ _id: req.params.itemId });

  // If cart is empty, clear restaurant
  if (cart.items.length === 0) {
    cart.restaurant = null;
  }

  await cart.save();

  res.status(200).json({
    success: true,
    cart,
  });
});

// ===== CLEAR CART =====
export const clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ customer: req.profileId });
  if (!cart) {
    return res.status(200).json({
      success: true,
      message: 'Cart is already empty',
    });
  }

  cart.items = [];
  cart.restaurant = null;
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    cart,
  });
});
