import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineLocationMarker, HiOutlineTruck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as orderApi from '../../api/order.api';
import * as deliveryApi from '../../api/delivery.api';
import useSocketStore from '../../store/useSocketStore';
import useGeolocation from '../../hooks/useGeolocation';
import Loading from '../../components/common/Loading';
import { formatPrice } from '../../utils/formatPrice';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';
import { ORDER_STATUS } from '../../constants';
import MapWrapper from '../../components/map/MapWrapper';
import DeliveryMap from '../../components/map/DeliveryMap';

const ActiveDelivery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [canCancel, setCanCancel] = useState(false);

  const lastEmitTime = useRef(0);

  const { socket } = useSocketStore();

  // Use geolocation hook — only active when order is picked_up
  const isPickedUp = order?.status === ORDER_STATUS.PICKED_UP;
  const { lat, lng, error: geoError, isWatching } = useGeolocation(isPickedUp);

  useEffect(() => {
    fetchOrder();

    if (socket && id) {
      const joinRoom = () => {
        socket.emit('join-order-room', { orderId: id });
      };

      joinRoom();
      socket.on('connect', joinRoom);

      const handleStatusChanged = (data) => {
        if (data.orderId === id) {
          setOrder(prev => prev ? { ...prev, status: data.status } : prev);
        }
      };

      socket.on('order-status-changed', handleStatusChanged);

      // Listen for payment status updates (e.g. customer pays online mid-delivery)
      const handlePaymentStatusChanged = (data) => {
        if (data.orderId === id) {
          setOrder(prev => prev ? { ...prev, paymentMethod: data.paymentMethod, paymentStatus: data.paymentStatus } : prev);
        }
      };
      socket.on('payment-status-changed', handlePaymentStatusChanged);

      return () => {
        socket.off('connect', joinRoom);
        socket.off('order-status-changed', handleStatusChanged);
        socket.off('payment-status-changed', handlePaymentStatusChanged);
      };
    }
  }, [id, socket]);

  useEffect(() => {
    if (order?.status === ORDER_STATUS.READY && order?.updatedAt) {
      const checkCancelWindow = () => {
        const now = new Date();
        const assignedAt = new Date(order.updatedAt);
        const diffMins = (now - assignedAt) / (1000 * 60);
        setCanCancel(diffMins <= 2);
      };
      
      checkCancelWindow();
      const interval = setInterval(checkCancelWindow, 10000); // Check every 10s
      return () => clearInterval(interval);
    } else {
      setCanCancel(false);
    }
  }, [order?.status, order?.updatedAt]);

  // Emit GPS updates via socket when position changes
  useEffect(() => {
    if (!lat || !lng || !socket || !id || !isPickedUp) return;

    // Throttle to every 5 seconds
    const now = Date.now();
    if (now - lastEmitTime.current < 5000) return;
    lastEmitTime.current = now;

    // Emit via socket (relayed to customer's order room by backend)
    socket.emit('location-update', { orderId: id, lat, lng });

    // Also update via API for persistence
    deliveryApi.updateLocation({ lat, lng }).catch(e => console.error('GPS API update failed', e));
  }, [lat, lng, socket, id, isPickedUp]);

  const fetchOrder = async () => {
    try {
      const { data } = await orderApi.getOrder(id);
      setOrder(data.order);
    } catch {
      toast.error('Failed to load order');
      navigate('/delivery/available');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    setUpdatingStatus(true);
    try {
      await orderApi.updateOrderStatus(id, { status });
      toast.success(`Order marked as ${getStatusLabel(status).toLowerCase()}`);
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) { toast.error('Enter a valid OTP'); return; }
    setVerifying(true);
    try {
      await orderApi.verifyDeliveryOtp(id, { otp });
      toast.success('Delivery verified! Order completed 🎉');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelAssignment = async () => {
    if (!window.confirm('Are you sure you want to cancel this delivery assignment?')) return;
    setCanceling(true);
    try {
      await orderApi.cancelDeliveryAssignment(id);
      toast.success('Assignment cancelled');
      navigate('/delivery/available');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel assignment');
      fetchOrder();
    } finally {
      setCanceling(false);
    }
  };

  if (loading) return <Loading message="Loading delivery details..." />;
  if (!order) return null;

  const sc = getStatusColor(order.status);
  const restaurantCoords = order.restaurant?.address?.coordinates;
  const customerCoords = order.deliveryAddress?.coordinates;
  const driverLocation = lat && lng ? { lat, lng } : null;

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/delivery/available')} style={{
        display: 'flex', alignItems: 'center', gap: '0.375rem',
        background: 'none', border: 'none', color: 'var(--color-text-muted)',
        cursor: 'pointer', marginBottom: '1rem', fontSize: '0.85rem',
      }}>
        <HiOutlineArrowLeft size={16} /> Back
      </button>

      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Active Delivery</h1>
          <span className="badge" style={{ background: sc.bg, color: sc.text, fontSize: '0.7rem' }}>
            {getStatusLabel(order.status)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Order #{order._id?.slice(-6).toUpperCase()}
          </p>
          {isWatching && isPickedUp && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
              GPS Live
            </span>
          )}
          {geoError && isPickedUp && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>
              ⚠️ GPS Error
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Delivery Map — visible when picked up */}
        {isPickedUp && (restaurantCoords?.lat || customerCoords?.lat) && (
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>🗺️ Delivery Route</h3>
            <MapWrapper>
              <DeliveryMap
                restaurantCoords={restaurantCoords}
                customerCoords={customerCoords}
                driverLocation={driverLocation}
              />
            </MapWrapper>
          </div>
        )}

        {/* Pickup / Dropoff Locations */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>📍 Route</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HiOutlineTruck size={16} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>PICKUP</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{order.restaurant?.name || 'Restaurant'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {order.restaurant?.address ? [order.restaurant.address.street, order.restaurant.address.city].filter(Boolean).join(', ') : 'Location'}
                </div>
              </div>
            </div>
            <div style={{ borderLeft: '2px dashed var(--color-border)', height: '20px', marginLeft: '15px' }} />
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HiOutlineLocationMarker size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>DROP-OFF</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{order.customer?.name || 'Customer'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {order.deliveryAddress ? [order.deliveryAddress.street, order.deliveryAddress.city].filter(Boolean).join(', ') : 'Location'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>💰 Payment Status</h3>
          {order.paymentStatus === 'paid' && order.paymentMethod === 'online' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.875rem', borderRadius: '0.75rem',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>Paid Online</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No cash collection needed</div>
              </div>
            </div>
          ) : order.paymentStatus === 'paid' && order.paymentMethod === 'cod' ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem', borderRadius: '0.75rem',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>✅</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>COD Collected</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cash received from customer</div>
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e' }}>
                {formatPrice(order.totalAmount || order.total)}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem', borderRadius: '0.75rem',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>💵</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f97316' }}>Cash on Delivery</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Collect cash from customer</div>
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f97316' }}>
                {formatPrice(order.totalAmount || order.total)}
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>🍽️ Items</h3>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <span>{item.foodItem?.name || item.name} × {item.quantity}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span className="gradient-text">{formatPrice(order.totalAmount || order.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>⚡ Actions</h3>

          {order.status === ORDER_STATUS.READY && (
            <div style={{ background: 'var(--color-bg-input)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Give this code to the restaurant to confirm pickup:
              </p>
              <div style={{ 
                fontSize: '2rem', fontWeight: 800, letterSpacing: '0.15em', 
                color: 'var(--color-primary)', background: '#fff', 
                padding: '0.5rem', borderRadius: '0.5rem', 
                border: '2px dashed var(--color-primary)', display: 'inline-block' 
              }}>
                {order.pickupCode}
              </div>
            </div>
          )}

          {canCancel && order.status === ORDER_STATUS.READY && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={handleCancelAssignment} 
                disabled={canceling}
                className="btn-secondary" 
                style={{ width: '100%', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                {canceling ? 'Canceling...' : 'Cancel Assignment'}
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                You can cancel within 2 minutes of accepting.
              </p>
            </div>
          )}

          {order.status === ORDER_STATUS.PICKED_UP && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Enter the OTP from the customer to complete delivery:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="input-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.2em', flex: 1 }}
                />
                <button onClick={handleVerifyOtp} disabled={verifying} className="btn-primary">
                  {verifying ? '...' : 'Verify & Complete'}
                </button>
              </div>
            </div>
          )}

          {order.status === ORDER_STATUS.DELIVERED && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-success)' }}>Delivery Completed!</p>
            </div>
          )}

          {![ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP, ORDER_STATUS.DELIVERED].includes(order.status) && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
              Waiting for the restaurant to prepare the order...
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default ActiveDelivery;
