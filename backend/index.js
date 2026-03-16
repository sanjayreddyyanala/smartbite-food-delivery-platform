import 'dotenv/config.js';

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import errorMiddleware from './middleware/error.middleware.js';
import AppError from './utils/AppError.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import restaurantRoutes from './routes/restaurant.routes.js';
import foodRoutes, { restaurantFoodRouter } from './routes/food.routes.js';
import cartRoutes from './routes/cart.routes.js';
import addressRoutes from './routes/address.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import leftoverFoodRoutes from './routes/leftoverFood.routes.js';
import ngoRoutes from './routes/ngo.routes.js';
import adminRoutes from './routes/admin.routes.js';
import groupOrderRoutes from './routes/groupOrder.routes.js';
import reviewRoutes from './routes/review.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();
const server = createServer(app);

// Initialize Socket.io
initSocket(server);

const parseAllowedOrigins = () => {
  const fromList = (process.env.FRONTEND_URLS || 'https://smartbite-eight.vercel.app')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const fallbackOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
  ].filter(Boolean);

  return [...new Set([...fromList, ...fallbackOrigins])];
};

const allowedOrigins = parseAllowedOrigins();
const corsOrigin = (origin, callback) => {
  // Allow non-browser requests (e.g. health checks, server-to-server calls)
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);

  return callback(new Error('Not allowed by CORS'));
};

// ===== Middleware =====
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurants/:id/foods', restaurantFoodRouter);
app.use('/api/foods', foodRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/leftover-food', leftoverFoodRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/group-orders', groupOrderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);

// ===== Health check =====
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// ===== 404 handler =====
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ===== Global error handler =====
app.use(errorMiddleware);

// ===== Start server =====
const PORT = process.env.PORT || 3000;

import { startCronJobs } from './utils/cron.js';

connectDB().then(() => {
  startCronJobs();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
});


