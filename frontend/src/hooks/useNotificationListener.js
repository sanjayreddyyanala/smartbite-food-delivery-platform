import { useEffect } from 'react';
import useSocketStore from '../store/useSocketStore';
import useAuthStore from '../store/useAuthStore';
import useNotificationStore from '../store/useNotificationStore';
import { ROLES } from '../constants';

/**
 * Hook that:
 * 1) Fetches persisted notifications from the backend when the user logs in.
 * 2) Listens to `new-notification` socket event for real-time pushes.
 * 3) Listens to legacy domain events so old socket-only notifications still work.
 *
 * Mount once at the app level (App.jsx).
 */
const useNotificationListener = () => {
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const { addNotification, fetchNotifications } = useNotificationStore();

  // ── Fetch persisted notifications when user is loaded ──
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user?._id]);

  // ── Real-time socket listeners ──
  useEffect(() => {
    if (!socket || !user) return;

    const handlers = [];
    const on = (event, handler) => {
      socket.on(event, handler);
      handlers.push({ event, handler });
    };

    // ─── PRIMARY: backend-pushed notification (persisted in DB) ───
    on('new-notification', (data) => {
      addNotification(data);
    });

    // ─── LEGACY FALLBACK: domain socket events that are NOT yet
    //     covered by the backend notification service (e.g. NGO room
    //     broadcasts, available-orders-updated)
    if (user.role === ROLES.DELIVERY) {
      on('available-orders-updated', () => {
        addNotification({
          type: 'order',
          title: '📋 New Orders Available',
          message: 'New delivery orders are available for pickup.',
          link: '/delivery/available',
          read: false,
          createdAt: new Date().toISOString(),
        });
      });
    }

    if (user.role === ROLES.NGO) {
      on('available-leftovers-updated', () => {
        addNotification({
          type: 'info',
          title: '🍽️ New Surplus Food',
          message: 'New leftover food is available for claim.',
          link: '/ngo/available',
          read: false,
          createdAt: new Date().toISOString(),
        });
      });
    }

    return () => {
      handlers.forEach(({ event, handler }) => socket.off(event, handler));
    };
  }, [socket, user, addNotification]);
};

export default useNotificationListener;

