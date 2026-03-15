import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineShoppingCart, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import useAuthStore from '../../store/useAuthStore';
import useCartStore from '../../store/useCartStore';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';
import { ROLES } from '../../constants';

const Navbar = ({ style = {} }) => {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case ROLES.RESTAURANT: return '/restaurant/dashboard';
      case ROLES.DELIVERY: return '/delivery/dashboard';
      case ROLES.NGO: return '/ngo/dashboard';
      case ROLES.ADMIN: return '/admin/dashboard';
      default: return '/';
    }
  };

  const isCustomer = user?.role === ROLES.CUSTOMER;

  return (
    <nav className="glass" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 1000,
      borderBottom: '1px solid var(--color-border)',
      ...style,
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        height: '64px',
        gap: '1rem',
      }}>
        {/* Logo */}
        <Link to={getDashboardLink()} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
        }}>
          <IoFastFoodOutline size={28} style={{ color: 'var(--color-primary)' }} />
          <span className="gradient-text" style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}>
            FoodDash
          </span>
        </Link>

        {/* Middle Search (customer desktop) */}
        {user && isCustomer && (
          <div className="customer-search-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <SearchBar />
          </div>
        )}

        {/* Desktop Nav Links */}
        <div className="nav-links" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginLeft: user && isCustomer ? 0 : 'auto',
        }}>
          {user ? (
            <>
              {isCustomer && (
                <>
                  <Link to="/restaurants" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                    Restaurants
                  </Link>
                  <Link to="/orders" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                    My Orders
                  </Link>
                  <Link to="/group" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                    Group Order
                  </Link>

                  {/* Cart Icon */}
                  <Link to="/cart" style={{ position: 'relative', color: 'var(--color-text-secondary)' }}>
                    <HiOutlineShoppingCart size={22} />
                    {cartCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* Notification Bell — all roles */}
              <NotificationDropdown />

              {/* Profile Dropdown */}
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '999px',
                    padding: '0.375rem 0.75rem 0.375rem 0.375rem',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.name?.split(' ')[0]}</span>
                </button>

                {profileOpen && (
                  <div className="animate-fade-in" style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    padding: '0.5rem',
                    minWidth: '180px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid var(--color-border)',
                      marginBottom: '0.25rem',
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
                      <div className="badge" style={{
                        marginTop: '0.375rem',
                        background: 'rgba(249,115,22,0.15)',
                        color: 'var(--color-primary)',
                        fontSize: '0.65rem',
                        textTransform: 'capitalize',
                      }}>
                        {user.role}
                      </div>
                    </div>

                    <Link
                      to={getDashboardLink()}
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary)',
                        borderRadius: '0.5rem',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.target.style.background = 'var(--color-bg-input)'}
                      onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                      Dashboard
                    </Link>

                    {user.role === ROLES.CUSTOMER && (
                      <Link
                        to="/addresses"
                        onClick={() => setProfileOpen(false)}
                        style={{
                          display: 'block',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.85rem',
                          color: 'var(--color-text-secondary)',
                          borderRadius: '0.5rem',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.target.style.background = 'var(--color-bg-input)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}
                      >
                        My Addresses
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-error)',
                        background: 'none',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
                      onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                Login
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', textDecoration: 'none' }}>
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            {menuOpen ? <HiOutlineX size={24} /> : <HiOutlineMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="animate-fade-in" style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {user && user.role === ROLES.CUSTOMER && (
            <>
              <Link to="/restaurants" onClick={() => setMenuOpen(false)} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Restaurants</Link>
              <Link to="/orders" onClick={() => setMenuOpen(false)} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>My Orders</Link>
              <Link to="/group" onClick={() => setMenuOpen(false)} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Group Order</Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)} style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Cart ({cartCount})</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .customer-search-wrap { display: none !important; }
          .nav-links > a, .nav-links > div { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
