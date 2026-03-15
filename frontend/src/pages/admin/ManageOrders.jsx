import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as adminApi from '../../api/admin.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { formatPrice } from '../../utils/formatPrice';

const TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'live', label: '🔴 Live Orders' },
  { key: 'history', label: 'Order History' },
];

const ManageOrders = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Sync tab when URL search params change
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'all';
    setActiveTab(urlTab);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    fetchOrders();
  }, [activeTab, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let data;

      if (activeTab === 'live') {
        const res = await adminApi.getLiveOrders();
        data = res.data;
        setOrders(data.orders);
        setTotal(data.count);
        setPages(1);
      } else if (activeTab === 'history') {
        const res = await adminApi.getOrderHistory({ page, limit: 20 });
        data = res.data;
        setOrders(data.orders);
        setTotal(data.total);
        setPages(data.pages);
      } else {
        const res = await adminApi.getAllOrders({ page, limit: 20 });
        data = res.data;
        setOrders(data.orders);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      placed: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
      accepted: { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
      preparing: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
      ready: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      picked_up: { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee' },
      delivered: { bg: 'rgba(34,197,94,0.25)', text: '#4ade80' },
      rejected: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
      cancelled: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    };
    const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };
    return (
      <span className="badge" style={{ background: c.bg, color: c.text, textTransform: 'capitalize' }}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  const getCustomerName = (order) => {
    if (order.customer?.user?.name) return order.customer.user.name;
    if (order.customer?.user?.email) return order.customer.user.email;
    return 'Unknown Customer';
  };

  const filteredOrders = orders
    .filter((o) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const customerName = getCustomerName(o).toLowerCase();
      const restaurantName = (o.restaurant?.name || '').toLowerCase();
      const orderId = (o._id || '').toLowerCase();
      return customerName.includes(term) || restaurantName.includes(term) || orderId.includes(term);
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'amount_high') return (b.totalAmount || b.total || 0) - (a.totalAmount || a.total || 0);
      if (sortBy === 'amount_low') return (a.totalAmount || a.total || 0) - (b.totalAmount || b.total || 0);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await adminApi.adminCancelOrder(orderId);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleUnassignDelivery = async (orderId) => {
    if (!window.confirm('Unassign delivery partner? Order will revert to Ready status.')) return;
    try {
      await adminApi.adminUnassignDelivery(orderId);
      toast.success('Delivery partner unassigned');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unassign delivery');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Orders
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          View and monitor all platform orders
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '1.5rem',
        background: 'var(--color-bg-input)',
        borderRadius: '0.75rem',
        padding: '0.25rem',
        width: 'fit-content',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.key ? 600 : 400,
              background: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Count */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <HiOutlineSearch
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by customer, restaurant, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
          />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {total} orders
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount_high">Highest Amount</option>
          <option value="amount_low">Lowest Amount</option>
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <Loading message="Loading orders..." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders found"
          message={activeTab === 'live' ? 'No live orders at the moment.' : 'Try adjusting your search.'}
        />
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0',
              fontSize: '0.85rem',
            }}>
              <thead>
                <tr>
                  {['Order ID', 'Customer', 'Restaurant', 'Status', 'Amount', 'Time', 'Actions'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, i) => (
                  <tr
                    key={order._id}
                    style={{
                      animation: `fadeIn 0.3s ease ${i * 0.03}s forwards`,
                      opacity: 0,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Order ID */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                        #{order._id?.slice(-8).toUpperCase()}
                      </span>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      <div style={{ fontWeight: 500 }}>{getCustomerName(order)}</div>
                    </td>

                    {/* Restaurant */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                        {order.restaurant?.name || '—'}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)', fontWeight: 600 }}>
                      {formatPrice(order.totalAmount || 0)}
                    </td>

                    {/* Time */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {timeAgo(order.createdAt)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {!['delivered', 'cancelled', 'rejected'].includes(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            style={{
                              padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                        {order.deliveryPartner && !['delivered', 'cancelled'].includes(order.status) && (
                          <button
                            onClick={() => handleUnassignDelivery(order._id)}
                            style={{
                              padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                              border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.375rem',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', padding: '0 0.75rem' }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManageOrders;
