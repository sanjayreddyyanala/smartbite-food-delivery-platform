import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocketStore from '../store/useSocketStore';
import useGroupOrderStore from '../store/useGroupOrderStore';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

/**
 * Hook to manage socket listeners for a group order session.
 * Joins the socket room and listens for all group events.
 */
const useGroupOrder = (code) => {
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!socket || !code) return;

    // Join socket room
    const joinRoom = () => {
      socket.emit('join-group-order', { code });
      
      // If we already have an active order, join its tracking room too
      const { session } = useGroupOrderStore.getState();
      if (session?.order?._id) {
        socket.emit('join-order-room', { orderId: session.order._id });
      }
    };

    joinRoom();
    socket.on('connect', joinRoom);

    const { syncCart, syncMembers, syncStatus, syncPermission, syncRestaurant, clearGroup, setSession } =
      useGroupOrderStore.getState();

    // ===== Event handlers =====
    const handleMemberJoined = ({ member, members }) => {
      syncMembers(members);
      toast.success(`${member.name} joined the group!`);
    };

    const handleMemberLeft = ({ userId, members, items }) => {
      syncMembers(members);
      syncCart(items);
      if (userId === user?._id) {
        clearGroup();
        navigate('/group');
      }
    };

    const handleCartUpdated = ({ items }) => {
      syncCart(items);
    };

    const handleMembersUpdated = ({ members }) => {
      syncMembers(members);
    };

    const handleStatusChanged = ({ status }) => {
      syncStatus(status);
      if (status === 'locked') {
        toast('Cart has been locked by the host', { icon: '🔒' });
      } else if (status === 'active') {
        toast('Cart has been unlocked', { icon: '🔓' });
      }
    };

    const handlePermissionChanged = ({ cartPermission }) => {
      syncPermission(cartPermission);
      toast(`Cart permission changed to ${cartPermission}`, { icon: '⚙️' });
    };

    const handleRestaurantChanged = ({ restaurant, items }) => {
      syncRestaurant(restaurant, items);
      toast(`Restaurant changed to ${restaurant?.name || 'new restaurant'} — cart cleared`, { icon: '🔄' });
    };

    const handleOrderPlaced = ({ order }) => {
      syncStatus('ordered');
      // Store the order data so GroupOrderRoom can display status
      useGroupOrderStore.getState().setSession({
        ...useGroupOrderStore.getState().session,
        status: 'ordered',
        order,
      }, user?._id);
      toast.success('Group order placed!');
      // Stay in the room — don't navigate away
    };

    const handleKicked = ({ kickedUserId }) => {
      if (kickedUserId === user?._id) {
        clearGroup();
        toast.error('You were kicked from the group');
        navigate('/group');
      }
    };

    const handleCancelled = ({ message }) => {
      clearGroup();
      // Leave the socket group room to avoid orphan listeners
      if (socket && code) {
        socket.emit('leave-group-order', { code });
      }
      toast.error(message || 'Group session cancelled');
      navigate('/group');
    };

    const handleExpired = ({ message }) => {
      clearGroup();
      toast.error(message || 'Group session expired');
      navigate('/group');
    };

    const handleError = ({ message }) => {
      toast.error(message);
    };

    // Tracking events
    const handleOrderStatusChanged = async ({ orderId }) => {
      const { session, syncOrder } = useGroupOrderStore.getState();
      if (session?.order?._id === orderId) {
        try {
          // Re-fetch the single order to get the full updated payload (e.g. OTP generation)
          const res = await fetch(`/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
          }).then(r => r.json());
          
          if (res.success) {
            syncOrder(res.order);
          }
        } catch {
          // Fallback if fetch fails
          syncOrder({ ...session.order, status: 'updated' });
        }
      }
    };

    const handleLocationUpdate = ({ orderId, lat, lng }) => {
      const { session, syncDriverLocation } = useGroupOrderStore.getState();
      if (session?.order?._id === orderId && lat && lng) {
        syncDriverLocation({ lat, lng });
      }
    };

    socket.on('group:member-joined', handleMemberJoined);
    socket.on('group:member-left', handleMemberLeft);
    socket.on('group:cart-updated', handleCartUpdated);
    socket.on('group:members-updated', handleMembersUpdated);
    socket.on('group:status-changed', handleStatusChanged);
    socket.on('group:permission-changed', handlePermissionChanged);
    socket.on('group:restaurant-changed', handleRestaurantChanged);
    socket.on('group:order-placed', handleOrderPlaced);
    socket.on('group:you-were-kicked', handleKicked);
    socket.on('group:cancelled', handleCancelled);
    socket.on('group:expired', handleExpired);
    socket.on('group:error', handleError);
    
    socket.on('order-status-changed', handleOrderStatusChanged);
    socket.on('location-update', handleLocationUpdate);
    
    return () => {
      socket.off('connect', joinRoom);
      socket.off('group:member-joined', handleMemberJoined);
      socket.off('group:member-left', handleMemberLeft);
      socket.off('group:cart-updated', handleCartUpdated);
      socket.off('group:members-updated', handleMembersUpdated);
      socket.off('group:status-changed', handleStatusChanged);
      socket.off('group:permission-changed', handlePermissionChanged);
      socket.off('group:restaurant-changed', handleRestaurantChanged);
      socket.off('group:order-placed', handleOrderPlaced);
      socket.off('group:you-were-kicked', handleKicked);
      socket.off('group:cancelled', handleCancelled);
      socket.off('group:expired', handleExpired);
      socket.off('group:error', handleError);
      socket.off('order-status-changed', handleOrderStatusChanged);
      socket.off('location-update', handleLocationUpdate);
    };
  }, [socket, code]);

  // Countdown timer
  useEffect(() => {
    const { expiresAt } = useGroupOrderStore.getState();
    if (!expiresAt) return;

    const tick = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      useGroupOrderStore.getState().setTimeRemaining(Math.max(0, remaining));
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [useGroupOrderStore.getState().expiresAt]);
};

export default useGroupOrder;
