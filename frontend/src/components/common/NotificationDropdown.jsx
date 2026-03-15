import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBell } from 'react-icons/hi';
import useNotificationStore from '../../store/useNotificationStore';

const typeColors = {
  order: { bg: 'rgba(249,115,22,0.12)', border: '#f97316', icon: '📋' },
  payment: { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', icon: '💳' },
  delivery: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', icon: '🚴' },
  success: { bg: 'rgba(34,197,94,0.12)', border: '#22c55e', icon: '✅' },
  warning: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', icon: '⚠️' },
  info: { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', icon: 'ℹ️' },
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const ref = useRef(null);
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotificationStore();

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (n) => {
    const id = n._id || n.id;
    markAsRead(id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HiOutlineBell size={22} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--color-bg-card)',
              animation: 'notifPulse 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: '360px',
            maxHeight: '460px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.875rem',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '999px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            {[{ key: 'all', label: 'All' }, { key: 'unread', label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` }].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: filter === tab.key ? 700 : 500,
                  color: filter === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  borderBottom: filter === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {displayedNotifications.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                <div style={{ fontSize: '0.85rem' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const tc = typeColors[n.type] || typeColors.info;
                const nId = n._id || n.id;
                return (
                  <div
                    key={nId}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      cursor: n.link ? 'pointer' : 'default',
                      background: n.read ? 'transparent' : 'rgba(249,115,22,0.04)',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-input)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = n.read
                        ? 'transparent'
                        : 'rgba(249,115,22,0.04)';
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: tc.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        flexShrink: 0,
                        marginTop: '0.125rem',
                      }}
                    >
                      {tc.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: n.read ? 500 : 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {n.title}
                        </span>
                        {!n.read && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: 'var(--color-primary)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-muted)',
                          margin: '0.125rem 0 0',
                          lineHeight: 1.4,
                        }}
                      >
                        {n.message}
                      </p>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--color-text-muted)',
                          opacity: 0.7,
                        }}
                      >
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default NotificationDropdown;
