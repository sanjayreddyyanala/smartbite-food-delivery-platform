import { Router } from 'express';
import {
  getRestaurantFoods,
  getAllFoods,
  filterFoods,
  addFoodItem,
  updateFoodItem,
  updateQuantity,
  toggleFoodAvailability,
  deleteFoodItem,
} from '../controllers/food.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public routes
router.get('/', getAllFoods);
router.get('/filter', filterFoods);

// Restaurant-scoped food routes (nested under /api/restaurants/:id/foods)
// These are mounted separately in index.js
export const restaurantFoodRouter = Router({ mergeParams: true });

restaurantFoodRouter.get('/', getRestaurantFoods);

restaurantFoodRouter.post(
  '/',
  protect,
  authorize(ROLES.RESTAURANT),
  upload.single('image'),
  addFoodItem
);

restaurantFoodRouter.put(
  '/:foodId',
  protect,
  authorize(ROLES.RESTAURANT),
  upload.single('image'),
  updateFoodItem
);

restaurantFoodRouter.patch(
  '/:foodId/quantity',
  protect,
  authorize(ROLES.RESTAURANT),
  updateQuantity
);

restaurantFoodRouter.patch(
  '/:foodId/toggle',
  protect,
  authorize(ROLES.RESTAURANT),
  toggleFoodAvailability
);

restaurantFoodRouter.delete(
  '/:foodId',
  protect,
  authorize(ROLES.RESTAURANT),
  deleteFoodItem
);

export default router;
