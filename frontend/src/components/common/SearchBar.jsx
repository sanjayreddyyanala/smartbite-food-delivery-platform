import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import * as restaurantApi from '../../api/restaurant.api';
import { formatPrice } from '../../utils/formatPrice';
import { SEARCH_MIN_CHARS, SEARCH_DEBOUNCE_MS } from '../../constants';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (q.length < SEARCH_MIN_CHARS) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await restaurantApi.globalSearch({ q });
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), SEARCH_DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setOpen(false);
  };

  const goToRestaurant = (id) => {
    setOpen(false);
    setQuery('');
    navigate(`/restaurants/${id}`);
  };

  const totalResults = (results?.restaurantCount || 0) + (results?.foodCount || 0);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, width: '100%', minWidth: '240px' }}>
      <div style={{ position: 'relative' }}>
        <HiOutlineSearch size={17} style={{
          position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)',
        }} />
        <input
          type="text"
          placeholder="Search restaurants or dishes..."
          value={query}
          onChange={handleChange}
          onFocus={() => results && setOpen(true)}
          style={{
            width: '100%', padding: '0.55rem 2.25rem 0.55rem 2.5rem',
            fontSize: '0.875rem', fontWeight: 500,
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border)',
            borderRadius: '999px',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'border 0.2s, box-shadow 0.2s',
          }}
        />
        {query && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', padding: '2px', display: 'flex',
            }}
          >
            <HiOutlineX size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '0.75rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          maxHeight: '400px', overflowY: 'auto', zIndex: 100,
          scrollbarWidth: 'thin',
        }}>
          {loading && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Searching...
            </div>
          )}

          {!loading && totalResults === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              No results for "{query}"
            </div>
          )}

          {/* Restaurants */}
          {results.restaurants?.length > 0 && (
            <div>
              <div style={{
                padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700,
                color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid var(--color-border)',
              }}>
                Restaurants ({results.restaurantCount})
              </div>
              {results.restaurants.map((r) => (
                <div
                  key={r._id}
                  onClick={() => goToRestaurant(r._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.625rem 0.75rem', cursor: 'pointer',
                    transition: 'background 0.15s',
                    borderBottom: '1px solid rgba(51,65,85,0.3)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-input)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '0.375rem', flexShrink: 0,
                    background: r.coverImage ? `url(${r.coverImage}) center/cover` : 'linear-gradient(135deg, #f97316, #fb923c)',
                  }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.name}</div>
                    {r.cuisineType?.length > 0 && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                        {r.cuisineType.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Food Items grouped by restaurant */}
          {results.foodsByRestaurant?.length > 0 && (
            <div>
              <div style={{
                padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700,
                color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid var(--color-border)',
              }}>
                Food Items ({results.foodCount})
              </div>
              {results.foodsByRestaurant.map((group) => (
                <div key={group.restaurant._id}>
                  <div
                    onClick={() => goToRestaurant(group.restaurant._id)}
                    style={{
                      padding: '0.4rem 0.75rem', fontSize: '0.7rem', fontWeight: 600,
                      color: 'var(--color-primary)', cursor: 'pointer',
                      background: 'rgba(249,115,22,0.04)',
                    }}
                  >
                    {group.restaurant.name}
                  </div>
                  {group.items.map((food) => (
                    <div
                      key={food._id}
                      onClick={() => goToRestaurant(group.restaurant._id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem 0.5rem 1.25rem', cursor: 'pointer',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid rgba(51,65,85,0.2)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-input)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {food.isVeg !== undefined && (
                          <span style={{
                            width: '10px', height: '10px', borderRadius: '2px',
                            border: `1.5px solid ${food.isVeg ? '#22c55e' : '#ef4444'}`,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: food.isVeg ? '#22c55e' : '#ef4444' }} />
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem' }}>{food.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {formatPrice(food.price)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
