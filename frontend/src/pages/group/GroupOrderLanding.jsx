import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUserGroup, HiOutlineQrcode, HiOutlineArrowRight } from 'react-icons/hi';
import * as groupApi from '../../api/groupOrder.api';
import Loading from '../../components/common/Loading';
import { formatPrice } from '../../utils/formatPrice';

const GroupOrderLanding = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active'); // 'active' or 'history'

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await groupApi.getMyGroupOrders();
      setGroups(data.groupOrders || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  // Active = active, locked, or ordered with an in-progress underlying order
  const activeGroups = groups.filter(g => {
    if (['active', 'locked'].includes(g.status)) return true;
    if (g.status === 'ordered') {
      const orderStatus = g.order?.status;
      // Still active if the underlying order hasn't reached a terminal state
      return orderStatus && !['delivered', 'cancelled', 'rejected'].includes(orderStatus);
    }
    return false;
  });

  // History = cancelled, expired, or ordered with delivered/cancelled/rejected order
  const historyGroups = groups.filter(g => {
    if (['cancelled', 'expired'].includes(g.status)) return true;
    if (g.status === 'ordered') {
      const orderStatus = g.order?.status;
      return !orderStatus || ['delivered', 'cancelled', 'rejected'].includes(orderStatus);
    }
    return false;
  });

  const statusBadge = (s) => {
    const cfg = {
      active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
      locked: { label: 'Locked', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      ordered: { label: 'Ordered', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
      delivered: { label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
      cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
      expired: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    };
    const st = cfg[s] || cfg.active;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        background: st.bg, color: st.color,
        padding: '0.3rem 0.65rem', borderRadius: '999px',
        fontSize: '0.75rem', fontWeight: 700,
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.color }} />
        {st.label}
      </span>
    );
  };

  const renderGroupList = (list, emptyMessage) => {
    if (list.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <span style={{ fontSize: '2rem' }}>📋</span>
          <p style={{ marginTop: '0.75rem' }}>{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list.map((g) => (
          <div
            key={g._id}
            onClick={() => ['active', 'locked', 'ordered'].includes(g.status) ? navigate(`/group/room/${g.code}`) : null}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem',
              cursor: ['active', 'locked', 'ordered'].includes(g.status) ? 'pointer' : 'default',
              border: '1px solid transparent', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (['active', 'locked', 'ordered'].includes(g.status)) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '0.5rem', flexShrink: 0,
                background: g.restaurant?.coverImage ? `url(${g.restaurant?.coverImage}) center/cover` : '#eee',
              }} />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                  {g.restaurant?.name || 'Restaurant'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {g.members?.length || 1} member(s) • Code: <strong>{g.code}</strong>
                </p>
                {g.createdAt && (
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {new Date(g.createdAt).toLocaleDateString()} {new Date(g.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            {statusBadge(g.status)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{
          fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem',
          background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Group Ordering
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Share a single cart with friends. Everyone picks their food, one delivery fee!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {/* Create */}
        <div
          onClick={() => navigate('/group/create')}
          className="card animate-fade-in"
          style={{ padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <div style={{ width: '64px', height: '64px', background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <HiOutlineUserGroup size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Create a Group</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', minHeight: '48px' }}>
            Pick a restaurant, set permissions, and invite friends.
          </p>
          <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem' }}>
            Get Started <HiOutlineArrowRight />
          </button>
        </div>

        {/* Join */}
        <div
          onClick={() => navigate('/group/join')}
          className="card animate-fade-in"
          style={{ padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: '2px solid transparent', animationDelay: '0.1s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <div style={{ width: '64px', height: '64px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <HiOutlineQrcode size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Join with Code</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', minHeight: '48px' }}>
            Have a 6-character code? Enter it to join a friend's group.
          </p>
          <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem' }}>
            Enter Code <HiOutlineArrowRight />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      {!loading && (activeGroups.length > 0 || historyGroups.length > 0) && (
        <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderRadius: '0.5rem', background: 'var(--color-bg-input)', padding: '0.25rem' }}>
            <button
              onClick={() => setTab('active')}
              style={{
                flex: 1, padding: '0.65rem', border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
                background: tab === 'active' ? 'var(--color-bg-card)' : 'transparent',
                color: tab === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: tab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Active ({activeGroups.length})
            </button>
            <button
              onClick={() => setTab('history')}
              style={{
                flex: 1, padding: '0.65rem', border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
                background: tab === 'history' ? 'var(--color-bg-card)' : 'transparent',
                color: tab === 'history' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: tab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              History ({historyGroups.length})
            </button>
          </div>

          {tab === 'active' && renderGroupList(activeGroups, 'No active group orders.')}
          {tab === 'history' && renderGroupList(historyGroups, 'No past group orders yet.')}
        </div>
      )}
    </div>
  );
};

export default GroupOrderLanding;
