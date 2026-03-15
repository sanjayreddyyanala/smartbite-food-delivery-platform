import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineTrash, HiOutlinePlus, HiOutlineMinus, HiOutlineArrowRight } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import useCartStore from '../../store/useCartStore';
import { formatPrice } from '../../utils/formatPrice';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import ImageLightbox from '../../components/common/ImageLightbox';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, restaurant, loading, fetchCart, updateItem, removeItem, clearCart, getTotalPrice } = useCartStore();
  const [updatingId, setUpdatingId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleQuantityChange = async (itemId, newQty) => {
    if (newQty < 1) return handleRemove(itemId);
    setUpdatingId(itemId);
    try {
      await updateItem(itemId, newQty);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId) => {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  if (loading) return <Loading message="Loading cart..." />;

  const subtotal = getTotalPrice();

  const handleInstructionSave = async (itemId, cookingInstructions) => {
    setUpdatingId(itemId);
    try {
      await updateItem(itemId, { cookingInstructions });
      toast.success('Cooking instructions updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cooking instructions');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Your Cart</h1>
          {items.length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {items.length} item{items.length > 1 ? 's' : ''} from {restaurant?.name || 'a restaurant'}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={handleClear} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', color: 'var(--color-error)' }}>
            Clear Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          message="Browse restaurants and add delicious items to your cart."
          action={
            <Link to="/restaurants" className="btn-primary" style={{ textDecoration: 'none' }}>
              Browse Restaurants
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, i) => (
              <CartItem
                key={item._id || i}
                item={item}
                index={i}
                updating={updatingId === item._id}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
                onInstructionSave={handleInstructionSave}
                onImageClick={item.foodItem?.image ? () => setLightboxImage(item.foodItem.image) : undefined}
              />
            ))}
          </div>

          {/* Price Summary */}
          <div className="card" style={{ animation: 'fadeIn 0.5s ease forwards' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700 }}>
                <span>Subtotal</span>
                <span className="gradient-text">{formatPrice(subtotal)}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Delivery fee will be calculated at checkout based on distance
              </p>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn-primary"
              style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              Proceed to Checkout <HiOutlineArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
};

const CartItem = ({ item, index, updating, onQuantityChange, onRemove, onInstructionSave, onImageClick }) => {
  const foodName = item.foodItem?.name || item.name || 'Food Item';
  const foodPrice = item.price || item.foodItem?.price || 0;
  const foodImage = item.foodItem?.image || item.image;
  const isVeg = item.foodItem?.isVeg ?? item.isVeg;
  const [instructionDraft, setInstructionDraft] = useState(item.cookingInstructions || '');

  useEffect(() => {
    setInstructionDraft(item.cookingInstructions || '');
  }, [item.cookingInstructions]);

  const hasInstructionChanges = instructionDraft.trim() !== (item.cookingInstructions || '').trim();

  const gradients = [
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  ];

  return (
    <div
      className="card animate-fade-in"
      style={{
        animationDelay: `${index * 0.05}s`,
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        opacity: updating ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Image */}
      <div
        onClick={onImageClick}
        style={{
          width: '80px', height: '80px', borderRadius: '0.75rem', overflow: 'hidden', flexShrink: 0,
          background: foodImage ? `url(${foodImage}) center / cover no-repeat` : gradients[index % gradients.length],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: onImageClick ? 'pointer' : 'default',
        }}
        title={foodImage ? 'Click to enlarge' : undefined}
      >
        {!foodImage && <IoFastFoodOutline size={28} style={{ color: 'rgba(0,0,0,0.15)' }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          {isVeg !== undefined && (
            <span style={{
              width: '14px', height: '14px', borderRadius: '3px',
              border: `2px solid ${isVeg ? '#22c55e' : '#ef4444'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isVeg ? '#22c55e' : '#ef4444' }} />
            </span>
          )}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {foodName}
          </h3>
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          {formatPrice(foodPrice * item.quantity)}
          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.375rem' }}>
            ({formatPrice(foodPrice)} × {item.quantity})
          </span>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.375rem' }}>
            Cooking instructions
          </label>
          <textarea
            value={instructionDraft}
            onChange={(e) => setInstructionDraft(e.target.value.slice(0, 200))}
            placeholder="Example: less spicy, no onions, extra crispy"
            disabled={updating}
            rows={2}
            style={{
              width: '100%',
              resize: 'vertical',
              borderRadius: '0.75rem',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-input)',
              padding: '0.65rem 0.75rem',
              fontSize: '0.8rem',
              color: 'var(--color-text-primary)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {instructionDraft.trim() ? `${instructionDraft.trim().length}/200 characters` : 'Optional note for the kitchen'}
            </span>
            <button
              onClick={() => onInstructionSave(item._id, instructionDraft)}
              disabled={updating || !hasInstructionChanges}
              className="btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.4rem 0.75rem', opacity: updating || !hasInstructionChanges ? 0.6 : 1 }}
            >
              Save note
            </button>
          </div>
        </div>
      </div>

      {/* Quantity Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={() => onQuantityChange(item._id, item.quantity - 1)}
          disabled={updating}
          style={{
            width: '32px', height: '32px', borderRadius: '0.5rem',
            background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          <HiOutlineMinus size={14} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: '24px', textAlign: 'center' }}>
          {item.quantity}
        </span>
        <button
          onClick={() => onQuantityChange(item._id, item.quantity + 1)}
          disabled={updating}
          style={{
            width: '32px', height: '32px', borderRadius: '0.5rem',
            background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          <HiOutlinePlus size={14} />
        </button>
        <button
          onClick={() => onRemove(item._id)}
          disabled={updating}
          style={{
            width: '32px', height: '32px', borderRadius: '0.5rem',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: 'var(--color-error)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: '0.25rem', transition: 'all 0.2s',
          }}
        >
          <HiOutlineTrash size={14} />
        </button>
      </div>
    </div>
  );
};

export default CartPage;
