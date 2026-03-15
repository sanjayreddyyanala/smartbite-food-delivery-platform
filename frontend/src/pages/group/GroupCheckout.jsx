import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineCreditCard, HiOutlineCash } from 'react-icons/hi';
import * as groupApi from '../../api/groupOrder.api';
import * as paymentApi from '../../api/payment.api';
import API from '../../api/axios';
import useGroupOrderStore from '../../store/useGroupOrderStore';
import useAuthStore from '../../store/useAuthStore';
import useGroupOrder from '../../hooks/useGroupOrder';
import Loading from '../../components/common/Loading';
import MemberBreakdown from '../../components/group/MemberBreakdown';
import { formatPrice } from '../../utils/formatPrice';
import toast from 'react-hot-toast';

const GroupCheckout = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, members, session, setSession, getSubtotal } = useGroupOrderStore();

  useGroupOrder(code);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  useEffect(() => {
    loadData();
  }, [code]);

  const loadData = async () => {
    try {
      // Load group if not in store
      if (!session || items.length === 0) {
        const { data } = await groupApi.getGroupOrder(code);
        setSession(data.groupOrder, user?._id);
      }

      // Load addresses
      const { data: addrData } = await API.get('/addresses');
      const addrList = addrData.addresses || [];
      setAddresses(addrList);
      if (addrList.length > 0) {
        const def = addrList.find(a => a.isDefault);
        setSelectedAddress(def ? def._id : addrList[0]._id);
      }
    } catch {
      toast.error('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getSubtotal();

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setPlacingOrder(true);

    try {
      if (paymentMethod === 'razorpay') {
        // Guard: ensure Razorpay script is loaded
        if (!window.Razorpay) {
          toast.error('Payment gateway is loading. Please try again in a moment.');
          setPlacingOrder(false);
          return;
        }

        // Use subtotal as estimate (delivery fee calculated at backend)
        const estimatedTotal = subtotal + deliveryFee;
        const payAmount = estimatedTotal > 0 ? estimatedTotal : subtotal;

        // Create Razorpay order
        const { data: rpData } = await paymentApi.createRazorpayOrder({ amount: payAmount });
        const options = {
          key: rpData.key,
          amount: rpData.order.amount,
          currency: 'INR',
          name: 'FoodDash',
          description: 'Group Order Payment',
          order_id: rpData.order.id,
          handler: async (response) => {
            try {
              await paymentApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              // Place group order after payment verification
              const { data } = await groupApi.placeGroupOrder(code, {
                addressId: selectedAddress,
                paymentMethod: 'online',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
              });
              toast.success('Group order placed!');
              navigate(`/orders/${data.order._id}`);
            } catch {
              toast.error('Payment verification failed. Please contact support.');
              setPlacingOrder(false);
            }
          },
          prefill: {},
          theme: { color: '#f97316' },
          modal: {
            ondismiss: () => setPlacingOrder(false),
          },
        };
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', (response) => {
          toast.error(response.error?.description || 'Payment failed. Please try again.');
          setPlacingOrder(false);
        });
        razorpay.open();
      } else {
        // COD order
        const { data } = await groupApi.placeGroupOrder(code, {
          addressId: selectedAddress,
          paymentMethod: 'cod',
        });
        toast.success('Group order placed!');
        navigate(`/orders/${data.order._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      if (paymentMethod !== 'razorpay') {
        setPlacingOrder(false);
      }
    }
  };

  if (loading) return <Loading message="Loading checkout..." />;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(`/group/room/${code}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}
      >
        ← Back to Room
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem' }}>Checkout Group Order</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 1fr', gap: '2rem' }}>

        {/* Left: Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Address */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Delivery Address</h3>
            {addresses.length === 0 ? (
              <div>
                <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>No saved addresses.</p>
                <button onClick={() => navigate('/addresses')} className="btn-secondary">Add Address</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {addresses.map(addr => (
                  <label key={addr._id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.875rem',
                    border: `1px solid ${selectedAddress === addr._id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: '0.5rem', background: selectedAddress === addr._id ? 'rgba(249,115,22,0.04)' : 'transparent',
                  }}>
                    <input type="radio" name="address" value={addr._id} checked={selectedAddress === addr._id} onChange={(e) => setSelectedAddress(e.target.value)} style={{ marginTop: '0.25rem', accentColor: 'var(--color-primary)' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{addr.street}</p>
                      <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{addr.city}, {addr.state} {addr.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Payment Method</h3>
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

          {/* Member Breakdown */}
          <MemberBreakdown members={members} items={items} deliveryFee={deliveryFee} />
        </div>

        {/* Right: Summary */}
        <div>
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {items.map((item, i) => (
                <div key={item._id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{item.quantity}× {item.name}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px dashed var(--color-border)', margin: '0.75rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{formatPrice(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Delivery Fee</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Calculated at order</span>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.75rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              <span>Total</span>
              <span>{formatPrice(subtotal)}+</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={placingOrder || !selectedAddress || items.length === 0}
              className="btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            >
              {placingOrder ? 'Processing...' : paymentMethod === 'cod' ? 'Place Group Order' : `Pay & Place Order`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCheckout;
