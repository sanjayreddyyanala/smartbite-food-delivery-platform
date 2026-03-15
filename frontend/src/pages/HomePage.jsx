import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IoFastFoodOutline } from 'react-icons/io5';
import { HiOutlineSearch, HiOutlineTruck, HiOutlineClock, HiOutlineShieldCheck, HiOutlineArrowRight } from 'react-icons/hi';
import useAuthStore from '../store/useAuthStore';
import useSocketStore from '../store/useSocketStore';
import * as orderApi from '../api/order.api';
import * as recommendationApi from '../api/recommendation.api';
import { getStatusColor, getStatusLabel } from '../utils/getStatusColor';
import ReorderCard from '../components/common/ReorderCard';
import RestaurantCard from '../components/common/RestaurantCard';
import FoodCard from '../components/common/FoodCard';

const features = [
  { icon: <HiOutlineSearch size={28} />, title: 'Browse Restaurants', desc: 'Explore hundreds of restaurants near you' },
  { icon: <HiOutlineTruck size={28} />, title: 'Fast Delivery', desc: 'Track your order in real-time with live GPS' },
  { icon: <HiOutlineClock size={28} />, title: 'Group Ordering', desc: 'Order together with friends and split easily' },
  { icon: <HiOutlineShieldCheck size={28} />, title: 'Secure Payments', desc: 'Pay safely with Razorpay or Cash on Delivery' },
];

const HScrollSection = ({ title, subtitle, children, linkTo, linkLabel }) => (
  <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>{subtitle}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          {linkLabel || 'See All'} →
        </Link>
      )}
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
      {children}
    </div>
  </div>
);

const HomePage = () => {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [activeOrders, setActiveOrders] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [recommendedRestaurants, setRecommendedRestaurants] = useState([]);
  const [recommendedFoods, setRecommendedFoods] = useState([]);
  const [trending, setTrending] = useState([]);
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (user && isCustomer) {
      fetchActiveOrders();
      fetchRecommendations();
    } else if (user) {
      // non-customer logged-in user: just trending
      fetchTrending();
    } else {
      fetchTrending();
    }
  }, [user]);

  useEffect(() => {
    if (socket && isCustomer) {
      socket.on('order-status-changed', fetchActiveOrders);
    }
    return () => {
      if (socket) {
        socket.off('order-status-changed', fetchActiveOrders);
      }
    };
  }, [socket, user]);

  const fetchRecommendations = async () => {
    try {
      const [reorderRes, restRes, foodRes, trendRes] = await Promise.allSettled([
        recommendationApi.getReorderSuggestions(5),
        recommendationApi.getRecommendedRestaurants(10),
        recommendationApi.getRecommendedFoods(10),
        recommendationApi.getTrending(10),
      ]);
      if (reorderRes.status === 'fulfilled') setReorderSuggestions(reorderRes.value.data.suggestions || []);
      if (restRes.status === 'fulfilled') setRecommendedRestaurants(restRes.value.data.restaurants || []);
      if (foodRes.status === 'fulfilled') setRecommendedFoods(foodRes.value.data.foods || []);
      if (trendRes.status === 'fulfilled') setTrending(trendRes.value.data.restaurants || []);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    }
  };

  const fetchTrending = async () => {
    try {
      const { data } = await recommendationApi.getTrending(10);
      setTrending(data.restaurants || []);
    } catch (err) {
      console.error('Failed to load trending', err);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const { data } = await orderApi.getMyOrders();
      const active = (data.orders || []).filter(o => 
        ['placed', 'accepted', 'preparing', 'ready', 'picked_up'].includes(o.status)
      );
      setActiveOrders(active);
    } catch (err) {
      console.error('Failed to load active orders', err);
    }
  };

  return (
    <div>
      {/* Active Orders Banner */}
      {activeOrders.length > 0 && (
        <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1, padding: '1.5rem 2rem 0', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeOrders.map((order) => (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'var(--color-bg-card)',
                border: '2px solid var(--color-primary)',
                boxShadow: '0 8px 16px rgba(var(--color-primary-rgb), 0.15)',
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      width: '10px', height: '10px', borderRadius: '50%', 
                      backgroundColor: 'var(--color-primary)', display: 'inline-block' 
                    }}></span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                      Ongoing Order: {order.restaurant?.name || 'Restaurant'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Status:
                    </span>
                    <span className="badge" style={{
                      ...getStatusColor(order.status),
                      background: getStatusColor(order.status).bg,
                      color: getStatusColor(order.status).text,
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      {getStatusLabel(order.status)}
                    </span>
                    {order.status === 'picked_up' && order.deliveryOtpPlain && (
                      <span style={{ 
                        marginLeft: '0.25rem', padding: '0.125rem 0.5rem', 
                        background: '#fef3c7', color: '#b45309', 
                        borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 
                      }}>
                        OTP: {order.deliveryOtpPlain}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' 
                }}>
                  Track Order
                  <HiOutlineArrowRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '6rem 2rem 5rem',
        textAlign: 'center',
        zIndex: 1,
      }}>
        <div className="animate-fade-in" style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 1rem',
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: '999px',
            fontSize: '0.8rem',
            color: 'var(--color-primary)',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}>
            <IoFastFoodOutline size={16} />
            Fresh food, delivered fast
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em',
          }}>
            Delicious food,
            <br />
            <span className="gradient-text">delivered to you</span>
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            maxWidth: '500px',
            margin: '0 auto 2rem',
          }}>
            Order from the best restaurants near you. Track your delivery in real-time and enjoy hot, fresh meals.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/restaurants" className="btn-primary" style={{ textDecoration: 'none', padding: '0.875rem 2rem', fontSize: '1rem' }}>
                Browse Restaurants
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '0.875rem 2rem', fontSize: '1rem' }}>
                  Get Started — It's Free
                </Link>
                <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.875rem 2rem', fontSize: '1rem' }}>
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Personalized Sections */}
      <section style={{ padding: '0 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Quick Reorder */}
        {isCustomer && reorderSuggestions.length > 0 && (
          <HScrollSection title="🔄 Order Again" subtitle="Your recent favorites">
            {reorderSuggestions.map((s, i) => (
              <ReorderCard key={i} suggestion={s} />
            ))}
          </HScrollSection>
        )}

        {/* Recommended Restaurants */}
        {isCustomer && recommendedRestaurants.length > 0 && (
          <HScrollSection title="✨ Recommended For You" subtitle="Restaurants you'll love" linkTo="/restaurants" linkLabel="View All">
            {recommendedRestaurants.map((r) => (
              <RestaurantCard key={r._id} restaurant={r} reason={r._reason} />
            ))}
          </HScrollSection>
        )}

        {/* Recommended Foods */}
        {isCustomer && recommendedFoods.length > 0 && (
          <HScrollSection title="🍽️ Based on Your Taste" subtitle="Food picks just for you">
            {recommendedFoods.map((f) => (
              <FoodCard key={f._id} food={f} />
            ))}
          </HScrollSection>
        )}

        {/* Trending — for everyone */}
        {trending.length > 0 && (
          <HScrollSection title="🔥 Trending Now" subtitle="Popular in your area" linkTo="/restaurants" linkLabel="Browse All">
            {trending.map((r) => (
              <RestaurantCard key={r._id} restaurant={r} reason="Trending" />
            ))}
          </HScrollSection>
        )}
      </section>

      {/* Features */}
      <section style={{
        padding: '3rem 2rem 5rem',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="card animate-fade-in"
              style={{
                animationDelay: `${i * 0.1}s`,
                textAlign: 'center',
                padding: '2rem 1.5rem',
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '1rem',
                background: 'rgba(249,115,22,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'var(--color-primary)',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
