import { useState, useEffect } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { timeAgo } from '../../utils/formatDate';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

const ManageRestaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, [statusFilter]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAllRestaurants(params);
      setRestaurants(data.restaurants);
    } catch (err) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      approved: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      pending: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
      rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    };
    const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text, textTransform: 'capitalize' }}>
        {status}
      </span>
    );
  };

  const handleMarkPaid = async (restaurant) => {
    if (!restaurant?._id) return;
    if (!window.confirm(`Mark ₹${(restaurant.unsettledEarnings || 0).toFixed(2)} as paid to ${restaurant.name}?`)) {
      return;
    }

    try {
      const { data } = await adminApi.markRestaurantPayoutPaid(restaurant._id);
      toast.success(data.message || 'Payout marked as paid');
      setRestaurants((prev) => prev.map((r) => (r._id === restaurant._id ? data.restaurant : r)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark payout paid');
    }
  };

  const maskAccount = (num) => {
    if (!num) return 'Not set';
    const digits = String(num);
    if (digits.length <= 4) return digits;
    return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  };

  const filteredRestaurants = restaurants.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.owner?.name?.toLowerCase().includes(term) ||
      r.owner?.email?.toLowerCase().includes(term) ||
      r.cuisine?.some((c) => c.toLowerCase().includes(term))
    );
  });

  if (loading) return <Loading message="Loading restaurants..." />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Restaurants
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          View and manage all registered restaurants
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
            placeholder="Search by name, owner, or cuisine..."
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
          {filteredRestaurants.length} restaurants
        </div>
      </div>

      {/* Restaurant List */}
      {filteredRestaurants.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="No restaurants found"
          message="Try adjusting your filters."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
        }}>
          {filteredRestaurants.map((restaurant, i) => (
            <div
              key={restaurant._id}
              className="card"
              style={{
                animation: `fadeIn 0.3s ease ${i * 0.04}s forwards`,
                opacity: 0,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}>
                  🍽️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.125rem' }}>
                    {restaurant.name}
                  </div>
                  {restaurant.owner && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                      by {restaurant.owner.name} · {restaurant.owner.email}
                    </div>
                  )}
                </div>
                {getStatusBadge(restaurant.status)}
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {restaurant.cuisine?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {restaurant.cuisine.map((c, ci) => (
                      <span
                        key={ci}
                        className="badge"
                        style={{
                          background: 'rgba(249,115,22,0.1)',
                          color: '#fb923c',
                          fontSize: '0.7rem',
                          textTransform: 'capitalize',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {restaurant.address?.street && (
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    📍 {restaurant.address.street}{restaurant.address.city ? `, ${restaurant.address.city}` : ''}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(51,65,85,0.5)',
                }}>
                  {restaurant.rating !== undefined && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                      ⭐ {restaurant.rating?.toFixed(1) || 'N/A'}
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {timeAgo(restaurant.createdAt)}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  <strong>Payout:</strong>{' '}
                  {restaurant.bankDetails?.accountNumber ? (
                    <>
                      Ready • {restaurant.bankDetails.bankName || 'Bank'} • A/C {maskAccount(restaurant.bankDetails.accountNumber)}
                      {restaurant.bankDetails.ifscCode ? ` • IFSC ${restaurant.bankDetails.ifscCode}` : ''}
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>Not configured yet</span>
                  )}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                  <span><strong>Total Earned:</strong> ₹{Number(restaurant.totalEarnings || 0).toFixed(2)}</span>
                  <span><strong>Unsettled:</strong> ₹{Number(restaurant.unsettledEarnings || 0).toFixed(2)}</span>
                  <span><strong>Total Paid:</strong> ₹{Number(restaurant.totalPaidOut || 0).toFixed(2)}</span>
                </div>

                {Number(restaurant.unsettledEarnings || 0) > 0 && (
                  <button
                    onClick={() => handleMarkPaid(restaurant)}
                    style={{
                      marginTop: '0.5rem',
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
                    💸 Mark Payout Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageRestaurants;
