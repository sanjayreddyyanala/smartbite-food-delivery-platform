import { useState, useEffect } from 'react';
import { HiOutlineCheck, HiOutlineX, HiOutlineClock, HiOutlineEye, HiOutlineMail, HiOutlineCalendar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatDate, timeAgo } from '../../utils/formatDate';

const PendingApprovals = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null, action: null });
  const [detailUser, setDetailUser] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const { data } = await adminApi.getPendingUsers();
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    const { user, action } = confirmModal;
    if (!user || !action) return;

    setActionLoading(user._id);
    setConfirmModal({ open: false, user: null, action: null });

    try {
      if (action === 'approve') {
        await adminApi.approveUser(user._id);
        toast.success(`${user.name} has been approved! ✅`);
      } else {
        await adminApi.rejectUser(user._id);
        toast.success(`${user.name} has been rejected`);
      }
      setUsers(users.filter((u) => u._id !== user._id));
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirm = (user, action) => {
    setConfirmModal({ open: true, user, action });
  };

  const getRoleBadge = (role) => {
    const colors = {
      restaurant: { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
      delivery: { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
      ngo: { bg: 'rgba(236,72,153,0.15)', text: '#f472b6' },
    };
    const c = colors[role] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text, textTransform: 'capitalize' }}>
        {role === 'delivery' ? 'Delivery Partner' : role}
      </span>
    );
  };

  if (loading) return <Loading message="Loading pending approvals..." />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Pending Approvals
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Review and approve or reject registration requests
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="All caught up!"
          message="There are no pending approvals at the moment."
        />
      ) : (
        <>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.875rem',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '999px',
            fontSize: '0.8rem',
            color: 'var(--color-warning)',
            fontWeight: 600,
            marginBottom: '1rem',
          }}>
            <HiOutlineClock size={14} />
            {users.length} pending {users.length === 1 ? 'request' : 'requests'}
          </div>

          {/* Sort Row */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'newest', label: '⬇ Newest' },
              { key: 'oldest', label: '⬆ Oldest' },
              { key: 'role', label: '🏷️ By Role' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem',
                  fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
                  ...(sortBy === opt.key
                    ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                    : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...users]
              .sort((a, b) => {
                if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
                if (sortBy === 'role') return (a.role || '').localeCompare(b.role || '');
                return new Date(b.createdAt) - new Date(a.createdAt);
              })
              .map((user, i) => (
              <div
                key={user._id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  cursor: 'pointer',
                  animation: `fadeIn 0.4s ease ${i * 0.05}s forwards`,
                  opacity: 0,
                  ...(actionLoading === user._id ? { opacity: 0.5, pointerEvents: 'none' } : {}),
                }}
                onClick={() => setDetailUser(user)}
              >
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.125rem' }}>
                      {user.name}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* Role + Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {getRoleBadge(user.role)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {timeAgo(user.createdAt)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openConfirm(user, 'approve'); }}
                    disabled={actionLoading === user._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.5rem 1rem', background: 'rgba(34,197,94,0.15)',
                      color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem',
                      fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}
                  >
                    <HiOutlineCheck size={16} /> Approve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openConfirm(user, 'reject'); }}
                    disabled={actionLoading === user._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem',
                      fontWeight: 600, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                  >
                    <HiOutlineX size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null, action: null })}
        title={`${confirmModal.action === 'approve' ? 'Approve' : 'Reject'} User`}
        maxWidth="400px"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            {confirmModal.action === 'approve' ? '✅' : '❌'}
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Are you sure you want to <strong>{confirmModal.action}</strong>{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{confirmModal.user?.name}</strong>?
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            {confirmModal.action === 'approve'
              ? 'They will be able to access their dashboard immediately.'
              : 'They will not be able to access the platform.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => setConfirmModal({ open: false, user: null, action: null })}
            >
              Cancel
            </button>
            <button
              className={confirmModal.action === 'approve' ? 'btn-primary' : 'btn-danger'}
              onClick={handleAction}
            >
              {confirmModal.action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        title="User Details"
        maxWidth="480px"
      >
        {detailUser && (
          <div>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {detailUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{detailUser.name}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {getRoleBadge(detailUser.role)}
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', marginLeft: '0.375rem' }}>Pending</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div style={{ background: 'var(--color-bg-input)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Contact Information</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <HiOutlineMail size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <a href={`mailto:${detailUser.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
                    {detailUser.email}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <HiOutlineCalendar size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Registered {formatDate(detailUser.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div style={{ background: 'var(--color-bg-input)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Account Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>User ID</div>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{detailUser._id?.slice(-10)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Applied As</div>
                  <div style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>{detailUser.role === 'delivery' ? 'Delivery Partner' : detailUser.role}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { setDetailUser(null); openConfirm(detailUser, 'approve'); }}
              >
                ✅ Approve
              </button>
              <button
                className="btn-danger"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => { setDetailUser(null); openConfirm(detailUser, 'reject'); }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingApprovals;
