import { Router } from 'express';
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/address.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All address routes require authentication + customer role + profile
router.use(protect, authorize(ROLES.CUSTOMER), attachProfile('customer'));

router.get('/', getAddresses);
router.post('/', addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
