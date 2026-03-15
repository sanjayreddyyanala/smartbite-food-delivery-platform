import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFastFoodOutline } from 'react-icons/io5';
import { HiOutlineClock, HiOutlineXCircle } from 'react-icons/hi';
import useAuthStore from '../../store/useAuthStore';

const PendingApproval = () => {
  const { user, logout, loadUser } = useAuthStore();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.status === 'approved') {
      navigate('/');
    }
  }, [user?.status, navigate]);

  useEffect(() => {
    // Poll for status every 10 seconds
    const interval = setInterval(() => {
      loadUser();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadUser]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const isRejected = user?.status === 'rejected';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      background: 'var(--color-bg-dark)',
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        <IoFastFoodOutline size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />

        <div className="card" style={{ padding: '2.5rem 2rem' }}>
          <div className="animate-pulse-glow" style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isRejected ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            {isRejected ? (
              <HiOutlineXCircle size={40} style={{ color: 'var(--color-error)' }} />
            ) : (
              <HiOutlineClock size={40} style={{ color: 'var(--color-warning)' }} />
            )}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {isRejected ? 'Application Rejected' : 'Awaiting Approval'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
            {isRejected ? (
              <>Your application as <strong style={{ color: 'var(--color-error)', textTransform: 'capitalize' }}>{user?.role}</strong> was not approved. Please contact support if you believe this is a mistake.</>
            ) : (
              <>Your account as <strong style={{ color: 'var(--color-primary)', textTransform: 'capitalize' }}>{user?.role}</strong> is under review. Our admin team will approve your account shortly.</>
            )}
          </p>

          {user && (
            <div style={{
              background: 'var(--color-bg-input)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Name</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Email</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Status</span>
                <span className="badge" style={{ 
                  background: isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', 
                  color: isRejected ? 'var(--color-error)' : 'var(--color-warning)',
                  textTransform: 'capitalize'
                }}>
                  {user.status}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!isRejected && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-primary"
                style={{ width: '100%', fontSize: '0.9rem' }}
              >
                {refreshing ? 'Checking...' : 'Check Status Now'}
              </button>
            )}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className={isRejected ? 'btn-primary' : 'btn-secondary'}
              style={{ width: '100%', fontSize: '0.9rem' }}
            >
              Sign out & try later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
