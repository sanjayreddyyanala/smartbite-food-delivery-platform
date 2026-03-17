import GroupOrder from '../models/GroupOrder.js';
import FoodItem from '../models/FoodItem.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';
import Address from '../models/Address.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import calculateDeliveryFee from '../utils/calculateDeliveryFee.js';
import { sendGroupInviteEmail } from '../utils/sendEmail.js';
import getFrontendBaseUrl from '../utils/getFrontendBaseUrl.js';
import { GROUP_ORDER_STATUS, CART_PERMISSION, ORDER_STATUS, NOTIFICATION_TYPES } from '../constants/index.js';
import { emitToGroup } from '../sockets/groupOrder.socket.js';
import { emitNewOrder } from '../sockets/order.socket.js';
import { createNotification, createNotifications } from '../services/notification.service.js';

// Helper: find group by code and check not expired
const findActiveGroup = async (code, next) => {
  // Only find groups that are still actionable (active, locked, or ordered)
  const group = await GroupOrder.findOne({
    code: code.toUpperCase(),
    status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED, GROUP_ORDER_STATUS.ORDERED] },
  });
  if (!group) {
    return next(new AppError('Group order not found', 404));
  }
  // Check expiry
  if (group.expiresAt < new Date() && group.status !== GROUP_ORDER_STATUS.ORDERED) {
    group.status = GROUP_ORDER_STATUS.EXPIRED;
    await group.save();
    return next(new AppError('This group order has expired', 400));
  }
  return group;
};

// Helper: populate group for responses
const populateGroup = (query) =>
  query
    .populate('restaurant', 'name coverImage address isOnline cuisineType')
    .populate('host', 'name email')
    .populate('members.user', 'name email')
    .populate('items.foodItem', 'image isAvailable')
    .populate('order');

// ===== CREATE GROUP ORDER =====
export const createGroupOrder = catchAsync(async (req, res, next) => {
  const { restaurantId, cartPermission, maxMembers } = req.body;

  if (!restaurantId) {
    return next(new AppError('Please provide a restaurantId', 400));
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isOnline) {
    return next(new AppError('Restaurant not found or offline', 400));
  }

  // Check if user already has an active group order (as host or member)
  const existingAsHost = await GroupOrder.findOne({
    host: req.user._id,
    status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED] },
  });
  if (existingAsHost) {
    return next(new AppError('You already have an active group order as host', 400));
  }

  const existingAsMember = await GroupOrder.findOne({
    'members.user': req.user._id,
    status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED] },
  });
  if (existingAsMember) {
    return next(new AppError('You are already a member of an active group order', 400));
  }

  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

  const group = await GroupOrder.createWithRetry({
    host: req.user._id,
    restaurant: restaurantId,
    cartPermission: cartPermission || CART_PERMISSION.OPEN,
    maxMembers: maxMembers || 10,
    expiresAt,
    members: [{ user: req.user._id, name: req.user.name }],
  });

  const populated = await populateGroup(GroupOrder.findById(group._id));

  res.status(201).json({
    success: true,
    code: group.code,
    groupOrder: populated,
  });
});

// ===== GET GROUP ORDER =====
export const getGroupOrder = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  const isMember = group.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return next(new AppError('You are not a member of this group order', 403));
  }

  const populated = await populateGroup(GroupOrder.findById(group._id));

  res.status(200).json({
    success: true,
    groupOrder: populated,
  });
});

// ===== JOIN GROUP ORDER =====
export const joinGroupOrder = catchAsync(async (req, res, next) => {
  const { code } = req.params;
  if (!code) {
    return next(new AppError('Please provide a group code', 400));
  }

  const group = await findActiveGroup(code, next);
  if (!group) return;

  if (group.status !== GROUP_ORDER_STATUS.ACTIVE) {
    return next(new AppError('This group order is not accepting new members', 400));
  }

  // Already a member?
  const alreadyMember = group.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (alreadyMember) {
    // Return the group data so they can enter the room
    const populated = await populateGroup(GroupOrder.findById(group._id));
    return res.status(200).json({
      success: true,
      message: 'Already a member',
      groupOrder: populated,
    });
  }

  // Check max members
  if (group.members.length >= group.maxMembers) {
    return next(new AppError('This group is full', 400));
  }

  group.members.push({ user: req.user._id, name: req.user.name });
  await group.save();

  const populated = await populateGroup(GroupOrder.findById(group._id));

  // Broadcast to room
  emitToGroup(group.code, 'group:member-joined', {
    member: { user: req.user._id, name: req.user.name },
    members: populated.members,
  });

  // Notify host that someone joined
  if (group.host.toString() !== req.user._id.toString()) {
    createNotification(group.host, {
      type: NOTIFICATION_TYPES.GROUP,
      title: '👥 New Member Joined',
      message: `${req.user.name} joined your group order at ${populated.restaurant?.name || 'the restaurant'}.`,
      link: `/group/${group.code}`,
      data: { groupCode: group.code },
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: 'Joined group order successfully',
    groupOrder: populated,
  });
});

// ===== LEAVE GROUP ORDER =====
export const leaveGroupOrder = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  // Host leaving → cancel the whole session
  if (group.host.toString() === req.user._id.toString()) {
    group.status = GROUP_ORDER_STATUS.CANCELLED;
    await group.save();

    emitToGroup(group.code, 'group:cancelled', { message: 'Host has left — session cancelled' });

    return res.status(200).json({
      success: true,
      message: 'Group order cancelled (host left)',
    });
  }

  // Member leaving
  const memberIdx = group.members.findIndex(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (memberIdx === -1) {
    return next(new AppError('You are not a member of this group order', 400));
  }

  group.members.splice(memberIdx, 1);
  // Remove their items
  group.items = group.items.filter(
    (i) => i.addedBy.toString() !== req.user._id.toString()
  );
  await group.save();

  const populated = await populateGroup(GroupOrder.findById(group._id));

  emitToGroup(group.code, 'group:member-left', {
    userId: req.user._id,
    members: populated.members,
    items: populated.items,
  });

  res.status(200).json({
    success: true,
    message: 'You have left the group order',
  });
});

// ===== ADD ITEM =====
export const addItemToGroup = catchAsync(async (req, res, next) => {
  const { foodItemId, quantity } = req.body;

  if (!foodItemId || !quantity || quantity < 1) {
    return next(new AppError('Please provide foodItemId and a valid quantity', 400));
  }

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  // Cart must be active (not locked)
  if (group.status === GROUP_ORDER_STATUS.LOCKED) {
    return next(new AppError('Cart is locked', 400));
  }
  if (group.status !== GROUP_ORDER_STATUS.ACTIVE) {
    return next(new AppError('This group order is not active', 400));
  }

  // Must be a member
  const member = group.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!member) {
    return next(new AppError('You are not a member of this group order', 403));
  }

  // Validate food item
  const foodItem = await FoodItem.findById(foodItemId);
  if (!foodItem) {
    return next(new AppError('Food item not found', 404));
  }
  if (foodItem.restaurant.toString() !== group.restaurant.toString()) {
    return next(new AppError('This food item does not belong to the group restaurant', 400));
  }
  if (!foodItem.isAvailable) {
    return next(new AppError('This food item is currently unavailable', 400));
  }

  // Check if this user already added the same food item
  const existingItem = group.items.find(
    (i) =>
      i.foodItem.toString() === foodItemId &&
      i.addedBy.toString() === req.user._id.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    group.items.push({
      addedBy: req.user._id,
      memberName: member.name,
      foodItem: foodItemId,
      name: foodItem.name,
      price: foodItem.price,
      quantity,
      image: foodItem.image || '',
    });
  }

  await group.save();
  const populated = await populateGroup(GroupOrder.findById(group._id));

  emitToGroup(group.code, 'group:cart-updated', { items: populated.items });

  res.status(200).json({
    success: true,
    groupOrder: populated,
  });
});

// ===== UPDATE ITEM QUANTITY =====
export const updateItemQuantity = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  if (!quantity || quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  // Locked?
  if (group.status === GROUP_ORDER_STATUS.LOCKED) {
    return next(new AppError('Cart is locked', 400));
  }
  if (group.status !== GROUP_ORDER_STATUS.ACTIVE) {
    return next(new AppError('This group order is not active', 400));
  }

  const item = group.items.id(itemId);
  if (!item) {
    return next(new AppError('Item not found in group cart', 404));
  }

  // Permission check
  const isHost = group.host.toString() === req.user._id.toString();
  if (!isHost) {
    if (group.cartPermission === CART_PERMISSION.PERSONAL) {
      if (item.addedBy.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only modify your own items', 403));
      }
    }
  }

  item.quantity = quantity;
  await group.save();
  const populated = await populateGroup(GroupOrder.findById(group._id));

  emitToGroup(group.code, 'group:cart-updated', { items: populated.items });

  res.status(200).json({
    success: true,
    groupOrder: populated,
  });
});

// ===== REMOVE ITEM =====
export const removeItemFromGroup = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  // Locked?
  if (group.status === GROUP_ORDER_STATUS.LOCKED) {
    return next(new AppError('Cart is locked', 400));
  }
  if (group.status !== GROUP_ORDER_STATUS.ACTIVE) {
    return next(new AppError('This group order is not active', 400));
  }

  const item = group.items.id(itemId);
  if (!item) {
    return next(new AppError('Item not found in group cart', 404));
  }

  // Permission check
  const isHost = group.host.toString() === req.user._id.toString();
  if (!isHost) {
    if (group.cartPermission === CART_PERMISSION.PERSONAL) {
      if (item.addedBy.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only modify your own items', 403));
      }
    }
  }

  group.items.pull(itemId);
  await group.save();
  const populated = await populateGroup(GroupOrder.findById(group._id));

  emitToGroup(group.code, 'group:cart-updated', { items: populated.items });

  res.status(200).json({
    success: true,
    groupOrder: populated,
  });
});

// ===== TOGGLE READY =====
export const toggleReady = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  const member = group.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!member) {
    return next(new AppError('You are not a member of this group order', 403));
  }

  member.isReady = !member.isReady;
  await group.save();

  const populated = await populateGroup(GroupOrder.findById(group._id));

  emitToGroup(group.code, 'group:members-updated', { members: populated.members });

  res.status(200).json({
    success: true,
    isReady: member.isReady,
    members: populated.members,
  });
});

// ===== LOCK CART (host only) =====
export const lockCart = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can lock the cart', 403));
  }

  if (group.status !== GROUP_ORDER_STATUS.ACTIVE) {
    return next(new AppError('Group must be active to lock', 400));
  }

  group.status = GROUP_ORDER_STATUS.LOCKED;
  await group.save();

  emitToGroup(group.code, 'group:status-changed', { status: GROUP_ORDER_STATUS.LOCKED });

  res.status(200).json({
    success: true,
    status: GROUP_ORDER_STATUS.LOCKED,
  });
});

// ===== UNLOCK CART (host only) =====
export const unlockCart = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can unlock the cart', 403));
  }

  if (group.status !== GROUP_ORDER_STATUS.LOCKED) {
    return next(new AppError('Cart is not locked', 400));
  }

  group.status = GROUP_ORDER_STATUS.ACTIVE;
  await group.save();

  emitToGroup(group.code, 'group:status-changed', { status: GROUP_ORDER_STATUS.ACTIVE });

  res.status(200).json({
    success: true,
    status: GROUP_ORDER_STATUS.ACTIVE,
  });
});

// ===== KICK MEMBER (host only) =====
export const kickMember = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can kick members', 403));
  }

  if (userId === req.user._id.toString()) {
    return next(new AppError('Host cannot kick themselves', 400));
  }

  const memberIdx = group.members.findIndex(
    (m) => m.user.toString() === userId
  );
  if (memberIdx === -1) {
    return next(new AppError('Member not found in this group', 404));
  }

  group.members.splice(memberIdx, 1);
  // Remove their items
  group.items = group.items.filter(
    (i) => i.addedBy.toString() !== userId
  );
  await group.save();

  const populated = await populateGroup(GroupOrder.findById(group._id));

  // Notify kicked user
  emitToGroup(group.code, 'group:you-were-kicked', { kickedUserId: userId });
  // Update everyone else
  emitToGroup(group.code, 'group:member-left', {
    userId,
    members: populated.members,
    items: populated.items,
  });

  res.status(200).json({
    success: true,
    message: 'Member kicked',
    groupOrder: populated,
  });
});

// ===== PLACE ORDER =====
export const placeGroupOrder = catchAsync(async (req, res, next) => {
  const { addressId, paymentMethod, razorpayOrderId, razorpayPaymentId } = req.body;

  if (!addressId || !paymentMethod) {
    return next(new AppError('Please provide addressId and paymentMethod', 400));
  }

  if (!['cod', 'online'].includes(paymentMethod)) {
    return next(new AppError('Payment method must be cod or online', 400));
  }

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  // Must be a member
  const isMember = group.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return next(new AppError('You are not a member of this group order', 403));
  }

  const isHost = group.host.toString() === req.user._id.toString();

  // Members can only place if all are ready
  if (!isHost) {
    const allReady = group.members.every((m) => m.isReady);
    if (!allReady) {
      return next(new AppError('All members must be ready before placing the order', 400));
    }
  }

  if (![GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED].includes(group.status)) {
    return next(new AppError('Cannot place order — session is not active', 400));
  }

  if (group.items.length === 0) {
    return next(new AppError('The group cart is empty', 400));
  }

  // Validate address
  const address = await Address.findOne({ _id: addressId, customer: req.profileId });
  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  // Get restaurant
  const restaurant = await Restaurant.findById(group.restaurant);
  if (!restaurant || !restaurant.isOnline) {
    return next(new AppError('Restaurant is offline', 400));
  }

  // Combine items for the order (merge same food items)
  const mergedItems = [];
  for (const item of group.items) {
    const existing = mergedItems.find(
      (i) => i.foodItem.toString() === item.foodItem.toString()
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      mergedItems.push({
        foodItem: item.foodItem,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }
  }

  // Atomic stock check & decrement
  for (const item of mergedItems) {
    const result = await FoodItem.findOneAndUpdate(
      { _id: item.foodItem, availableQuantity: { $gte: item.quantity } },
      { $inc: { availableQuantity: -item.quantity } },
      { returnDocument: 'after' }
    );
    if (!result) {
      return next(new AppError(`${item.name} is out of stock or insufficient quantity`, 409));
    }
    if (result.availableQuantity <= 0) {
      result.isAvailable = false;
      await result.save();
    }
  }

  // Calculate fees
  const subtotal = mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = await calculateDeliveryFee(
    restaurant.address?.coordinates,
    address.coordinates
  );
  const totalAmount = subtotal + deliveryFee;

  // Calculate member breakdown
  const memberBreakdown = [];
  for (const member of group.members) {
    const memberItems = group.items.filter(
      (i) => i.addedBy.toString() === member.user.toString()
    );
    const itemsTotal = memberItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFeeShare = subtotal > 0 ? (itemsTotal / subtotal) * deliveryFee : 0;
    memberBreakdown.push({
      user: member.user,
      name: member.name,
      itemsTotal: Math.round(itemsTotal * 100) / 100,
      deliveryFeeShare: Math.round(deliveryFeeShare * 100) / 100,
      totalShare: Math.round((itemsTotal + deliveryFeeShare) * 100) / 100,
    });
  }

  // Create order
  const order = await Order.create({
    customer: req.profileId,
    restaurant: group.restaurant,
    items: mergedItems.map((i) => ({
      foodItem: i.foodItem,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    deliveryAddress: {
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      coordinates: address.coordinates,
    },
    status: ORDER_STATUS.PLACED,
    paymentMethod,
    paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
    razorpayOrderId: razorpayOrderId || null,
    razorpayPaymentId: razorpayPaymentId || null,
    subtotal,
    deliveryFee,
    totalAmount,
    groupOrder: group._id,
    isGroupOrder: true,
    memberBreakdown,
    placedAt: new Date(),
  });

  // Update group
  group.status = GROUP_ORDER_STATUS.ORDERED;
  group.order = order._id;
  group.placedBy = req.user._id;
  group.deliveryAddress = {
    street: address.street,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    coordinates: address.coordinates,
  };
  await group.save();

  // Emit events
  emitToGroup(group.code, 'group:order-placed', { order });
  emitNewOrder(order.restaurant.toString(), order);

  // Notify all group members
  const memberUserIds = group.members.map(m => m.user);
  createNotifications(memberUserIds, {
    type: NOTIFICATION_TYPES.ORDER,
    title: '🎉 Group Order Placed!',
    message: `Your group order from ${restaurant.name} has been placed successfully.`,
    link: `/orders/${order._id}`,
    data: { orderId: order._id },
  }).catch(() => {});

  // Notify restaurant owner
  createNotification(restaurant.owner, {
    type: NOTIFICATION_TYPES.ORDER,
    title: '🔔 New Group Order',
    message: `A group order #${order._id.toString().slice(-6).toUpperCase()} has been placed at your restaurant.`,
    link: '/restaurant/orders',
    data: { orderId: order._id },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Group order placed successfully',
    order,
    groupOrder: group,
  });
});

// ===== CANCEL GROUP ORDER (host only) =====
export const cancelGroupOrder = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can cancel the group order', 403));
  }

  if (![GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED].includes(group.status)) {
    return next(new AppError('Cannot cancel — order already placed or expired', 400));
  }

  group.status = GROUP_ORDER_STATUS.CANCELLED;
  await group.save();

  emitToGroup(group.code, 'group:cancelled', { message: 'Session cancelled by host' });

  // Notify all members (excluding host)
  const memberUserIds = group.members
    .filter(m => m.user.toString() !== req.user._id.toString())
    .map(m => m.user);
  if (memberUserIds.length > 0) {
    createNotifications(memberUserIds, {
      type: NOTIFICATION_TYPES.WARNING,
      title: '❌ Group Order Cancelled',
      message: 'The host has cancelled the group order session.',
      data: { groupCode: group.code },
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: 'Group order cancelled',
  });
});

// ===== CHANGE CART PERMISSION (host only) =====
export const changePermission = catchAsync(async (req, res, next) => {
  const { cartPermission } = req.body;

  if (!cartPermission || ![CART_PERMISSION.OPEN, CART_PERMISSION.PERSONAL].includes(cartPermission)) {
    return next(new AppError('Please provide a valid cartPermission (open or personal)', 400));
  }

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can change cart permission', 403));
  }

  if (![GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED].includes(group.status)) {
    return next(new AppError('Cannot change permission — session is not active', 400));
  }

  group.cartPermission = cartPermission;
  await group.save();

  const populated = await populateGroup(GroupOrder.findById(group._id));
  emitToGroup(group.code, 'group:permission-changed', { cartPermission, groupOrder: populated });

  res.status(200).json({
    success: true,
    cartPermission: group.cartPermission,
    groupOrder: populated,
  });
});

// ===== CHANGE RESTAURANT (host only) =====
export const changeRestaurant = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.body;

  if (!restaurantId) {
    return next(new AppError('Please provide a restaurantId', 400));
  }

  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can change the restaurant', 403));
  }

  if (![GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED].includes(group.status)) {
    return next(new AppError('Cannot change restaurant — session is not active', 400));
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isOnline) {
    return next(new AppError('Restaurant not found or offline', 400));
  }

  // If already the same restaurant, no-op
  if (group.restaurant.toString() === restaurantId) {
    return res.status(200).json({ success: true, message: 'Same restaurant', groupOrder: group });
  }

  // Change restaurant and clear entire cart
  group.restaurant = restaurantId;
  group.items = [];
  await group.save();

  const populated = await populateGroup(GroupOrder.findById(group._id));

  emitToGroup(group.code, 'group:restaurant-changed', {
    restaurant: populated.restaurant,
    items: [],
  });

  res.status(200).json({
    success: true,
    message: 'Restaurant changed — cart cleared',
    groupOrder: populated,
  });
});

// ===== GET MY GROUP ORDERS =====
export const getMyGroupOrders = catchAsync(async (req, res, next) => {
  const groupOrders = await GroupOrder.find({
    'members.user': req.user._id,
  })
    .populate('restaurant', 'name coverImage')
    .populate('host', 'name')
    .populate('order', 'status')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: groupOrders.length,
    groupOrders,
  });
});

// ===== INVITE BY EMAIL =====
export const inviteByEmail = catchAsync(async (req, res, next) => {
  const group = await findActiveGroup(req.params.code, next);
  if (!group) return;

  // Only host can invite
  if (group.host.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the host can send invitations', 403));
  }

  const { email, emails } = req.body;
  const emailList = emails || (email ? [email] : []);

  if (emailList.length === 0) {
    return next(new AppError('Please provide at least one email', 400));
  }

  const results = [];
  const hostName = req.user.name || 'Someone';
  const restaurantName = group.restaurant ? (await Restaurant.findById(group.restaurant))?.name : '';
  const frontendUrl = getFrontendBaseUrl(req);
  const joinLink = `${frontendUrl}/group/join/${group.code}`;

  for (const inviteeEmail of emailList) {
    try {
      // Check if user exists
      const user = await User.findOne({ email: inviteeEmail.trim().toLowerCase() });
      if (!user) {
        results.push({ email: inviteeEmail, status: 'failed', reason: 'User not registered' });
        continue;
      }
      if (user.role !== 'customer') {
        results.push({ email: inviteeEmail, status: 'failed', reason: 'User is not a customer' });
        continue;
      }
      // Check if already a member
      const isMember = group.members.some(m => m.user.toString() === user._id.toString());
      if (isMember) {
        results.push({ email: inviteeEmail, status: 'skipped', reason: 'Already a member' });
        continue;
      }

      try {
        await sendGroupInviteEmail(inviteeEmail, hostName, restaurantName, joinLink);
        results.push({ email: inviteeEmail, status: 'sent' });
      } catch {
        results.push({ email: inviteeEmail, status: 'failed', reason: 'Email delivery failed' });
      }
    } catch {
      results.push({ email: inviteeEmail, status: 'failed', reason: 'Email delivery failed' });
    }
  }

  res.status(200).json({
    success: true,
    message: `Invitations processed`,
    results,
  });
});
