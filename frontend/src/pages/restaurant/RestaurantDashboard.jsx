import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineClipboardList, HiOutlineCog, HiOutlineGift, HiOutlineBell, HiOutlineArrowRight } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import useSocketStore from '../../store/useSocketStore';
import * as restaurantApi from '../../api/restaurant.api';
import * as orderApi from '../../api/order.api';
import * as foodApi from '../../api/food.api';
import Loading from '../../components/common/Loading';

const RestaurantDashboard = () => {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({ menuItems: 0, liveOrders: 0 });
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: resData } = await restaurantApi.getMyRestaurant();
      setRestaurant(resData.restaurant);

      const [foodRes, orderRes] = await Promise.allSettled([
        foodApi.getRestaurantFoods(resData.restaurant._id),
        orderApi.getRestaurantLiveOrders(),
      ]);
      
      let liveCount = 0;
      let pendingCount = 0;
      if (orderRes.status === 'fulfilled') {
        const orders = orderRes.value.data.orders || [];
        liveCount = orders.filter(o => ['placed', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
        pendingCount = orders.filter(o => o.status === 'placed').length;
      }
      
      setStats({
        menuItems: foodRes.status === 'fulfilled' ? (foodRes.value.data.foods?.length || 0) : 0,
        liveOrders: liveCount,
      });
      setPendingOrdersCount(pendingCount);
    } catch (err) {
      if (err.response?.status === 404) {
        // Restaurant not created yet — will show setup prompt
        setRestaurant(null);
      } else {
        toast.error('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveOrdersOnly = async () => {
    try {
      const { data } = await orderApi.getRestaurantLiveOrders();
      const orders = data.orders || [];
      const liveCount = orders.filter(o => ['placed', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
      const pendingCount = orders.filter(o => o.status === 'placed').length;
      
      setStats(prev => ({ ...prev, liveOrders: liveCount }));
      setPendingOrdersCount(pendingCount);
    } catch (err) {
      console.error('Failed to fetch live orders count', err);
    }
  };

  useEffect(() => {
    if (socket && user?.role === 'restaurant') {
      socket.on('new-order', fetchLiveOrdersOnly);
      socket.on('order-status-changed', fetchLiveOrdersOnly);
    }
    return () => {
      if (socket) {
        socket.off('new-order', fetchLiveOrdersOnly);
        socket.off('order-status-changed', fetchLiveOrdersOnly);
      }
    };
  }, [socket, user]);

  const handleToggleOnline = async () => {
    if (!restaurant) return;
    setToggling(true);
    try {
      await restaurantApi.toggleOnline(restaurant._id);
      setRestaurant({ ...restaurant, isOnline: !restaurant.isOnline });
      toast.success(restaurant.isOnline ? 'Restaurant is now offline' : 'Restaurant is now online');
    } catch {
      toast.error('Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;

  if (!restaurant) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Set Up Your Restaurant</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Your restaurant profile hasn't been created yet. Head to Settings to set up your restaurant.
        </p>
        <Link to="/restaurant/settings" className="btn-primary" style={{ textDecoration: 'none' }}>
          Go to Settings
        </Link>
      </div>
    );
  }

  const quickLinks = [
    { to: '/restaurant/menu', icon: IoFastFoodOutline, label: 'Manage Menu', desc: `${stats.menuItems} items`, color: '#f97316' },
    { to: '/restaurant/orders', icon: HiOutlineClipboardList, label: 'Live Orders', desc: `${stats.liveOrders} active`, color: '#22c55e' },
    { to: '/restaurant/leftover', icon: HiOutlineGift, label: 'Leftover Food', desc: 'Post surplus food', color: '#a78bfa' },
    { to: '/restaurant/settings', icon: HiOutlineCog, label: 'Settings', desc: 'Edit profile', color: '#60a5fa' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Welcome back! 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {restaurant?.name || 'Your Restaurant'}
        </p>
      </div>

      {/* New Orders Notification Banner */}
      {pendingOrdersCount > 0 && (
        <Link to="/restaurant/orders" style={{ textDecoration: 'none' }}>
          <div className="animate-fade-in" style={{
            background: 'var(--color-bg-card)',
            border: '2px solid var(--color-error)',
            boxShadow: '0 8px 16px rgba(239, 68, 68, 0.15)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <HiOutlineBell size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                  Action Required
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.125rem' }}>
                  You have <strong style={{ color: 'var(--color-error)' }}>{pendingOrdersCount} new order{pendingOrdersCount !== 1 ? 's' : ''}</strong> waiting to be accepted.
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              color: 'var(--color-error)', fontWeight: 600, fontSize: '0.9rem' 
            }}>
              Accept Orders
              <HiOutlineArrowRight size={18} />
            </div>
          </div>
        </Link>
      )}

      {/* Online Toggle */}
      <div className="card" style={{
        marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: restaurant?.isOnline ? '1px solid rgba(34,197,94,0.3)' : undefined,
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            {restaurant?.isOnline ? '🟢 Restaurant is Online' : '🔴 Restaurant is Offline'}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {restaurant?.isOnline ? 'Customers can see your restaurant and place orders' : 'Your restaurant is hidden from customers'}
          </p>
        </div>
        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: restaurant?.isOnline ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            color: restaurant?.isOnline ? '#ef4444' : '#22c55e',
          }}
        >
          {toggling ? '...' : restaurant?.isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {quickLinks.map((link, i) => (
          <Link
            key={link.to}
            to={link.to}
            className="card animate-fade-in"
            style={{
              textDecoration: 'none', color: 'inherit',
              animationDelay: `${i * 0.05}s`,
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '0.75rem',
              background: `${link.color}15`, marginBottom: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <link.icon size={22} style={{ color: link.color }} />
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{link.label}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
