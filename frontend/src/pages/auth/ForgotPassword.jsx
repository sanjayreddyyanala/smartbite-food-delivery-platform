import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IoFastFoodOutline } from 'react-icons/io5';
import { HiOutlineMail, HiOutlineCheckCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as authApi from '../../api/auth.api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      // Always show success to prevent email enumeration (matches backend behavior)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      background: 'var(--color-bg-dark)',
    }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <IoFastFoodOutline size={36} style={{ color: 'var(--color-primary)' }} />
            <span className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800 }}>FoodDash</span>
          </Link>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <HiOutlineCheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your email</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                If an account exists with <strong style={{ color: 'var(--color-text-secondary)' }}>{email}</strong>,
                we've sent a password reset link. The link expires in 10 minutes.
              </p>
              <Link to="/login" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Forgot password?</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ position: 'relative' }}>
                  <HiOutlineMail size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
