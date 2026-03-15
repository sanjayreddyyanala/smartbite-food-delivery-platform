import FoodItem from '../models/FoodItem.js';
import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../middleware/upload.middleware.js';

const validateRestaurantCategory = (restaurant, category) => {
  const normalizedCategory = typeof category === 'string' ? category.trim() : '';
  const allowedCategories = restaurant.categories || [];

  if (!normalizedCategory) {
    throw new AppError('Category is required', 400);
  }

  if (!allowedCategories.includes(normalizedCategory)) {
    throw new AppError(`Invalid category. Choose from: ${allowedCategories.join(', ')}`, 400);
  }

  return normalizedCategory;
};

// ===== GET FOODS OF A RESTAURANT =====
export const getRestaurantFoods = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id).select('categories');

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const categoryOrder = restaurant.categories || [];
  const foods = await FoodItem.find({ restaurant: req.params.id });

  foods.sort((firstItem, secondItem) => {
    const firstCategoryIndex = categoryOrder.indexOf(firstItem.category);
    const secondCategoryIndex = categoryOrder.indexOf(secondItem.category);
    const firstOrder = firstCategoryIndex === -1 ? Number.MAX_SAFE_INTEGER : firstCategoryIndex;
    const secondOrder = secondCategoryIndex === -1 ? Number.MAX_SAFE_INTEGER : secondCategoryIndex;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    return firstItem.name.localeCompare(secondItem.name);
  });

  res.status(200).json({
    success: true,
    count: foods.length,
    foods,
  });
});

// ===== GET ALL FOOD ITEMS (across restaurants) =====
export const getAllFoods = catchAsync(async (req, res, next) => {
  const foods = await FoodItem.find().populate('restaurant', 'name isOnline status');

  res.status(200).json({
    success: true,
    count: foods.length,
    foods,
  });
});

// ===== FILTER FOOD ITEMS =====
export const filterFoods = catchAsync(async (req, res, next) => {
  const { category, isVeg, search, restaurant } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (isVeg !== undefined) filter.isVeg = isVeg === 'true';
  if (restaurant) filter.restaurant = restaurant;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const foods = await FoodItem.find(filter)
    .populate('restaurant', 'name isOnline status')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: foods.length,
    foods,
  });
});

// ===== ADD FOOD ITEM =====
export const addFoodItem = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only add food to your own restaurant', 403));
  }

  const { name, description, price, category, isVeg, defaultQuantity } = req.body;

  // Upload food image if provided
  let image = '';
  if (req.file) {
    image = await uploadToCloudinary(req.file.buffer, 'food-items');
  }

  const validatedCategory = validateRestaurantCategory(restaurant, category);

  const foodItem = await FoodItem.create({
    restaurant: restaurant._id,
    name,
    description,
    price,
    image,
    category: validatedCategory,
    isVeg: isVeg !== undefined ? isVeg : true,
    defaultQuantity,
    availableQuantity: defaultQuantity, // initially same as default
  });

  res.status(201).json({
    success: true,
    foodItem,
  });
});

// ===== UPDATE FOOD ITEM =====
export const updateFoodItem = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update food in your own restaurant', 403));
  }

  const foodItem = await FoodItem.findOne({
    _id: req.params.foodId,
    restaurant: restaurant._id,
  });

  if (!foodItem) {
    return next(new AppError('Food item not found', 404));
  }

  const { name, description, price, category, isVeg, defaultQuantity, availableQuantity } = req.body;

  // Update image if new one provided
  if (req.file) {
    await deleteFromCloudinary(foodItem.image);
    foodItem.image = await uploadToCloudinary(req.file.buffer, 'food-items');
  }

  if (name) foodItem.name = name;
  if (description !== undefined) foodItem.description = description;
  if (price !== undefined) foodItem.price = price;
  if (category !== undefined) {
    foodItem.category = validateRestaurantCategory(restaurant, category);
  }
  if (isVeg !== undefined) foodItem.isVeg = isVeg;
  if (defaultQuantity !== undefined) foodItem.defaultQuantity = defaultQuantity;
  
  if (availableQuantity !== undefined) {
    foodItem.availableQuantity = availableQuantity;
    if (availableQuantity > 0) {
      foodItem.isAvailable = true;
    } else {
      foodItem.isAvailable = false;
    }
  }

  await foodItem.save();

  res.status(200).json({
    success: true,
    foodItem,
  });
});

// ===== UPDATE AVAILABLE QUANTITY =====
export const updateQuantity = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update quantity in your own restaurant', 403));
  }

  const foodItem = await FoodItem.findOne({
    _id: req.params.foodId,
    restaurant: restaurant._id,
  });

  if (!foodItem) {
    return next(new AppError('Food item not found', 404));
  }

  const { availableQuantity } = req.body;

  if (availableQuantity === undefined || availableQuantity < 0) {
    return next(new AppError('Please provide a valid available quantity', 400));
  }

  foodItem.availableQuantity = availableQuantity;

  // Auto-manage isAvailable based on quantity
  if (availableQuantity <= 0) {
    foodItem.isAvailable = false;
  } else {
    foodItem.isAvailable = true;
  }

  await foodItem.save();

  res.status(200).json({
    success: true,
    foodItem,
  });
});

// ===== TOGGLE FOOD AVAILABILITY =====
export const toggleFoodAvailability = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only toggle food in your own restaurant', 403));
  }

  const foodItem = await FoodItem.findOne({
    _id: req.params.foodId,
    restaurant: restaurant._id,
  });

  if (!foodItem) {
    return next(new AppError('Food item not found', 404));
  }

  // Can't toggle available if quantity is 0
  if (foodItem.availableQuantity <= 0 && !foodItem.isAvailable) {
    return next(new AppError('Cannot make available — quantity is 0. Update quantity first.', 400));
  }

  foodItem.isAvailable = !foodItem.isAvailable;
  await foodItem.save();

  res.status(200).json({
    success: true,
    message: `Food item is now ${foodItem.isAvailable ? 'available' : 'unavailable'}`,
    isAvailable: foodItem.isAvailable,
  });
});

// ===== DELETE FOOD ITEM =====
export const deleteFoodItem = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only delete food from your own restaurant', 403));
  }

  const foodItem = await FoodItem.findOne({
    _id: req.params.foodId,
    restaurant: restaurant._id,
  });

  if (!foodItem) {
    return next(new AppError('Food item not found', 404));
  }

  // Delete image from Cloudinary
  await deleteFromCloudinary(foodItem.image);

  await foodItem.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Food item deleted',
  });
});
