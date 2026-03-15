import { HiOutlineTrash, HiOutlinePlus, HiOutlineMinus, HiOutlineLockClosed } from 'react-icons/hi';
import { formatPrice } from '../../utils/formatPrice';

const GroupCartItem = ({ item, canEdit, isOwn, onRemove, onUpdateQty }) => {
  const addedByName = item.memberName || item.addedBy?.name || 'Unknown';

  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.875rem', marginBottom: '0.625rem',
        borderRadius: '0.75rem', border: `1.5px solid ${isOwn ? 'rgba(249,115,22,0.3)' : 'var(--color-border)'}`,
        background: isOwn ? 'rgba(249,115,22,0.04)' : 'var(--color-bg-card)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
        {/* Image */}
        {item.image ? (
          <div style={{
            width: '48px', height: '48px', borderRadius: '0.5rem', flexShrink: 0,
            background: `url(${item.image}) center / cover no-repeat`,
          }} />
        ) : (
          <div style={{
            width: '48px', height: '48px', borderRadius: '0.5rem', flexShrink: 0,
            background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
          }}>🍽️</div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            <span>{formatPrice(item.price)} each</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '0.15rem 0.4rem', borderRadius: '4px',
              fontSize: '0.7rem', fontWeight: 700, lineHeight: 1,
              background: isOwn ? 'rgba(249,115,22,0.1)' : 'var(--color-bg-input)',
              color: isOwn ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              border: `1px solid ${isOwn ? 'rgba(249,115,22,0.2)' : 'var(--color-border)'}`,
              whiteSpace: 'nowrap'
            }}>
              👤 {isOwn ? 'You' : addedByName}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
        {/* Quantity controls */}
        {canEdit ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-bg-input)', borderRadius: '0.5rem', padding: '0.2rem' }}>
            <button
              onClick={() => item.quantity > 1 ? onUpdateQty(item._id, item.quantity - 1) : onRemove(item._id)}
              style={{
                width: '28px', height: '28px', borderRadius: '0.375rem', border: 'none',
                background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {item.quantity === 1 ? <HiOutlineTrash size={14} /> : <HiOutlineMinus size={14} />}
            </button>
            <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item._id, item.quantity + 1)}
              style={{
                width: '28px', height: '28px', borderRadius: '0.375rem', border: 'none',
                background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <HiOutlinePlus size={14} />
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', minWidth: '28px', textAlign: 'center' }}>
            ×{item.quantity}
          </span>
        )}

        <span style={{ fontSize: '0.95rem', fontWeight: 700, minWidth: '60px', textAlign: 'right' }}>
          {formatPrice(item.price * item.quantity)}
        </span>

        {!canEdit && (
          <div style={{ color: 'var(--color-text-muted)' }} title="Cannot edit">
            <HiOutlineLockClosed size={14} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupCartItem;
