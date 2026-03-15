import API from './axios';

export const getRecommendedRestaurants = (params) => API.get('/recommendations/restaurants', { params });
export const getRecommendedFoods = (params) => API.get('/recommendations/foods', { params });
export const getRestaurantRecommendedItems = (restaurantId, params) => API.get(`/recommendations/restaurants/${restaurantId}/foods`, { params });
export const getTrending = (params) => API.get('/recommendations/trending', { params });
export const getReorderSuggestions = (params) => API.get('/recommendations/reorder', { params });
