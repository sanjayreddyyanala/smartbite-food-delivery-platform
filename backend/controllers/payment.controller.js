import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import { emitPaymentStatusChanged } from '../sockets/order.socket.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ===== CREATE RAZORPAY ORDER =====
export const createRazorpayOrder = catchAsync(async (req, res, next) => {
  const { amount } = req.body; // amount in ₹

  if (!amount || amount <= 0) {
    return next(new AppError('Please provide a valid amount', 400));
  }

  const instance = getRazorpayInstance();

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  };

  const order = await instance.orders.create(options);

  res.status(201).json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID, // Send key so frontend doesn't need env var
    order,
  });
});

// ===== VERIFY RAZORPAY PAYMENT =====
export const verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing payment verification fields', 400));
  }

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return next(new AppError('Payment verification failed — invalid signature', 400));
  }

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });
});

// ===== REFUND PAYMENT (admin only) =====
export const refundPayment = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId) {
    return next(new AppError('Please provide an orderId', 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.paymentMethod !== 'online') {
    return next(new AppError('This order was not paid online', 400));
  }

  if (!order.razorpayPaymentId) {
    return next(new AppError('No Razorpay payment ID found for this order', 400));
  }

  if (order.paymentStatus === 'refunded') {
    return next(new AppError('This order has already been refunded', 400));
  }

  if (!['refund_pending', 'paid'].includes(order.paymentStatus)) {
    return next(new AppError(`Cannot refund order with payment status: ${order.paymentStatus}`, 400));
  }

  const instance = getRazorpayInstance();

  try {
    const refund = await instance.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(order.totalAmount * 100), // full refund in paise
      speed: 'normal',
      notes: {
        reason: 'Order cancelled',
        orderId: order._id.toString(),
      },
    });

    order.paymentStatus = 'refunded';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      refund,
      order,
    });
  } catch (err) {
    return next(new AppError(`Razorpay refund failed: ${err.error?.description || err.message}`, 500));
  }
});

// ===== CONVERT COD TO ONLINE PAYMENT =====
export const convertCodToOnline = catchAsync(async (req, res, next) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing required fields', 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Must be a COD order with pending payment
  if (order.paymentMethod !== 'cod') {
    return next(new AppError('This order is not a COD order', 400));
  }

  if (order.paymentStatus !== 'pending') {
    return next(new AppError('Payment has already been processed for this order', 400));
  }

  // Cannot convert if already delivered, cancelled, or rejected
  const terminalStatuses = ['delivered', 'cancelled', 'rejected'];
  if (terminalStatuses.includes(order.status)) {
    return next(new AppError(`Cannot pay for an order that is ${order.status}`, 400));
  }

  // Verify Razorpay signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return next(new AppError('Payment verification failed — invalid signature', 400));
  }

  // Update order payment fields
  order.paymentMethod = 'online';
  order.paymentStatus = 'paid';
  order.razorpayOrderId = razorpay_order_id;
  order.razorpayPaymentId = razorpay_payment_id;
  await order.save();

  // Notify delivery partner and customer in real-time
  emitPaymentStatusChanged(order._id.toString(), {
    paymentMethod: 'online',
    paymentStatus: 'paid',
  });

  res.status(200).json({
    success: true,
    message: 'Payment converted to online successfully',
    order,
  });
});
