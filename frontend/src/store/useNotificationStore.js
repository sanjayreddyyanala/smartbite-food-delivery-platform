import { create } from 'zustand';
import * as notificationApi from '../api/notification.api';

const MAX_LOCAL = 50;

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  // ── Fetch persisted notifications from backend ──
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await notificationApi.getNotifications({ limit: MAX_LOCAL });
      set({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount ?? 0,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  // ── Add a real-time notification pushed via socket ──
  addNotification: (notification) => {
    // Normalise: backend sends _id, local fallback uses id
    const normalised = {
      ...notification,
      id: notification._id || notification.id || (Date.now() + Math.random()),
    };
    set((state) => ({
      notifications: [normalised, ...state.notifications].slice(0, MAX_LOCAL),
      unreadCount: state.unreadCount + 1,
    }));
  },

  // ── Mark one as read (optimistic + API) ──
  markAsRead: (id) => {
    const state = get();
    const notif = state.notifications.find((n) => n._id === id || n.id === id);
    if (!notif || notif.read) return;

    set((s) => ({
      notifications: s.notifications.map((n) =>
        (n._id === id || n.id === id) ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));

    notificationApi.markAsRead(id).catch(() => {});
  },

  // ── Mark all as read (optimistic + API) ──
  markAllAsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    notificationApi.markAllAsRead().catch(() => {});
  },

  // ── Clear all (optimistic + API) ──
  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
    notificationApi.clearAll().catch(() => {});
  },
}));

export default useNotificationStore;

