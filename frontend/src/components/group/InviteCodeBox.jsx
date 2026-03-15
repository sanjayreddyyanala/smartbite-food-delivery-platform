import React, { useState } from 'react';
import { HiOutlineClipboardCopy } from 'react-icons/hi';

const InviteCodeBox = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code) return null;

  return (
    <div style={{ marginBottom: '1.5rem', background: 'rgba(249, 115, 22, 0.05)', border: '1px dashed var(--color-primary)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Group Invite Code</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.2em', color: 'var(--color-primary)' }}>
          {code}
        </span>
        <button 
          onClick={handleCopy}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
          title="Copy Code"
        >
          {copied ? <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'bold' }}>Copied!</span> : <HiOutlineClipboardCopy size={20} />}
        </button>
      </div>
    </div>
  );
};

export default InviteCodeBox;
