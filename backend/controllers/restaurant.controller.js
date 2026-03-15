import Restaurant from '../models/Restaurant.js';
import FoodItem from '../models/FoodItem.js';
import Order from '../models/Order.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../middleware/upload.middleware.js';
import {
  DEFAULT_RESTAURANT_CATEGORIES,
  ROLES,
  USER_STATUS,
  ORDER_STATUS,
} from '../constants/index.js';

const sanitizeCategories = (categories) => {
  const rawCategories = Array.isArray(categories)
    ? categories
    : typeof categories === 'string'
      ? JSON.parse(categories)
      : [];

  const seen = new Set();

  return rawCategories
    .map((category) => String(category || '').trim())
    .filter((category) => category.length > 0)
    .filter((category) => {
      const key = category.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

// ===== GLOBAL SEARCH (restaurants + food items) =====
export const globalSearch = catchAsync(async (req, res, next) => {
  const { q, limit } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(200).json({ success: true, restaurants: [], foodsByRestaurant: [] });
  }

  const searchRegex = { $regex: q.trim(), $options: 'i' };
  const maxResults = parseInt(limit) || 20;

  // Search restaurants by name
  const restaurants = await Restaurant.find({
    name: searchRegex,
    status: USER_STATUS.APPROVED,
    isOnline: true,
  })
    .select('name coverImage cuisineType address isOnline')
    .limit(maxResults);

  // Search food items by name (only from approved/online restaurants)
  const approvedRestaurants = await Restaurant.find({
    status: USER_STATUS.APPROVED,
    isOnline: true,
  }).select('_id');
  const approvedIds = approvedRestaurants.map(r => r._id);

  const foodItems = await FoodItem.find({
    name: searchRegex,
    restaurant: { $in: approvedIds },
    isAvailable: true,
  })
    .populate('restaurant', 'name coverImage')
    .limit(maxResults);

  // Group food items by restaurant
  const foodsByRestaurant = {};
  for (const food of foodItems) {
    const rId = food.restaurant?._id?.toString();
    if (!rId) continue;
    if (!foodsByRestaurant[rId]) {
      foodsByRestaurant[rId] = {
        restaurant: { _id: rId, name: food.restaurant.name, coverImage: food.restaurant.coverImage },
        items: [],
      };
    }
    foodsByRestaurant[rId].items.push({
      _id: food._id,
      name: food.name,
      price: food.price,
      image: food.image,
      isVeg: food.isVeg,
    });
  }

  res.status(200).json({
    success: true,
    restaurants,
    foodsByRestaurant: Object.values(foodsByRestaurant),
    restaurantCount: restaurants.length,
    foodCount: foodItems.length,
  });
});

// ===== CREATE RESTAURANT =====
export const createRestaurant = catchAsync(async (req, res, next) => {
  // Check if user already has a restaurant
  const existing = await Restaurant.findOne({ owner: req.user._id });
  if (existing) {
    return next(new AppError('You already have a restaurant registered', 400));
  }

  const { name, description, cuisineType, phone, address, openingHours, bankDetails, categories } = req.body;

  // Upload cover image if provided
  let coverImage = '';
  if (req.file) {
    coverImage = await uploadToCloudinary(req.file.buffer, 'restaurants');
  }

  // Parse JSON fields if sent as strings (multipart form)
  const parsedCuisineType = typeof cuisineType === 'string' ? JSON.parse(cuisineType) : cuisineType;
  const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
  const parsedOpeningHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
  const parsedBankDetails = typeof bankDetails === 'string' ? JSON.parse(bankDetails) : bankDetails;
  const parsedCategories = categories ? sanitizeCategories(categories) : DEFAULT_RESTAURANT_CATEGORIES;

  const restaurant = await Restaurant.create({
    owner: req.user._id,
    name,
    description,
    cuisineType: parsedCuisineType,
    phone,
    categories: parsedCategories.length > 0 ? parsedCategories : DEFAULT_RESTAURANT_CATEGORIES,
    coverImage,
    address: parsedAddress,
    openingHours: parsedOpeningHours,
    bankDetails: parsedBankDetails || {},
    status: req.user.status === USER_STATUS.APPROVED ? USER_STATUS.APPROVED : USER_STATUS.PENDING,
  });

  res.status(201).json({
    success: true,
    restaurant,
  });
});

// ===== GET ALL RESTAURANTS (public — approved + online only) =====
export const getRestaurants = catchAsync(async (req, res, next) => {
  const { search, cuisine, category } = req.query;

  const filter = {
    status: USER_STATUS.APPROVED,
    isOnline: true,
  };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (cuisine) {
    filter.cuisineType = { $in: [cuisine] };
  }
  if (category) {
    filter.categories = { $in: [category] };
  }

  const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: restaurants.length,
    restaurants,
  });
});

// ===== GET SINGLE RESTAURANT =====
export const getRestaurantById = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  res.status(200).json({
    success: true,
    restaurant,
  });
});

// ===== GET MY RESTAURANT (for restaurant owner) =====
export const getMyRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });

  if (!restaurant) {
    return next(new AppError('You have not registered a restaurant yet', 404));
  }

  res.status(200).json({
    success: true,
    restaurant,
  });
});

// ===== GET RESTAURANT CATEGORIES =====
export const getRestaurantCategories = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id).select('categories');

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  res.status(200).json({
    success: true,
    categories: restaurant.categories || DEFAULT_RESTAURANT_CATEGORIES,
  });
});

// ===== UPDATE RESTAURANT CATEGORIES =====
export const updateRestaurantCategories = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own restaurant categories', 403));
  }

  const nextCategories = sanitizeCategories(req.body.categories);
  if (nextCategories.length === 0) {
    return next(new AppError('Please provide at least one category', 400));
  }

  const currentCategories = restaurant.categories || DEFAULT_RESTAURANT_CATEGORIES;
  const removedCategories = currentCategories.filter((category) => !nextCategories.includes(category));
  const reassignments = req.body.reassignments && typeof req.body.reassignments === 'object'
    ? req.body.reassignments
    : {};

  const foodsInRemovedCategories = removedCategories.length > 0
    ? await FoodItem.find({ restaurant: restaurant._id, category: { $in: removedCategories } }).select('category')
    : [];

  const usedRemovedCategories = [...new Set(foodsInRemovedCategories.map((food) => food.category))];
  const unresolvedRemovedCategories = usedRemovedCategories.filter((category) => {
    const reassignmentTarget = typeof reassignments[category] === 'string' ? reassignments[category].trim() : '';
    return !reassignmentTarget || !nextCategories.includes(reassignmentTarget);
  });

  if (unresolvedRemovedCategories.length > 0) {
    return next(
      new AppError(
        `Cannot remove categories with existing food items: ${unresolvedRemovedCategories.join(', ')}`,
        400
      )
    );
  }

  for (const removedCategory of usedRemovedCategories) {
    const reassignmentTarget = reassignments[removedCategory].trim();
    await FoodItem.updateMany(
      { restaurant: restaurant._id, category: removedCategory },
      { category: reassignmentTarget }
    );
  }

  restaurant.categories = nextCategories;
  await restaurant.save();

  res.status(200).json({
    success: true,
    categories: restaurant.categories,
  });
});

// ===== UPDATE RESTAURANT =====
export const updateRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  // Only owner can update
  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own restaurant', 403));
  }

  const { name, description, cuisineType, phone, address, openingHours, bankDetails } = req.body;

  // Update cover image if new one provided
  if (req.file) {
    // Delete old image from Cloudinary
    await deleteFromCloudinary(restaurant.coverImage);
    restaurant.coverImage = await uploadToCloudinary(req.file.buffer, 'restaurants');
  }

  if (name) restaurant.name = name;
  if (description !== undefined) restaurant.description = description;
  if (cuisineType) {
    restaurant.cuisineType = typeof cuisineType === 'string' ? JSON.parse(cuisineType) : cuisineType;
  }
  if (phone !== undefined) restaurant.phone = phone;
  if (address) {
    restaurant.address = typeof address === 'string' ? JSON.parse(address) : address;
  }
  if (openingHours) {
    restaurant.openingHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
  }
  if (bankDetails) {
    const parsedBankDetails = typeof bankDetails === 'string' ? JSON.parse(bankDetails) : bankDetails;
    restaurant.bankDetails = {
      ...restaurant.bankDetails,
      accountHolderName: parsedBankDetails?.accountHolderName ?? restaurant.bankDetails?.accountHolderName ?? '',
      accountNumber: parsedBankDetails?.accountNumber ?? restaurant.bankDetails?.accountNumber ?? '',
      ifscCode: parsedBankDetails?.ifscCode ?? restaurant.bankDetails?.ifscCode ?? '',
      bankName: parsedBankDetails?.bankName ?? restaurant.bankDetails?.bankName ?? '',
      upiId: parsedBankDetails?.upiId ?? restaurant.bankDetails?.upiId ?? '',
    };
  }

  await restaurant.save();

  res.status(200).json({
    success: true,
    restaurant,
  });
});

// ===== TOGGLE ONLINE/OFFLINE =====
export const toggleOnline = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only toggle your own restaurant', 403));
  }

  // Only approved restaurants can go online
  if (restaurant.status !== USER_STATUS.APPROVED) {
    return next(new AppError('Your restaurant must be approved before going online', 403));
  }

  restaurant.isOnline = !restaurant.isOnline;

  // When going online, reset all food items' availableQuantity to defaultQuantity
  if (restaurant.isOnline) {
    const foodItems = await FoodItem.find({ restaurant: restaurant._id });
    for (const item of foodItems) {
      item.availableQuantity = item.defaultQuantity;
      item.isAvailable = item.defaultQuantity > 0;
      await item.save();
    }
  }

  await restaurant.save();

  res.status(200).json({
    success: true,
    message: `Restaurant is now ${restaurant.isOnline ? 'online' : 'offline'}`,
    isOnline: restaurant.isOnline,
  });
});

// ===== UPLOAD GALLERY IMAGES =====
export const uploadImages = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own restaurant', 403));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400));
  }

  // Upload each file to Cloudinary
  const uploadPromises = req.files.map((file) =>
    uploadToCloudinary(file.buffer, 'restaurants/gallery')
  );
  const urls = await Promise.all(uploadPromises);

  restaurant.images.push(...urls);
  await restaurant.save();

  res.status(200).json({
    success: true,
    images: restaurant.images,
  });
});

// ===== DELETE A GALLERY IMAGE =====
export const deleteImage = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own restaurant', 403));
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    return next(new AppError('imageUrl is required', 400));
  }

  if (!restaurant.images.includes(imageUrl)) {
    return next(new AppError('Image not found in gallery', 404));
  }

  // Delete from Cloudinary
  await deleteFromCloudinary(imageUrl);

  // Remove from array
  restaurant.images = restaurant.images.filter((url) => url !== imageUrl);
  await restaurant.save();

  res.status(200).json({
    success: true,
    images: restaurant.images,
  });
});

// ===== GET RESTAURANT EARNINGS =====
export const getRestaurantEarnings = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const orders = await Order.find({
    restaurant: restaurant._id,
    status: ORDER_STATUS.DELIVERED,
  })
    .select('subtotal deliveryFee totalAmount items deliveredAt createdAt paymentMethod')
    .sort({ deliveredAt: -1 });

  res.status(200).json({
    success: true,
    totalEarnings: restaurant.totalEarnings || 0,
    unsettledEarnings: restaurant.unsettledEarnings || 0,
    totalPaidOut: restaurant.totalPaidOut || 0,
    lastPayoutAt: restaurant.lastPayoutAt || null,
    restaurantName: restaurant.name,
    orders,
  });
});
