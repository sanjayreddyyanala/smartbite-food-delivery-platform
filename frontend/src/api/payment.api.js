import API from './axios';

export const createRazorpayOrder = (data) => API.post('/payments/create-order', data);
export const verifyPayment = (data) => API.post('/payments/verify', data);
export const refundPayment = (data) => API.post('/payments/refund', data);
export const convertCodToOnline = (data) => API.post('/payments/convert-cod', data);
