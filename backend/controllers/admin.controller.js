import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';
import DeliveryProfile from '../models/DeliveryProfile.js';
import CustomerProfile from '../models/CustomerProfile.js';
import NGOProfile from '../models/NGOProfile.js';
import LeftoverFood from '../models/LeftoverFood.js';
import Address from '../models/Address.js';
import Cart from '../models/Cart.js';
import FoodItem from '../models/FoodItem.js';
import GroupOrder from '../models/GroupOrder.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  USER_STATUS,
  ORDER_STATUS,
  ROLES,
  NOTIFICATION_TYPES,
  GROUP_ORDER_STATUS,
} from '../constants/index.js';
import { emitOrderStatusChanged, emitAvailableOrdersUpdate } from '../sockets/order.socket.js';
import { createNotification } from '../services/notification.service.js';

// ===== DASHBOARD STATS =====
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    pendingApprovals,
    totalCustomers,
    totalRestaurants,
    totalDeliveryPartners,
    totalNGOs,
    totalOrders,
    deliveredOrders,
    liveOrders,
    totalRevenue,
    totalLeftoverClaims,
    deliveryPayoutTotals,
    restaurantPayoutTotals,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: USER_STATUS.PENDING, role: { $ne: ROLES.CUSTOMER } }),
    User.countDocuments({ role: ROLES.CUSTOMER }),
    Restaurant.countDocuments(),
    User.countDocuments({ role: ROLES.DELIVERY }),
    User.countDocuments({ role: ROLES.NGO }),
    Order.countDocuments(),
    Order.countDocuments({ status: ORDER_STATUS.DELIVERED }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP] },
    }),
    Order.aggregate([
      { $match: { status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    LeftoverFood.countDocuments({ status: 'claimed', collectedAt: { $ne: null } }),
    DeliveryProfile.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$earnings' },
          unsettled: { $sum: '$unsettledEarnings' },
          totalPaidOut: { $sum: '$totalPaidOut' },
        },
      },
    ]),
    Restaurant.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
          unsettled: { $sum: '$unsettledEarnings' },
          totalPaidOut: { $sum: '$totalPaidOut' },
        },
      },
    ]),
  ]);

  const deliveryPayout = deliveryPayoutTotals[0] || { totalEarnings: 0, unsettled: 0, totalPaidOut: 0 };
  const restaurantPayout = restaurantPayoutTotals[0] || { totalEarnings: 0, unsettled: 0, totalPaidOut: 0 };

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      pendingApprovals,
      totalCustomers,
      totalRestaurants,
      totalDeliveryPartners,
      totalNGOs,
      totalOrders,
      deliveredOrders,
      liveOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalLeftoverClaims,
      deliveryTotalEarnings: deliveryPayout.totalEarnings || 0,
      deliveryUnsettledAmount: deliveryPayout.unsettled || 0,
      deliveryTotalPaidOut: deliveryPayout.totalPaidOut || 0,
      restaurantTotalEarnings: restaurantPayout.totalEarnings || 0,
      restaurantUnsettledAmount: restaurantPayout.unsettled || 0,
      restaurantTotalPaidOut: restaurantPayout.totalPaidOut || 0,
    },
  });
});

// ===== MARK DELIVERY PAYOUT AS PAID =====
export const markDeliveryPayoutPaid = catchAsync(async (req, res, next) => {
  const profile = await DeliveryProfile.findById(req.params.id).populate('user', 'name');

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  const payable = Number(profile.unsettledEarnings || 0);
  if (payable <= 0) {
    return next(new AppError('No unsettled payout pending for this delivery partner', 400));
  }

  profile.totalPaidOut = Number(profile.totalPaidOut || 0) + payable;
  profile.unsettledEarnings = 0;
  profile.lastPayoutAt = new Date();
  await profile.save();

  if (profile.user?._id) {
    createNotification(profile.user._id, {
      type: NOTIFICATION_TYPES.SUCCESS,
      title: '💸 Payout Settled',
      message: `Your delivery payout of ₹${payable.toFixed(2)} has been marked as paid by admin.`,
      link: '/delivery/profile',
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: `Marked ₹${payable.toFixed(2)} as paid for ${profile.user?.name || 'delivery partner'}`,
    profile,
    paidAmount: payable,
  });
});

// ===== MARK RESTAURANT PAYOUT AS PAID =====
export const markRestaurantPayoutPaid = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name');

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const payable = Number(restaurant.unsettledEarnings || 0);
  if (payable <= 0) {
    return next(new AppError('No unsettled payout pending for this restaurant', 400));
  }

  restaurant.totalPaidOut = Number(restaurant.totalPaidOut || 0) + payable;
  restaurant.unsettledEarnings = 0;
  restaurant.lastPayoutAt = new Date();
  await restaurant.save();

  if (restaurant.owner?._id) {
    createNotification(restaurant.owner._id, {
      type: NOTIFICATION_TYPES.SUCCESS,
      title: '💸 Payout Settled',
      message: `Your restaurant payout of ₹${payable.toFixed(2)} has been marked as paid by admin.`,
      link: '/restaurant/settings',
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: `Marked ₹${payable.toFixed(2)} as paid for ${restaurant.name}`,
    restaurant,
    paidAmount: payable,
  });
});

// ===== GET ALL USERS (with filters) =====
export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role, status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  const users = await User.find(filter)
    .select('-password -passwordResetToken -passwordResetExpires')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    users,
  });
});

// ===== GET ALL CUSTOMERS =====
export const getAllCustomers = catchAsync(async (req, res, next) => {
  const profiles = await CustomerProfile.find()
    .populate('user', 'name email status createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: profiles.length,
    customers: profiles,
  });
});

// ===== GET ALL DELIVERY PARTNERS (with profile details) =====
export const getAllDeliveryPartners = catchAsync(async (req, res, next) => {
  const { status } = req.query;

  // Get delivery users first
  const filter = { role: ROLES.DELIVERY };
  if (status) filter.status = status;

  const profiles = await DeliveryProfile.find()
    .populate('user', 'name email status createdAt')
    .populate('currentOrder', 'status')
    .sort({ createdAt: -1 });

  // If status filter, only include profiles whose user matches
  let result = profiles;
  if (status) {
    result = profiles.filter((p) => p.user && p.user.status === status);
  }

  res.status(200).json({
    success: true,
    count: result.length,
    deliveryPartners: result,
  });
});

// ===== GET ALL NGOs (with profile details) =====
export const getAllNGOs = catchAsync(async (req, res, next) => {
  const { status } = req.query;

  const profiles = await NGOProfile.find()
    .populate('user', 'name email status createdAt')
    .sort({ createdAt: -1 });

  let result = profiles;
  if (status) {
    result = profiles.filter((p) => p.user && p.user.status === status);
  }

  res.status(200).json({
    success: true,
    count: result.length,
    ngos: result,
  });
});

// ===== GET PENDING APPROVALS (excludes customers — they're auto-approved) =====
export const getPendingApprovals = catchAsync(async (req, res, next) => {
  const users = await User.find({
    status: USER_STATUS.PENDING,
    role: { $ne: ROLES.CUSTOMER },
  })
    .select('-password')
    .sort({ createdAt: 1 }); // oldest first

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});

// ===== APPROVE USER =====
export const approveUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === ROLES.CUSTOMER) {
    return next(new AppError('Customers are auto-approved and do not need manual approval', 400));
  }

  if (user.status === USER_STATUS.APPROVED) {
    return next(new AppError('User is already approved', 400));
  }

  user.status = USER_STATUS.APPROVED;
  await user.save({ validateBeforeSave: false });

  // Also approve the restaurant if the user is a restaurant owner
  if (user.role === ROLES.RESTAURANT) {
    await Restaurant.findOneAndUpdate(
      { owner: user._id },
      { status: USER_STATUS.APPROVED }
    );
  }

  // Notify the approved user
  createNotification(user._id, {
    type: NOTIFICATION_TYPES.ADMIN,
    title: '🎉 Account Approved',
    message: `Your ${user.role} account has been approved. You can now access all features.`,
    link: user.role === ROLES.RESTAURANT ? '/restaurant/dashboard' : `/${user.role}/dashboard`,
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: `${user.name} (${user.role}) has been approved`,
    user,
  });
});

// ===== REJECT USER =====
export const rejectUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === ROLES.CUSTOMER) {
    return next(new AppError('Customers cannot be rejected — use ban instead', 400));
  }

  if (user.status === USER_STATUS.REJECTED) {
    return next(new AppError('User is already rejected', 400));
  }

  user.status = USER_STATUS.REJECTED;
  await user.save({ validateBeforeSave: false });

  // Also reject the restaurant if the user is a restaurant owner
  if (user.role === ROLES.RESTAURANT) {
    await Restaurant.findOneAndUpdate(
      { owner: user._id },
      { status: USER_STATUS.REJECTED }
    );
  }

  // Notify the rejected user
  createNotification(user._id, {
    type: NOTIFICATION_TYPES.WARNING,
    title: '❌ Account Not Approved',
    message: 'Your account application has been reviewed and was not approved at this time. Please contact support for more information.',
    link: null,
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: `${user.name} (${user.role}) has been rejected`,
    user,
  });
});

// ===== GET ALL RESTAURANTS =====
export const getAllRestaurants = catchAsync(async (req, res, next) => {
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const restaurants = await Restaurant.find(filter)
    .populate('owner', 'name email status')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: restaurants.length,
    restaurants,
  });
});

// ===== GET LIVE ORDERS =====
export const getLiveOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    status: {
      $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP],
    },
  })
    .populate('restaurant', 'name')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } })
    .populate({ path: 'deliveryPartner', populate: { path: 'user', select: 'name' } })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

// ===== GET ORDER HISTORY =====
export const getOrderHistory = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const filter = {
    status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.REJECTED] },
  };

  const orders = await Order.find(filter)
    .populate('restaurant', 'name')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } })
    .populate({ path: 'deliveryPartner', populate: { path: 'user', select: 'name' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    orders,
  });
});

// ===== GET ALL ORDERS (with filters) =====
export const getAllOrders = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('restaurant', 'name')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } })
    .populate({ path: 'deliveryPartner', populate: { path: 'user', select: 'name' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    orders,
  });
});

// ===== TOGGLE USER BAN =====
export const toggleUserBan = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === ROLES.ADMIN) {
    return next(new AppError('Cannot ban an admin', 400));
  }

  if (user.status === USER_STATUS.BANNED) {
    user.status = USER_STATUS.APPROVED;
  } else {
    user.status = USER_STATUS.BANNED;
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `${user.name} is now ${user.status}`,
    user,
  });
});

// ===== GET ALL LEFTOVER FOOD CLAIMS (admin view) =====
export const getAllLeftoverClaims = catchAsync(async (req, res, next) => {
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const leftovers = await LeftoverFood.find(filter)
    .populate('restaurant', 'name address phone')
    .populate({ path: 'claimedBy', populate: { path: 'user', select: 'name email' } })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: leftovers.length,
    leftovers,
  });
});

// ===== DELETE USER =====
export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === ROLES.ADMIN) {
    return next(new AppError('Cannot delete an admin', 400));
  }

  const now = new Date();
  let cleaned = [];

  // Clean notifications for the deleted user
  await Notification.deleteMany({ recipient: user._id });

  // Remove user from active group-order collaborations.
  // Keep ordered/cancelled/expired sessions as history logs.
  await GroupOrder.updateMany(
    { status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED] } },
    {
      $pull: {
        members: { user: user._id },
        items: { addedBy: user._id },
      },
    }
  );

  // Role-specific cleanup (keep Order documents for history/audit logs)
  if (user.role === ROLES.CUSTOMER) {
    const customerProfile = await CustomerProfile.findOne({ user: user._id });
    if (customerProfile) {
      await Promise.all([
        Address.deleteMany({ customer: customerProfile._id }),
        Cart.deleteMany({ customer: customerProfile._id }),
        Review.deleteMany({ customer: customerProfile._id }),
      ]);

      await CustomerProfile.findByIdAndDelete(customerProfile._id);
      cleaned.push('customer profile, addresses, cart, and reviews');
    }

    await GroupOrder.updateMany(
      {
        host: user._id,
        status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED] },
      },
      {
        status: GROUP_ORDER_STATUS.CANCELLED,
      }
    );
  } else if (user.role === ROLES.DELIVERY) {
    const deliveryProfile = await DeliveryProfile.findOne({ user: user._id });
    if (deliveryProfile) {
      // Unassign active in-flight work, but keep delivered/cancelled/rejected order history logs.
      const activeDeliveryOrders = await Order.find({
        deliveryPartner: deliveryProfile._id,
        status: { $nin: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] },
      }).select('_id');

      if (activeDeliveryOrders.length > 0) {
        await Order.updateMany(
          { _id: { $in: activeDeliveryOrders.map((o) => o._id) } },
          {
            status: ORDER_STATUS.READY,
            deliveryPartner: null,
            pickupCode: null,
            deliveryOtp: null,
            deliveryOtpPlain: null,
            deliveryOtpExpiresAt: null,
            pickedUpAt: null,
          }
        );
      }

      await DeliveryProfile.findByIdAndDelete(deliveryProfile._id);
      cleaned.push('delivery profile and active delivery assignments');
    }

    emitAvailableOrdersUpdate();
  } else if (user.role === ROLES.NGO) {
    const ngoProfile = await NGOProfile.findOne({ user: user._id });
    if (ngoProfile) {
      // Release currently claimed (not yet picked) leftovers; keep picked-up history logs.
      await LeftoverFood.updateMany(
        { claimedBy: ngoProfile._id, status: 'claimed' },
        {
          status: 'available',
          claimedBy: null,
          claimedAt: null,
          claimOtp: null,
          claimOtpExpiresAt: null,
        }
      );

      await NGOProfile.findByIdAndDelete(ngoProfile._id);
      cleaned.push('ngo profile and active leftover claims');
    }
  } else if (user.role === ROLES.RESTAURANT) {
    const restaurant = await Restaurant.findOne({ owner: user._id });
    if (restaurant) {
      const activeRestaurantOrders = await Order.find({
        restaurant: restaurant._id,
        status: { $nin: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] },
      }).select('_id deliveryPartner');

      if (activeRestaurantOrders.length > 0) {
        const deliveryPartnerIds = activeRestaurantOrders
          .map((o) => o.deliveryPartner)
          .filter(Boolean);

        if (deliveryPartnerIds.length > 0) {
          await DeliveryProfile.updateMany(
            { _id: { $in: deliveryPartnerIds } },
            { currentOrder: null, isAvailable: true }
          );
        }

        await Order.updateMany(
          { _id: { $in: activeRestaurantOrders.map((o) => o._id) } },
          {
            status: ORDER_STATUS.REJECTED,
            rejectedAt: now,
            deliveryPartner: null,
            pickupCode: null,
            deliveryOtp: null,
            deliveryOtpPlain: null,
            deliveryOtpExpiresAt: null,
            pickedUpAt: null,
          }
        );
      }

      await Promise.all([
        FoodItem.deleteMany({ restaurant: restaurant._id }),
        LeftoverFood.deleteMany({ restaurant: restaurant._id }),
        Review.deleteMany({ restaurant: restaurant._id }),
        GroupOrder.deleteMany({
          restaurant: restaurant._id,
          status: { $in: [GROUP_ORDER_STATUS.ACTIVE, GROUP_ORDER_STATUS.LOCKED] },
        }),
      ]);

      await Restaurant.findByIdAndDelete(restaurant._id);
      cleaned.push('restaurant, menu, leftovers, reviews, and active group orders');
    }

    emitAvailableOrdersUpdate();
  }

  await User.findByIdAndDelete(user._id);

  res.status(200).json({
    success: true,
    message: `${user.name} (${user.role}) has been permanently deleted`,
    cleaned,
    historyPreserved: ['orders', 'order-status timeline', 'delivered/rejected/cancelled records'],
  });
});

// ===== ADMIN CANCEL ORDER =====
export const adminCancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.status)) {
    return next(new AppError(`Cannot cancel an order that is already ${order.status}`, 400));
  }

  // Free delivery partner if assigned
  if (order.deliveryPartner) {
    await DeliveryProfile.findByIdAndUpdate(order.deliveryPartner, {
      currentOrder: null,
      isAvailable: true,
    });
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  order.deliveryPartner = null;
  order.pickupCode = null;
  order.deliveryOtp = null;
  order.deliveryOtpPlain = null;
  order.deliveryOtpExpiresAt = null;
  await order.save();

  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.CANCELLED);
  emitAvailableOrdersUpdate();

  res.status(200).json({
    success: true,
    message: 'Order cancelled by admin',
    order,
  });
});

// ===== ADMIN UNASSIGN DELIVERY PARTNER =====
export const adminUnassignDelivery = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (!order.deliveryPartner) {
    return next(new AppError('No delivery partner assigned to this order', 400));
  }

  if (order.status === ORDER_STATUS.DELIVERED) {
    return next(new AppError('Cannot unassign from a delivered order', 400));
  }

  // Free delivery partner
  await DeliveryProfile.findByIdAndUpdate(order.deliveryPartner, {
    currentOrder: null,
    isAvailable: true,
  });

  // Reset order
  order.deliveryPartner = null;
  order.status = ORDER_STATUS.READY;
  order.pickupCode = null;
  order.deliveryOtp = null;
  order.deliveryOtpPlain = null;
  order.deliveryOtpExpiresAt = null;
  order.pickedUpAt = null;
  await order.save();

  emitOrderStatusChanged(order._id.toString(), ORDER_STATUS.READY);
  emitAvailableOrdersUpdate();

  res.status(200).json({
    success: true,
    message: 'Delivery partner unassigned — order reverted to ready',
    order,
  });
});
