import { Router } from 'express';
import {
  postLeftoverFood,
  getAvailableLeftovers,
  getMyLeftovers,
  deleteLeftover,
} from '../controllers/leftoverFood.controller.js';
import { verifyClaimOtp } from '../controllers/ngo.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Public — anyone can see available leftovers
router.get('/available', getAvailableLeftovers);

// Restaurant posts leftover food
router.post('/', protect, authorize(ROLES.RESTAURANT), postLeftoverFood);
router.get('/my-posts', protect, authorize(ROLES.RESTAURANT), getMyLeftovers);
router.delete('/:id', protect, authorize(ROLES.RESTAURANT), deleteLeftover);

// Restaurant verifies NGO claim OTP at pickup
router.patch('/:id/verify-otp', protect, authorize(ROLES.RESTAURANT), verifyClaimOtp);

export default router;
