import { Server } from 'socket.io';

import { SOCKET_EVENTS } from '../constants/index.js';

let io;

const parseAllowedOrigins = () => {
  const fromList = (process.env.FRONTEND_URLS || '')
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
const socketCorsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Not allowed by Socket.IO CORS'));
};

/**
 * Initialize Socket.io with the HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server} Socket.io instance
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: socketCorsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join order-specific room for real-time updates
    socket.on(SOCKET_EVENTS.JOIN_ORDER_ROOM || 'join-order-room', ({ orderId }) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`Socket ${socket.id} joined order:${orderId}`);
      }
    });

    // Join restaurant room for new order notifications
    socket.on('join-restaurant-room', ({ restaurantId }) => {
      if (restaurantId) {
        socket.join(`restaurant:${restaurantId}`);
        console.log(`Socket ${socket.id} joined restaurant:${restaurantId}`);
      }
    });

    // Delivery partners global room
    socket.on(SOCKET_EVENTS.JOIN_DELIVERY_ROOM || 'join-delivery-room', () => {
      socket.join('delivery/partners');
      console.log(`Socket ${socket.id} joined delivery/partners`);
    });

    // NGOs global room for leftover food updates
    socket.on('join-ngo-room', () => {
      socket.join('ngo/partners');
      console.log(`Socket ${socket.id} joined ngo/partners`);
    });

    // Delivery partner streams live GPS
    socket.on(SOCKET_EVENTS.LOCATION_UPDATE || 'location-update', ({ orderId, lat, lng }) => {
      if (orderId && lat && lng) {
        // Broadcast to order room (customer sees this)
        socket.to(`order:${orderId}`).emit(SOCKET_EVENTS.LOCATION_UPDATE || 'location-update', { lat, lng });
      }
    });

    // Personal user room — for targeted notifications
    socket.on('join-user-room', ({ userId }) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    // Group order room (uses 6-char code)
    socket.on('join-group-order', ({ code }) => {
      if (code) {
        socket.join(`group-${code}`);
        console.log(`Socket ${socket.id} joined group-${code}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get the Socket.io instance (must be initialized first).
 * @returns {Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket(httpServer) first.');
  }
  return io;
};
