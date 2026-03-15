import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import FoodItem from '../models/FoodItem.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { ORDER_STATUS } from '../constants/index.js';

// ===== SUBMIT REVIEW =====
export const submitReview = catchAsync(async (req, res, next) => {
  const { orderId, restaurantRating, restaurantReview, foodRatings } = req.body;

  if (!orderId || !restaurantRating) {
    return next(new AppError('orderId and restaurantRating are required', 400));
  }

  if (restaurantRating < 1 || restaurantRating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    return next(new AppError('You can only review delivered orders', 400));
  }

  if (String(order.customer) !== String(req.profileId)) {
    return next(new AppError('You can only review your own orders', 403));
  }

  // Check review window (7 days)
  const daysSinceDelivery = (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) {
    return next(new AppError('Review window has expired (7 days after delivery)', 400));
  }

  // Check if already reviewed
  const existingReview = await Review.findOne({ order: orderId });
  if (existingReview) {
    return next(new AppError('You have already reviewed this order', 400));
  }

  // Validate food ratings
  const validatedFoodRatings = [];
  if (foodRatings && Array.isArray(foodRatings)) {
    const orderFoodIds = order.items.map((i) => String(i.foodItem));
    for (const fr of foodRatings) {
      if (!orderFoodIds.includes(String(fr.foodItem))) {
        return next(new AppError(`Food item ${fr.foodItem} was not part of this order`, 400));
      }
      if (fr.rating < 1 || fr.rating > 5) {
        return next(new AppError('Food rating must be between 1 and 5', 400));
      }
      const orderItem = order.items.find((i) => String(i.foodItem) === String(fr.foodItem));
      validatedFoodRatings.push({
        foodItem: fr.foodItem,
        name: orderItem.name,
        rating: fr.rating,
        review: fr.review || '',
      });
    }
  }

  const review = await Review.create({
    customer: req.profileId,
    restaurant: order.restaurant,
    order: orderId,
    restaurantRating,
    restaurantReview: restaurantReview || '',
    foodRatings: validatedFoodRatings,
  });

  // Update restaurant aggregate rating
  await updateRestaurantRating(order.restaurant);

  // Update food item aggregate ratings
  for (const fr of validatedFoodRatings) {
    await updateFoodItemRating(fr.foodItem);
  }

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    review,
  });
});

// ===== GET RESTAURANT REVIEWS =====
export const getRestaurantReviews = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ restaurant: restaurantId })
      .populate('customer', 'user')
      .populate({
        path: 'customer',
        populate: { path: 'user', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ restaurant: restaurantId }),
  ]);

  res.status(200).json({
    success: true,
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ===== GET MY REVIEWS =====
export const getMyReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find({ customer: req.profileId })
    .populate('restaurant', 'name coverImage')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    reviews,
  });
});

// ===== CHECK IF ORDER IS REVIEWED =====
export const getOrderReviewStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const review = await Review.findOne({ order: orderId });

  res.status(200).json({
    success: true,
    reviewed: !!review,
    review: review || null,
  });
});

// ===== HELPER: Update restaurant aggregate rating =====
async function updateRestaurantRating(restaurantId) {
  const result = await Review.aggregate([
    { $match: { restaurant: restaurantId } },
    {
      $group: {
        _id: '$restaurant',
        avgRating: { $avg: '$restaurantRating' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      avgRating: Math.round(result[0].avgRating * 10) / 10,
      totalRatings: result[0].totalRatings,
    });
  }
}

// ===== HELPER: Update food item aggregate rating =====
async function updateFoodItemRating(foodItemId) {
  const result = await Review.aggregate([
    { $unwind: '$foodRatings' },
    { $match: { 'foodRatings.foodItem': foodItemId } },
    {
      $group: {
        _id: '$foodRatings.foodItem',
        avgRating: { $avg: '$foodRatings.rating' },
      },
    },
  ]);

  if (result.length > 0) {
    await FoodItem.findByIdAndUpdate(foodItemId, {
      avgRating: Math.round(result[0].avgRating * 10) / 10,
    });
  }
}
