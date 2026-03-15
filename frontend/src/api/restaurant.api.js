import API from './axios';

export const getRestaurants = (params) => API.get('/restaurants', { params });
export const globalSearch = (params) => API.get('/restaurants/search', { params });
export const getRestaurant = (id) => API.get(`/restaurants/${id}`);
export const getMyRestaurant = () => API.get('/restaurants/my');
export const createRestaurant = (data) => API.post('/restaurants', data);
export const updateRestaurant = (id, data) => API.put(`/restaurants/${id}`, data);
export const toggleOnline = (id) => API.patch(`/restaurants/${id}/toggle`);
export const uploadRestaurantImages = (id, formData) =>
  API.post(`/restaurants/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteRestaurantImage = (id, imageUrl) =>
  API.delete(`/restaurants/${id}/images`, { data: { imageUrl } });
export const getRestaurantCategories = (id) => API.get(`/restaurants/${id}/categories`);
export const updateRestaurantCategories = (id, data) => API.put(`/restaurants/${id}/categories`, data);
export const getRestaurantEarnings = () => API.get('/restaurants/earnings');
