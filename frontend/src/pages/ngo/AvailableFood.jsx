import { useState, useEffect } from 'react';
import { HiOutlineLocationMarker, HiOutlineClock } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as ngoApi from '../../api/ngo.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { timeAgo } from '../../utils/formatDate';
import useSocketStore from '../../store/useSocketStore';

const AvailableFood = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [claimedOtpModal, setClaimedOtpModal] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  
  const { socket } = useSocketStore();

  useEffect(() => {
    fetchPosts();

    if (socket) {
      socket.on('available-leftovers-updated', fetchPosts);
    }

    return () => {
      if (socket) {
        socket.off('available-leftovers-updated', fetchPosts);
      }
    };
  }, [socket]);

  const fetchPosts = async () => {
    try {
      const { data } = await ngoApi.getAvailableLeftover();
      setPosts(data.leftovers || []);
    } catch {
      toast.error('Failed to load available food');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (postId) => {
    setClaimingId(postId);
    const selectedPost = posts.find((p) => p._id === postId);
    setConfirmModal(null);
    try {
      const { data } = await ngoApi.claimLeftover(postId);
      setClaimedOtpModal({ restaurantName: selectedPost?.restaurant?.name, otp: data.otp });
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return <Loading message="Loading available food..." />;

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'qty_high') return (b.quantity || 0) - (a.quantity || 0);
    if (sortBy === 'qty_low') return (a.quantity || 0) - (b.quantity || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });

  return (
    <div>
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Available Food</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{posts.length} post{posts.length !== 1 ? 's' : ''} available for pickup</p>
        </div>
        <button onClick={fetchPosts} className="btn-secondary" style={{ fontSize: '0.8rem' }}>🔄 Refresh</button>
      </div>

      {/* Sort Row */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'newest', label: '⬇ Newest' },
          { key: 'oldest', label: '⬆ Oldest' },
          { key: 'qty_high', label: '📦 Most Qty' },
          { key: 'qty_low', label: '📦 Least Qty' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            style={{
              padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem',
              fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              ...(sortBy === opt.key
                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState icon="🍱" title="No food available right now" message="Check back later — restaurants post surplus food regularly." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {sortedPosts.map((post, i) => (
            <div key={post._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
              {/* Restaurant Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '0.5rem',
                  background: 'rgba(34,197,94,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                }}>
                  🍽️
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{post.restaurant?.name || 'Restaurant'}</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeAgo(post.createdAt)}</span>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {post.description}
              </p>

              {/* Meta */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                <span>📦 Qty: {post.quantity}</span>
                {post.pickupWindow && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <HiOutlineClock size={14} /> {post.pickupWindow}
                  </span>
                )}
                {post.restaurant?.address?.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <HiOutlineLocationMarker size={14} /> {post.restaurant.address.city}
                  </span>
                )}
              </div>

              <button
                onClick={() => setConfirmModal(post)}
                disabled={claimingId === post._id}
                className="btn-primary"
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                {claimingId === post._id ? 'Claiming...' : '✋ Claim This Food'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirm Claim" maxWidth="400px">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍱</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Claim food from <strong>{confirmModal?.restaurant?.name}</strong>?
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            You'll receive a pickup OTP after claiming.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => handleClaim(confirmModal._id)}>
              Confirm Claim
            </button>
          </div>
        </div>
      </Modal>

      {/* Claimed OTP Modal */}
      <Modal isOpen={!!claimedOtpModal} onClose={() => setClaimedOtpModal(null)} title="Claim Successful! 🎉" maxWidth="400px">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
            You have successfully claimed the food from <strong>{claimedOtpModal?.restaurantName}</strong>!
          </p>
          <div style={{ background: 'rgba(34,197,94,0.1)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px dashed rgba(34,197,94,0.3)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Your Pickup OTP</p>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--color-success)' }}>
              {claimedOtpModal?.otp}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              We've also sent this to your email. Share it with the restaurant to pick up the food.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setClaimedOtpModal(null)} style={{ width: '100%' }}>
            Got It
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AvailableFood;
