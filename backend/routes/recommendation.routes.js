import { Router } from 'express';
import {
  getRecommendedRestaurants,
  getRecommendedFoods,
  getRestaurantRecommendedItems,
  getTrending,
  getReorderSuggestions,
} from '../controllers/recommendation.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Trending is available to any authenticated user
router.get('/trending', protect, getTrending);

// All personalized routes require customer auth + profile
router.use(protect, authorize(ROLES.CUSTOMER), attachProfile('customer'));

router.get('/restaurants', getRecommendedRestaurants);
router.get('/foods', getRecommendedFoods);
router.get('/restaurants/:restaurantId/foods', getRestaurantRecommendedItems);
router.get('/reorder', getReorderSuggestions);

export default router;
