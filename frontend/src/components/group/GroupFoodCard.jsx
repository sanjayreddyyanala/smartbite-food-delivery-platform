import { useState } from 'react';
import { HiOutlinePlus, HiOutlineMinus } from 'react-icons/hi';
import { formatPrice } from '../../utils/formatPrice';

const GroupFoodCard = ({ food, onAdd, adding, disabled }) => {
  const [qty, setQty] = useState(1);
  const isUnavailable = !food.isAvailable || food.availableQuantity <= 0 || disabled;

  return (
    <div
      style={{
        display: 'flex', gap: '0.875rem', padding: '1rem',
        borderRadius: '0.75rem', border: '1px solid var(--color-border)',
        background: 'var(--color-bg-card)', transition: 'all 0.2s',
        opacity: isUnavailable ? 0.5 : 1,
      }}
    >
      {/* Image */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '0.625rem', flexShrink: 0,
        background: food.image
          ? `url(${food.image}) center / cover no-repeat`
          : 'linear-gradient(135deg, #ffecd2, #fcb69f)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!food.image && <span style={{ fontSize: '1.5rem' }}>🍽️</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 600 }}>{food.name}</h4>
            {food.description && (
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                {food.description.slice(0, 60)}{food.description.length > 60 ? '…' : ''}
              </p>
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {formatPrice(food.price)}
            </span>
          </div>
        </div>

        {/* Action row */}
        {!isUnavailable && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            {/* Qty selector */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.15rem',
              background: 'var(--color-bg-input)', borderRadius: '0.5rem', padding: '0.15rem',
            }}>
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1 || disabled}
                style={{
                  width: '26px', height: '26px', borderRadius: '0.375rem', border: 'none',
                  background: 'transparent', cursor: (qty > 1 && !disabled) ? 'pointer' : 'default',
                  color: (qty > 1 && !disabled) ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <HiOutlineMinus size={14} />
              </button>
              <span style={{ minWidth: '22px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                disabled={disabled}
                style={{
                  width: '26px', height: '26px', borderRadius: '0.375rem', border: 'none',
                  background: 'transparent', cursor: disabled ? 'default' : 'pointer', color: disabled ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <HiOutlinePlus size={14} />
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={() => { onAdd(food, qty); setQty(1); }}
              disabled={adding || disabled}
              className="btn-primary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', borderRadius: '0.5rem', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {adding ? '...' : '+ Add'}
            </button>
          </div>
        )}

        {isUnavailable && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: disabled ? 'var(--color-text-muted)' : 'var(--color-error)', fontWeight: 600 }}>
            {disabled ? 'Host locked the cart 🔒' : 'Unavailable'}
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupFoodCard;
