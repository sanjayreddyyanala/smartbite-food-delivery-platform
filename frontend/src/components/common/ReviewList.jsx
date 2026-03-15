import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import * as reviewApi from '../../api/review.api';

const ReviewList = ({ restaurantId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchReviews(1);
  }, [restaurantId]);

  const fetchReviews = async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await reviewApi.getRestaurantReviews(restaurantId, { page: pageNum, limit: 5 });
      if (pageNum === 1) {
        setReviews(data.reviews);
      } else {
        setReviews((prev) => [...prev, ...data.reviews]);
      }
      setPagination(data.pagination);
      setPage(pageNum);
    } catch {
      // Silent fail — reviews section is optional
    } finally {
      setLoading(false);
    }
  };

  if (loading && reviews.length === 0) {
    return null; // Don't show loading state for reviews section
  }

  if (reviews.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        Reviews
        {pagination && (
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            ({pagination.total})
          </span>
        )}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {reviews.map((review) => (
          <div
            key={review._id}
            className="card"
            style={{ padding: '1rem' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {(review.customer?.user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {review.customer?.user?.name || 'Customer'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <StarRating rating={review.restaurantRating} size={16} readonly />
            </div>

            {/* Restaurant review text */}
            {review.restaurantReview && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                {review.restaurantReview}
              </p>
            )}

            {/* Food ratings */}
            {review.foodRatings?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
                {review.foodRatings.map((fr) => (
                  <div
                    key={fr.foodItem}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      borderRadius: '999px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{fr.name}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {fr.rating}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {pagination && page < pagination.pages && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={() => fetchReviews(page + 1)}
            disabled={loading}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1.5rem' }}
          >
            {loading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
