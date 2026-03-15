import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as groupApi from '../../api/groupOrder.api';
import useAuthStore from '../../store/useAuthStore';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const JoinGroupOrder = () => {
  const navigate = useNavigate();
  const { inviteCode: paramCode } = useParams();
  const { user } = useAuthStore();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);

  const joiningRef = useRef(false);

  useEffect(() => {
    let autoCode = paramCode;
    if (!autoCode) {
      const saved = sessionStorage.getItem('pendingGroupInvite');
      if (saved) {
        autoCode = saved;
        sessionStorage.removeItem('pendingGroupInvite');
      }
    }

    if (autoCode) {
      const cleaned = autoCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setCode(cleaned);

      if (user && !joiningRef.current) {
        joiningRef.current = true;
        setAutoJoining(true);
        doJoin(cleaned);
      } else if (!user) {
        sessionStorage.setItem('pendingGroupInvite', cleaned);
      }
    }
  }, [paramCode, user]);

  const doJoin = async (targetCode) => {
    setLoading(true);
    try {
      const { data } = await groupApi.joinGroupOrder(targetCode);
      toast.success('Joined group order!');
      navigate(`/group/room/${data.groupOrder?.code || targetCode}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired invite code';
      if (msg.includes('Already a member') || msg.includes('already')) {
        toast('You are already a member!');
        navigate(`/group/room/${targetCode}`);
      } else {
        toast.error(msg);
      }
      setCode('');
      setAutoJoining(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length < 4) {
      toast.error('Please enter a valid 6-character code');
      return;
    }
    await doJoin(code.toUpperCase());
  };

  if (autoJoining) return <Loading message="Joining group order..." />;

  return (
    <div className="container" style={{ maxWidth: '480px', margin: '6rem auto' }}>
      <div className="card animate-fade-in" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Join a Group</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter the 6-character code shared by the host.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text" className="input-field" placeholder="e.g. AB12CD"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={6}
            style={{ textAlign: 'center', fontSize: '1.75rem', letterSpacing: '0.2em', fontWeight: 800, marginBottom: '1.5rem', padding: '1rem', fontFamily: 'monospace' }}
            required autoComplete="off"
          />
          <button
            type="submit" className="btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            disabled={loading || code.length < 6}
          >
            {loading ? 'Joining...' : 'Join Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGroupOrder;
