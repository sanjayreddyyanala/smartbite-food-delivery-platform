import API from './axios';

export const postLeftover = (data) => API.post('/leftover-food', data);
export const getMyLeftoverPosts = () => API.get('/leftover-food/my-posts');
export const verifyNgoOtp = (id, data) => API.patch(`/leftover-food/${id}/verify-otp`, data);
export const deleteLeftover = (id) => API.delete(`/leftover-food/${id}`);
