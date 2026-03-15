import Order from '../models/Order.js';
import CustomerProfile from '../models/CustomerProfile.js';
import Restaurant from '../models/Restaurant.js';
import { ORDER_STATUS } from '../constants/index.js';

/**
 * Recompute and cache preference data for a single customer.
 * Analyzes their delivered orders to extract: cuisine preferences,
 * category preferences, price range, veg preference, and order frequency.
 */
export async function computePreferences(customerProfileId) {
  const orders = await Order.find({
    customer: customerProfileId,
    status: ORDER_STATUS.DELIVERED,
  })
    .populate('restaurant', 'cuisineType')
    .populate('items.foodItem', 'category isVeg price');

  if (orders.length === 0) return;

  // Cuisine scoring — count frequency, weight recent orders more
  const cuisineMap = {};
  const categoryMap = {};
  const restaurantFreq = {};
  let vegCount = 0;
  let nonVegCount = 0;
  let totalPrice = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  let itemCount = 0;

  const now = Date.now();

  for (const order of orders) {
    // Recency weight: orders from last 7 days = 3x, 30 days = 2x, older = 1x
    const ageInDays = (now - new Date(order.deliveredAt || order.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = ageInDays <= 7 ? 3 : ageInDays <= 30 ? 2 : 1;

    // Cuisine preferences
    if (order.restaurant?.cuisineType) {
      for (const cuisine of order.restaurant.cuisineType) {
        cuisineMap[cuisine] = (cuisineMap[cuisine] || 0) + recencyWeight;
      }
    }

    // Restaurant frequency
    const restId = String(order.restaurant?._id || order.restaurant);
    restaurantFreq[restId] = (restaurantFreq[restId] || 0) + 1;

    // Item-level analysis
    for (const item of order.items) {
      const food = item.foodItem;
      if (!food) continue;

      // Category preferences
      if (food.category) {
        categoryMap[food.category] = (categoryMap[food.category] || 0) + (item.quantity * recencyWeight);
      }

      // Veg preference
      if (food.isVeg) {
        vegCount += item.quantity;
      } else {
        nonVegCount += item.quantity;
      }

      // Price analysis
      const price = food.price || item.price;
      totalPrice += price * item.quantity;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
      itemCount += item.quantity;
    }
  }

  // Build sorted cuisine preferences
  const favoriteCuisines = Object.entries(cuisineMap)
    .map(([cuisine, score]) => ({ cuisine, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Build sorted category preferences
  const favoriteCategories = Object.entries(categoryMap)
    .map(([category, score]) => ({ category, score }))
    .sort((a, b) => b.score - a.score);

  // Price range
  const priceRange = {
    min: minPrice === Infinity ? 0 : minPrice,
    max: maxPrice,
    avg: itemCount > 0 ? Math.round(totalPrice / itemCount) : 0,
  };

  // Veg preference (if >70% items are veg)
  const totalItems = vegCount + nonVegCount;
  const isVegPreferred = totalItems > 0 ? vegCount / totalItems > 0.7 : false;

  await CustomerProfile.findByIdAndUpdate(customerProfileId, {
    'preferences.favoriteCuisines': favoriteCuisines,
    'preferences.favoriteCategories': favoriteCategories,
    'preferences.priceRange': priceRange,
    'preferences.isVegPreferred': isVegPreferred,
    'preferences.orderFrequency': restaurantFreq,
    'preferences.lastUpdated': new Date(),
  });
}

/**
 * Batch recompute preferences for all customers with delivered orders.
 * Designed to be called from a daily cron job.
 */
export async function computeAllPreferences() {
  const profiles = await CustomerProfile.find({});
  let updated = 0;

  for (const profile of profiles) {
    try {
      await computePreferences(profile._id);
      updated++;
    } catch (err) {
      console.error(`[PreferenceComputer] Error for profile ${profile._id}:`, err.message);
    }
  }

  console.log(`[PreferenceComputer] Updated preferences for ${updated}/${profiles.length} customers`);
}

/**
 * Update popular items for all restaurants based on order volume.
 */
export async function computePopularItems() {
  const restaurants = await Restaurant.find({ status: 'approved' });

  for (const restaurant of restaurants) {
    try {
      const result = await Order.aggregate([
        { $match: { restaurant: restaurant._id, status: ORDER_STATUS.DELIVERED } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.foodItem',
            totalOrdered: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalOrdered: -1 } },
        { $limit: 5 },
      ]);

      const popularItemIds = result.map((r) => r._id).filter(Boolean);
      await Restaurant.findByIdAndUpdate(restaurant._id, { popularItems: popularItemIds });

      // Also update totalOrders on each FoodItem for this restaurant
      const allItems = await Order.aggregate([
        { $match: { restaurant: restaurant._id, status: ORDER_STATUS.DELIVERED } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.foodItem',
            totalOrdered: { $sum: '$items.quantity' },
          },
        },
      ]);

      for (const item of allItems) {
        if (item._id) {
          await import('../models/FoodItem.js').then(({ default: FoodItem }) =>
            FoodItem.findByIdAndUpdate(item._id, { totalOrders: item.totalOrdered })
          );
        }
      }
    } catch (err) {
      console.error(`[PreferenceComputer] Error computing popular items for ${restaurant._id}:`, err.message);
    }
  }
}
