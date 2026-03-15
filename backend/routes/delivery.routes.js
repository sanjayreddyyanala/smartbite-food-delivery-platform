import { Router } from 'express';
import {
  getMyProfile,
  updateProfile,
  toggleAvailability,
  updateLocation,
  getCurrentOrder,
  getEarnings,
  getDeliveryHistory,
} from '../controllers/delivery.controller.js';
import {
  getAvailableOrders,
  assignDeliveryPartner,
  verifyDeliveryOtp,
  cancelDeliveryAssignment,
} from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All delivery routes require auth + delivery role + profile
router.use(protect, authorize(ROLES.DELIVERY), attachProfile('delivery'));

// Profile
router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);
router.patch('/toggle-availability', toggleAvailability);
router.patch('/location', updateLocation);

// Orders
router.get('/available-orders', getAvailableOrders);
router.patch('/orders/:id/claim', assignDeliveryPartner);
router.patch('/orders/:id/verify-otp', verifyDeliveryOtp);
router.patch('/orders/:id/cancel-assignment', cancelDeliveryAssignment);
router.get('/current-order', getCurrentOrder);

// Earnings & History
router.get('/earnings', getEarnings);
router.get('/history', getDeliveryHistory);

export default router;
