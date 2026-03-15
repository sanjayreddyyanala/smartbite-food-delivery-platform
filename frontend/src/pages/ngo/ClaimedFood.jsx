import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as ngoApi from '../../api/ngo.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';
import useSocketStore from '../../store/useSocketStore';

const ClaimedFood = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  
  const { socket } = useSocketStore();

  useEffect(() => {
    fetchPosts();

    if (socket) {
      socket.on('leftover-status-changed', fetchPosts);
      socket.on('available-leftovers-updated', fetchPosts);
    }

    return () => {
      if (socket) {
        socket.off('leftover-status-changed', fetchPosts);
        socket.off('available-leftovers-updated', fetchPosts);
      }
    };
  }, [socket]);

  const fetchPosts = async () => {
    try {
      const { data } = await ngoApi.getClaimedLeftover();
      setPosts(data.claims || []);
    } catch {
      toast.error('Failed to load claimed posts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading your claims..." />;

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'status') {
      const order = { claimed: 0, collected: 1 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    }
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });

  return (
    <div>
      <div className="animate-fade-in" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Claims</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{posts.length} claimed post{posts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Sort Row */}
      {posts.length > 0 && (
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { key: 'newest', label: '⬇ Newest' },
            { key: 'oldest', label: '⬆ Oldest' },
            { key: 'status', label: '📌 By Status' },
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
      )}

      {posts.length === 0 ? (
        <EmptyState icon="✅" title="No claims yet" message="Browse available food and claim items for pickup." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sortedPosts.map((post, i) => {
            const sc = getStatusColor(post.status);
            return (
              <div key={post._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{post.restaurant?.name || 'Restaurant'}</h3>
                      <span className="badge" style={{ background: sc.bg, color: sc.text, fontSize: '0.65rem' }}>
                        {getStatusLabel(post.status)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{post.description}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {timeAgo(post.createdAt)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  <span>📦 Qty: {post.quantity}</span>
                  {post.pickupWindow && <span>⏰ {post.pickupWindow}</span>}
                </div>

                {/* OTP Display */}
                {post.status === 'claimed' && post.claimOtp && (
                  <div style={{ background: 'var(--color-bg-input)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center', border: '1px solid var(--color-border)', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                      Give this code to the restaurant to confirm pickup:
                    </p>
                    <div style={{ 
                      fontSize: '2rem', fontWeight: 800, letterSpacing: '0.15em', 
                      color: 'var(--color-primary)', background: '#fff', 
                      padding: '0.5rem', borderRadius: '0.5rem', 
                      border: '2px dashed var(--color-primary)', display: 'inline-block' 
                    }}>
                      {post.claimOtp}
                    </div>
                  </div>
                )}

                {post.status === 'picked_up' && (
                  <div style={{
                    marginTop: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem',
                    background: 'rgba(34,197,94,0.1)', textAlign: 'center',
                    fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600,
                  }}>
                    ✅ Pickup Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClaimedFood;
