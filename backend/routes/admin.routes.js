import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getAllCustomers,
  getAllDeliveryPartners,
  getAllNGOs,
  getPendingApprovals,
  approveUser,
  rejectUser,
  getAllRestaurants,
  getAllOrders,
  getLiveOrders,
  getOrderHistory,
  toggleUserBan,
  getAllLeftoverClaims,
  deleteUser,
  adminCancelOrder,
  adminUnassignDelivery,
  markDeliveryPayoutPaid,
  markRestaurantPayoutPaid,
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, authorize(ROLES.ADMIN));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users — general
router.get('/users', getAllUsers);
router.get('/users/pending', getPendingApprovals);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/reject', rejectUser);
router.patch('/users/:id/ban', toggleUserBan);
router.delete('/users/:id', deleteUser);

// Users — role-specific views
router.get('/customers', getAllCustomers);
router.get('/delivery-partners', getAllDeliveryPartners);
router.get('/ngos', getAllNGOs);

// Restaurants
router.get('/restaurants', getAllRestaurants);
router.patch('/restaurants/:id/mark-paid', markRestaurantPayoutPaid);

// Payouts
router.patch('/delivery-partners/:id/mark-paid', markDeliveryPayoutPaid);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/live', getLiveOrders);
router.get('/orders/history', getOrderHistory);
router.patch('/orders/:id/cancel', adminCancelOrder);
router.patch('/orders/:id/unassign-delivery', adminUnassignDelivery);

// Leftover Food
router.get('/leftover-claims', getAllLeftoverClaims);

export default router;
