import { NavLink } from 'react-router-dom';
import { 
  HiOutlineClipboardList, 
  HiOutlineClock, 
  HiOutlineCog,
  HiOutlineGift,
  HiOutlineUsers,
  HiOutlineTruck,
  HiOutlineHome,
  HiOutlineCheck,
  HiOutlineHeart,
  HiOutlineUserGroup,
  HiOutlineCurrencyRupee,
} from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import { useState, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import useSocketStore from '../../store/useSocketStore';
import * as orderApi from '../../api/order.api';
import * as adminApi from '../../api/admin.api';
import * as restaurantApi from '../../api/restaurant.api';
import { ROLES } from '../../constants';

const sidebarLinks = {
  [ROLES.RESTAURANT]: [
    { to: '/restaurant/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/restaurant/menu', label: 'Menu', icon: IoFastFoodOutline },
    { to: '/restaurant/orders', label: 'Live Orders', icon: HiOutlineClipboardList },
    { to: '/restaurant/history', label: 'Order History', icon: HiOutlineClock },
    { to: '/restaurant/earnings', label: 'Earnings', icon: HiOutlineCurrencyRupee },
    { to: '/restaurant/leftover', label: 'Leftover Food', icon: HiOutlineGift },
    { to: '/restaurant/settings', label: 'Settings', icon: HiOutlineCog },
  ],
  [ROLES.DELIVERY]: [
    { to: '/delivery/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/delivery/available', label: 'Available Orders', icon: HiOutlineClipboardList },
    { to: '/delivery/history', label: 'Delivery History', icon: HiOutlineClock },
    { to: '/delivery/earnings', label: 'Earnings', icon: HiOutlineCurrencyRupee },
    { to: '/delivery/profile', label: 'Profile', icon: HiOutlineCog },
  ],
  [ROLES.NGO]: [
    { to: '/ngo/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/ngo/available', label: 'Available Food', icon: IoFastFoodOutline },
    { to: '/ngo/claimed', label: 'My Claims', icon: HiOutlineCheck },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/admin/pending', label: 'Pending Approvals', icon: HiOutlineCheck },
    { to: '/admin/users', label: 'All Users', icon: HiOutlineUserGroup },
    { to: '/admin/delivery-partners', label: 'Delivery Partners', icon: HiOutlineTruck },
    { to: '/admin/ngos', label: 'NGOs', icon: HiOutlineHeart },
    { to: '/admin/restaurants', label: 'Restaurants', icon: IoFastFoodOutline },
    { to: '/admin/orders', label: 'Orders', icon: HiOutlineClipboardList },
    { to: '/admin/leftover-claims', label: 'Leftover Claims', icon: HiOutlineGift },
  ],
};

const Sidebar = () => {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [availableOrdersCount, setAvailableOrdersCount] = useState(0);

  const [availableLeftoversCount, setAvailableLeftoversCount] = useState(0);

  const links = sidebarLinks[user?.role] || [];

  const fetchLiveOrdersCount = async () => {
    if (user?.role !== ROLES.RESTAURANT) return;
    try {
      const { data } = await orderApi.getRestaurantLiveOrders();
      // Only count practically active orders: placed, accepted, preparing, ready
      const active = (data.orders || []).filter(o => 
        ['placed', 'accepted', 'preparing', 'ready'].includes(o.status)
      );
      setActiveOrdersCount(active.length);
    } catch (err) {
      console.error('Failed to fetch live orders count', err);
    }
  };

  const fetchPendingApprovalsCount = async () => {
    if (user?.role !== ROLES.ADMIN) return;
    try {
      const { data } = await adminApi.getPendingUsers();
      // data.users contains the list of pending users
      const pendingUsers = data.users || [];
      setPendingApprovalsCount(pendingUsers.length);
    } catch (err) {
      console.error('Failed to fetch pending approvals count', err);
    }
  };

  const fetchAvailableOrdersCount = async () => {
    if (user?.role !== ROLES.DELIVERY) return;
    try {
      const { data } = await orderApi.getAvailableDeliveryOrders();
      setAvailableOrdersCount((data.orders || []).length);
    } catch (err) {
      console.error('Failed to fetch available orders count', err);
    }
  };

  const fetchAvailableLeftoversCount = async () => {
    if (user?.role !== ROLES.NGO) return;
    try {
      // Import here to avoid circular dependencies if any, otherwise can be top-level import
      const ngoApi = await import('../../api/ngo.api');
      const { data } = await ngoApi.getAvailableLeftover();
      setAvailableLeftoversCount((data.leftovers || []).length);
    } catch (err) {
      console.error('Failed to fetch available leftovers count', err);
    }
  };

  useEffect(() => {
    fetchLiveOrdersCount();
    fetchPendingApprovalsCount();
    fetchAvailableOrdersCount();
    fetchAvailableLeftoversCount();

    if (socket) {
      if (user?.role === ROLES.RESTAURANT) {
        // Join restaurant room so new-order events are received
        const joinRestaurantRoom = async () => {
          try {
            const { data } = await restaurantApi.getMyRestaurant();
            const rid = data.restaurant?._id;
            if (rid) {
              socket.emit('join-restaurant-room', { restaurantId: rid });
            }
          } catch (e) {
            console.error('Could not join restaurant room for sidebar', e);
          }
        };
        joinRestaurantRoom();
        socket.on('connect', joinRestaurantRoom);
        socket.on('new-order', fetchLiveOrdersCount);
        socket.on('order-status-changed', fetchLiveOrdersCount);
      }
      if (user?.role === ROLES.DELIVERY) {
        const joinRoom = () => socket.emit('join-delivery-room');
        joinRoom();
        socket.on('connect', joinRoom);
        socket.on('available-orders-updated', fetchAvailableOrdersCount);
      }
      if (user?.role === ROLES.NGO) {
        const joinRoom = () => socket.emit('join-ngo-room');
        joinRoom();
        socket.on('connect', joinRoom);
        socket.on('available-leftovers-updated', fetchAvailableLeftoversCount);
      }
    }

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('new-order', fetchLiveOrdersCount);
        socket.off('order-status-changed', fetchLiveOrdersCount);
        socket.off('available-orders-updated', fetchAvailableOrdersCount);
        socket.off('available-leftovers-updated', fetchAvailableLeftoversCount);
      }
    };
  }, [socket, user]);

  if (!links.length) return null;

  return (
    <aside style={{
      width: '260px',
      minHeight: 'calc(100vh - 64px)',
      background: 'var(--color-bg-card)',
      borderRight: '1px solid var(--color-border)',
      padding: '1.5rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}>
      <div style={{
        padding: '0 0.75rem',
        marginBottom: '1rem',
      }}>
        <h3 style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-text-muted)',
        }}>
          {user?.role === ROLES.RESTAURANT ? 'Restaurant' : 
           user?.role === ROLES.DELIVERY ? 'Delivery' :
           user?.role === ROLES.NGO ? 'NGO' : 'Admin'} Panel
        </h3>
      </div>

      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.75rem',
            borderRadius: '0.65rem',
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
            textDecoration: 'none',
            transition: 'all 0.2s',
          })}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <link.icon size={18} />
              {link.label}
            </div>
            {link.label === 'Live Orders' && activeOrdersCount > 0 && (
              <span style={{
                background: 'var(--color-error)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '0.125rem 0.4rem',
                borderRadius: '999px',
                minWidth: '20px',
                textAlign: 'center',
              }}>
                {activeOrdersCount}
              </span>
            )}
            {link.label === 'Available Orders' && availableOrdersCount > 0 && (
              <span style={{
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '0.125rem 0.4rem',
                borderRadius: '999px',
                minWidth: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(249, 115, 34, 0.2)'
              }}>
                {availableOrdersCount}
              </span>
            )}
            {link.label === 'Available Food' && availableLeftoversCount > 0 && (
              <span style={{
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '0.125rem 0.4rem',
                borderRadius: '999px',
                minWidth: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(249, 115, 34, 0.2)'
              }}>
                {availableLeftoversCount}
              </span>
            )}
            {link.label === 'Pending Approvals' && pendingApprovalsCount > 0 && (
              <span style={{
                background: 'var(--color-warning)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '0.125rem 0.4rem',
                borderRadius: '999px',
                minWidth: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)' /* Optional shadow for contrast */
              }}>
                {pendingApprovalsCount}
              </span>
            )}
          </div>
        </NavLink>
      ))}
    </aside>
  );
};

export default Sidebar;
