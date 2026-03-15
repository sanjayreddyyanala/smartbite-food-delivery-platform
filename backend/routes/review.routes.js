import { Router } from 'express';
import {
  submitReview,
  getRestaurantReviews,
  getMyReviews,
  getOrderReviewStatus,
} from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(protect);

// Customer routes
router.post('/', authorize(ROLES.CUSTOMER), attachProfile('customer'), submitReview);
router.get('/my', authorize(ROLES.CUSTOMER), attachProfile('customer'), getMyReviews);
router.get('/order/:orderId', authorize(ROLES.CUSTOMER), attachProfile('customer'), getOrderReviewStatus);

// Public (any authenticated user can view restaurant reviews)
router.get('/restaurant/:restaurantId', getRestaurantReviews);

export default router;
