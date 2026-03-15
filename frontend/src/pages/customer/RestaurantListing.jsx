import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineLocationMarker, HiOutlineClock, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import toast from 'react-hot-toast';
import * as restaurantApi from '../../api/restaurant.api';
import * as recommendationApi from '../../api/recommendation.api';
import useAuthStore from '../../store/useAuthStore';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import StarRating from '../../components/common/StarRating';

const CUISINE_FILTERS = ['All', 'North Indian', 'South Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'Continental', 'Fast Food', 'Desserts'];

const RestaurantListing = () => {
  const { user } = useAuthStore();
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState(user?.role === 'customer' ? 'recommended' : 'default');
  const [recommendedIds, setRecommendedIds] = useState(new Set());

  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (isCustomer) {
      fetchRecommendedIds();
    }
    fetchRestaurants();
  }, []);

  const fetchRecommendedIds = async () => {
    try {
      const { data } = await recommendationApi.getRecommendedRestaurants(50);
      const ids = (data.restaurants || []).map((r) => r._id);
      setRecommendedIds(new Set(ids));
    } catch {
      // non-critical
    }
  };

  const sortRestaurants = (list, sort) => {
    if (sort === 'rating') {
      return [...list].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    }
    if (sort === 'recommended' && recommendedIds.size > 0) {
      return [...list].sort((a, b) => {
        const aRec = recommendedIds.has(a._id) ? 1 : 0;
        const bRec = recommendedIds.has(b._id) ? 1 : 0;
        if (bRec !== aRec) return bRec - aRec;
        return (b.avgRating || 0) - (a.avgRating || 0);
      });
    }
    return list;
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const { data } = await restaurantApi.getRestaurants();
      setAllRestaurants(data.restaurants || []);
    } catch (err) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const categoryFilters = useMemo(() => {
    const uniqueCategories = [...new Set(
      allRestaurants.flatMap((restaurant) => restaurant.categories || [])
    )];

    return ['All', ...uniqueCategories];
  }, [allRestaurants]);

  const filteredRestaurants = useMemo(() => {
    return allRestaurants.filter((restaurant) => {
      const matchesSearch = !search.trim()
        || restaurant.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCuisine = activeCuisine === 'All'
        || restaurant.cuisineType?.includes(activeCuisine);
      const matchesCategory = activeCategory === 'All'
        || (restaurant.categories || []).includes(activeCategory);

      return matchesSearch && matchesCuisine && matchesCategory;
    });
  }, [allRestaurants, search, activeCuisine, activeCategory]);

  const displayRestaurants = sortRestaurants(filteredRestaurants, sortBy);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleCuisineFilter = (cuisine) => {
    setActiveCuisine(cuisine);
  };

  const handleCategoryFilter = (category) => {
    setActiveCategory(category);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Restaurants
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Discover delicious food from the best restaurants near you
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          maxWidth: '500px',
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <HiOutlineSearch size={18} style={{
              position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search restaurants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem' }}>
            Search
          </button>
        </div>
      </form>

      {/* Cuisine Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '1rem',
        scrollbarWidth: 'none',
      }}>
        {CUISINE_FILTERS.map((cuisine) => (
          <button
            key={cuisine}
            onClick={() => handleCuisineFilter(cuisine)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              ...(activeCuisine === cuisine ? {
                background: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                color: '#fff',
              } : {
                background: 'transparent',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }),
            }}
          >
            {cuisine}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '2rem',
        scrollbarWidth: 'none',
      }}>
        {categoryFilters.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryFilter(category)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              ...(activeCategory === category ? {
                background: 'rgba(59,130,246,0.15)',
                borderColor: 'var(--color-info)',
                color: '#bfdbfe',
              } : {
                background: 'transparent',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }),
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sort:</span>
        {[
          { key: 'default', label: 'Default' },
          ...(isCustomer ? [{ key: 'recommended', label: '✨ Recommended' }] : []),
          { key: 'rating', label: '⭐ Top Rated' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(sortBy === opt.key
                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                : { background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }),
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <Loading message="Finding restaurants..." />
      ) : displayRestaurants.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="No restaurants found"
          message="Try adjusting your search or filters to find what you're looking for."
          action={
            <button className="btn-secondary" onClick={() => { setSearch(''); setActiveCuisine('All'); setActiveCategory('All'); }}>
              Clear Filters
            </button>
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.25rem',
        }}>
          {displayRestaurants.map((restaurant, i) => (
            <RestaurantListCard key={restaurant._id} restaurant={restaurant} index={i} isRecommended={recommendedIds.has(restaurant._id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const RestaurantListCard = ({ restaurant, index, isRecommended }) => {
  const [currentImg, setCurrentImg] = useState(0);

  // Aggregate images
  const images = [];
  if (restaurant.coverImage) images.push(restaurant.coverImage);
  if (restaurant.images && restaurant.images.length > 0) {
    restaurant.images.forEach(img => {
      if (img !== restaurant.coverImage && !images.includes(img)) {
        images.push(img);
      }
    });
  }

  const handlePrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg((prev) => (prev + 1) % images.length);
  };

  const placeholderGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  ];

  return (
    <Link
      to={`/restaurants/${restaurant._id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="card animate-fade-in"
        style={{
          animationDelay: `${index * 0.05}s`,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
      >
        {/* Cover Image */}
        <div style={{
          height: '160px',
          background: images.length > 0
            ? `url(${images[currentImg]}) center / cover no-repeat`
            : placeholderGradients[index % placeholderGradients.length],
          position: 'relative',
          transition: 'background 0.3s ease-in-out',
        }}>
          {images.length > 1 && (
            <>
              {/* Arrows */}
              <div 
                onClick={handlePrev}
                style={{
                  position: 'absolute', left: '0.35rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.4)', color: 'white', borderRadius: '50%',
                  width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10, transition: 'background 0.2s', backdropFilter: 'blur(4px)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
              >
                <HiChevronLeft size={16} />
              </div>
              <div 
                onClick={handleNext}
                style={{
                  position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.4)', color: 'white', borderRadius: '50%',
                  width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10, transition: 'background 0.2s', backdropFilter: 'blur(4px)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
              >
                <HiChevronRight size={16} />
              </div>

              {/* Dots */}
              <div style={{
                position: 'absolute', bottom: '0.5rem', left: '0', right: '0',
                display: 'flex', justifyContent: 'center', gap: '0.25rem', zIndex: 10
              }}>
                {images.map((_, i) => (
                  <div key={i} style={{
                    width: i === currentImg ? '12px' : '6px',
                    height: '6px', borderRadius: '3px',
                    background: i === currentImg ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s'
                  }} />
                ))}
              </div>
            </>
          )}

          {/* Online badge */}
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '999px',
            fontSize: '0.7rem',
            fontWeight: 700,
            background: restaurant.isOnline ? 'rgba(34,197,94,0.9)' : 'rgba(107,114,128,0.9)',
            color: '#fff',
            backdropFilter: 'blur(4px)',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: restaurant.isOnline ? '#86efac' : '#9ca3af',
            }} />
            {restaurant.isOnline ? 'Open' : 'Closed'}
          </div>

          {/* removed fast food icon placeholder per user request */}
        </div>

        {/* Details */}
        <div style={{ padding: '1rem 1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.375rem' }}>
            {restaurant.name}
            {isRecommended && (
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.6rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(249,115,22,0.1)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                verticalAlign: 'middle',
              }}>
                ✨ For You
              </span>
            )}
          </h3>

          {/* Rating */}
          {restaurant.avgRating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
              <StarRating value={restaurant.avgRating} readonly size={14} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{restaurant.avgRating.toFixed(1)}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                ({restaurant.totalRatings} {restaurant.totalRatings === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {/* Cuisine tags */}
          {restaurant.cuisineType?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {restaurant.cuisineType.slice(0, 3).map((c) => (
                <span key={c} style={{
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  borderRadius: '999px',
                  background: 'rgba(249,115,22,0.1)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(249,115,22,0.15)',
                }}>
                  {c}
                </span>
              ))}
              {restaurant.cuisineType.length > 3 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  +{restaurant.cuisineType.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Location & Hours */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {restaurant.address?.city && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineLocationMarker size={14} />
                {restaurant.address.city}
              </span>
            )}
            {restaurant.openingHours && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineClock size={14} />
                {restaurant.openingHours.open} — {restaurant.openingHours.close}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantListing;
