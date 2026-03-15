import { Link } from 'react-router-dom';
import StarRating from './StarRating';

const RestaurantCard = ({ restaurant, reason }) => {
  const { _id, name, coverImage, cuisineType, avgRating, totalRatings, deliveryTime, isVeg } =
    restaurant;

  return (
    <Link
      to={`/restaurants/${_id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="card"
        style={{
          minWidth: '240px',
          maxWidth: '240px',
          flexShrink: 0,
          overflow: 'hidden',
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
        {/* Image */}
        <div
          style={{
            height: '130px',
            background: coverImage
              ? `url(${coverImage}) center / cover no-repeat`
              : 'linear-gradient(135deg, #f97316, #fb923c)',
            position: 'relative',
          }}
        >
          {isVeg && (
            <span
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: '#22c55e',
                color: '#fff',
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              VEG
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '0.75rem' }}>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '0.25rem',
            }}
          >
            {name}
          </div>

          {/* Rating */}
          {avgRating > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginBottom: '0.25rem',
              }}
            >
              <StarRating value={avgRating} readonly size={12} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                ({totalRatings})
              </span>
            </div>
          )}

          {/* Cuisine + time */}
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '0.25rem',
            }}
          >
            {Array.isArray(cuisineType) ? cuisineType.join(', ') : cuisineType}
            {deliveryTime ? ` · ${deliveryTime} min` : ''}
          </div>

          {/* Reason tag */}
          {reason && (
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(249, 115, 22, 0.1)',
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              {reason}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
