import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import * as orderApi from '../../api/order.api';
import * as restaurantApi from '../../api/restaurant.api';
import useSocketStore from '../../store/useSocketStore';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/formatPrice';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';
import { ORDER_STATUS } from '../../constants';

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [pickupCode, setPickupCode] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);
  const [sortBy, setSortBy] = useState('oldest'); // oldest first = most urgent

  const { socket } = useSocketStore();
  const restaurantIdRef = useRef(null);

  // Pure data-fetching function — no socket logic
  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await orderApi.getRestaurantLiveOrders();
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket setup — completely separate from data fetching
  useEffect(() => {
    if (!socket) return;

    let isMounted = true;

    // Fetch restaurant ID and join the room
    const setupRoom = async () => {
      try {
        const { data } = await restaurantApi.getMyRestaurant();
        const rid = data.restaurant?._id;
        if (rid && isMounted) {
          restaurantIdRef.current = rid;
          socket.emit('join-restaurant-room', { restaurantId: rid });
        }
      } catch (e) {
        console.error('Could not fetch restaurant ID for sockets');
      }
    };

    setupRoom();

    // Re-join room on reconnect
    const handleReconnect = () => {
      if (restaurantIdRef.current) {
        socket.emit('join-restaurant-room', { restaurantId: restaurantIdRef.current });
      }
    };

    // New order notification
    const handleNewOrder = () => {
      toast('🔔 New order received!', { icon: '📋', duration: 5000 });
      fetchOrders();
    };

    // Order status changed — refetch
    const handleStatusChanged = () => {
      fetchOrders();
    };

    socket.on('connect', handleReconnect);
    socket.on('new-order', handleNewOrder);
    socket.on('order-status-changed', handleStatusChanged);

    return () => {
      isMounted = false;
      socket.off('connect', handleReconnect);
      socket.off('new-order', handleNewOrder);
      socket.off('order-status-changed', handleStatusChanged);
    };
  }, [socket, fetchOrders]);

  // Join order rooms when orders change
  useEffect(() => {
    if (!socket || orders.length === 0) return;
    orders.forEach((o) => {
      socket.emit('join-order-room', { orderId: o._id });
    });
  }, [socket, orders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await orderApi.updateOrderStatus(orderId, { status: newStatus });
      toast.success(`Order ${getStatusLabel(newStatus).toLowerCase()}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyPickup = async (orderId) => {
    const code = pickupCode[orderId];
    if (!code || code.length !== 4) { toast.error('Enter 4-digit code'); return; }
    setVerifyingId(orderId);
    try {
      await orderApi.verifyPickupCode(orderId, { pickupCode: code });
      toast.success('Pickup verified!');
      setPickupCode(prev => ({ ...prev, [orderId]: '' }));
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setVerifyingId(null);
    }
  };

  const getNextActions = (status) => {
    switch (status) {
      case ORDER_STATUS.PLACED:
        return [
          { status: ORDER_STATUS.ACCEPTED, label: 'Accept', style: 'success' },
          { status: ORDER_STATUS.REJECTED, label: 'Reject', style: 'danger' },
        ];
      case ORDER_STATUS.ACCEPTED:
        return [{ status: ORDER_STATUS.PREPARING, label: 'Start Preparing', style: 'primary' }];
      case ORDER_STATUS.PREPARING:
        return [{ status: ORDER_STATUS.READY, label: 'Mark Ready', style: 'primary' }];
      default:
        return [];
    }
  };

  if (loading) return <Loading message="Loading live orders..." />;

  // Status priority: placed > accepted > preparing > ready > picked_up
  const statusPriority = { placed: 0, accepted: 1, preparing: 2, ready: 3, picked_up: 4 };
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'status') return (statusPriority[a.status] ?? 5) - (statusPriority[b.status] ?? 5);
    if (sortBy === 'amount') return (b.totalAmount || b.total || 0) - (a.totalAmount || a.total || 0);
    return 0;
  });

  return (
    <div>
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Live Orders</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{orders.length} active order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Sort Row */}
      {orders.length > 0 && (
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { key: 'oldest', label: '⏳ Most Urgent' },
            { key: 'newest', label: '⬇ Newest' },
            { key: 'status', label: '📄 By Stage' },
            { key: 'amount', label: '💰 Highest Value' },
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
      )}

      {orders.length === 0 ? (
        <EmptyState icon="📋" title="No active orders" message="New orders will appear here in real-time." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sortedOrders.map((order, i) => {
            const actions = getNextActions(order.status);
            const sc = getStatusColor(order.status);
            return (
              <div key={order._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.7rem',
                      fontWeight: 700, background: sc.bg, color: sc.text,
                    }}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      #{order._id?.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {timeAgo(order.createdAt)}
                  </span>
                </div>

                {/* Customer */}
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  👤 {order.customer?.user?.name || 'Customer'}
                </p>

                {/* Items */}
                <div style={{ background: 'var(--color-bg-input)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  {order.items?.map((item, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', padding: '0.25rem 0' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>{item.foodItem?.name || item.name} × {item.quantity}</div>
                        {item.cookingInstructions?.trim() && (
                          <div style={{ marginTop: '0.15rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', wordBreak: 'break-word' }}>
                            Note: {item.cookingInstructions}
                          </div>
                        )}
                      </div>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Total + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    Total: <span className="gradient-text">{formatPrice(order.totalAmount || order.total)}</span>
                  </span>
                  {actions.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {actions.map((action) => (
                        <button
                          key={action.status}
                          onClick={() => handleStatusUpdate(order._id, action.status)}
                          disabled={updatingId === order._id}
                          className={action.style === 'danger' ? 'btn-danger' : action.style === 'success' ? 'btn-primary' : 'btn-primary'}
                          style={{
                            fontSize: '0.8rem', padding: '0.5rem 1rem',
                            ...(action.style === 'success' ? { background: '#22c55e' } : {}),
                          }}
                        >
                          {updatingId === order._id ? '...' : action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pickup Verification Input */}
                {order.status === ORDER_STATUS.READY && order.deliveryPartner && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%', background: 'var(--color-bg-input)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <input 
                      type="text" 
                      maxLength={4} 
                      placeholder="4-digit Pickup Code" 
                      value={pickupCode[order._id] || ''}
                      onChange={(e) => setPickupCode(prev => ({ ...prev, [order._id]: e.target.value }))}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)', textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700 }}
                    />
                    <button 
                      onClick={() => handleVerifyPickup(order._id)} 
                      disabled={verifyingId === order._id}
                      className="btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      {verifyingId === order._id ? 'Verifying...' : 'Verify Pickup'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveOrders;
