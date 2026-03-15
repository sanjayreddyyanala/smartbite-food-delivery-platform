// ===== ROLES =====
export const ROLES = {
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  DELIVERY: 'delivery',
  NGO: 'ngo',
  ADMIN: 'admin',
};

// ===== ORDER STATUS =====
export const ORDER_STATUS = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// ===== ORDER CANCELLATION =====
export const CANCELLABLE_BEFORE_STATUS = 'accepted'; // orders can be cancelled before this status

// ===== LEFTOVER FOOD STATUS =====
export const LEFTOVER_STATUS = {
  AVAILABLE: 'available',
  CLAIMED: 'claimed',
  PICKED_UP: 'picked_up',
};

// ===== GROUP ORDER STATUS =====
export const GROUP_ORDER_STATUS = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  ORDERED: 'ordered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// ===== CART PERMISSION =====
export const CART_PERMISSION = {
  OPEN: 'open',
  PERSONAL: 'personal',
};

// ===== DELIVERY FEE =====
export const DELIVERY_BASE_FEE = 20; // ₹ flat base fee
export const DELIVERY_PER_KM_RATE = 5; // ₹ per km

// ===== RESTAURANT CATEGORIES =====
export const DEFAULT_RESTAURANT_CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Drinks'];

// ===== OTP EXPIRY =====
export const OTP_EXPIRY_DELIVERY_MINS = 240; // delivery OTP valid for 4 hours
export const OTP_EXPIRY_NGO_HOURS = 24; // NGO OTP valid for 24 hours

// ===== DELIVERY CANCEL WINDOW =====
export const DELIVERY_CANCEL_WINDOW_MINS = 2; // delivery partner can cancel assignment within this many minutes

// ===== PASSWORD RESET =====
export const PASSWORD_RESET_EXPIRES_MINS = 10; // forgot-password token valid for 10 minutes

// ===== USER STATUS =====
export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BANNED: 'banned',
};

// ===== NOTIFICATION TYPES =====
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  DELIVERY: 'delivery',
  GROUP: 'group',
  LEFTOVER: 'leftover',
  ADMIN: 'admin',
  REVIEW: 'review',
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
};

// ===== SOCKET EVENTS =====
export const SOCKET_EVENTS = {
  JOIN_ORDER_ROOM: 'join-order-room',
  NEW_ORDER: 'new-order',
  ORDER_STATUS_CHANGED: 'order-status-changed',
  LOCATION_UPDATE: 'location-update',
  JOIN_GROUP_ORDER: 'join-group-order',
  GROUP_CART_UPDATED: 'group-cart-updated',
  GROUP_PERMISSION_CHANGED: 'group-permission-changed',
  GROUP_ORDER_PLACED: 'group-order-placed',
  JOIN_DELIVERY_ROOM: 'join-delivery-room',
  AVAILABLE_ORDERS_UPDATED: 'available-orders-updated',
  JOIN_USER_ROOM: 'join-user-room',
  NEW_NOTIFICATION: 'new-notification',
};

// ===== GROUP ORDER LIMITS =====
export const MAX_GROUP_MEMBERS = 20;
export const GROUP_SESSION_DURATION_HOURS = 3;

// ===== SEARCH =====
export const SEARCH_MIN_CHARS = 2;
export const SEARCH_DEBOUNCE_MS = 300;

// ===== DELIVERY SORTING =====
export const AVAILABLE_ORDERS_DEFAULT_SORT = 'distance';

// ===== RECOMMENDATION WEIGHTS =====
export const RECOMMENDATION_WEIGHTS = {
  restaurant: {
    cuisineMatch: 0.25,
    rating: 0.2,
    popularity: 0.1,
    proximity: 0.15,
    reorderBonus: 0.2,
    timeRelevance: 0.1,
  },
  food: {
    categoryMatch: 0.2,
    vegMatch: 0.15,
    priceMatch: 0.1,
    itemRating: 0.2,
    itemPopularity: 0.15,
    restaurantAffinity: 0.2,
  },
};

// ===== RECOMMENDATION SETTINGS =====
export const COLD_START_ORDER_THRESHOLD = 3; // min orders before personalization kicks in
export const TRENDING_WINDOW_HOURS = 48; // hours to look back for trending items
export const REVIEW_WINDOW_DAYS = 7; // days after delivery to allow review
