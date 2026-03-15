import { useState, useEffect } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatDate, timeAgo } from '../../utils/formatDate';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'available', label: '🟢 Available' },
  { key: 'claimed', label: '🟡 Claimed' },
  { key: 'expired', label: '🔴 Expired' },
];

const LeftoverClaims = () => {
  const [leftovers, setLeftovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetchLeftovers();
  }, [statusFilter]);

  const fetchLeftovers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAllLeftoverClaims(params);
      setLeftovers(data.leftovers);
    } catch (err) {
      toast.error('Failed to load leftover claims');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      available: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', label: 'Available' },
      claimed: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', label: 'Claimed' },
      expired: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Expired' },
    };
    const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', label: status };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text }}>{c.label}</span>
    );
  };

  const isExpired = (bestBefore) => new Date() > new Date(bestBefore);

  const filteredLeftovers = leftovers.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.description?.toLowerCase().includes(term) ||
      l.restaurant?.name?.toLowerCase().includes(term) ||
      l.claimedBy?.user?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Leftover Food Claims
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Track leftover food posted by restaurants and claimed by NGOs
        </p>
      </div>

      {/* Status Tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        background: 'var(--color-bg-input)', borderRadius: '0.75rem',
        padding: '0.25rem', width: 'fit-content',
      }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none',
              cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: statusFilter === tab.key ? 600 : 400,
              background: statusFilter === tab.key ? 'var(--color-primary)' : 'transparent',
              color: statusFilter === tab.key ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <HiOutlineSearch size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by food, restaurant, or NGO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
          />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {filteredLeftovers.length} items
        </div>
      </div>

      {/* Leftover List */}
      {loading ? (
        <Loading message="Loading leftover claims..." />
      ) : filteredLeftovers.length === 0 ? (
        <EmptyState icon="🍲" title="No leftover food found" message="Try adjusting your filters." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filteredLeftovers.map((item, i) => (
            <div
              key={item._id}
              onClick={() => setDetailItem(item)}
              style={{
                background: 'var(--color-bg-card)', borderRadius: '1rem',
                border: '1px solid var(--color-border)', padding: '1.25rem',
                cursor: 'pointer', transition: 'all 0.2s',
                animation: `fadeIn 0.3s ease ${i * 0.04}s forwards`, opacity: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, flex: 1, lineHeight: 1.3 }}>
                  {item.description?.length > 60 ? item.description.slice(0, 60) + '…' : item.description}
                </div>
                <div style={{ marginLeft: '0.5rem' }}>{getStatusBadge(item.status)}</div>
              </div>

              {/* Restaurant */}
              <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                🏪 {item.restaurant?.name || 'Unknown Restaurant'}
              </div>

              {/* Meta Row */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                <span>📦 {item.quantity}</span>
                <span style={{ color: isExpired(item.bestBefore) ? '#ef4444' : 'var(--color-text-muted)' }}>
                  ⏰ Best before: {formatDate(item.bestBefore)}
                </span>
              </div>

              {/* Claimed By */}
              {item.claimedBy && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
                  fontSize: '0.78rem', marginTop: '0.5rem',
                }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Claimed by: </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {item.claimedBy?.user?.name || 'Unknown NGO'}
                  </span>
                  {item.claimedAt && (
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                      • {timeAgo(item.claimedAt)}
                    </span>
                  )}
                </div>
              )}

              {/* Collected Badge */}
              {item.collectedAt && (
                <div style={{
                  background: 'rgba(34,197,94,0.1)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
                  fontSize: '0.78rem', marginTop: '0.375rem', color: '#22c55e', fontWeight: 500,
                }}>
                  ✅ Collected {timeAgo(item.collectedAt)}
                </div>
              )}

              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Posted {timeAgo(item.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Leftover Food Details"
        maxWidth="520px"
      >
        {detailItem && (
          <div>
            {/* Status + Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>{getStatusBadge(detailItem.status)}</div>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                {detailItem.description}
              </p>
            </div>

            {/* Restaurant Info */}
            <div style={{
              background: 'var(--color-bg-input)', borderRadius: '0.75rem',
              padding: '1rem', marginBottom: '1rem',
            }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Restaurant</h4>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                {detailItem.restaurant?.name || '—'}
              </div>
              {detailItem.restaurant?.phone && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  📞 <a href={`tel:${detailItem.restaurant.phone}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{detailItem.restaurant.phone}</a>
                </div>
              )}
              {detailItem.restaurant?.address && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  📍 {detailItem.restaurant.address.street}, {detailItem.restaurant.address.city}
                </div>
              )}
            </div>

            {/* Food Details */}
            <div style={{
              background: 'var(--color-bg-input)', borderRadius: '0.75rem',
              padding: '1rem', marginBottom: '1rem',
            }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Food Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Quantity</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{detailItem.quantity}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Best Before</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isExpired(detailItem.bestBefore) ? '#ef4444' : 'var(--color-text-primary)' }}>
                    {formatDate(detailItem.bestBefore)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Posted</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{formatDate(detailItem.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status</div>
                  <div>{getStatusBadge(detailItem.status)}</div>
                </div>
              </div>
            </div>

            {/* NGO Claim Info */}
            {detailItem.claimedBy && (
              <div style={{
                background: 'rgba(245,158,11,0.08)', borderRadius: '0.75rem',
                border: '1px solid rgba(245,158,11,0.2)',
                padding: '1rem', marginBottom: '1rem',
              }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fbbf24', marginBottom: '0.75rem', fontWeight: 600 }}>NGO Claim</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>NGO Name</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{detailItem.claimedBy?.user?.name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>NGO Email</div>
                    <a href={`mailto:${detailItem.claimedBy?.user?.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
                      {detailItem.claimedBy?.user?.email || '—'}
                    </a>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Claimed At</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {detailItem.claimedAt ? formatDate(detailItem.claimedAt) : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Collected At</div>
                    <div style={{ fontSize: '0.85rem', color: detailItem.collectedAt ? '#22c55e' : 'var(--color-text-muted)' }}>
                      {detailItem.collectedAt ? formatDate(detailItem.collectedAt) : 'Not yet collected'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeftoverClaims;
