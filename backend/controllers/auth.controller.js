import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import CustomerProfile from '../models/CustomerProfile.js';
import DeliveryProfile from '../models/DeliveryProfile.js';
import NGOProfile from '../models/NGOProfile.js';
import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { sendPasswordResetEmail } from '../utils/sendEmail.js';
import { ROLES, USER_STATUS, PASSWORD_RESET_EXPIRES_MINS } from '../constants/index.js';

// Helper: generate JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper: send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
  });
};

// ===== REGISTER =====
export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Validate role
  if (!Object.values(ROLES).includes(role)) {
    return next(new AppError(`Invalid role: ${role}`, 400));
  }

  // Don't allow registering as admin
  if (role === ROLES.ADMIN) {
    return next(new AppError('Cannot register as admin', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 400));
  }

  // Set status: customers are auto-approved, others are pending
  const status = role === ROLES.CUSTOMER ? USER_STATUS.APPROVED : USER_STATUS.PENDING;

  // Create user
  const user = await User.create({ name, email, password, role, status });

  // Create role-specific profile
  if (role === ROLES.CUSTOMER) {
    await CustomerProfile.create({ user: user._id });
  } else if (role === ROLES.DELIVERY) {
    const { bankDetails } = req.body;
    await DeliveryProfile.create({ user: user._id, bankDetails: bankDetails || {} });
  } else if (role === ROLES.NGO) {
    const { organizationName, phone, address } = req.body;
    await NGOProfile.create({
      user: user._id,
      organizationName: organizationName || '',
      phone: phone || '',
      address: address || {},
    });
  } else if (role === ROLES.RESTAURANT) {
    // Create restaurant record with details from registration form
    const { restaurantName, description, phone, cuisineType, address, bankDetails } = req.body;
    await Restaurant.create({
      owner: user._id,
      name: restaurantName || name,
      description: description || '',
      phone: phone || '',
      cuisineType: Array.isArray(cuisineType) ? cuisineType : [],
      address: address || {},
      bankDetails: bankDetails || {},
      status: USER_STATUS.PENDING,
    });
  }

  sendTokenResponse(user, 201, res);
});

// ===== LOGIN =====
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user and include password field
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Only rejected users are blocked from login
  // Pending users can log in to set up their profiles
  if (user.status === USER_STATUS.REJECTED) {
    return next(new AppError('Your account has been rejected. Please contact support.', 403));
  }

  if (user.status === USER_STATUS.BANNED) {
    return next(new AppError('Your account has been banned. Please contact support.', 403));
  }

  sendTokenResponse(user, 200, res);
});

// ===== GET ME =====
export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
});

// ===== FORGOT PASSWORD =====
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address', 400));
  }

  const user = await User.findOne({ email });

  // Always return 200 to prevent email enumeration
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  // Generate raw token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash token with SHA-256 and store on user
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINS * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  // Build reset URL pointing to frontend page (which will submit new password to API)
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetURL = `${frontendURL}/reset-password/${rawToken}`;

  console.log(resetURL);

  try {
    await sendPasswordResetEmail(user.email, user.name, resetURL);
  } catch (err) {
    // If email fails, clear the reset fields
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error sending email. Please try again later.', 500));
  }

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

// ===== RESET PASSWORD =====
export const resetPassword = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new AppError('Please provide a new password', 400));
  }

  // Hash the raw token from the URL to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  // Find user with matching token that hasn't expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  // Update password and clear reset fields
  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // Log the user in with new password
  sendTokenResponse(user, 200, res);
});
