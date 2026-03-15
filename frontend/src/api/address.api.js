import API from './axios';

export const getAddresses = () => API.get('/addresses');
export const addAddress = (data) => API.post('/addresses', data);
export const updateAddress = (id, data) => API.put(`/addresses/${id}`, data);
export const deleteAddress = (id) => API.delete(`/addresses/${id}`);
export const setDefault = (id) => API.patch(`/addresses/${id}/default`);
