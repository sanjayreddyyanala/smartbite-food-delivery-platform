import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineLocationMarker, HiOutlineCreditCard, HiOutlineTruck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as orderApi from '../../api/order.api';
import * as paymentApi from '../../api/payment.api';
import * as reviewApi from '../../api/review.api';
import useSocketStore from '../../store/useSocketStore';
import Loading from '../../components/common/Loading';
import ReviewForm from '../../components/common/ReviewForm';
import { formatPrice } from '../../utils/formatPrice';
import { formatDate } from '../../utils/formatDate';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';
import { ORDER_STATUS, CANCELLABLE_BEFORE_STATUS } from '../../constants';
import MapWrapper from '../../components/map/MapWrapper';
import DeliveryMap from '../../components/map/DeliveryMap';

const STATUS_STEPS = [
  { key: ORDER_STATUS.PLACED, label: 'Placed', icon: '📝' },
  { key: ORDER_STATUS.ACCEPTED, label: 'Accepted', icon: '✅' },
  { key: ORDER_STATUS.PREPARING, label: 'Preparing', icon: '👨‍🍳' },
  { key: ORDER_STATUS.READY, label: 'Ready', icon: '📦' },
  { key: ORDER_STATUS.PICKED_UP, label: 'Picked Up', icon: '🚴' },
  { key: ORDER_STATUS.DELIVERED, label: 'Delivered', icon: '🎉' },
];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [paying, setPaying] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(true);

  const { socket } = useSocketStore();

  useEffect(() => {
    fetchOrder();

    if (socket && id) {
      const joinRoom = () => socket.emit('join-order-room', { orderId: id });
      joinRoom();
      socket.on('connect', joinRoom);

      // Listen for order status changes
      const handleStatusChanged = (data) => {
        if (data.orderId === id) {
          // Refetch full order to get new fields like deliveryOtpPlain
          fetchOrder();
        }
      };

      // Listen for delivery partner GPS updates
      const handleLocationUpdate = (data) => {
        if (data.lat && data.lng) {
          setDriverLocation({ lat: data.lat, lng: data.lng });
        }
      };

      socket.on('order-status-changed', handleStatusChanged);
      socket.on('location-update', handleLocationUpdate);

      // Listen for payment status changes (COD -> online)
      const handlePaymentStatusChanged = (data) => {
        if (data.orderId === id) {
          fetchOrder();
        }
      };
      socket.on('payment-status-changed', handlePaymentStatusChanged);

      return () => {
        socket.off('connect', joinRoom);
        socket.off('order-status-changed', handleStatusChanged);
        socket.off('location-update', handleLocationUpdate);
        socket.off('payment-status-changed', handlePaymentStatusChanged);
      };
    }

    return () => {};
  }, [id, socket]);

  const fetchOrder = async () => {
    try {
      const { data } = await orderApi.getOrder(id);
      setOrder(data.order);
      // Check review status for delivered orders
      if (data.order.status === ORDER_STATUS.DELIVERED) {
        try {
          const reviewRes = await reviewApi.getOrderReviewStatus(id);
          setReviewed(reviewRes.data.reviewed);
        } catch { /* ignore */ }
      }
    } catch {
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
      setReviewLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await orderApi.cancelOrder(id);
      toast.success('Order cancelled');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  // ===== PAY NOW (convert COD to online) =====
  const handlePayNow = async () => {
    if (!window.Razorpay) {
      toast.error('Payment gateway is loading. Please try again.');
      return;
    }
    setPaying(true);
    try {
      const { data: rpData } = await paymentApi.createRazorpayOrder({ amount: order.totalAmount });
      const options = {
        key: rpData.key,
        amount: rpData.order.amount,
        currency: 'INR',
        name: 'FoodDash',
        description: `Pay for Order #${order._id?.slice(-8).toUpperCase()}`,
        order_id: rpData.order.id,
        handler: async (response) => {
          try {
            await paymentApi.convertCodToOnline({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment successful! Order is now paid online.');
            fetchOrder();
          } catch {
            toast.error('Payment verification failed. Please contact support.');
          }
          setPaying(false);
        },
        prefill: {},
        theme: { color: '#f97316' },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (resp) => {
        toast.error(resp.error?.description || 'Payment failed. Please try again.');
        setPaying(false);
      });
      razorpay.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setPaying(false);
    }
  };

  if (loading) return <Loading message="Loading order..." />;
  if (!order) return null;

  const isRejected = order.status === ORDER_STATUS.REJECTED;
  const isCancelled = order.status === ORDER_STATUS.CANCELLED;
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const showMap = order.status === ORDER_STATUS.PICKED_UP;

  // Determine if order can be cancelled
  const statusSequence = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered'];
  const canCancel = !['delivered', 'cancelled', 'rejected'].includes(order.status)
    && statusSequence.indexOf(order.status) < statusSequence.indexOf(CANCELLABLE_BEFORE_STATUS);

  const restaurantCoords = order.restaurant?.address?.coordinates;
  const customerCoords = order.deliveryAddress?.coordinates;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/orders')}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          background: 'none', border: 'none', color: 'var(--color-text-muted)',
          cursor: 'pointer', padding: '1rem 0', fontSize: '0.85rem', fontWeight: 500,
        }}
      >
        <HiOutlineArrowLeft size={16} /> Back to Orders
      </button>

      {/* Header */}
      <div className="card animate-fade-in" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {order.restaurant?.name || 'Restaurant Order'}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Order #{order._id?.slice(-8).toUpperCase()} • {formatDate(order.createdAt)}
            </p>
          </div>
          <span className="badge" style={{
            ...getStatusColor(order.status),
            background: getStatusColor(order.status).bg,
            color: getStatusColor(order.status).text,
            fontSize: '0.75rem', padding: '0.375rem 0.875rem',
          }}>
            {getStatusLabel(order.status)}
          </span>
        </div>

        {/* Status Progress */}
        {!isRejected && !isCancelled && (
          <div style={{ margin: '1.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {STATUS_STEPS.map((step, i) => {
                const isComplete = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                    {/* Line */}
                    {i > 0 && (
                      <div style={{
                        position: 'absolute', top: '16px', right: '50%', left: '-50%',
                        height: '3px', borderRadius: '2px',
                        background: isComplete ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background 0.3s',
                      }} />
                    )}
                    {/* Circle */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: isCurrent ? 'var(--color-primary)' : isComplete ? 'rgba(249,115,22,0.2)' : 'var(--color-bg-input)',
                      border: `2px solid ${isComplete ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', zIndex: 1,
                      transition: 'all 0.3s',
                      boxShadow: isCurrent ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
                    }}>
                      {step.icon}
                    </div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: isCurrent ? 700 : 400, marginTop: '0.375rem',
                      color: isComplete ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      textAlign: 'center',
                    }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isRejected && (
          <div style={{
            marginTop: '1rem', padding: '1rem', borderRadius: '0.75rem',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-error)',
          }}>
            This order was rejected by the restaurant
          </div>
        )}

        {isCancelled && (
          <div style={{
            marginTop: '1rem', padding: '1rem', borderRadius: '0.75rem',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-error)',
          }}>
            This order was cancelled
          </div>
        )}

        {/* Cancel Order Button */}
        {canCancel && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={handleCancelOrder}
              style={{
                padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 600,
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>

      {/* Live Delivery Tracking Map */}
      {showMap && (restaurantCoords?.lat || customerCoords?.lat) && (
        <div className="card animate-fade-in" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            🗺️ Live Tracking
            {driverLocation && order.status === ORDER_STATUS.PICKED_UP && (
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                Live
              </span>
            )}
          </h3>
          <MapWrapper>
            <DeliveryMap
              restaurantCoords={restaurantCoords}
              customerCoords={customerCoords}
              driverLocation={driverLocation}
            />
          </MapWrapper>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Items */}
        <div className="card animate-fade-in" style={{ animationDelay: '0.1s', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🍽️ Order Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {item.foodItem?.isVeg !== undefined && (
                    <span style={{
                      width: '14px', height: '14px', borderRadius: '3px',
                      border: `2px solid ${item.foodItem?.isVeg ? '#22c55e' : '#ef4444'}`,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.foodItem?.isVeg ? '#22c55e' : '#ef4444' }} />
                    </span>
                  )}
                  <span style={{ fontSize: '0.9rem' }}>
                    {item.foodItem?.name || item.name} × {item.quantity}
                  </span>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.75rem 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <span>Delivery Fee</span>
              <span>{formatPrice(order.deliveryFee || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700 }}>
              <span>Total</span>
              <span className="gradient-text">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <HiOutlineLocationMarker size={16} style={{ color: 'var(--color-primary)' }} /> Delivery Address
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {order.deliveryAddress
              ? [order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.pincode].filter(Boolean).join(', ')
              : 'Address not available'}
          </p>
        </div>

        {/* Payment & Delivery Info */}
        <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <HiOutlineCreditCard size={16} style={{ color: 'var(--color-primary)' }} /> Payment
          </h3>

          {/* Payment status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
              background: order.paymentStatus === 'paid' ? 'rgba(34,197,94,0.15)' : order.paymentStatus === 'refunded' ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)',
              color: order.paymentStatus === 'paid' ? '#22c55e' : order.paymentStatus === 'refunded' ? '#3b82f6' : '#f97316',
            }}>
              {order.paymentStatus === 'paid' ? '✅ Paid' : order.paymentStatus === 'refunded' ? '↩️ Refunded' : order.paymentStatus === 'refund_pending' ? '⏳ Refund Pending' : '⏳ Pending'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              {order.paymentMethod === 'online' ? '💳 Online' : '💵 COD'}
            </span>
          </div>

          {/* Pay Now button for COD orders that are still pending */}
          {order.paymentMethod === 'cod' && order.paymentStatus === 'pending'
            && !['delivered', 'cancelled', 'rejected'].includes(order.status) && (
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="btn-primary"
              style={{
                width: '100%', marginTop: '0.5rem', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              }}
            >
              <HiOutlineCreditCard size={16} />
              {paying ? 'Processing...' : `Pay Now — ${formatPrice(order.totalAmount)}`}
            </button>
          )}

          {order.deliveryPartner && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <HiOutlineTruck size={16} style={{ color: 'var(--color-primary)' }} /> Delivery Partner
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {order.deliveryPartner?.user?.name || 'Assigned'}
              </p>
            </div>
          )}

          {/* OTP Display — shown to customer when order is picked up */}
          {(order.status === ORDER_STATUS.PICKED_UP) && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem', borderRadius: '0.75rem',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              textAlign: 'center',
            }}>
              {order.deliveryOtpPlain ? (
                <>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Delivery OTP</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.3em', color: 'var(--color-primary)' }}>
                    {order.deliveryOtpPlain}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Share with delivery partner to confirm delivery
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  📧 A delivery OTP has been sent to your email.
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Share it with the delivery partner upon arrival
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Section — shown after delivery */}
      {order.status === ORDER_STATUS.DELIVERED && !reviewLoading && !reviewed && (
        <ReviewForm order={order} onReviewSubmitted={() => setReviewed(true)} />
      )}
      {order.status === ORDER_STATUS.DELIVERED && reviewed && (
        <div className="card animate-fade-in" style={{ marginTop: '1.25rem', textAlign: 'center', padding: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>You reviewed this order</p>
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderDetail;
