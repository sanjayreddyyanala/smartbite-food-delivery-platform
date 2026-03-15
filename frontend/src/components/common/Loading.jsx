const Loading = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1.25rem',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '3px solid var(--color-border)',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.9rem',
        fontWeight: 500,
      }}>
        {message}
      </p>
    </div>
  );
};

export default Loading;
