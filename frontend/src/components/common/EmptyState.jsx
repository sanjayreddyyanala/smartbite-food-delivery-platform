const EmptyState = ({ icon = '📭', title, message, action }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
        color: 'var(--color-text-primary)',
      }}>
        {title}
      </h3>
      {message && (
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
          maxWidth: '360px',
          lineHeight: '1.6',
        }}>
          {message}
        </p>
      )}
      {action && (
        <div style={{ marginTop: '1.5rem' }}>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
