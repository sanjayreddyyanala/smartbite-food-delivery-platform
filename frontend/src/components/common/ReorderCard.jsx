import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/formatPrice';

const ReorderCard = ({ suggestion }) => {
  const { restaurant, items, totalAmount, deliveredAt } = suggestion;

  const daysAgo = Math.floor(
    (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;

  return (
    <Link
      to={`/restaurants/${restaurant._id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="card"
        style={{
          minWidth: '260px',
          maxWidth: '260px',
          padding: '0.875rem',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        {/* Restaurant info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {restaurant.coverImage ? (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                background: `url(${restaurant.coverImage}) center / cover no-repeat`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {restaurant.name?.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {restaurant.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeLabel}</div>
          </div>
        </div>

        {/* Items summary */}
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.375rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          {formatPrice(totalAmount)}
        </div>
      </div>
    </Link>
  );
};

export default ReorderCard;
