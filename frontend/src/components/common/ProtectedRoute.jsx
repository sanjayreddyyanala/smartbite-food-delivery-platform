import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import Loading from './Loading';

/**
 * ProtectedRoute — wraps routes that require authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string|string[]} [props.roles] - allowed roles
 * @param {boolean} [props.requireApproval] - require user status === 'approved'
 */
const ProtectedRoute = ({ children, roles, requireApproval = false }) => {
  const { user, loading } = useAuthStore();

  if (loading) return <Loading />;

  // Not authenticated
  if (!user) return <Navigate to="/login" replace />;

  // Role check
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  // Approval check — redirect pending users
  if (requireApproval && user.status === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (user.status === 'rejected') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem',
        }}>🚫</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Account Rejected
        </h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
          Your account has been rejected by the admin. Please contact support for more information.
        </p>
      </div>
    );
  }

  if (user.status === 'banned') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
        }}>⛔</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ef4444' }}>
          Account Banned
        </h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Your account has been banned by the administrator. You can no longer access this platform.
          If you believe this is a mistake, please contact support.
        </p>
        <button
          className="btn-secondary"
          onClick={() => {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }}
          style={{ fontSize: '0.9rem', padding: '0.625rem 1.5rem' }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
