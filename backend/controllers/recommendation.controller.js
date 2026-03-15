import catchAsync from '../utils/catchAsync.js';
import * as recommendationService from '../services/recommendation.service.js';

// ===== PERSONALIZED RESTAURANTS =====
export const getRecommendedRestaurants = catchAsync(async (req, res) => {
  const { lat, lng } = req.query;
  const userCoords = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;

  const restaurants = await recommendationService.getPersonalizedRestaurants(
    req.profile,
    userCoords,
    parseInt(req.query.limit) || 20
  );

  res.status(200).json({ success: true, restaurants });
});

// ===== PERSONALIZED FOOD ITEMS =====
export const getRecommendedFoods = catchAsync(async (req, res) => {
  const foods = await recommendationService.getPersonalizedFoods(
    req.profile,
    parseInt(req.query.limit) || 20
  );

  res.status(200).json({ success: true, foods });
});

// ===== RECOMMENDED ITEMS WITHIN A RESTAURANT =====
export const getRestaurantRecommendedItems = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;

  const foods = await recommendationService.getRestaurantRecommendedItems(
    req.profile,
    restaurantId,
    parseInt(req.query.limit) || 5
  );

  res.status(200).json({ success: true, foods });
});

// ===== TRENDING (NON-PERSONALIZED) =====
export const getTrending = catchAsync(async (req, res) => {
  const { restaurants, foods } = await recommendationService.getTrending(
    parseInt(req.query.limit) || 10
  );

  res.status(200).json({ success: true, restaurants, foods });
});

// ===== REORDER SUGGESTIONS =====
export const getReorderSuggestions = catchAsync(async (req, res) => {
  const suggestions = await recommendationService.getReorderSuggestions(
    req.profileId,
    parseInt(req.query.limit) || 5
  );

  res.status(200).json({ success: true, suggestions });
});
