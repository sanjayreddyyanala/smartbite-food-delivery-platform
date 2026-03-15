import { HiOutlineStar, HiOutlineX } from 'react-icons/hi';

const MemberList = ({ members, hostId, currentUserId, isHost, onKick }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {members.map((member, idx) => {
        const userId = String(member.user?._id || member.user || '');
        const isMemberHost = userId === String(hostId);
        const isSelf = userId === String(currentUserId);

        return (
          <div
            key={userId || idx}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.625rem 0.75rem', 
              background: isSelf ? 'rgba(249,115,22,0.08)' : 'var(--color-bg-card)',
              borderRadius: '0.5rem', 
              border: `1px solid ${isSelf ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {/* Avatar */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: isMemberHost ? 'var(--color-primary)' : 'var(--color-bg-input)',
                color: isMemberHost ? 'white' : 'var(--color-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem',
              }}>
                {(member.name || 'M').charAt(0).toUpperCase()}
              </div>

              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                  {member.name || 'Member'}
                  {isSelf && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>(You)</span>}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  {isMemberHost && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
                      fontSize: '0.65rem', color: 'var(--color-warning)', fontWeight: 700,
                    }}>
                      <HiOutlineStar size={11} /> Host
                    </span>
                  )}
                  {/* Ready indicator */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
                    fontSize: '0.65rem', fontWeight: 600,
                    color: member.isReady ? '#22c55e' : 'var(--color-text-muted)',
                  }}>
                    {member.isReady ? '✓ Ready' : '⏳ Not ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Kick button (host only, not self) */}
            {isHost && !isSelf && !isMemberHost && onKick && (
              <button
                onClick={() => onKick(userId)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                title="Kick member"
              >
                <HiOutlineX size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MemberList;
