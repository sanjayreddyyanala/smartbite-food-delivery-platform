import bcrypt from 'bcryptjs';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import FoodItem from '../models/FoodItem.js';
import Restaurant from '../models/Restaurant.js';
import Address from '../models/Address.js';
import DeliveryProfile from '../models/DeliveryProfile.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import calculateDeliveryFee from '../utils/calculateDeliveryFee.js';
import generateOtp from '../utils/generateOtp.js';
import { sendDeliveryOtpEmail, sendOrderStatusEmail } from '../utils/sendEmail.js';
import CustomerProfile from '../models/CustomerProfile.js';
import { ORDER_STATUS, OTP_EXPIRY_DELIVERY_MINS, CANCELLABLE_BEFORE_STATUS, NOTIFICATION_TYPES } from '../constants/index.js';
import { emitNewOrder, emitOrderStatusChanged, emitAvailableOrdersUpdate } from '../sockets/order.socket.js';
import { getIO } from '../config/socket.js';
import { computePreferences } from '../services/preferenceComputer.js';
import { createNotification } from '../services/notification.service.js';

// ===== DELIVERY FEE PREVIEW =====
export const getDeliveryFeePreview = catchAsync(async (req, res, next) => {
  const { restaurantId, addressId } = req.query;

  if (!restaurantId || !addressId) {
    return next(new AppError('restaurantId and addressId are required', 400));
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const address = await Address.findOne({ _id: addressId, customer: req.profileId });
  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  const restaurantCoords = restaurant.address?.coordinates;
  const deliveryCoords = address.coordinates;

  if (!restaurantCoords?.lat || !restaurantCoords?.lng || !deliveryCoords?.lat || !deliveryCoords?.lng) {
    // If coordinates missing, return base fee
    const { DELIVERY_BASE_FEE } = await import('../constants/index.js');
    return res.status(200).json({
      success: true,
      deliveryFee: DELIVERY_BASE_FEE,
      distance: null,
      note: 'Coordinates unavailable — showing base fee',
    });
  }

  const deliveryFee = await calculateDeliveryFee(restaurantCoords, deliveryCoords);

  res.status(200).json({
    success: true,
    deliveryFee,
  });
});

// ===== PLACE ORDER =====
export const placeOrder = catchAsync(async (req, res, next) => {
  const { addressId, paymentMethod, razorpayOrderId, razorpayPaymentId } = req.body;

  if (!addressId || !paymentMethod) {
    return next(new AppError('Please provide addressId and paymentMethod', 400));
  }

  if (!['cod', 'online'].includes(paymentMethod)) {
    return next(new AppError('Payment method must be cod or online', 400));
  }

  // Get customer's cart
  const cart = await Cart.findOne({ customer: req.profileId });
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Your cart is empty', 400));
  }

  // Get delivery address
  const address = await Address.findOne({ _id: addressId, customer: req.profileId });
  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  // Get restaurant
  const restaurant = await Restaurant.findById(cart.restaurant);
  if (!restaurant || !restaurant.isOnline) {
    return next(new AppError('Restaurant is currently offline', 400));
  }

  // DB-level quantity check for each item (handles race conditions)
  const quantityErrors = [];
  for (const cartItem of cart.items) {
    const foodItem = await FoodItem.findById(cartItem.foodItem);
    if (!foodItem) {
      quantityErrors.push(`${cartItem.name} is no longer available`);
      continue;
    }
    if (!foodItem.isAvailable) {
      quantityErrors.push(`${cartItem.name} is currently unavailable`);
      continue;
    }
    if (foodItem.availableQuantity < cartItem.quantity) {
      quantityErrors.push(
        `${cartItem.name}: only ${foodItem.availableQuantity} available, you requested ${cartItem.quantity}`
      );
    }
  }

  if (quantityErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Some items have insufficient quantity',
      errors: quantityErrors,
    });
  }

  // Atomically decrement quantities
  for (const cartItem of cart.items) {
    const result = await FoodItem.findOneAndUpdate(
      {
        _id: cartItem.foodItem,
        availableQuantity: { $gte: cartItem.quantity },
      },
      {
        $inc: { availableQuantity: -cartItem.quantity },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return next(new AppError(`Race condition: ${cartItem.name} ran out of stock`, 409));
    }

    // Auto-set isAvailable to false if quantity hits 0
    if (result.availableQuantity <= 0) {
      result.isAvailable = false;
      await result.save();
    }
  }

  // Calculate delivery fee
  const deliveryFee = await calculateDeliveryFee(
    restaurant.address.coordinates,
    address.coordinates
  );

  // Calculate subtotal
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalAmount = subtotal + deliveryFee;

  // Determine payment status
  const paymentStatus = paymentMethod === 'online' ? 'paid' : 'pending';

  // Create order
  const order = await Order.create({
    customer: req.profileId,
    restaurant: cart.restaurant,
    items: cart.items.map((item) => ({
      foodItem: item.foodItem,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      cookingInstructions: item.cookingInstructions || '',
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
    paymentStatus,
    razorpayOrderId: razorpayOrderId || null,
    razorpayPaymentId: razorpayPaymentId || null,
    subtotal,
    deliveryFee,
    totalAmount,
    placedAt: new Date(),
  });

  // Clear cart after order
  cart.items = [];
  cart.restaurant = null;
  await cart.save();

  // Emit new order event to restaurant
  emitNewOrder(order.restaurant.toString(), order);

  // Notify restaurant owner
  createNotification(restaurant.owner, {
    type: NOTIFICATION_TYPES.ORDER,
    title: '🔔 New Order Received',
    message: `Order #${order._id.toString().slice(-6).toUpperCase()} has been placed at your restaurant.`,
    link: '/restaurant/orders',
    data: { orderId: order._id },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    order,
  });
});

// ===== GET CUSTOMER ORDERS =====
export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ customer: req.profileId, isGroupOrder: { $ne: true } })
    .populate('restaurant', 'name coverImage')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// ===== GET SINGLE ORDER =====
export const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('restaurant', 'name coverImage address phone')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } })
    .populate({ path: 'deliveryPartner', populate: { path: 'user', select: 'name email' } });

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Auto-expire delivery OTP if past time and unassign the delivery partner
  if (order.status === ORDER_STATUS.PICKED_UP && order.deliveryOtpExpiresAt && new Date() > order.deliveryOtpExpiresAt) {
    order.status = ORDER_STATUS.READY;
    const oldPartnerId = order.deliveryPartner?._id || order.deliveryPartner;
    
    order.deliveryPartner = null;
    order.deliveryOtp = null;
    order.deliveryOtpPlain = null;
    order.deliveryOtpExpiresAt = null;
    order.pickedUpAt = null;
    await order.save();

    if (oldPartnerId) {
      const DeliveryProfile = (await import('../models/DeliveryProfile.js')).default;
      await DeliveryProfile.findByIdAndUpdate(oldPartnerId, { currentOrder: null, isAvailable: true });
    }
    
    emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.READY);
    emitAvailableOrdersUpdate();
  }

  // Check access: customer, restaurant owner, delivery partner, or admin
  let isAuthorized = false;
  const isAdmin = req.user.role === 'admin';

  if (req.user.role === 'customer') {
    const CustomerProfile = (await import('../models/CustomerProfile.js')).default;
    const profile = await CustomerProfile.findOne({ user: req.user._id });
    isAuthorized = profile && order.customer._id.toString() === profile._id.toString();
  } else if (req.user.role === 'delivery') {
    const profile = await DeliveryProfile.findOne({ user: req.user._id });
    isAuthorized = order.deliveryPartner && profile && order.deliveryPartner._id.toString() === profile._id.toString();
  } else if (req.user.role === 'restaurant') {
    const restaurant = await Restaurant.findById(order.restaurant._id);
    isAuthorized = restaurant && restaurant.owner.toString() === req.user._id.toString();
  }

  if (!isAuthorized && !isAdmin) {
    return next(new AppError('Not authorized to view this order', 403));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// ===== UPDATE ORDER STATUS (restaurant) =====
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Verify restaurant owner
  const restaurant = await Restaurant.findById(order.restaurant);
  if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this order', 403));
  }

  // Validate status transitions
  const validTransitions = {
    [ORDER_STATUS.PLACED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED],
    [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY],
  };

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(status)) {
    return next(
      new AppError(`Cannot change status from '${order.status}' to '${status}'`, 400)
    );
  }

  order.status = status;

  // Set event timestamps
  const now = new Date();
  if (status === ORDER_STATUS.ACCEPTED) order.acceptedAt = now;
  if (status === ORDER_STATUS.PREPARING) order.preparingAt = now;
  if (status === ORDER_STATUS.READY) order.readyAt = now;
  if (status === ORDER_STATUS.REJECTED) order.rejectedAt = now;

  await order.save();

  // Emit status change to order room
  emitOrderStatusChanged(order._id.toString(), status);
  if (status === ORDER_STATUS.READY) {
    emitAvailableOrdersUpdate();
  }

  // Notify customer of status change
  const customerStatusMessages = {
    [ORDER_STATUS.ACCEPTED]:  { title: '✅ Order Accepted',          message: `${restaurant.name} accepted your order! It will be prepared shortly.` },
    [ORDER_STATUS.REJECTED]:  { title: '❌ Order Rejected',          message: `Unfortunately ${restaurant.name} could not accept your order.` },
    [ORDER_STATUS.PREPARING]: { title: '👨‍🍳 Being Prepared',         message: `${restaurant.name} is now cooking your order.` },
    [ORDER_STATUS.READY]:     { title: '📦 Ready for Pickup',        message: 'Your order is ready and waiting for a delivery partner.' },
  };
  const notifPayload = customerStatusMessages[status];
  if (notifPayload) {
    try {
      const cp = await CustomerProfile.findById(order.customer).select('user');
      if (cp?.user) {
        createNotification(cp.user, {
          type: status === ORDER_STATUS.REJECTED ? NOTIFICATION_TYPES.WARNING : NOTIFICATION_TYPES.ORDER,
          ...notifPayload,
          link: `/orders/${order._id}`,
          data: { orderId: order._id },
        }).catch(() => {});
      }
    } catch { /* non-blocking */ }
  }

  // Send email to customer on accepted
  if (status === ORDER_STATUS.ACCEPTED) {
    try {
      const customerProfile = await CustomerProfile.findById(order.customer).populate('user', 'name email');
      if (customerProfile?.user?.email) {
        sendOrderStatusEmail(customerProfile.user.email, customerProfile.user.name, order._id, restaurant.name, 'accepted').catch(e => console.error('Status email failed:', e.message));
      }
    } catch (e) { console.error('Could not send status email:', e.message); }
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// ===== VERIFY DELIVERY OTP =====
export const verifyDeliveryOtp = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status !== ORDER_STATUS.PICKED_UP) {
    return next(new AppError('Order must be in picked_up status to verify OTP', 400));
  }

  // Check delivery partner
  if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.profileId.toString()) {
    return next(new AppError('Not authorized — you are not the assigned delivery partner', 403));
  }

  // Check OTP expiry
  if (!order.deliveryOtp || !order.deliveryOtpExpiresAt) {
    return next(new AppError('No delivery OTP found for this order', 400));
  }

  if (new Date() > order.deliveryOtpExpiresAt) {
    // Unassign delivery partner
    order.status = ORDER_STATUS.READY;
    order.deliveryPartner = null;
    order.deliveryOtp = null;
    order.deliveryOtpPlain = null;
    order.deliveryOtpExpiresAt = null;
    order.pickedUpAt = null;
    await order.save();

    const DeliveryProfile = (await import('../models/DeliveryProfile.js')).default;
    await DeliveryProfile.findByIdAndUpdate(req.profileId, { currentOrder: null, isAvailable: true });
    
    emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.READY);
    emitAvailableOrdersUpdate();

    return next(new AppError('Delivery OTP has expired. The order has been unassigned.', 400));
  }

  // Verify OTP hash
  const isValid = await bcrypt.compare(otp, order.deliveryOtp);
  if (!isValid) {
    return next(new AppError('Invalid OTP', 400));
  }

  // Mark as delivered
  order.status = ORDER_STATUS.DELIVERED;
  order.deliveredAt = new Date();
  order.deliveryOtp = null;
  order.deliveryOtpPlain = null;
  order.deliveryOtpExpiresAt = null;

  // Mark as paid for COD
  if (order.paymentMethod === 'cod') {
    order.paymentStatus = 'paid';
  }

  await order.save();

  // Free up delivery partner and update earnings
  await DeliveryProfile.findByIdAndUpdate(
    req.profileId,
    {
      currentOrder: null,
      isAvailable: true,
      $inc: { earnings: order.deliveryFee, unsettledEarnings: order.deliveryFee, totalDeliveries: 1 },
    }
  );

  // Credit restaurant earnings ledger (restaurant share excludes delivery fee)
  const restaurantRevenue = Number(order.subtotal || (order.totalAmount - order.deliveryFee) || 0);
  if (restaurantRevenue > 0) {
    await Restaurant.findByIdAndUpdate(order.restaurant, {
      $inc: { totalEarnings: restaurantRevenue, unsettledEarnings: restaurantRevenue },
    });
  }

  // Emit delivered status to order room
  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.DELIVERED);

  // Send delivered email + notifications
  try {
    const customerProfile = await CustomerProfile.findById(order.customer).populate('user', 'name email');
    const restaurant = await Restaurant.findById(order.restaurant);
    if (customerProfile?.user?.email) {
      sendOrderStatusEmail(customerProfile.user.email, customerProfile.user.name, order._id, restaurant?.name || 'Restaurant', 'delivered').catch(e => console.error('Status email failed:', e.message));
    }
    // Notify customer
    if (customerProfile?.user?._id) {
      createNotification(customerProfile.user._id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: '🎉 Order Delivered!',
        message: `Your order from ${restaurant?.name || 'the restaurant'} has been delivered. Enjoy your meal!`,
        link: `/orders/${order._id}`,
        data: { orderId: order._id },
      }).catch(() => {});
    }
    // Notify delivery partner
    const deliveryUser = await DeliveryProfile.findById(req.profileId).select('user');
    if (deliveryUser?.user) {
      createNotification(deliveryUser.user, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: '✅ Delivery Complete',
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} delivered. ₹${order.deliveryFee} added to your earnings.`,
        link: '/delivery/history',
        data: { orderId: order._id },
      }).catch(() => {});
    }
    // Recompute customer preferences after delivery (non-blocking)
    computePreferences(order.customer).catch(e => console.error('Preference computation failed:', e.message));
  } catch (e) { console.error('Post-delivery hooks failed:', e.message); }

  res.status(200).json({
    success: true,
    message: 'Order delivered successfully',
    order,
  });
});

// ===== VERIFY PICKUP CODE (restaurant) =====
export const verifyPickupCode = catchAsync(async (req, res, next) => {
  const { pickupCode } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Verify restaurant owner
  const restaurant = await Restaurant.findById(order.restaurant);
  if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to verify pickup for this order', 403));
  }

  if (order.status !== ORDER_STATUS.READY) {
    return next(new AppError('Order must be in ready status to verify pickup', 400));
  }

  if (!order.pickupCode) {
    return next(new AppError('This order does not have a pickup code pending verification', 400));
  }

  if (order.pickupCode !== pickupCode) {
    return next(new AppError('Invalid pickup code', 400));
  }

  // Verification successful -> Move to picked_up
  order.status = ORDER_STATUS.PICKED_UP;
  order.pickedUpAt = new Date();
  order.pickupCode = null; // Clear code after successful use
  await order.save();

  // Emit status change to order room
  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.PICKED_UP);
  // Also tell dispatch the order is truly off the market
  emitAvailableOrdersUpdate();

  // Send picked_up email + notification to customer
  try {
    const customerProfile = await CustomerProfile.findById(order.customer).populate('user', 'name email');
    if (customerProfile?.user?.email) {
      sendOrderStatusEmail(customerProfile.user.email, customerProfile.user.name, order._id, restaurant.name, 'picked_up').catch(e => console.error('Status email failed:', e.message));
    }
    if (customerProfile?.user?._id) {
      createNotification(customerProfile.user._id, {
        type: NOTIFICATION_TYPES.ORDER,
        title: '🚴 On Its Way!',
        message: `Your order from ${restaurant.name} has been picked up and is on the way.`,
        link: `/orders/${order._id}`,
        data: { orderId: order._id },
      }).catch(() => {});
    }
  } catch (e) { console.error('Could not send picked_up notifications:', e.message); }

  res.status(200).json({
    success: true,
    message: 'Pickup verified successfully',
    order,
  });
});

// ===== GET RESTAURANT LIVE ORDERS =====
export const getRestaurantLiveOrders = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const orders = await Order.find({
    restaurant: restaurant._id,
    status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY] },
  })
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// ===== GET RESTAURANT ORDER HISTORY =====
export const getRestaurantOrderHistory = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const orders = await Order.find({
    restaurant: restaurant._id,
    status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.REJECTED] },
  })
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// ===== GET AVAILABLE ORDERS FOR DELIVERY =====
export const getAvailableOrders = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.query;

  const orders = await Order.find({
    status: ORDER_STATUS.READY,
    deliveryPartner: null,
  })
    .populate('restaurant', 'name address')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name' } })
    .sort({ readyAt: 1 }); // oldest ready first

  // If delivery partner sends their location, calculate distance to each restaurant
  const ordersWithDistance = orders.map(order => {
    const orderObj = order.toObject();
    if (lat && lng && order.restaurant?.address?.coordinates) {
      const rCoords = order.restaurant.address.coordinates;
      orderObj.distanceToRestaurant = haversineDistanceKm(
        { lat: parseFloat(lat), lng: parseFloat(lng) },
        { lat: rCoords.lat, lng: rCoords.lng }
      );
    } else {
      orderObj.distanceToRestaurant = null;
    }
    return orderObj;
  });

  res.status(200).json({
    success: true,
    count: ordersWithDistance.length,
    orders: ordersWithDistance,
  });
});

// Haversine helper for distance calculation
const haversineDistanceKm = (coord1, coord2) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// ===== DELIVERY PARTNER SELF-ASSIGN =====
export const assignDeliveryPartner = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status !== ORDER_STATUS.READY) {
    return next(new AppError('Order must be in ready status to be picked up', 400));
  }

  if (order.deliveryPartner) {
    return next(new AppError('Order already assigned to a delivery partner', 400));
  }

  // Check delivery partner availability
  const deliveryProfile = await DeliveryProfile.findOne({ user: req.user._id });
  if (!deliveryProfile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  // Prevent offline partners from accepting orders
  if (!deliveryProfile.isAvailable) {
    return next(new AppError('You must go Online in your profile to accept orders', 400));
  }

  if (deliveryProfile.currentOrder) {
    return next(new AppError('You already have an active order. Complete it first.', 400));
  }

  // Generate delivery OTP (for customer handoff)
  const { otp, otpHash, expiresAt } = await generateOtp(4, OTP_EXPIRY_DELIVERY_MINS);

  // Generate pickup code (for restaurant handoff)
  const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Assign partner but do NOT change status to picked_up. Leave as READY.
  order.deliveryPartner = req.profileId;
  order.pickupCode = pickupCode;
  order.deliveryOtp = otpHash;
  order.deliveryOtpPlain = otp; // plaintext for customer dashboard display
  order.deliveryOtpExpiresAt = expiresAt;
  await order.save();

  // Mark partner as busy
  deliveryProfile.currentOrder = order._id;
  deliveryProfile.isAvailable = false;
  await deliveryProfile.save();

  // Send OTP to customer via email (fire and forget)
  import('../models/CustomerProfile.js').then(async ({ default: CustomerProfile }) => {
    const customerProfile = await CustomerProfile.findById(order.customer).populate('user', 'name email');
    if (customerProfile && customerProfile.user) {
      sendDeliveryOtpEmail(customerProfile.user.email, customerProfile.user.name, otp).catch(err => {
        console.error('Failed to send delivery OTP email:', err.message);
      });
    }
  }).catch(err => console.error('Failed to load profile for OTP email:', err));

  // Re-emit READY status so the RESTAURANT knows a partner is attached (and should show the verify code input)
  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.READY);
  // Emit available orders update so it disappears from other partners' lists
  emitAvailableOrdersUpdate();

  res.status(200).json({
    success: true,
    message: 'Order assigned successfully. Proceed to restaurant for pickup.',
    pickupCode, // shown to delivery partner on their dashboard
    order,
  });
});

// ===== CANCEL DELIVERY ASSIGNMENT =====
export const cancelDeliveryAssignment = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status !== ORDER_STATUS.READY) {
    return next(new AppError('Can only cancel order while it is in ready status', 400));
  }

  // Check if assigned to this partner
  if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.profileId.toString()) {
    return next(new AppError('You are not assigned to this order', 403));
  }

  // Check time window
  const { DELIVERY_CANCEL_WINDOW_MINS } = await import('../constants/index.js');
  const now = new Date();
  const assignedAt = order.updatedAt; // updated when assigned
  const diffMins = (now - assignedAt) / (1000 * 60);

  if (diffMins > DELIVERY_CANCEL_WINDOW_MINS) {
    return next(new AppError(`You can only cancel within ${DELIVERY_CANCEL_WINDOW_MINS} minutes of accepting`, 400));
  }

  // Clear assignment variables
  order.deliveryPartner = null;
  order.pickupCode = null;
  // Intentionally leaving deliveryOtp, deliveryOtpPlain, deliveryOtpExpiresAt as requested
  await order.save();

  // Free up the delivery partner
  await DeliveryProfile.findByIdAndUpdate(req.profileId, {
    currentOrder: null,
    isAvailable: true,
  });

  // Re-emit READY status so the RESTAURANT knows the partner is detached
  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.READY);
  
  // Emit available orders update so it reappears on the available list for others
  emitAvailableOrdersUpdate();

  res.status(200).json({
    success: true,
    message: 'Delivery assignment cancelled successfully',
  });
});

// ===== CUSTOMER CANCEL ORDER =====
export const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Check customer owns this order
  if (order.customer.toString() !== req.profileId.toString()) {
    return next(new AppError('Not authorized to cancel this order', 403));
  }

  // Already cancelled/delivered
  if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED].includes(order.status)) {
    return next(new AppError(`Cannot cancel an order that is already ${order.status}`, 400));
  }

  // Check status is before the cancellable threshold
  const statusSequence = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.PICKED_UP,
    ORDER_STATUS.DELIVERED,
  ];

  const currentIdx = statusSequence.indexOf(order.status);
  const thresholdIdx = statusSequence.indexOf(CANCELLABLE_BEFORE_STATUS);

  if (currentIdx >= thresholdIdx) {
    return next(new AppError(`Order can only be cancelled before it is ${CANCELLABLE_BEFORE_STATUS}`, 400));
  }

  // Cancel the order
  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();

  // If payment was online, mark for refund
  if (order.paymentMethod === 'online' && order.paymentStatus === 'paid') {
    order.paymentStatus = 'refund_pending';
  }

  await order.save();

  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.CANCELLED);

  // Notify restaurant about cancellation
  try {
    const restaurant = await Restaurant.findById(order.restaurant).select('owner name');
    if (restaurant?.owner) {
      createNotification(restaurant.owner, {
        type: NOTIFICATION_TYPES.WARNING,
        title: '❌ Order Cancelled',
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} was cancelled by the customer.`,
        link: '/restaurant/orders',
        data: { orderId: order._id },
      }).catch(() => {});
    }
  } catch { /* non-blocking */ }

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    order,
  });
});
