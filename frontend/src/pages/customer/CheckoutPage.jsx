import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineCreditCard, HiOutlineCash, HiOutlineCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import useCartStore from '../../store/useCartStore';
import * as addressApi from '../../api/address.api';
import * as orderApi from '../../api/order.api';
import * as paymentApi from '../../api/payment.api';
import { formatPrice } from '../../utils/formatPrice';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, restaurant, fetchCart, getTotalPrice } = useCartStore();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [feeLoading, setFeeLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      await fetchCart();
      const { data } = await addressApi.getAddresses();
      const addrs = data.addresses || [];
      setAddresses(addrs);
      const def = addrs.find((a) => a.isDefault);
      if (def) setSelectedAddress(def._id);
      else if (addrs.length) setSelectedAddress(addrs[0]._id);
    } catch {
      toast.error('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch delivery fee when address or restaurant changes
  const fetchDeliveryFee = useCallback(async (addressId) => {
    const restaurantId = typeof restaurant === 'object' ? restaurant?._id : restaurant;
    if (!restaurantId || !addressId) return;

    setFeeLoading(true);
    try {
      const { data } = await orderApi.getDeliveryFeePreview({
        restaurantId,
        addressId,
      });
      setDeliveryFee(data.deliveryFee);
    } catch {
      // Fallback — don't break checkout
      setDeliveryFee(20);
    } finally {
      setFeeLoading(false);
    }
  }, [restaurant]);

  // Re-calculate fee when address selection changes
  useEffect(() => {
    if (selectedAddress && restaurant) {
      fetchDeliveryFee(selectedAddress);
    }
  }, [selectedAddress, restaurant, fetchDeliveryFee]);

  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setPlacing(true);

    try {
      if (paymentMethod === 'razorpay') {
        // Guard: ensure Razorpay script is loaded
        if (!window.Razorpay) {
          toast.error('Payment gateway is loading. Please try again in a moment.');
          setPlacing(false);
          return;
        }

        // Create Razorpay order
        const { data: rpData } = await paymentApi.createRazorpayOrder({ amount: total });
        const options = {
          key: rpData.key,
          amount: rpData.order.amount,
          currency: 'INR',
          name: 'FoodDash',
          description: 'Food Order Payment',
          order_id: rpData.order.id,
          handler: async (response) => {
            try {
              await paymentApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              // Place order after payment verification
              const { data: orderData } = await orderApi.placeOrder({
                addressId: selectedAddress,
                paymentMethod: 'online',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
              });
              await fetchCart();
              toast.success('Order placed successfully!');
              navigate(`/orders/${orderData.order._id}`);
            } catch {
              toast.error('Payment verification failed. Please contact support.');
              setPlacing(false);
            }
          },
          prefill: {},
          theme: { color: '#f97316' },
          modal: {
            ondismiss: () => setPlacing(false),
          },
        };
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', (response) => {
          toast.error(response.error?.description || 'Payment failed. Please try again.');
          setPlacing(false);
        });
        razorpay.open();
      } else {
        // COD order
        const { data } = await orderApi.placeOrder({
          addressId: selectedAddress,
          paymentMethod: 'cod',
        });
        fetchCart();
        toast.success('Order placed successfully!');
        navigate(`/orders/${data.order._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
      setPlacing(false);
    }
  };

  if (loading) return <Loading message="Preparing checkout..." />;

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <EmptyState icon="🛒" title="Nothing to checkout" message="Add items to your cart first." action={
          <button onClick={() => navigate('/restaurants')} className="btn-primary">Browse Restaurants</button>
        } />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="animate-fade-in" style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        Checkout
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Delivery Address */}
          <div className="card animate-fade-in">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiOutlineLocationMarker size={18} style={{ color: 'var(--color-primary)' }} /> Delivery Address
            </h3>
            {addresses.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                <p>No addresses saved.</p>
                <button onClick={() => navigate('/addresses')} className="btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  Add Address
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {addresses.map((addr) => (
                  <label
                    key={addr._id}
                    onClick={() => setSelectedAddress(addr._id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.875rem', borderRadius: '0.75rem', cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selectedAddress === addr._id ? 'var(--color-primary)' : 'var(--color-border)',
                      background: selectedAddress === addr._id ? 'rgba(249,115,22,0.05)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${selectedAddress === addr._id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedAddress === addr._id && (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                      )}
                    </div>
                    <div>
                      <span className="badge" style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
                        {addr.label}
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        {[addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiOutlineCreditCard size={18} style={{ color: 'var(--color-primary)' }} /> Payment Method
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { id: 'cod', label: 'Cash on Delivery', icon: HiOutlineCash, desc: 'Pay when your order arrives' },
                { id: 'razorpay', label: 'Pay Online', icon: HiOutlineCreditCard, desc: 'UPI, Card, Net Banking' },
              ].map((method) => (
                <label
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem', borderRadius: '0.75rem', cursor: 'pointer',
                    border: '1px solid',
                    borderColor: paymentMethod === method.id ? 'var(--color-primary)' : 'var(--color-border)',
                    background: paymentMethod === method.id ? 'rgba(249,115,22,0.05)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${paymentMethod === method.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {paymentMethod === method.id && (
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                    )}
                  </div>
                  <method.icon size={20} style={{ color: paymentMethod === method.id ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{method.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Summary */}
        <div className="card animate-fade-in" style={{ animationDelay: '0.15s', position: 'sticky', top: '80px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Order Summary</h3>

          {/* Restaurant */}
          {restaurant && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              🍽️ {restaurant.name || 'Restaurant'}
            </div>
          )}

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.foodItem?.name || item.name} × {item.quantity}
                  </div>
                  {item.cookingInstructions?.trim() && (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      Note: {item.cookingInstructions}
                    </div>
                  )}
                </div>
                <span style={{ flexShrink: 0 }}>{formatPrice((item.price || item.foodItem?.price || 0) * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.75rem 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                Delivery Fee
                {feeLoading && (
                  <span style={{
                    display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%',
                    border: '2px solid var(--color-primary)', borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
              </span>
              <span>{feeLoading ? '...' : formatPrice(deliveryFee)}</span>
            </div>
            <div style={{ height: '1px', background: 'var(--color-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700 }}>
              <span>Total</span>
              <span className="gradient-text">{feeLoading ? '...' : formatPrice(total)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={placing || !selectedAddress || feeLoading}
            className="btn-primary"
            style={{
              width: '100%', marginTop: '1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {placing ? 'Processing...' : (
              <>
                <HiOutlineCheck size={18} />
                {paymentMethod === 'cod' ? `Place Order (${formatPrice(total)})` : `Pay ${formatPrice(total)}`}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 360px"] {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;
