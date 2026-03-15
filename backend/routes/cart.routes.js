import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All cart routes require authentication + customer role + profile
router.use(protect, authorize(ROLES.CUSTOMER), attachProfile('customer'));

router.get('/', getCart);
router.post('/add', addToCart);
router.patch('/update/:itemId', updateCartItem);
router.delete('/remove/:itemId', removeCartItem);
router.delete('/clear', clearCart);

export default router;
