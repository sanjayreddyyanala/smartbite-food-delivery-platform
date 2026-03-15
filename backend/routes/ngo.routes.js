import { Router } from 'express';
import {
  getMyProfile,
  updateProfile,
  claimLeftoverFood,
  getMyClaims,
} from '../controllers/ngo.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All NGO routes require authentication + NGO role
router.use(protect, authorize(ROLES.NGO));

// Profile
router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);

// Claim food
router.patch('/claim/:id', claimLeftoverFood);
router.get('/my-claims', getMyClaims);

export default router;
