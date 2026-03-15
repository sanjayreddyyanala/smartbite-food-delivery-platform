import { useState } from 'react';

const StarRating = ({ rating = 0, onRate = null, size = 20, readonly = false }) => {
  const [hovered, setHovered] = useState(0);
  const interactive = !readonly && onRate;

  return (
    <div style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive ? star <= (hovered || rating) : star <= rating;
        const halfFilled = !filled && !interactive && star - 0.5 <= rating;

        return (
          <span
            key={star}
            onClick={() => interactive && onRate(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              fontSize: `${size}px`,
              lineHeight: 1,
              color: filled ? '#f59e0b' : halfFilled ? '#f59e0b' : '#d1d5db',
              transition: 'color 0.15s, transform 0.15s',
              transform: interactive && hovered === star ? 'scale(1.2)' : 'scale(1)',
              userSelect: 'none',
            }}
          >
            {filled ? '★' : halfFilled ? '★' : '☆'}
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
