import bcrypt from 'bcryptjs';
import NGOProfile from '../models/NGOProfile.js';
import LeftoverFood from '../models/LeftoverFood.js';
import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import generateOtp from '../utils/generateOtp.js';
import { sendNgoClaimEmail } from '../utils/sendEmail.js';
import { OTP_EXPIRY_NGO_HOURS, NOTIFICATION_TYPES } from '../constants/index.js';
import { createNotification } from '../services/notification.service.js';

// ===== GET NGO PROFILE =====
export const getMyProfile = catchAsync(async (req, res, next) => {
  const profile = await NGOProfile.findOne({ user: req.user._id })
    .populate('user', 'name email status');

  if (!profile) {
    return next(new AppError('NGO profile not found', 404));
  }

  res.status(200).json({
    success: true,
    profile,
  });
});

// ===== UPDATE NGO PROFILE =====
export const updateProfile = catchAsync(async (req, res, next) => {
  const profile = await NGOProfile.findOne({ user: req.user._id });

  if (!profile) {
    return next(new AppError('NGO profile not found', 404));
  }

  const { organizationName, registrationNumber, phone, address } = req.body;

  if (organizationName) profile.organizationName = organizationName;
  if (registrationNumber) profile.registrationNumber = registrationNumber;
  if (phone !== undefined) profile.phone = phone;
  if (address) {
    profile.address = typeof address === 'string' ? JSON.parse(address) : address;
  }

  await profile.save();

  res.status(200).json({
    success: true,
    profile,
  });
});

// ===== CLAIM LEFTOVER FOOD =====
export const claimLeftoverFood = catchAsync(async (req, res, next) => {
  const leftover = await LeftoverFood.findById(req.params.id);

  if (!leftover) {
    return next(new AppError('Leftover food not found', 404));
  }

  if (leftover.status !== 'available') {
    return next(new AppError('This leftover food is no longer available', 400));
  }

  if (new Date() > leftover.bestBefore) {
    leftover.status = 'expired';
    await leftover.save();
    return next(new AppError('This leftover food has expired', 400));
  }

  // Look up NGO profile
  const ngoProfile = await NGOProfile.findOne({ user: req.user._id });
  if (!ngoProfile) {
    return next(new AppError('NGO profile not found', 404));
  }

  // Generate claim OTP
  const { otp, otpHash, expiresAt } = await generateOtp(4, OTP_EXPIRY_NGO_HOURS * 60);

  leftover.status = 'claimed';
  leftover.claimedBy = ngoProfile._id;
  leftover.claimedAt = new Date();
  leftover.claimOtp = otp; // Store plain text OTP in DB
  leftover.claimOtpExpiresAt = expiresAt;
  await leftover.save();

  // Send plain text OTP via email to the claiming NGO (fire and forget to prevent blocking)
  import('../models/User.js').then(async ({ default: User }) => {
    const ngoUser = await User.findById(req.user._id);
    if (ngoUser) {
      sendNgoClaimEmail(ngoUser.email, ngoUser.name, leftover.description, otp).catch(err => {
        console.error('Failed to send claim OTP email to NGO:', err.message);
      });
    }
  }).catch(err => console.error('Failed to load User model for claim email:', err.message));

  // Emit real-time update to refresh available counts for other NGOs
  // And notify specific restaurant that their food was claimed
  import('../config/socket.js').then(({ getIO }) => {
    try {
      getIO().to('ngo/partners').emit('available-leftovers-updated');
      getIO().to(`restaurant:${leftover.restaurant.toString()}`).emit('leftover-status-changed', {
        leftoverId: leftover._id,
        status: 'claimed'
      });
    } catch (err) {
      console.error('Socket emit available-leftovers-updated/leftover-status-changed failed (claim):', err.message);
    }
  });

  // Notify restaurant owner
  try {
    const ngoUser = await import('../models/User.js').then(m => m.default.findById(req.user._id).select('name'));
    const restaurantDoc = await Restaurant.findById(leftover.restaurant).select('owner name');
    if (restaurantDoc?.owner) {
      createNotification(restaurantDoc.owner, {
        type: NOTIFICATION_TYPES.LEFTOVER,
        title: '🍽️ Surplus Food Claimed',
        message: `${ngoUser?.name || 'An NGO'} has claimed your surplus food: "${leftover.description}". They will pick it up shortly.`,
        link: '/restaurant/leftover',
        data: { leftoverId: leftover._id },
      }).catch(() => {});
    }
  } catch { /* non-blocking */ }

  res.status(200).json({
    success: true,
    message: 'Leftover food claimed successfully',
    otp, // return plain text OTP in response for the dashboard UI
    leftover,
  });
});

// ===== VERIFY CLAIM OTP (restaurant verifies at pickup) =====
export const verifyClaimOtp = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const leftover = await LeftoverFood.findById(req.params.id);

  if (!leftover) {
    return next(new AppError('Leftover food not found', 404));
  }

  if (leftover.status !== 'claimed') {
    return next(new AppError('This leftover food has not been claimed', 400));
  }

  // Only the restaurant owner can verify
  const restaurant = await Restaurant.findById(leftover.restaurant);
  if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the restaurant owner can verify claim OTP', 403));
  }

  if (!leftover.claimOtp || !leftover.claimOtpExpiresAt) {
    return next(new AppError('No claim OTP found', 400));
  }

  if (new Date() > leftover.claimOtpExpiresAt) {
    return next(new AppError('Claim OTP has expired', 400));
  }

  const isValid = otp === leftover.claimOtp;
  if (!isValid) {
    return next(new AppError('Invalid OTP', 400));
  }

  leftover.status = 'picked_up';
  leftover.pickedUpAt = new Date();
  leftover.collectedAt = new Date();
  leftover.claimOtp = null;
  leftover.claimOtpExpiresAt = null;
  await leftover.save();

  // Increment NGO's totalClaims
  await NGOProfile.findByIdAndUpdate(
    leftover.claimedBy,
    { $inc: { totalClaims: 1 } }
  );

  // Emit real-time update to the specific claiming NGO, AND the specific restaurant
  import('../config/socket.js').then(({ getIO }) => {
    try {
      getIO().to('ngo/partners').emit('leftover-status-changed', {
        leftoverId: leftover._id,
        status: 'picked_up'
      });
      getIO().to(`restaurant:${leftover.restaurant.toString()}`).emit('leftover-status-changed', {
        leftoverId: leftover._id,
        status: 'picked_up'
      });
    } catch (err) {
      console.error('Socket emit leftover-status-changed failed (verifyClaimOtp):', err.message);
    }
  });

  // Notify the NGO that claimed this
  try {
    const ngoProfile = await NGOProfile.findById(leftover.claimedBy).select('user');
    if (ngoProfile?.user) {
      createNotification(ngoProfile.user, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: '✅ Pickup Verified',
        message: `Your pickup of "${leftover.description}" from ${restaurant.name} has been verified. Thank you!`,
        link: '/ngo/claims',
        data: { leftoverId: leftover._id },
      }).catch(() => {});
    }
  } catch { /* non-blocking */ }

  res.status(200).json({
    success: true,
    message: 'Collection verified — food handed over to NGO',
    leftover,
  });
});

// ===== GET MY CLAIMS (NGO) =====
export const getMyClaims = catchAsync(async (req, res, next) => {
  const ngoProfile = await NGOProfile.findOne({ user: req.user._id });
  if (!ngoProfile) {
    return next(new AppError('NGO profile not found', 404));
  }

  const claims = await LeftoverFood.find({ claimedBy: ngoProfile._id })
    .populate('restaurant', 'name address phone')
    .sort({ claimedAt: -1 });

  res.status(200).json({
    success: true,
    count: claims.length,
    claims,
  });
});
