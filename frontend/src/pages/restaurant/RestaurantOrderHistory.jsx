import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as orderApi from '../../api/order.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/formatPrice';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';

const RestaurantOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await orderApi.getRestaurantOrderHistory();
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const sortOrders = (list) => {
    const s = [...list];
    if (sortBy === 'newest') s.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'oldest') s.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === 'amount_high') s.sort((a, b) => (b.totalAmount || b.total || 0) - (a.totalAmount || a.total || 0));
    else if (sortBy === 'amount_low') s.sort((a, b) => (a.totalAmount || a.total || 0) - (b.totalAmount || b.total || 0));
    return s;
  };

  const filtered = sortOrders(filter === 'all' ? orders : orders.filter((o) => o.status === filter));

  if (loading) return <Loading message="Loading order history..." />;

  return (
    <div>
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Order History</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{orders.length} total orders</p>
      </div>

      {/* Sort Row */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {[{ key: 'newest', label: '⬇ Newest' }, { key: 'oldest', label: '⬆ Oldest' }, { key: 'amount_high', label: '💰 High' }, { key: 'amount_low', label: '💰 Low' }].map((opt) => (
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

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['all', 'delivered', 'rejected', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '0.4rem 0.875rem', borderRadius: '999px', fontSize: '0.75rem',
            fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize',
            ...(filter === s ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
              : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
          }}>
            {s === 'all' ? `All (${orders.length})` : getStatusLabel(s)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📜" title="No orders found" message="Completed and rejected orders will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map((order, i) => {
            const sc = getStatusColor(order.status);
            return (
              <div key={order._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      #{order._id?.slice(-6).toUpperCase()}
                    </span>
                    <span className="badge" style={{ background: sc.bg, color: sc.text, fontSize: '0.65rem' }}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDate(order.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  👤 {order.customer?.user?.name || 'Customer'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  {order.items?.slice(0, 3).map((item, itemIndex) => (
                    <div key={`${order._id}-${itemIndex}`} style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      <div>{item.foodItem?.name || item.name} × {item.quantity}</div>
                      {item.cookingInstructions?.trim() && (
                        <div style={{ marginTop: '0.1rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', wordBreak: 'break-word' }}>
                          Note: {item.cookingInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                  {(order.items?.length || 0) > 3 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatPrice(order.totalAmount || order.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RestaurantOrderHistory;
