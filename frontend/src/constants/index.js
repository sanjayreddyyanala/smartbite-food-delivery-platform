export const ROLES = {
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  DELIVERY: 'delivery',
  NGO: 'ngo',
  ADMIN: 'admin',
};

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

export const CANCELLABLE_BEFORE_STATUS = 'accepted';

export const LEFTOVER_STATUS = {
  AVAILABLE: 'available',
  CLAIMED: 'claimed',
  PICKED_UP: 'picked_up',
  EXPIRED: 'expired',
};

export const GROUP_ORDER_STATUS = {
  OPEN: 'open',
  ORDERED: 'ordered',
  CANCELLED: 'cancelled',
};

export const CART_PERMISSION = {
  OPEN: 'open',
  LOCKED: 'locked',
};

export const SOCKET_EVENTS = {
  JOIN_ORDER_ROOM: 'join-order-room',
  NEW_ORDER: 'new-order',
  ORDER_STATUS_CHANGED: 'order-status-changed',
  LOCATION_UPDATE: 'location-update',
  JOIN_GROUP_ORDER: 'join-group-order',
  GROUP_CART_UPDATED: 'group-cart-updated',
  GROUP_PERMISSION_CHANGED: 'group-permission-changed',
  GROUP_ORDER_PLACED: 'group-order-placed',
};

export const DELIVERY_BASE_FEE = 20;
export const DELIVERY_PER_KM_RATE = 5;

export const DEFAULT_RESTAURANT_CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Drinks'];

export const VEHICLE_TYPES = ['bike', 'scooter', 'bicycle'];

export const ADDRESS_LABELS = ['Home', 'Work', 'Other'];

// ===== GROUP ORDER LIMITS =====
export const MAX_GROUP_MEMBERS = 20;
export const GROUP_SESSION_DURATION_HOURS = 3;

// ===== SEARCH =====
export const SEARCH_MIN_CHARS = 2;
export const SEARCH_DEBOUNCE_MS = 300;

// ===== DELIVERY SORTING =====
export const AVAILABLE_ORDERS_DEFAULT_SORT = 'distance';
