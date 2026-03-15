import LeftoverFood from '../models/LeftoverFood.js';
import Restaurant from '../models/Restaurant.js';
import NGOProfile from '../models/NGOProfile.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendLeftoverFoodAlertEmail } from '../utils/sendEmail.js';
import { ROLES, NOTIFICATION_TYPES } from '../constants/index.js';
import { createNotifications } from '../services/notification.service.js';

// ===== POST LEFTOVER FOOD (restaurant) =====
export const postLeftoverFood = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const { description, quantity, bestBefore } = req.body;

  if (!description || !quantity || !bestBefore) {
    return next(new AppError('Please provide description, quantity, and bestBefore', 400));
  }

  const leftover = await LeftoverFood.create({
    restaurant: restaurant._id,
    description,
    quantity,
    bestBefore: new Date(bestBefore),
  });

  // Notify all approved NGOs via email AND in-app (fire and forget)
  const ngoUsers = await User.find({ role: ROLES.NGO, status: 'approved' });
  ngoUsers.forEach(ngo => {
    sendLeftoverFoodAlertEmail(
      ngo.email,
      ngo.name,
      restaurant.name,
      description,
      quantity
    ).catch(err => {
      console.error(`Failed to notify NGO ${ngo.email}:`, err.message);
    });
  });

  // In-app notifications for NGOs
  if (ngoUsers.length > 0) {
    createNotifications(
      ngoUsers.map(u => u._id),
      {
        type: NOTIFICATION_TYPES.LEFTOVER,
        title: '🍽️ New Surplus Food Available',
        message: `${restaurant.name} has posted surplus food: ${description} (${quantity} portions). Claim it before it expires!`,
        link: '/ngo/available',
        data: { leftoverId: leftover._id },
      }
    ).catch(() => {});
  }

  // Emit real-time update to all connected NGOs and specific restaurant
  import('../config/socket.js').then(({ getIO }) => {
    try {
      getIO().to('ngo/partners').emit('available-leftovers-updated');
      getIO().to(`restaurant:${restaurant._id.toString()}`).emit('leftover-status-changed', {
        newPost: true,
      });
    } catch (err) {
      console.error('Socket emit available-leftovers-updated failed:', err.message);
    }
  });

  res.status(201).json({
    success: true,
    leftover,
    notifiedNGOs: ngoUsers.length,
  });
});

// ===== GET ALL AVAILABLE LEFTOVERS (public / NGO) =====
export const getAvailableLeftovers = catchAsync(async (req, res, next) => {
  const leftovers = await LeftoverFood.find({
    status: 'available',
    bestBefore: { $gt: new Date() },
  })
    .populate('restaurant', 'name address phone coverImage')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: leftovers.length,
    leftovers,
  });
});

// ===== GET MY RESTAURANT'S LEFTOVER POSTS =====
export const getMyLeftovers = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const leftovers = await LeftoverFood.find({ restaurant: restaurant._id })
    .populate({ path: 'claimedBy', populate: { path: 'user', select: 'name email' } })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: leftovers.length,
    leftovers,
  });
});

// ===== DELETE LEFTOVER POST =====
export const deleteLeftover = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const leftover = await LeftoverFood.findOne({
    _id: req.params.id,
    restaurant: restaurant._id,
  });

  if (!leftover) {
    return next(new AppError('Leftover food post not found', 404));
  }

  if (leftover.status === 'claimed') {
    return next(new AppError('Cannot delete — already claimed by an NGO', 400));
  }

  await leftover.deleteOne();

  // Emit real-time update to all connected NGOs and the specific restaurant owner's session
  import('../config/socket.js').then(({ getIO }) => {
    try {
      getIO().to('ngo/partners').emit('available-leftovers-updated');
      getIO().to(`restaurant:${leftover.restaurant.toString()}`).emit('leftover-status-changed', {
        deleted: true,
      });
    } catch (err) {
      console.error('Socket emit available-leftovers-updated failed (delete):', err.message);
    }
  });

  res.status(200).json({
    success: true,
    message: 'Leftover food post deleted',
  });
});
