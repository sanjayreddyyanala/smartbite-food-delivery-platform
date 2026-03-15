import { Router } from 'express';
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  getMyRestaurant,
  updateRestaurant,
  toggleOnline,
  uploadImages,
  deleteImage,
  globalSearch,
  getRestaurantEarnings,
  getRestaurantCategories,
  updateRestaurantCategories,
} from '../controllers/restaurant.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public routes
router.get('/search', globalSearch);
router.get('/', getRestaurants);
router.get('/my', protect, authorize(ROLES.RESTAURANT), getMyRestaurant);
router.get('/earnings', protect, authorize(ROLES.RESTAURANT), getRestaurantEarnings);
router.get('/:id/categories', getRestaurantCategories);
router.put('/:id/categories', protect, authorize(ROLES.RESTAURANT), updateRestaurantCategories);
router.get('/:id', getRestaurantById);

// Protected routes (restaurant owner only)
router.post(
  '/',
  protect,
  authorize(ROLES.RESTAURANT),
  upload.single('coverImage'),
  createRestaurant
);

router.put(
  '/:id',
  protect,
  authorize(ROLES.RESTAURANT),
  upload.single('coverImage'),
  updateRestaurant
);

router.patch(
  '/:id/toggle',
  protect,
  authorize(ROLES.RESTAURANT),
  toggleOnline
);

// Gallery image routes
router.post(
  '/:id/images',
  protect,
  authorize(ROLES.RESTAURANT),
  upload.array('images', 10),
  uploadImages
);

router.delete(
  '/:id/images',
  protect,
  authorize(ROLES.RESTAURANT),
  deleteImage
);

export default router;
