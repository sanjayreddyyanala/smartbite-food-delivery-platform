import { useState } from 'react';
import toast from 'react-hot-toast';
import StarRating from './StarRating';
import * as reviewApi from '../../api/review.api';

const ReviewForm = ({ order, onReviewSubmitted }) => {
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantReview, setRestaurantReview] = useState('');
  const [foodRatings, setFoodRatings] = useState(
    (order.items || []).map((item) => ({
      foodItem: item.foodItem?._id || item.foodItem,
      name: item.foodItem?.name || item.name,
      rating: 0,
      review: '',
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleFoodRatingChange = (index, field, value) => {
    setFoodRatings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (restaurantRating === 0) {
      toast.error('Please rate the restaurant');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId: order._id,
        restaurantRating,
        restaurantReview: restaurantReview.trim(),
        foodRatings: foodRatings.filter((fr) => fr.rating > 0),
      };

      await reviewApi.submitReview(payload);
      toast.success('Review submitted!');
      onReviewSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <div
        className="card"
        style={{
          marginTop: '1.25rem',
          textAlign: 'center',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.05), rgba(249,115,22,0.1))',
          border: '1px dashed rgba(249,115,22,0.3)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(true)}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⭐</div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          How was your order?
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Tap to rate & review your experience
        </p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ marginTop: '1.25rem' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
        ⭐ Rate Your Order
      </h3>

      {/* Restaurant Rating */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
          Restaurant
        </label>
        <StarRating rating={restaurantRating} onRate={setRestaurantRating} size={28} />
        <textarea
          placeholder="Share your experience (optional)"
          value={restaurantReview}
          onChange={(e) => setRestaurantReview(e.target.value)}
          maxLength={500}
          rows={2}
          className="input-field"
          style={{ width: '100%', marginTop: '0.5rem', resize: 'vertical', fontSize: '0.85rem' }}
        />
      </div>

      {/* Food Item Ratings */}
      {foodRatings.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Rate Items
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {foodRatings.map((fr, idx) => (
              <div
                key={fr.foodItem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0',
                  borderBottom: idx < foodRatings.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.85rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fr.name}
                </span>
                <StarRating
                  rating={fr.rating}
                  onRate={(val) => handleFoodRatingChange(idx, 'rating', val)}
                  size={18}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          className="btn-secondary"
          onClick={() => setExpanded(false)}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting || restaurantRating === 0}
          style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default ReviewForm;
