import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineCheck } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import * as ngoApi from '../../api/ngo.api';
import Loading from '../../components/common/Loading';

const NGODashboard = () => {
  const [availableCount, setAvailableCount] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [avail, claimed] = await Promise.allSettled([
        ngoApi.getAvailableLeftover(),
        ngoApi.getClaimedLeftover(),
      ]);
      if (avail.status === 'fulfilled') setAvailableCount(avail.value.data.leftovers?.length || 0);
      if (claimed.status === 'fulfilled') setClaimedCount(claimed.value.data.claims?.length || 0);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;

  const quickLinks = [
    { to: '/ngo/available', icon: IoFastFoodOutline, label: 'Available Food', desc: `${availableCount} posts`, color: '#22c55e' },
    { to: '/ngo/claimed', icon: HiOutlineCheck, label: 'My Claims', desc: `${claimedCount} claimed`, color: '#60a5fa' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          NGO Dashboard 🤝
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Help reduce food waste by claiming surplus food
        </p>
      </div>

      {/* Stats */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>{availableCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Available Posts</div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-info)' }}>{claimedCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>My Claims</div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
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

export default NGODashboard;
