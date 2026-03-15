import API from './axios';

export const getAvailableLeftover = () => API.get('/leftover-food/available');
export const claimLeftover = (id) => API.patch('/ngo/claim/' + id);
export const getClaimedLeftover = () => API.get('/ngo/my-claims');
