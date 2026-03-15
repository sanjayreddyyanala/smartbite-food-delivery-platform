import { ORDER_STATUS, LEFTOVER_STATUS } from '../constants';

/**
 * Get CSS color class for order status
 * @param {string} status
 * @returns {{ bg: string, text: string }}
 */
export const getStatusColor = (status) => {
  const colors = {
    [ORDER_STATUS.PLACED]: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
    [ORDER_STATUS.ACCEPTED]: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
    [ORDER_STATUS.PREPARING]: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
    [ORDER_STATUS.READY]: { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
    [ORDER_STATUS.PICKED_UP]: { bg: 'rgba(236,72,153,0.15)', text: '#f472b6' },
    [ORDER_STATUS.DELIVERED]: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    [ORDER_STATUS.REJECTED]: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    [ORDER_STATUS.CANCELLED]: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    [LEFTOVER_STATUS.AVAILABLE]: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    [LEFTOVER_STATUS.CLAIMED]: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
    [LEFTOVER_STATUS.PICKED_UP]: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
    [LEFTOVER_STATUS.EXPIRED]: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
  };
  return colors[status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
};

/**
 * Get a human-readable label for status
 * @param {string} status
 * @returns {string}
 */
export const getStatusLabel = (status) => {
  const labels = {
    placed: 'Placed',
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready',
    picked_up: 'Picked Up',
    delivered: 'Delivered',
    rejected: 'Rejected',
    available: 'Available',
    claimed: 'Claimed',
    open: 'Open',
    ordered: 'Ordered',
    cancelled: 'Cancelled',
    expired: 'Expired',
  };
  return labels[status] || status;
};
