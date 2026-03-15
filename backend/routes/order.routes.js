import { Router } from 'express';
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  verifyPickupCode,
  verifyDeliveryOtp,
  getRestaurantLiveOrders,
  getRestaurantOrderHistory,
  getAvailableOrders,
  assignDeliveryPartner,
  getDeliveryFeePreview,
  cancelOrder,
} from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All order routes require authentication
router.use(protect);

// Customer routes
router.get('/delivery-fee-preview', authorize(ROLES.CUSTOMER), attachProfile('customer'), getDeliveryFeePreview);
router.post('/', authorize(ROLES.CUSTOMER), attachProfile('customer'), placeOrder);
router.get('/my-orders', authorize(ROLES.CUSTOMER), attachProfile('customer'), getMyOrders);
router.patch('/:id/cancel', authorize(ROLES.CUSTOMER), attachProfile('customer'), cancelOrder);

// Restaurant routes
router.get('/restaurant/live', authorize(ROLES.RESTAURANT), getRestaurantLiveOrders);
router.get('/restaurant/history', authorize(ROLES.RESTAURANT), getRestaurantOrderHistory);
router.patch('/:id/status', authorize(ROLES.RESTAURANT), updateOrderStatus);
router.patch('/:id/verify-pickup-code', authorize(ROLES.RESTAURANT), verifyPickupCode);

// Delivery routes
router.get('/delivery/available', authorize(ROLES.DELIVERY), getAvailableOrders);
router.patch('/:id/assign', authorize(ROLES.DELIVERY), attachProfile('delivery'), assignDeliveryPartner);
router.patch('/:id/verify-delivery-otp', authorize(ROLES.DELIVERY), attachProfile('delivery'), verifyDeliveryOtp);

// Shared (multi-role access handled in controller)
router.get('/:id', getOrderById);

export default router;
