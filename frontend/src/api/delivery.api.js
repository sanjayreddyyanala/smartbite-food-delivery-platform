import API from './axios';

export const getDeliveryProfile = () => API.get('/delivery/profile');
export const updateDeliveryProfile = (data) => API.put('/delivery/profile', data);
export const toggleAvailability = () => API.patch('/delivery/toggle-availability');
export const updateLocation = (data) => API.patch('/delivery/location', data);
export const getDeliveryHistory = () => API.get('/delivery/history');
export const getEarnings = () => API.get('/delivery/earnings');
