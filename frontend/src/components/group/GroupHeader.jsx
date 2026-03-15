import { formatPrice } from '../../utils/formatPrice';

const GroupHeader = ({ code, status, cartPermission, memberCount, maxMembers, timeRemaining }) => {
  // Format time remaining
  const formatTime = (ms) => {
    if (!ms || ms <= 0) return '0:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const statusConfig = {
    active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    locked: { label: 'Locked', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    ordered: { label: 'Ordered', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    expired: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  };

  const permConfig = {
    open: { label: 'Open Cart', emoji: '🔓' },
    personal: { label: 'Personal Only', emoji: '👤' },
  };

  const st = statusConfig[status] || statusConfig.active;
  const pm = permConfig[cartPermission] || permConfig.open;
  const isUrgent = timeRemaining && timeRemaining < 15 * 60 * 1000; // <15 min

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem',
      marginBottom: '1.5rem', padding: '1rem 1.25rem',
      background: 'var(--color-bg-card)', borderRadius: '0.75rem',
      border: '1px solid var(--color-border)',
    }}>
      {/* Code */}
      <div style={{
        padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
        background: 'rgba(249,115,22,0.08)', border: '1px dashed var(--color-primary)',
        fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800,
        color: 'var(--color-primary)', letterSpacing: '0.15em',
      }}>
        {code}
      </div>

      {/* Status badge */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.3rem 0.65rem', borderRadius: '999px',
        fontSize: '0.75rem', fontWeight: 700,
        background: st.bg, color: st.color,
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />
        {st.label}
      </span>

      {/* Permission badge */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.3rem 0.65rem', borderRadius: '999px',
        fontSize: '0.75rem', fontWeight: 600,
        background: 'var(--color-bg-input)', color: 'var(--color-text-secondary)',
      }}>
        {pm.emoji} {pm.label}
      </span>

      {/* Members count */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.3rem 0.65rem', borderRadius: '999px',
        fontSize: '0.75rem', fontWeight: 600,
        background: 'var(--color-bg-input)', color: 'var(--color-text-secondary)',
      }}>
        👥 {memberCount}/{maxMembers}
      </span>

      {/* Timer */}
      {timeRemaining != null && timeRemaining > 0 && (
        <span style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.3rem 0.65rem', borderRadius: '999px',
          fontSize: '0.8rem', fontWeight: 700,
          background: isUrgent ? 'rgba(239,68,68,0.1)' : 'var(--color-bg-input)',
          color: isUrgent ? '#ef4444' : 'var(--color-text-secondary)',
          animation: isUrgent ? 'pulse 1s ease infinite' : 'none',
        }}>
          ⏱️ {formatTime(timeRemaining)}
        </span>
      )}
    </div>
  );
};

export default GroupHeader;
