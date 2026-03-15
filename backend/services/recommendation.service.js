import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import FoodItem from '../models/FoodItem.js';
import { ORDER_STATUS, RECOMMENDATION_WEIGHTS, COLD_START_ORDER_THRESHOLD, TRENDING_WINDOW_HOURS } from '../constants/index.js';

/**
 * Haversine formula — straight-line distance between two lat/lng points in km.
 */
function haversineDistance(coord1, coord2) {
  const R = 6371;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Normalize a value to 0-1 range.
 */
function normalize(value, max) {
  if (max <= 0) return 0;
  return Math.min(value / max, 1);
}

/**
 * Get personalized restaurant recommendations for a customer.
 */
export async function getPersonalizedRestaurants(customerProfile, userCoords = null, limit = 20) {
  const preferences = customerProfile.preferences || {};
  const orderCount = await Order.countDocuments({
    customer: customerProfile._id,
    status: ORDER_STATUS.DELIVERED,
  });

  const restaurants = await Restaurant.find({
    status: 'approved',
    isOnline: true,
  }).lean();

  if (restaurants.length === 0) return [];

  // Get max values for normalization
  const maxRatings = Math.max(...restaurants.map((r) => r.totalRatings || 0), 1);
  const maxRating = 5;

  const w = RECOMMENDATION_WEIGHTS.restaurant;
  const usePersonalized = orderCount >= COLD_START_ORDER_THRESHOLD;
  // Alpha blends personalized vs trending: 0 = all trending, 1 = all personalized
  const alpha = usePersonalized ? Math.min((orderCount - COLD_START_ORDER_THRESHOLD) / 10 + 0.5, 1) : 0;

  const favCuisineSet = new Map(
    (preferences.favoriteCuisines || []).map((c) => [c.cuisine, c.score])
  );
  const maxCuisineScore = Math.max(...(preferences.favoriteCuisines || []).map((c) => c.score), 1);
  const orderFreq = preferences.orderFrequency || new Map();

  const scored = restaurants.map((restaurant) => {
    // Cuisine match
    let cuisineScore = 0;
    if (restaurant.cuisineType && favCuisineSet.size > 0) {
      for (const cuisine of restaurant.cuisineType) {
        if (favCuisineSet.has(cuisine)) {
          cuisineScore += favCuisineSet.get(cuisine) / maxCuisineScore;
        }
      }
      cuisineScore = Math.min(cuisineScore / restaurant.cuisineType.length, 1);
    }

    // Rating score
    const ratingScore = (restaurant.avgRating || 0) / maxRating;

    // Popularity score
    const popularityScore = normalize(restaurant.totalRatings || 0, maxRatings);

    // Proximity score (inverse distance, capped at 20km)
    let proximityScore = 0.5; // default when no coords
    if (userCoords && restaurant.address?.coordinates?.lat) {
      const dist = haversineDistance(userCoords, restaurant.address.coordinates);
      proximityScore = Math.max(0, 1 - dist / 20);
    }

    // Reorder bonus
    const restId = String(restaurant._id);
    const freq = (orderFreq instanceof Map ? orderFreq.get(restId) : orderFreq[restId]) || 0;
    const reorderScore = Math.min(freq / 5, 1); // caps at 5 orders

    // Time relevance (is restaurant currently open?)
    const timeRelevance = restaurant.isOnline ? 1 : 0;

    // Personalized score
    const personalizedScore =
      w.cuisineMatch * cuisineScore +
      w.rating * ratingScore +
      w.popularity * popularityScore +
      w.proximity * proximityScore +
      w.reorderBonus * reorderScore +
      w.timeRelevance * timeRelevance;

    // Trending score (no personalization)
    const trendingScore =
      0.35 * ratingScore +
      0.3 * popularityScore +
      0.2 * proximityScore +
      0.15 * timeRelevance;

    const finalScore = alpha * personalizedScore + (1 - alpha) * trendingScore;

    // Build "reason" tag
    let reason = null;
    if (usePersonalized) {
      if (reorderScore > 0.3) {
        reason = 'Ordered before';
      } else if (cuisineScore > 0.5 && restaurant.cuisineType?.length > 0) {
        const matchedCuisine = restaurant.cuisineType.find((c) => favCuisineSet.has(c));
        reason = matchedCuisine ? `Because you like ${matchedCuisine}` : null;
      } else if (ratingScore > 0.8) {
        reason = 'Highly rated';
      }
    } else {
      if (ratingScore > 0.8) reason = 'Highly rated';
      else if (popularityScore > 0.5) reason = 'Popular';
    }

    return { ...restaurant, score: finalScore, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get personalized food item recommendations across all restaurants.
 */
export async function getPersonalizedFoods(customerProfile, limit = 20) {
  const preferences = customerProfile.preferences || {};
  const orderCount = await Order.countDocuments({
    customer: customerProfile._id,
    status: ORDER_STATUS.DELIVERED,
  });

  const foods = await FoodItem.find({ isAvailable: true })
    .populate('restaurant', 'name isOnline status cuisineType')
    .lean();

  // Only show items from approved, online restaurants
  const availableFoods = foods.filter(
    (f) => f.restaurant?.status === 'approved' && f.restaurant?.isOnline
  );

  if (availableFoods.length === 0) return [];

  const w = RECOMMENDATION_WEIGHTS.food;
  const usePersonalized = orderCount >= COLD_START_ORDER_THRESHOLD;
  const alpha = usePersonalized ? Math.min((orderCount - COLD_START_ORDER_THRESHOLD) / 10 + 0.5, 1) : 0;

  const favCategoryMap = new Map(
    (preferences.favoriteCategories || []).map((c) => [c.category, c.score])
  );
  const maxCategoryScore = Math.max(...(preferences.favoriteCategories || []).map((c) => c.score), 1);
  const priceRange = preferences.priceRange || { min: 0, max: 0, avg: 0 };
  const orderFreq = preferences.orderFrequency || new Map();
  const maxOrders = Math.max(...availableFoods.map((f) => f.totalOrders || 0), 1);

  const scored = availableFoods.map((food) => {
    // Category match
    const categoryScore = favCategoryMap.has(food.category)
      ? favCategoryMap.get(food.category) / maxCategoryScore
      : 0;

    // Veg match
    const vegScore = preferences.isVegPreferred
      ? food.isVeg ? 1 : 0.2
      : 0.5;

    // Price match (how close to user's avg price range)
    let priceScore = 0.5;
    if (priceRange.avg > 0) {
      const diff = Math.abs(food.price - priceRange.avg);
      priceScore = Math.max(0, 1 - diff / priceRange.avg);
    }

    // Item rating
    const itemRating = (food.avgRating || 0) / 5;

    // Item popularity
    const itemPopularity = normalize(food.totalOrders || 0, maxOrders);

    // Restaurant affinity
    const restId = String(food.restaurant._id);
    const freq = (orderFreq instanceof Map ? orderFreq.get(restId) : orderFreq[restId]) || 0;
    const restaurantAffinity = Math.min(freq / 5, 1);

    const personalizedScore =
      w.categoryMatch * categoryScore +
      w.vegMatch * vegScore +
      w.priceMatch * priceScore +
      w.itemRating * itemRating +
      w.itemPopularity * itemPopularity +
      w.restaurantAffinity * restaurantAffinity;

    const trendingScore =
      0.35 * itemRating +
      0.35 * itemPopularity +
      0.3 * 0.5; // neutral base

    const finalScore = alpha * personalizedScore + (1 - alpha) * trendingScore;

    return { ...food, score: finalScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get recommended food items within a specific restaurant for a customer.
 */
export async function getRestaurantRecommendedItems(customerProfile, restaurantId, limit = 5) {
  const preferences = customerProfile.preferences || {};

  const foods = await FoodItem.find({
    restaurant: restaurantId,
    isAvailable: true,
  }).lean();

  if (foods.length === 0) return [];

  const favCategoryMap = new Map(
    (preferences.favoriteCategories || []).map((c) => [c.category, c.score])
  );
  const maxCategoryScore = Math.max(...(preferences.favoriteCategories || []).map((c) => c.score), 1);

  const scored = foods.map((food) => {
    const categoryScore = favCategoryMap.has(food.category)
      ? favCategoryMap.get(food.category) / maxCategoryScore
      : 0;
    const vegScore = preferences.isVegPreferred ? (food.isVeg ? 1 : 0.2) : 0.5;
    const ratingScore = (food.avgRating || 0) / 5;
    const popularityScore = (food.totalOrders || 0) > 0 ? 1 : 0;

    const score = 0.3 * categoryScore + 0.2 * vegScore + 0.3 * ratingScore + 0.2 * popularityScore;

    return { ...food, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get trending restaurants and food items (non-personalized).
 */
export async function getTrending(limit = 10) {
  const since = new Date(Date.now() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);

  // Trending restaurants: most orders in the window
  const trendingRestaurants = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] } } },
    { $group: { _id: '$restaurant', orderCount: { $sum: 1 } } },
    { $sort: { orderCount: -1 } },
    { $limit: limit },
  ]);

  const restaurantIds = trendingRestaurants.map((r) => r._id);
  const restaurants = await Restaurant.find({
    _id: { $in: restaurantIds },
    status: 'approved',
    isOnline: true,
  }).lean();

  // Preserve order
  const restaurantMap = new Map(restaurants.map((r) => [String(r._id), r]));
  const orderedRestaurants = restaurantIds
    .map((id) => restaurantMap.get(String(id)))
    .filter(Boolean);

  // Trending food items: most ordered in the window
  const trendingFoods = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.foodItem', totalOrdered: { $sum: '$items.quantity' } } },
    { $sort: { totalOrdered: -1 } },
    { $limit: limit },
  ]);

  const foodIds = trendingFoods.map((f) => f._id);
  const foods = await FoodItem.find({
    _id: { $in: foodIds },
    isAvailable: true,
  })
    .populate('restaurant', 'name isOnline status')
    .lean();

  const onlineFoods = foods.filter(
    (f) => f.restaurant?.status === 'approved' && f.restaurant?.isOnline
  );

  return { restaurants: orderedRestaurants, foods: onlineFoods };
}

/**
 * Get reorder suggestions: recent delivered orders with item details.
 */
export async function getReorderSuggestions(customerProfileId, limit = 5) {
  const orders = await Order.find({
    customer: customerProfileId,
    status: ORDER_STATUS.DELIVERED,
  })
    .populate('restaurant', 'name coverImage isOnline status')
    .sort({ deliveredAt: -1 })
    .limit(limit * 2) // fetch more to deduplicate by restaurant
    .lean();

  // Deduplicate by restaurant — one suggestion per restaurant
  const seen = new Set();
  const suggestions = [];

  for (const order of orders) {
    if (!order.restaurant || order.restaurant.status !== 'approved') continue;
    const restId = String(order.restaurant._id);
    if (seen.has(restId)) continue;
    seen.add(restId);
    suggestions.push({
      orderId: order._id,
      restaurant: order.restaurant,
      items: order.items,
      totalAmount: order.totalAmount,
      deliveredAt: order.deliveredAt,
    });
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}
