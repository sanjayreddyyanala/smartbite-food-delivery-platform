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

const ManageDeliveryPartners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [banModal, setBanModal] = useState({ open: false, partner: null });
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, [statusFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAllDeliveryPartners(params);
      setPartners(data.deliveryPartners);
    } catch (err) {
      toast.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async () => {
    const { partner } = banModal;
    if (!partner?.user) return;

    setActionLoading(partner.user._id);
    setBanModal({ open: false, partner: null });

    try {
      const { data } = await adminApi.toggleUserBan(partner.user._id);
      toast.success(data.message);
      setPartners(partners.map((p) =>
        p.user?._id === partner.user._id
          ? { ...p, user: { ...p.user, status: data.user.status } }
          : p
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (partner) => {
    if (!partner?._id) return;
    if (!window.confirm(`Mark ₹${(partner.unsettledEarnings || 0).toFixed(2)} as paid to ${partner.user?.name || 'this delivery partner'}?`)) {
      return;
    }

    setActionLoading(partner.user?._id || partner._id);
    try {
      const { data } = await adminApi.markDeliveryPayoutPaid(partner._id);
      toast.success(data.message || 'Payout marked as paid');
      setPartners((prev) => prev.map((p) => (p._id === partner._id ? data.profile : p)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark payout paid');
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

  const maskAccount = (num) => {
    if (!num) return 'Not set';
    const digits = String(num);
    if (digits.length <= 4) return digits;
    return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  };

  const filteredPartners = partners.filter((p) => {
    if (!searchTerm || !p.user) return true;
    const term = searchTerm.toLowerCase();
    return p.user.name?.toLowerCase().includes(term) || p.user.email?.toLowerCase().includes(term);
  });

  if (loading) return <Loading message="Loading delivery partners..." />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Delivery Partners
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          View and manage all delivery partners
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
            placeholder="Search by name or email..."
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
          {filteredPartners.length} partners
        </div>
      </div>

      {/* Partners List */}
      {filteredPartners.length === 0 ? (
        <EmptyState
          icon="🚴"
          title="No delivery partners found"
          message="Try adjusting your filters."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredPartners.map((partner, i) => (
            <div
              key={partner._id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                animation: `fadeIn 0.3s ease ${i * 0.04}s forwards`,
                opacity: 0,
                ...(actionLoading === partner.user?._id ? { opacity: 0.5, pointerEvents: 'none' } : {}),
              }}
            >
              {/* Partner Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {partner.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.125rem' }}>
                    {partner.user?.name || 'Unknown'}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {partner.user?.email || '—'}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {partner.vehicleType && (
                  <span className="badge" style={{
                    background: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa',
                    textTransform: 'capitalize',
                  }}>
                    🏍️ {partner.vehicleType}
                  </span>
                )}
                {partner.isAvailable !== undefined && (
                  <span className="badge" style={{
                    background: partner.isAvailable ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                    color: partner.isAvailable ? '#22c55e' : '#94a3b8',
                  }}>
                    {partner.isAvailable ? '🟢 Available' : '⚫ Offline'}
                  </span>
                )}
                {getStatusBadge(partner.user?.status)}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {timeAgo(partner.user?.createdAt)}
                </span>
              </div>

              <div style={{ width: '100%', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                <strong>Payout:</strong>{' '}
                {partner.bankDetails?.accountNumber ? (
                  <>
                    Ready • {partner.bankDetails.bankName || 'Bank'} • A/C {maskAccount(partner.bankDetails.accountNumber)}
                    {partner.bankDetails.ifscCode ? ` • IFSC ${partner.bankDetails.ifscCode}` : ''}
                  </>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>Not configured yet</span>
                )}
              </div>

              <div style={{ width: '100%', marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                <span><strong>Total Earned:</strong> ₹{Number(partner.earnings || 0).toFixed(2)}</span>
                <span><strong>Unsettled:</strong> ₹{Number(partner.unsettledEarnings || 0).toFixed(2)}</span>
                <span><strong>Total Paid:</strong> ₹{Number(partner.totalPaidOut || 0).toFixed(2)}</span>
              </div>

              {/* Ban/Unban */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {Number(partner.unsettledEarnings || 0) > 0 && (
                  <button
                    onClick={() => handleMarkPaid(partner)}
                    disabled={actionLoading === (partner.user?._id || partner._id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      background: 'rgba(34,197,94,0.15)',
                      color: '#22c55e',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    💸 Mark Paid
                  </button>
                )}
                {partner.user && (
                  <button
                    onClick={() => setBanModal({ open: true, partner })}
                    disabled={actionLoading === partner.user._id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      background: partner.user.status === 'banned'
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(239,68,68,0.15)',
                      color: partner.user.status === 'banned' ? '#22c55e' : '#ef4444',
                      border: `1px solid ${partner.user.status === 'banned' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {partner.user.status === 'banned' ? (
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
        onClose={() => setBanModal({ open: false, partner: null })}
        title={banModal.partner?.user?.status === 'banned' ? 'Unban Partner' : 'Ban Partner'}
        maxWidth="420px"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            {banModal.partner?.user?.status === 'banned' ? '✅' : '🚫'}
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Are you sure you want to{' '}
            <strong>{banModal.partner?.user?.status === 'banned' ? 'unban' : 'ban'}</strong>{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{banModal.partner?.user?.name}</strong>?
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            {banModal.partner?.user?.status === 'banned'
              ? 'Their delivery access will be restored.'
              : 'They will be locked out of deliveries immediately.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setBanModal({ open: false, partner: null })}>
              Cancel
            </button>
            <button
              className={banModal.partner?.user?.status === 'banned' ? 'btn-primary' : 'btn-danger'}
              onClick={handleBanToggle}
            >
              {banModal.partner?.user?.status === 'banned' ? 'Unban' : 'Ban Partner'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageDeliveryPartners;
