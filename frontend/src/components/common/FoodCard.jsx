import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import { formatPrice } from '../../utils/formatPrice';

const FoodCard = ({ food }) => {
  const { _id, name, price, image, category, avgRating, isVeg, restaurant } = food;
  const restaurantId =
    typeof restaurant === 'object' ? restaurant._id : restaurant;
  const restaurantName =
    typeof restaurant === 'object' ? restaurant.name : null;

  return (
    <Link
      to={restaurantId ? `/restaurants/${restaurantId}` : '#'}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="card"
        style={{
          minWidth: '200px',
          maxWidth: '200px',
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
        <div
          style={{
            height: '110px',
            background: image
              ? `url(${image}) center / cover no-repeat`
              : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            position: 'relative',
          }}
        >
          {isVeg && (
            <span
              style={{
                position: 'absolute',
                top: '0.4rem',
                right: '0.4rem',
                background: '#22c55e',
                color: '#fff',
                fontSize: '0.6rem',
                padding: '2px 5px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              VEG
            </span>
          )}
        </div>

        <div style={{ padding: '0.6rem' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '0.2rem',
            }}
          >
            {name}
          </div>

          {avgRating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
              <StarRating value={avgRating} readonly size={10} />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                {avgRating.toFixed(1)}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              {formatPrice(price)}
            </span>
            {category && (
              <span
                style={{
                  fontSize: '0.6rem',
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: 'rgba(249, 115, 22, 0.08)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {category}
              </span>
            )}
          </div>

          {restaurantName && (
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-muted)',
                marginTop: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {restaurantName}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FoodCard;
