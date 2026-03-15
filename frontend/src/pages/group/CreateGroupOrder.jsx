import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as groupApi from '../../api/groupOrder.api';
import * as restaurantApi from '../../api/restaurant.api';
import toast from 'react-hot-toast';
import Loading from '../../components/common/Loading';
import InviteCodeBox from '../../components/group/InviteCodeBox';
import { HiOutlineArrowLeft, HiOutlineCheck, HiOutlineSearch } from 'react-icons/hi';

const CreateGroupOrder = () => {
  const { restaurantId: paramRestaurantId } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(paramRestaurantId ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState(false);

  // Step 0: Restaurant selection
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(paramRestaurantId || null);

  // Step 1: Settings
  const [cartPermission, setCartPermission] = useState('open');
  const [maxMembers, setMaxMembers] = useState(10);

  // Step 2: Session created
  const [sessionData, setSessionData] = useState(null);

  const creatingRef = useRef(false);

  // Fetch restaurants for step 0
  useEffect(() => {
    if (step === 0) fetchRestaurants();
  }, [step]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const { data } = await restaurantApi.getRestaurants({ status: 'approved', isOnline: true });
      setRestaurants(data.restaurants || []);
    } catch {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = (id) => {
    setSelectedRestaurantId(id);
    setStep(1);
  };

  const handleCreateSession = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setLoading(true);
    setCreateError(false);
    try {
      const { data } = await groupApi.createGroupOrder({
        restaurantId: selectedRestaurantId,
        cartPermission,
        maxMembers,
      });
      setSessionData(data.groupOrder);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session');
      setCreateError(true);
    } finally {
      setLoading(false);
      creatingRef.current = false;
    }
  };

  const handleBackToRestaurants = async () => {
    if (sessionData) {
      try { await groupApi.cancelSession(sessionData.code); } catch {}
      setSessionData(null);
    }
    creatingRef.current = false;
    if (paramRestaurantId) {
      navigate('/group');
    } else {
      setSelectedRestaurantId(null);
      setStep(0);
    }
  };

  const handleEnterRoom = () => {
    if (!sessionData) return;
    navigate(`/group/room/${sessionData.code}`);
  };

  const shareableLink = sessionData
    ? `${window.location.origin}/group/join/${sessionData.code}`
    : '';

  // ─── Step 0: Restaurant Selection ───
  if (step === 0) {
    const filtered = restaurants.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="container" style={{ maxWidth: '800px', margin: '3rem auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StepIndicator current={0} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>Select a Restaurant</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Choose the restaurant everyone will order from</p>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <HiOutlineSearch size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text" placeholder="Search restaurants..." className="input-field"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {loading ? <Loading /> : (
          <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
            {filtered.map(r => (
              <div
                key={r._id} onClick={() => handleSelectRestaurant(r._id)}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '0.5rem', background: r.coverImage ? `url(${r.coverImage}) center/cover` : '#eee', flexShrink: 0 }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{r.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
                    {r.address?.city || ''}
                  </p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                No online restaurants found.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Step 1: Settings ───
  if (step === 1) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <button onClick={handleBackToRestaurants} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          <HiOutlineArrowLeft /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <StepIndicator current={1} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem' }}>Session Settings</h1>
        </div>

        {/* Cart Permission */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Cart Permission</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <PermRadio
              value="open" selected={cartPermission} onChange={setCartPermission}
              title="Open" desc="Anyone can add, edit, or remove any item in the cart"
            />
            <PermRadio
              value="personal" selected={cartPermission} onChange={setCartPermission}
              title="Personal" desc="Members can only edit their own items (host can always edit all)"
            />
          </div>
        </div>

        {/* Max Members */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Group Member Count</h3>
          <input
            type="number" min={1} value={maxMembers} className="input-field"
            onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: '120px', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
          />
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Set the maximum number of members allowed
          </p>
        </div>

        <button
          onClick={handleCreateSession} disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {loading ? 'Creating...' : <>Create Group <HiOutlineCheck size={18} /></>}
        </button>

        {createError && (
          <p style={{ color: 'var(--color-error)', textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
            Failed to create session. You may already have an active group.
          </p>
        )}
      </div>
    );
  }

  // ─── Step 2: Session Created — Share ───
  if (!sessionData) return <Loading message="Initializing..." />;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
      <StepIndicator current={2} />
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem', marginBottom: '0.5rem' }}>Invite Your Friends!</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Share the code or link below to invite people
      </p>

      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <InviteCodeBox code={sessionData.code} />

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input type="text" readOnly value={shareableLink} className="input-field" style={{ flex: 1, fontSize: '0.75rem', background: 'var(--color-bg-input)' }} />
          <button
            onClick={() => { navigator.clipboard.writeText(shareableLink); toast.success('Link copied!'); }}
            className="btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}
          >
            Copy Link
          </button>
        </div>
      </div>

      <button
        onClick={handleEnterRoom} className="btn-primary"
        style={{ width: '100%', padding: '1.125rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        Enter Room 🚀
      </button>
    </div>
  );
};

// ─── Sub-components ───
const StepIndicator = ({ current }) => {
  const steps = ['Restaurant', 'Settings', 'Share'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700,
            background: i <= current ? 'var(--color-primary)' : 'var(--color-bg-input)',
            color: i <= current ? '#fff' : 'var(--color-text-muted)',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: '0.8rem', color: i <= current ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: i === current ? 700 : 400 }}>{label}</span>
          {i < steps.length - 1 && <div style={{ width: '24px', height: '1px', background: 'var(--color-border)' }} />}
        </div>
      ))}
    </div>
  );
};

const PermRadio = ({ value, selected, onChange, title, desc }) => (
  <label style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.875rem',
    border: `1px solid ${selected === value ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: '0.5rem', background: selected === value ? 'rgba(249,115,22,0.05)' : 'transparent',
    transition: 'all 0.2s',
  }}>
    <input type="radio" name="perm" value={value} checked={selected === value} onChange={() => onChange(value)} style={{ accentColor: 'var(--color-primary)' }} />
    <div>
      <strong>{title}</strong>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{desc}</p>
    </div>
  </label>
);

export default CreateGroupOrder;
