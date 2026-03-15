import { useState, useEffect } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as leftoverApi from '../../api/leftover.api';
import * as restaurantApi from '../../api/restaurant.api';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';
import useAuthStore from '../../store/useAuthStore';
import useSocketStore from '../../store/useSocketStore';

const LeftoverFoodManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickupCode, setPickupCode] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuthStore();
  const { socket } = useSocketStore();

  const [form, setForm] = useState({
    description: '', quantity: '', bestBefore: '',
  });

  useEffect(() => {
    fetchPostsAndSetupSocket();

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('leftover-status-changed', fetchPostsAndSetupSocket);
      }
    };
  }, [socket]);

  const fetchPostsAndSetupSocket = async () => {
    try {
      const { data } = await leftoverApi.getMyLeftoverPosts();
      setPosts(data.leftovers || []);

      if (socket) {
        let restaurantId = null;

        const joinRoom = () => {
          if (restaurantId) {
            socket.emit('join-restaurant-room', { restaurantId });
          }
        };

        const setupSocket = async () => {
          const resData = await restaurantApi.getMyRestaurant();
          if (resData?.data?.restaurant?._id) {
            restaurantId = resData.data.restaurant._id;
            joinRoom();
            socket.on('leftover-status-changed', fetchPostsAndSetupSocket);
          }
        };
        
        setupSocket();
        socket.on('connect', joinRoom);
      }
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.description || !form.quantity) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      await leftoverApi.postLeftover(form);
      toast.success('Leftover food posted!');
      setModalOpen(false);
      setForm({ description: '', quantity: '', bestBefore: '' });
      fetchPostsAndSetupSocket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPickup = async (postId) => {
    const code = pickupCode[postId];
    if (!code || code.length !== 4) { toast.error('Enter 4-digit code'); return; }
    setVerifyingId(postId);
    try {
      await leftoverApi.verifyNgoOtp(postId, { otp: code });
      toast.success('Pickup verified!');
      setPickupCode(prev => ({ ...prev, [postId]: '' }));
      fetchPostsAndSetupSocket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await leftoverApi.deleteLeftover(id);
      toast.success('Post deleted');
      setPosts(posts.filter((p) => p._id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <Loading message="Loading leftover food posts..." />;

  const displayedPosts = posts
    .filter((p) => filterStatus === 'all' || p.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'qty_high') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_low') return (a.quantity || 0) - (b.quantity || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div>
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Leftover Food</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Post surplus food for NGOs to claim</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem' }}>
          <HiOutlinePlus size={18} /> Post Food
        </button>
      </div>

      {/* Status Filter + Sort */}
      {posts.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {['all', 'available', 'claimed', 'collected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem',
                  fontWeight: 600, border: '1px solid', cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap',
                  ...(filterStatus === s
                    ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                    : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
                }}
              >
                {s === 'all' ? `All (${posts.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', marginLeft: 'auto' }}>
            {[{ key: 'newest', label: '⬇ Newest' }, { key: 'oldest', label: '⬆ Oldest' }, { key: 'qty_high', label: '📦 Qty ↓' }, { key: 'qty_low', label: '📦 Qty ↑' }].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                style={{
                  padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem',
                  fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
                  ...(sortBy === opt.key
                    ? { background: 'rgba(249,115,22,0.15)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }
                    : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState icon="🍱" title="No posts yet" message="Post leftover food to help reduce waste and feed those in need." action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">Post Now</button>
        } />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {displayedPosts.map((post, i) => {
            const sc = getStatusColor(post.status);
            return (
              <div key={post._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span className="badge" style={{ background: sc.bg, color: sc.text, fontSize: '0.65rem', marginBottom: '0.375rem' }}>
                      {getStatusLabel(post.status)}
                    </span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.25rem' }}>{post.description}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{timeAgo(post.createdAt)}</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  <span>📦 Qty: {post.quantity}</span>
                  {post.bestBefore && <span>⏰ Best before: {new Date(post.bestBefore).toLocaleString('en-IN')}</span>}
                  {post.claimedBy && <span>🏢 Claimed by: {post.claimedBy?.user?.name || post.claimedBy?.organizationName || 'NGO'}</span>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {post.status === 'available' && (
                    <button onClick={() => handleDelete(post._id)} className="btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
                      Delete
                    </button>
                  )}
                </div>

                {/* Pickup Verification Input */}
                {post.status === 'claimed' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%', background: 'var(--color-bg-input)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <input 
                      type="text" 
                      maxLength={4} 
                      placeholder="4-digit Pickup Code" 
                      value={pickupCode[post._id] || ''}
                      onChange={(e) => setPickupCode(prev => ({ ...prev, [post._id]: e.target.value }))}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)', textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700 }}
                    />
                    <button 
                      onClick={() => handleVerifyPickup(post._id)} 
                      disabled={verifyingId === post._id}
                      className="btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      {verifyingId === post._id ? 'Verifying...' : 'Verify Pickup'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Post Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Post Leftover Food" maxWidth="440px">
        <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Description *</label>
            <textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 20 portions of rice and dal" rows={3} required style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Quantity *</label>
            <input className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 20 portions" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Best Before *</label>
            <input className="input-field" type="datetime-local" value={form.bestBefore} onChange={(e) => setForm({ ...form, bestBefore: e.target.value })} required />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default LeftoverFoodManagement;
