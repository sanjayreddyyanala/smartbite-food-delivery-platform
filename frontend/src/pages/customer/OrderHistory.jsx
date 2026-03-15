import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineClock, HiOutlineArrowRight } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as orderApi from '../../api/order.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/formatPrice';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await orderApi.getMyOrders();
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const statusFilters = ['all', 'placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'rejected', 'cancelled'];
  const activeStatuses = ['placed', 'accepted', 'preparing', 'ready', 'picked_up'];

  const sortOrders = (list) => {
    const sorted = [...list];
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === 'amount_high') sorted.sort((a, b) => (b.totalAmount || b.total || 0) - (a.totalAmount || a.total || 0));
    else if (sortBy === 'amount_low') sorted.sort((a, b) => (a.totalAmount || a.total || 0) - (b.totalAmount || b.total || 0));
    return sorted;
  };

  const filtered = sortOrders(filter === 'all' ? orders : orders.filter((o) => o.status === filter));

  const activeOrders = sortOrders(orders.filter((o) => activeStatuses.includes(o.status)));
  const pastOrders = sortOrders(orders.filter((o) => !activeStatuses.includes(o.status)));

  if (loading) return <Loading message="Loading your orders..." />;

  const renderOrderCard = (order, i, isActive = false) => (
    <Link
      key={order._id}
      to={`/orders/${order._id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="card animate-fade-in"
        style={{
          animationDelay: `${i * 0.04}s`, cursor: 'pointer',
          transition: 'transform 0.2s',
          ...(isActive ? { border: '2px solid var(--color-primary)', boxShadow: '0 8px 16px rgba(var(--color-primary-rgb), 0.15)' } : {})
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            {/* Restaurant Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                {order.restaurant?.name || 'Restaurant'}
              </h3>
              <span className="badge" style={{
                ...getStatusColor(order.status),
                background: getStatusColor(order.status).bg,
                color: getStatusColor(order.status).text,
                fontSize: '0.65rem',
              }}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            {/* Items summary */}
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
              {order.items?.slice(0, 3).map((it) => it.foodItem?.name || it.name).join(', ')}
              {order.items?.length > 3 && ` +${order.items.length - 3} more`}
            </p>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineClock size={13} /> {timeAgo(order.createdAt)}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatPrice(order.totalAmount || order.total)}
              </span>
            </div>
          </div>

          <HiOutlineArrowRight size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </Link>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Orders</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Track and manage all your food orders
        </p>
      </div>

      {/* Sort + Filter Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
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
      </div>

      {/* Status Filters */}
      <div style={{
        display: 'flex', gap: '0.375rem', overflowX: 'auto', scrollbarWidth: 'none',
        paddingBottom: '0.5rem', marginBottom: '1.5rem',
      }}>
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.4rem 0.875rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s', textTransform: 'capitalize',
              ...(filter === s ? {
                background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff',
              } : {
                background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)',
              }),
            }}
          >
            {s === 'all' ? `All (${orders.length})` : getStatusLabel(s)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title={filter === 'all' ? 'No orders yet' : `No ${getStatusLabel(filter)} orders`}
          message={filter === 'all' ? 'Place your first order from our amazing restaurants!' : 'Try checking a different status filter.'}
          action={filter === 'all' ? (
            <Link to="/restaurants" className="btn-primary" style={{ textDecoration: 'none' }}>
              Browse Restaurants
            </Link>
          ) : null}
        />
      ) : filter === 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {activeOrders.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'inline-block' }}></span>
                Active Orders
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeOrders.map((order, i) => renderOrderCard(order, i, true))}
              </div>
            </div>
          )}

          {pastOrders.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                Past Orders
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pastOrders.map((order, i) => renderOrderCard(order, i, false))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((order, i) => renderOrderCard(order, i, activeStatuses.includes(order.status)))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
