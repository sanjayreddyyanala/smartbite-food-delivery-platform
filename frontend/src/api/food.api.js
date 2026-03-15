import API from './axios';

export const getRestaurantFoods = (restaurantId) => API.get(`/restaurants/${restaurantId}/foods`);
export const getAllFoods = () => API.get('/foods');
export const filterFoods = (params) => API.get('/foods/filter', { params });
export const addFood = (restaurantId, data) => API.post(`/restaurants/${restaurantId}/foods`, data);
export const updateFood = (restaurantId, foodId, data) => API.put(`/restaurants/${restaurantId}/foods/${foodId}`, data);
export const deleteFood = (restaurantId, foodId) => API.delete(`/restaurants/${restaurantId}/foods/${foodId}`);
export const updateQuantity = (restaurantId, foodId, quantity) => API.patch(`/restaurants/${restaurantId}/foods/${foodId}/quantity`, { availableQuantity: quantity });
export const toggleAvailability = (restaurantId, foodId) => API.patch(`/restaurants/${restaurantId}/foods/${foodId}/toggle`);
