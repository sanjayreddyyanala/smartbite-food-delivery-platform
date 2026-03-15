import { Router } from 'express';
import { createRazorpayOrder, verifyPayment, refundPayment, convertCodToOnline } from '../controllers/payment.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.post('/refund', restrictTo('admin'), refundPayment);
router.post('/convert-cod', convertCodToOnline);

export default router;
