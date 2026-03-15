import { useState, useEffect } from 'react';
import { HiOutlineUsers, HiOutlineClipboardList, HiOutlineTruck, HiOutlineCurrencyRupee, HiOutlineHeart, HiOutlineExclamationCircle } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import { formatPrice } from '../../utils/formatPrice';
import Loading from '../../components/common/Loading';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await adminApi.getDashboardStats();
      setStats(data.stats);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: <HiOutlineUsers size={24} />, color: '#3b82f6', clickable: true, to: '/admin/users' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals || 0, icon: <HiOutlineExclamationCircle size={24} />, color: '#f59e0b', clickable: true, to: '/admin/pending' },
    { label: 'Customers', value: stats?.totalCustomers || 0, icon: <HiOutlineUsers size={24} />, color: '#22c55e', clickable: true, to: '/admin/users?role=customer' },
    { label: 'Restaurants', value: stats?.totalRestaurants || 0, icon: <IoFastFoodOutline size={24} />, color: '#f97316', clickable: true, to: '/admin/restaurants' },
    { label: 'Delivery Partners', value: stats?.totalDeliveryPartners || 0, icon: <HiOutlineTruck size={24} />, color: '#8b5cf6', clickable: true, to: '/admin/delivery-partners' },
    { label: 'NGOs', value: stats?.totalNGOs || 0, icon: <HiOutlineHeart size={24} />, color: '#ec4899', clickable: true, to: '/admin/ngos' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: <HiOutlineClipboardList size={24} />, color: '#06b6d4', clickable: true, to: '/admin/orders' },
    { label: 'Delivered Orders', value: stats?.deliveredOrders || 0, icon: <HiOutlineClipboardList size={24} />, color: '#22c55e', clickable: true, to: '/admin/orders?tab=history' },
    { label: 'Live Orders', value: stats?.liveOrders || 0, icon: <HiOutlineClipboardList size={24} />, color: '#ef4444', clickable: true, to: '/admin/orders?tab=live' },
    { label: 'Total Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: <HiOutlineCurrencyRupee size={24} />, color: '#f59e0b' },
    { label: 'Delivery Total Earnings', value: formatPrice(stats?.deliveryTotalEarnings || 0), icon: <HiOutlineTruck size={24} />, color: '#8b5cf6', clickable: true, to: '/admin/delivery-partners' },
    { label: 'Delivery Unsettled', value: formatPrice(stats?.deliveryUnsettledAmount || 0), icon: <HiOutlineCurrencyRupee size={24} />, color: '#a855f7', clickable: true, to: '/admin/delivery-partners' },
    { label: 'Restaurant Total Earnings', value: formatPrice(stats?.restaurantTotalEarnings || 0), icon: <IoFastFoodOutline size={24} />, color: '#f97316', clickable: true, to: '/admin/restaurants' },
    { label: 'Restaurant Unsettled', value: formatPrice(stats?.restaurantUnsettledAmount || 0), icon: <HiOutlineCurrencyRupee size={24} />, color: '#fb923c', clickable: true, to: '/admin/restaurants' },
    { label: 'Leftover Claims', value: stats?.totalLeftoverClaims || 0, icon: <HiOutlineHeart size={24} />, color: '#14b8a6', clickable: true, to: '/admin/leftover-claims' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Overview of your platform's stats
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            className="card"
            onClick={card.clickable ? () => navigate(card.to) : undefined}
            style={{
              cursor: card.clickable ? 'pointer' : 'default',
              animation: `fadeIn 0.4s ease ${i * 0.05}s forwards`,
              opacity: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '0.75rem',
                background: `${card.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
              }}>
                {card.icon}
              </div>
              {card.clickable && stats?.pendingApprovals > 0 && (
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: card.color,
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }} />
              )}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
