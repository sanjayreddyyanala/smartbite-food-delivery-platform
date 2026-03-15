import DeliveryProfile from '../models/DeliveryProfile.js';
import Order from '../models/Order.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { ORDER_STATUS } from '../constants/index.js';
import { getIO } from '../config/socket.js';

// ===== GET / SETUP DELIVERY PROFILE =====
export const getMyProfile = catchAsync(async (req, res, next) => {
  const profile = await DeliveryProfile.findOne({ user: req.user._id })
    .populate('user', 'name email status')
    .populate('currentOrder', 'status restaurant deliveryAddress');

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  res.status(200).json({
    success: true,
    profile,
  });
});

// ===== UPDATE DELIVERY PROFILE =====
export const updateProfile = catchAsync(async (req, res, next) => {
  const profile = await DeliveryProfile.findOne({ user: req.user._id });

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  const { phone, vehicleType, licensePlate, licenseNumber, bankDetails } = req.body;

  if (phone !== undefined) profile.phone = phone;
  if (vehicleType) profile.vehicleType = vehicleType;
  if (licensePlate !== undefined) profile.licensePlate = licensePlate;
  if (licenseNumber !== undefined) profile.licensePlate = licenseNumber;
  if (bankDetails && typeof bankDetails === 'object') {
    profile.bankDetails = {
      ...profile.bankDetails,
      accountHolderName: bankDetails.accountHolderName ?? profile.bankDetails?.accountHolderName ?? '',
      accountNumber: bankDetails.accountNumber ?? profile.bankDetails?.accountNumber ?? '',
      ifscCode: bankDetails.ifscCode ?? profile.bankDetails?.ifscCode ?? '',
      bankName: bankDetails.bankName ?? profile.bankDetails?.bankName ?? '',
      upiId: bankDetails.upiId ?? profile.bankDetails?.upiId ?? '',
    };
  }

  await profile.save();

  res.status(200).json({
    success: true,
    profile,
  });
});

// ===== TOGGLE AVAILABILITY =====
export const toggleAvailability = catchAsync(async (req, res, next) => {
  const profile = await DeliveryProfile.findOne({ user: req.user._id });

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  // Can't go available if there's an active order
  if (!profile.isAvailable && profile.currentOrder) {
    return next(new AppError('Complete your current order before going available', 400));
  }

  // Only approved users can go available
  if (req.user.status !== 'approved') {
    return next(new AppError('Your account must be approved before going available', 403));
  }

  profile.isAvailable = !profile.isAvailable;
  await profile.save();

  res.status(200).json({
    success: true,
    message: `You are now ${profile.isAvailable ? 'available' : 'offline'}`,
    isAvailable: profile.isAvailable,
  });
});

// ===== UPDATE LIVE LOCATION =====
export const updateLocation = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return next(new AppError('Please provide lat and lng', 400));
  }

  const profile = await DeliveryProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      currentLocation: { lat, lng, lastUpdated: new Date() },
    },
    { returnDocument: 'after' }
  );

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  // If delivering, also emit to the order room via socket
  if (profile.currentOrder) {
    try {
      const io = getIO();
      io.to(`order:${profile.currentOrder.toString()}`).emit('location-update', { lat, lng });
    } catch (err) {
      // Socket not critical — silently fail
    }
  }

  res.status(200).json({
    success: true,
    currentLocation: profile.currentLocation,
  });
});

// ===== GET CURRENT ORDER =====
export const getCurrentOrder = catchAsync(async (req, res, next) => {
  const profile = await DeliveryProfile.findOne({ user: req.user._id });

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  if (!profile.currentOrder) {
    return res.status(200).json({
      success: true,
      order: null,
    });
  }

  const order = await Order.findById(profile.currentOrder)
    .populate('restaurant', 'name address phone coverImage')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name email' } });

  res.status(200).json({
    success: true,
    order,
  });
});

// ===== GET EARNINGS =====
export const getEarnings = catchAsync(async (req, res, next) => {
  const profile = await DeliveryProfile.findOne({ user: req.user._id });

  if (!profile) {
    return next(new AppError('Delivery profile not found', 404));
  }

  // Get recent delivery history
  const completedOrders = await Order.find({
    deliveryPartner: req.profileId,
    status: ORDER_STATUS.DELIVERED,
  })
    .select('deliveryFee totalAmount deliveredAt restaurant')
    .populate('restaurant', 'name')
    .sort({ deliveredAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    totalEarnings: profile.earnings,
    unsettledEarnings: profile.unsettledEarnings || 0,
    totalPaidOut: profile.totalPaidOut || 0,
    lastPayoutAt: profile.lastPayoutAt || null,
    totalDeliveries: profile.totalDeliveries,
    recentDeliveries: completedOrders,
  });
});

// ===== GET DELIVERY HISTORY =====
export const getDeliveryHistory = catchAsync(async (req, res, next) => {
  const orders = await Order.find({
    deliveryPartner: req.profileId,
    status: { $in: [ORDER_STATUS.DELIVERED] },
  })
    .populate('restaurant', 'name coverImage')
    .populate({ path: 'customer', populate: { path: 'user', select: 'name' } })
    .sort({ deliveredAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});
