import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineSortDescending, HiOutlineHome } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as orderApi from '../../api/order.api';
import useSocketStore from '../../store/useSocketStore';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatPrice } from '../../utils/formatPrice';
import { timeAgo } from '../../utils/formatDate';
import { AVAILABLE_ORDERS_DEFAULT_SORT } from '../../constants';

const SORT_OPTIONS = [
  { key: 'distance', label: '📍 Nearest First' },
  { key: 'price', label: '💰 Highest Fee' },
  { key: 'time', label: '🕐 Oldest First' },
];

// Haversine distance helper (km)
const haversineKm = (c1, c2) => {
  if (!c1?.lat || !c1?.lng || !c2?.lat || !c2?.lng) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(c2.lat - c1.lat);
  const dLng = toRad(c2.lng - c1.lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

const AvailableOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [sortBy, setSortBy] = useState(AVAILABLE_ORDERS_DEFAULT_SORT);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const { socket } = useSocketStore();
  const navigate = useNavigate();
  const locationRef = useRef(null);

  // Get delivery partner's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPartnerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          console.warn('Geolocation denied — distance sorting unavailable');
        }
      );
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [partnerLocation]);

  useEffect(() => {
    if (socket) {
      socket.on('available-orders-updated', fetchOrders);
      return () => socket.off('available-orders-updated', fetchOrders);
    }
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const params = {};
      if (partnerLocation) {
        params.lat = partnerLocation.lat;
        params.lng = partnerLocation.lng;
      }
      const { data } = await orderApi.getAvailableDeliveryOrders(params);
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (orderId) => {
    setClaiming(orderId);
    try {
      await orderApi.assignDeliveryOrder(orderId);
      toast.success('Order claimed!');
      navigate(`/delivery/active/${orderId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim');
    } finally {
      setClaiming(null);
    }
  };

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        if (a.distanceToRestaurant == null && b.distanceToRestaurant == null) return 0;
        if (a.distanceToRestaurant == null) return 1;
        if (b.distanceToRestaurant == null) return -1;
        return a.distanceToRestaurant - b.distanceToRestaurant;
      case 'price':
        return (b.deliveryFee || 0) - (a.deliveryFee || 0);
      case 'time':
        return new Date(a.readyAt || a.createdAt) - new Date(b.readyAt || b.createdAt);
      default:
        return 0;
    }
  });

  if (loading) return <Loading message="Finding available orders..." />;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Available Orders</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} ready for pickup
          </p>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlineSortDescending size={16} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 500,
              background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)', borderRadius: '0.5rem',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!partnerLocation && (
        <div style={{
          padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: '0.8rem', color: '#fbbf24', textAlign: 'center',
        }}>
          📍 Enable location access for distance-based sorting
        </div>
      )}

      {sortedOrders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No available orders"
          message="Check back soon — orders will appear here when restaurants mark them as ready."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sortedOrders.map((order, i) => (
            <div
              key={order._id}
              className="card animate-fade-in"
              style={{ animationDelay: `${i * 0.04}s`, transition: 'transform 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  {/* Restaurant */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      {order.restaurant?.name || 'Restaurant'}
                    </h3>
                    {order.distanceToRestaurant != null && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem',
                        fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                      }}>
                        <HiOutlineLocationMarker size={11} />
                        {order.distanceToRestaurant} km away
                      </span>
                    )}
                    {(() => {
                      const d = haversineKm(order.restaurant?.address?.coordinates, order.deliveryAddress?.coordinates);
                      return d != null ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                          padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem',
                          fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#34d399',
                        }}>
                          <HiOutlineHome size={11} />
                          {d} km delivery
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Items summary */}
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
                    {order.items?.length || 0} items • {order.customer?.user?.name || 'Customer'}
                  </p>

                  {/* Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatPrice(order.totalAmount || 0)}
                    </span>
                    {order.deliveryFee && (
                      <span>Fee: {formatPrice(order.deliveryFee)}</span>
                    )}
                    <span>{timeAgo(order.readyAt || order.createdAt)}</span>
                  </div>
                </div>

                {/* Claim Button */}
                <button
                  onClick={() => handleClaim(order._id)}
                  disabled={claiming === order._id}
                  className="btn-primary"
                  style={{
                    padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700,
                    whiteSpace: 'nowrap', opacity: claiming === order._id ? 0.6 : 1,
                  }}
                >
                  {claiming === order._id ? 'Claiming...' : 'Claim'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableOrders;
