import { getIO } from '../config/socket.js';
import { SOCKET_EVENTS } from '../constants/index.js';

/**
 * Emit new order notification to restaurant room.
 * @param {string} restaurantId
 * @param {object} order
 */
export const emitNewOrder = (restaurantId, order) => {
  try {
    const io = getIO();
    io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.NEW_ORDER, { order });
  } catch (err) {
    console.error('Socket emit error (new-order):', err.message);
  }
};

/**
 * Emit order status change to order room.
 * @param {string} orderId
 * @param {string} status
 */
export const emitOrderStatusChanged = (orderId, status) => {
  try {
    const io = getIO();
    io.to(`order:${orderId}`).emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, { orderId, status });
  } catch (err) {
    console.error('Socket emit error (order-status-changed):', err.message);
  }
};

/**
 * Emit available orders update to all delivery partners.
 */
export const emitAvailableOrdersUpdate = () => {
  try {
    const io = getIO();
    io.to('delivery/partners').emit(SOCKET_EVENTS.AVAILABLE_ORDERS_UPDATED);
  } catch (err) {
    console.error('Socket emit error (available-orders-updated):', err.message);
  }
};

/**
 * Emit payment status change to order room (delivery partner + customer see this).
 * @param {string} orderId
 * @param {object} paymentInfo - { paymentMethod, paymentStatus }
 */
export const emitPaymentStatusChanged = (orderId, paymentInfo) => {
  try {
    const io = getIO();
    io.to(`order:${orderId}`).emit('payment-status-changed', { orderId, ...paymentInfo });
  } catch (err) {
    console.error('Socket emit error (payment-status-changed):', err.message);
  }
};
