import API from './axios';

export const placeOrder = (data) => API.post('/orders', data);
export const getDeliveryFeePreview = (params) => API.get('/orders/delivery-fee-preview', { params });
export const getMyOrders = () => API.get('/orders/my-orders');
export const getOrder = (id) => API.get(`/orders/${id}`);
export const updateOrderStatus = (id, data) => API.patch(`/orders/${id}/status`, data);
export const verifyDeliveryOtp = (id, data) => API.patch(`/orders/${id}/verify-delivery-otp`, data);
export const verifyPickupCode = (id, data) => API.patch(`/orders/${id}/verify-pickup-code`, data);
export const getRestaurantLiveOrders = () => API.get('/orders/restaurant/live');
export const getRestaurantOrderHistory = () => API.get('/orders/restaurant/history');
export const getAvailableDeliveryOrders = (params) => API.get('/delivery/available-orders', { params });
export const assignDeliveryOrder = (id) => API.patch(`/delivery/orders/${id}/claim`);
export const cancelDeliveryAssignment = (id) => API.patch(`/delivery/orders/${id}/cancel-assignment`);
export const cancelOrder = (id) => API.patch(`/orders/${id}/cancel`);
