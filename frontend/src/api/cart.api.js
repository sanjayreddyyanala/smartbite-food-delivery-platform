import API from './axios';

export const getCart = () => API.get('/cart');
export const addToCart = (data) => API.post('/cart/add', data);
export const updateCartItem = (itemId, data) => API.patch(`/cart/update/${itemId}`, data);
export const removeCartItem = (itemId) => API.delete(`/cart/remove/${itemId}`);
export const clearCart = () => API.delete('/cart/clear');
