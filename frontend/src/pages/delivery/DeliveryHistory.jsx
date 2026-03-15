import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as deliveryApi from '../../api/delivery.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatDate';
import { formatPrice } from '../../utils/formatPrice';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';

const DeliveryHistory = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await deliveryApi.getDeliveryHistory();
      setDeliveries(data.deliveries || data.orders || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading delivery history..." />;

  const sortedDeliveries = [...deliveries].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'earnings_high') return (b.deliveryFee || b.earnings || 0) - (a.deliveryFee || a.earnings || 0);
    if (sortBy === 'earnings_low') return (a.deliveryFee || a.earnings || 0) - (b.deliveryFee || b.earnings || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });

  return (
    <div>
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Delivery History</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{deliveries.length} deliveries completed</p>
      </div>

      {/* Sort Row */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'newest', label: '⬇ Newest' },
          { key: 'oldest', label: '⬆ Oldest' },
          { key: 'earnings_high', label: '💵 Highest Earnings' },
          { key: 'earnings_low', label: '💵 Lowest Earnings' },
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

      {deliveries.length === 0 ? (
        <EmptyState icon="📜" title="No deliveries yet" message="Your completed deliveries will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {sortedDeliveries.map((d, i) => {
            const sc = getStatusColor(d.status);
            return (
              <div key={d._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{d.restaurant?.name || 'Restaurant'}</h3>
                    <span className="badge" style={{ background: sc.bg, color: sc.text, fontSize: '0.65rem' }}>
                      {getStatusLabel(d.status)}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatPrice(d.totalAmount || d.total || d.earnings)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span>#{d._id?.slice(-6).toUpperCase()}</span>
                  <span>{formatDate(d.createdAt || d.completedAt)}</span>
                  <span>👤 {d.customer?.name || 'Customer'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
