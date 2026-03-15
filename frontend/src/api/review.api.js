import API from './axios';

export const submitReview = (data) => API.post('/reviews', data);
export const getRestaurantReviews = (restaurantId, params) => API.get(`/reviews/restaurant/${restaurantId}`, { params });
export const getMyReviews = () => API.get('/reviews/my');
export const getOrderReviewStatus = (orderId) => API.get(`/reviews/order/${orderId}`);
