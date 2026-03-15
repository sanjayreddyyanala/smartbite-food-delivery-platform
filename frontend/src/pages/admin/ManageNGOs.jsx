import { useState, useEffect } from 'react';
import { HiOutlineBan, HiOutlineCheck, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { timeAgo } from '../../utils/formatDate';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'banned', label: 'Banned' },
];

const ManageNGOs = () => {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [banModal, setBanModal] = useState({ open: false, ngo: null });
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchNGOs();
  }, [statusFilter]);

  const fetchNGOs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAllNGOs(params);
      setNgos(data.ngos);
    } catch (err) {
      toast.error('Failed to load NGOs');
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async () => {
    const { ngo } = banModal;
    if (!ngo?.user) return;

    setActionLoading(ngo.user._id);
    setBanModal({ open: false, ngo: null });

    try {
      const { data } = await adminApi.toggleUserBan(ngo.user._id);
      toast.success(data.message);
      setNgos(ngos.map((n) =>
        n.user?._id === ngo.user._id
          ? { ...n, user: { ...n.user, status: data.user.status } }
          : n
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      approved: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      pending: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
      rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
      banned: { bg: 'rgba(239,68,68,0.25)', text: '#fca5a5' },
    };
    const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  const filteredNGOs = ngos.filter((n) => {
    if (!searchTerm || !n.user) return true;
    const term = searchTerm.toLowerCase();
    return (
      n.user.name?.toLowerCase().includes(term) ||
      n.user.email?.toLowerCase().includes(term) ||
      n.organizationName?.toLowerCase().includes(term)
    );
  });

  if (loading) return <Loading message="Loading NGOs..." />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          NGO Partners
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          View and manage all registered NGOs
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <HiOutlineSearch
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or org..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {filteredNGOs.length} NGOs
        </div>
      </div>

      {/* NGOs List */}
      {filteredNGOs.length === 0 ? (
        <EmptyState
          icon="💚"
          title="No NGOs found"
          message="Try adjusting your filters."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredNGOs.map((ngo, i) => (
            <div
              key={ngo._id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                animation: `fadeIn 0.3s ease ${i * 0.04}s forwards`,
                opacity: 0,
                ...(actionLoading === ngo.user?._id ? { opacity: 0.5, pointerEvents: 'none' } : {}),
              }}
            >
              {/* NGO Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {ngo.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.125rem' }}>
                    {ngo.user?.name || 'Unknown'}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {ngo.user?.email || '—'}
                  </div>
                  {ngo.organizationName && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                      🏢 {ngo.organizationName}
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {ngo.registrationNumber && (
                  <span className="badge" style={{
                    background: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa',
                  }}>
                    #{ngo.registrationNumber}
                  </span>
                )}
                {getStatusBadge(ngo.user?.status)}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {timeAgo(ngo.user?.createdAt)}
                </span>
              </div>

              {/* Ban/Unban */}
              <div>
                {ngo.user && (
                  <button
                    onClick={() => setBanModal({ open: true, ngo })}
                    disabled={actionLoading === ngo.user._id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      background: ngo.user.status === 'banned'
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(239,68,68,0.15)',
                      color: ngo.user.status === 'banned' ? '#22c55e' : '#ef4444',
                      border: `1px solid ${ngo.user.status === 'banned' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {ngo.user.status === 'banned' ? (
                      <><HiOutlineCheck size={14} /> Unban</>
                    ) : (
                      <><HiOutlineBan size={14} /> Ban</>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ban Modal */}
      <Modal
        isOpen={banModal.open}
        onClose={() => setBanModal({ open: false, ngo: null })}
        title={banModal.ngo?.user?.status === 'banned' ? 'Unban NGO' : 'Ban NGO'}
        maxWidth="420px"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            {banModal.ngo?.user?.status === 'banned' ? '✅' : '🚫'}
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Are you sure you want to{' '}
            <strong>{banModal.ngo?.user?.status === 'banned' ? 'unban' : 'ban'}</strong>{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{banModal.ngo?.user?.name}</strong>?
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            {banModal.ngo?.user?.status === 'banned'
              ? 'Their NGO access will be restored.'
              : 'They will be locked out of the platform immediately.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setBanModal({ open: false, ngo: null })}>
              Cancel
            </button>
            <button
              className={banModal.ngo?.user?.status === 'banned' ? 'btn-primary' : 'btn-danger'}
              onClick={handleBanToggle}
            >
              {banModal.ngo?.user?.status === 'banned' ? 'Unban' : 'Ban NGO'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageNGOs;
