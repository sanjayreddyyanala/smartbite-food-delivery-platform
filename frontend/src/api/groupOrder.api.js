import API from './axios';

// Session lifecycle
export const createGroupOrder = (data) => API.post('/group-orders', data);
export const getGroupOrder = (code) => API.get(`/group-orders/${code}`);
export const joinGroupOrder = (code) => API.post(`/group-orders/${code}/join`);
export const leaveGroupOrder = (code) => API.post(`/group-orders/${code}/leave`);
export const cancelSession = (code) => API.delete(`/group-orders/${code}`);
export const getMyGroupOrders = () => API.get('/group-orders/my-groups');

// Cart items
export const addItem = (code, data) => API.post(`/group-orders/${code}/add-item`, data);
export const updateItem = (code, itemId, data) => API.patch(`/group-orders/${code}/update-item/${itemId}`, data);
export const removeItem = (code, itemId) => API.delete(`/group-orders/${code}/remove-item/${itemId}`);

// Member actions
export const toggleReady = (code) => API.patch(`/group-orders/${code}/ready`);
export const lockCart = (code) => API.patch(`/group-orders/${code}/lock`);
export const unlockCart = (code) => API.patch(`/group-orders/${code}/unlock`);
export const kickMember = (code, userId) => API.patch(`/group-orders/${code}/kick/${userId}`);
export const changePermission = (code, data) => API.patch(`/group-orders/${code}/permission`, data);
export const changeRestaurant = (code, data) => API.patch(`/group-orders/${code}/restaurant`, data);

// Checkout
export const placeGroupOrder = (code, data) => API.post(`/group-orders/${code}/place-order`, data);
export const inviteByEmail = (code, data) => API.post(`/group-orders/${code}/invite`, data);
