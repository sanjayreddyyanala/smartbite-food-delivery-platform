import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineClipboardList, HiOutlineClock, HiOutlineCog, HiOutlineLightningBolt } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as deliveryApi from '../../api/delivery.api';
import * as orderApi from '../../api/order.api';
import Loading from '../../components/common/Loading';

const DeliveryDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, ordersRes] = await Promise.allSettled([
        deliveryApi.getDeliveryProfile(),
        orderApi.getAvailableDeliveryOrders(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data.profile || profileRes.value.data.user);
      if (ordersRes.status === 'fulfilled') setAvailableCount(ordersRes.value.data.orders?.length || 0);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;

  const quickLinks = [
    { to: '/delivery/available', icon: HiOutlineClipboardList, label: 'Available Orders', desc: `${availableCount} orders`, color: '#22c55e' },
    { to: '/delivery/history', icon: HiOutlineClock, label: 'Delivery History', desc: 'Past deliveries', color: '#60a5fa' },
    { to: '/delivery/profile', icon: HiOutlineCog, label: 'Profile', desc: 'Edit your info', color: '#a78bfa' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Welcome back! 🚴
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {profile?.name || 'Delivery Partner'}
        </p>
      </div>

      {/* Stats */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{availableCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Available Orders</div>
        </div>
        {profile?.vehicleType && (
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>{profile.vehicleType}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Vehicle</div>
          </div>
        )}
      </div>

      {profile?.currentOrder && (
        <Link
          to={`/delivery/active/${profile.currentOrder._id || profile.currentOrder}`}
          className="card animate-fade-in"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)',
            border: '1px solid rgba(34,197,94,0.3)',
            textDecoration: 'none', color: 'inherit', marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#22c55e', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HiOutlineLightningBolt size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-success)' }}>Active Delivery</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                You have an ongoing order. Tap to view details.
              </p>
            </div>
          </div>
          <div style={{ color: 'var(--color-success)' }}>→</div>
        </Link>
      )}

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {quickLinks.map((link, i) => (
          <Link
            key={link.to}
            to={link.to}
            className="card animate-fade-in"
            style={{ textDecoration: 'none', color: 'inherit', animationDelay: `${i * 0.05}s`, cursor: 'pointer', transition: 'transform 0.2s' }}
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

export default DeliveryDashboard;
