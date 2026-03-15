import { Router } from 'express';
import {
  createGroupOrder,
  getGroupOrder,
  joinGroupOrder,
  leaveGroupOrder,
  addItemToGroup,
  updateItemQuantity,
  removeItemFromGroup,
  toggleReady,
  lockCart,
  unlockCart,
  kickMember,
  placeGroupOrder,
  cancelGroupOrder,
  changePermission,
  changeRestaurant,
  getMyGroupOrders,
  inviteByEmail,
} from '../controllers/groupOrder.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { attachProfile } from '../middleware/profile.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All group order routes require auth + customer role + profile
router.use(protect, authorize(ROLES.CUSTOMER), attachProfile('customer'));

router.post('/', createGroupOrder);
router.get('/my-groups', getMyGroupOrders);
router.get('/:code', getGroupOrder);
router.post('/:code/join', joinGroupOrder);
router.post('/:code/leave', leaveGroupOrder);
router.post('/:code/add-item', addItemToGroup);
router.patch('/:code/update-item/:itemId', updateItemQuantity);
router.delete('/:code/remove-item/:itemId', removeItemFromGroup);
router.patch('/:code/ready', toggleReady);
router.patch('/:code/lock', lockCart);
router.patch('/:code/unlock', unlockCart);
router.patch('/:code/kick/:userId', kickMember);
router.patch('/:code/permission', changePermission);
router.patch('/:code/restaurant', changeRestaurant);
router.post('/:code/invite', inviteByEmail);
router.post('/:code/place-order', placeGroupOrder);
router.delete('/:code', cancelGroupOrder);

export default router;
