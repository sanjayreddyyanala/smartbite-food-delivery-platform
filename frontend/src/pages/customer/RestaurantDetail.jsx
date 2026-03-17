import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlineClock, HiOutlinePhone, HiOutlineArrowLeft } from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import * as restaurantApi from '../../api/restaurant.api';
import * as foodApi from '../../api/food.api';
import useCartStore from '../../store/useCartStore';
import useAuthStore from '../../store/useAuthStore';
import { formatPrice } from '../../utils/formatPrice';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import StarRating from '../../components/common/StarRating';
import ReviewList from '../../components/common/ReviewList';
import MapWrapper from '../../components/map/MapWrapper';
import RestaurantMap from '../../components/map/RestaurantMap';
import ImageLightbox from '../../components/common/ImageLightbox';
import * as recommendationApi from '../../api/recommendation.api';
import { DEFAULT_RESTAURANT_CATEGORIES } from '../../constants';

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [addingToCart, setAddingToCart] = useState(null);
  const [conflictModal, setConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [showLocationMap, setShowLocationMap] = useState(false);

  // Gallery slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null); // { url, source: 'gallery' | 'food' }
  const slideTimerRef = useRef(null);
  const [recommendedItems, setRecommendedItems] = useState([]);

  const { user } = useAuthStore();

  const galleryImages = restaurant?.images || [];
  const hasGallery = galleryImages.length > 0;
  const totalSlides = galleryImages.length;

  const goToSlide = useCallback((idx) => {
    if (totalSlides === 0) return;
    setCurrentSlide((idx + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (slidePaused || totalSlides <= 1) return;
    slideTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(slideTimerRef.current);
  }, [slidePaused, totalSlides]);

  const { items: cartItems, restaurant: cartRestaurant, fetchCart, addItem, updateItem, removeItem, clearCart } = useCartStore();

  useEffect(() => {
    fetchData();
    if (user?.role === 'customer') {
      fetchRecommendedItems();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, foodData] = await Promise.all([
        restaurantApi.getRestaurant(id),
        foodApi.getRestaurantFoods(id),
      ]);
      setRestaurant(resData.data.restaurant);
      setFoods(foodData.data.foods);
    } catch (err) {
      toast.error('Failed to load restaurant');
      navigate('/restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedItems = async () => {
    try {
      const { data } = await recommendationApi.getRestaurantRecommendedItems(id);
      setRecommendedItems(data.foods || []);
    } catch {
      // silent — recommendations are optional
    }
  };

  const handleAddToCart = async (food, cookingInstructions = '') => {
    // Check for restaurant conflict (use String() to avoid object vs string mismatch)
    const cartRestId = typeof cartRestaurant === 'object' ? cartRestaurant?._id : cartRestaurant;
    if (cartRestId && String(cartRestId) !== String(id) && cartItems.length > 0) {
      setPendingItem({ food, cookingInstructions });
      setConflictModal(true);
      return false;
    }

    setAddingToCart(food._id);
    try {
      const result = await addItem(food, id, cookingInstructions);
      if (result?.conflict) {
        setPendingItem({ food, cookingInstructions });
        setConflictModal(true);
        return false;
      }
      toast.success(`${food.name} added to cart!`);
      return true;
    } catch (err) {
      // If backend returns 409 restaurant conflict, show the modal instead of a toast
      if (err.response?.status === 409 && err.response?.data?.conflict) {
        setPendingItem({ food, cookingInstructions });
        setConflictModal(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to add to cart');
      }
      return false;
    } finally {
      setAddingToCart(null);
    }
  };

  const handleClearAndAdd = async () => {
    const nextItem = pendingItem;
    setConflictModal(false);
    setPendingItem(null);
    if (!nextItem?.food) return;

    setAddingToCart(nextItem.food._id);
    try {
      await clearCart();
      await addItem(nextItem.food, id, nextItem.cookingInstructions || '');
      toast.success(`Cart cleared. ${nextItem.food.name} added!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleUpdateCartQty = async (foodId, newQty) => {
    if (newQty < 0) return;

    // Prefer the default (no-note) line for stepper controls; fallback to first matching line.
    const matchingItems = cartItems.filter((item) => {
      const itemFoodId = item.foodItem?._id || item.foodItem;
      return String(itemFoodId) === String(foodId);
    });
    const cartItem = matchingItems.find((item) => !(item.cookingInstructions || '').trim()) || matchingItems[0];
    if (!cartItem) return;

    setAddingToCart(foodId);
    try {
      if (newQty === 0) {
        await removeItem(cartItem._id);
      } else {
        await updateItem(cartItem._id, newQty);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    } finally {
      setAddingToCart(null);
    }
  };

  const filteredFoods = foods.filter((f) => {
    if (activeCategory !== 'All' && f.category !== activeCategory) return false;
    if (vegOnly && !f.isVeg) return false;
    return true;
  });

  const restaurantCategories = useMemo(() => {
    const nextCategories = restaurant?.categories?.length
      ? [...restaurant.categories]
      : [...DEFAULT_RESTAURANT_CATEGORIES];

    for (const food of foods) {
      if (food.category && !nextCategories.includes(food.category)) {
        nextCategories.push(food.category);
      }
    }

    return nextCategories;
  }, [restaurant, foods]);

  const groupedFoods = useMemo(() => {
    const sections = restaurantCategories
      .map((category) => ({
        category,
        items: filteredFoods.filter((food) => food.category === category),
      }))
      .filter((section) => section.items.length > 0);

    const uncategorizedItems = filteredFoods.filter(
      (food) => food.category && !restaurantCategories.includes(food.category)
    );

    if (uncategorizedItems.length > 0) {
      sections.push({ category: 'Other', items: uncategorizedItems });
    }

    return sections;
  }, [filteredFoods, restaurantCategories]);

  const getCartQty = (foodId) => {
    return cartItems.reduce((total, item) => {
      const itemFoodId = item.foodItem?._id || item.foodItem;
      return String(itemFoodId) === String(foodId) ? total + (item.quantity || 0) : total;
    }, 0);
  };

  if (loading) return <Loading message="Loading restaurant..." />;
  if (!restaurant) return null;

  const placeholderGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/restaurants')}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          background: 'none', border: 'none', color: 'var(--color-text-muted)',
          cursor: 'pointer', padding: '1rem 0', fontSize: '0.85rem', fontWeight: 500,
        }}
      >
        <HiOutlineArrowLeft size={16} /> Back to Restaurants
      </button>

      {/* Restaurant Header */}
      <div className="animate-fade-in" style={{
        borderRadius: '1rem',
        overflow: 'hidden',
        marginBottom: '2rem',
        border: '1px solid var(--color-border)',
      }}>
        {/* Cover / Gallery Slideshow */}
        <div
          style={{
            height: hasGallery ? '300px' : '220px',
            position: 'relative',
            background: !hasGallery && !restaurant.coverImage ? placeholderGradient : '#000',
            cursor: hasGallery ? 'pointer' : 'default',
          }}
          onMouseEnter={() => hasGallery && setSlidePaused(true)}
          onMouseLeave={() => hasGallery && setSlidePaused(false)}
        >
          {hasGallery ? (
            <>
              {/* Sliding gallery images */}
              {galleryImages.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImage({ url, source: 'gallery' })}
                  style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${url})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    opacity: idx === currentSlide ? 1 : 0,
                    transition: 'opacity 0.6s ease-in-out',
                    zIndex: idx === currentSlide ? 1 : 0,
                  }}
                />
              ))}

              {/* Gradient overlay at bottom for readability */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                zIndex: 2, pointerEvents: 'none',
              }} />

              {/* Prev/Next Arrows */}
              {totalSlides > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); goToSlide(currentSlide - 1); }}
                    style={{
                      position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)',
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: 700, backdropFilter: 'blur(4px)',
                      transition: 'background 0.2s', zIndex: 3,
                    }}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goToSlide(currentSlide + 1); }}
                    style={{
                      position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)',
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: 700, backdropFilter: 'blur(4px)',
                      transition: 'background 0.2s', zIndex: 3,
                    }}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {totalSlides > 1 && (
                <div style={{
                  position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: '0.375rem', zIndex: 3,
                }}>
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
                      aria-label={`Go to image ${idx + 1}`}
                      style={{
                        width: idx === currentSlide ? '20px' : '8px',
                        height: '8px', borderRadius: '999px', border: 'none',
                        background: idx === currentSlide ? '#fff' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer', transition: 'all 0.3s', padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Image count badge */}
              <div style={{
                position: 'absolute', top: '0.75rem', left: '0.75rem',
                padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                background: 'rgba(0,0,0,0.5)', color: '#fff', backdropFilter: 'blur(4px)', zIndex: 3,
              }}>
                📷 {currentSlide + 1} / {totalSlides}
              </div>

              {/* Click hint */}
              <div style={{
                position: 'absolute', top: '0.75rem', right: '5rem',
                padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 500,
                background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', zIndex: 3,
              }}>
                Click to enlarge
              </div>
            </>
          ) : (
            <>
              {/* Original cover image or gradient fallback */}
              <div style={{
                position: 'absolute', inset: 0,
                background: restaurant.coverImage
                  ? `url(${restaurant.coverImage}) center / cover no-repeat`
                  : placeholderGradient,
              }} />
              {!restaurant.coverImage && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IoFastFoodOutline size={64} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
              )}
            </>
          )}

          {/* Online badge */}
          <div style={{
            position: 'absolute', bottom: '1rem', right: '1rem',
            padding: '0.375rem 0.875rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.8rem',
            background: restaurant.isOnline ? 'rgba(34,197,94,0.9)' : 'rgba(107,114,128,0.9)',
            color: '#fff', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', gap: '0.375rem', zIndex: 3,
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: restaurant.isOnline ? '#86efac' : '#9ca3af' }} />
            {restaurant.isOnline ? 'Open Now' : 'Currently Closed'}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '1.5rem', background: 'var(--color-bg-card)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{restaurant.name}</h1>

          {/* Rating display */}
          {restaurant.avgRating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <StarRating rating={restaurant.avgRating} size={18} readonly />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {restaurant.avgRating}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                ({restaurant.totalRatings} {restaurant.totalRatings === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          {restaurant.description && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              {restaurant.description}
            </p>
          )}

          {/* Cuisine tags */}
          {restaurant.cuisineType?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
              {restaurant.cuisineType.map((c) => (
                <span key={c} style={{
                  padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 500,
                  borderRadius: '999px', background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)',
                  border: '1px solid rgba(249,115,22,0.15)',
                }}>
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {restaurant.address?.city && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineLocationMarker size={16} />
                {[restaurant.address.street, restaurant.address.city, restaurant.address.state].filter(Boolean).join(', ')}
              </span>
            )}
            {restaurant.openingHours && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlineClock size={16} />
                {restaurant.openingHours.open} — {restaurant.openingHours.close}
              </span>
            )}
            {restaurant.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <HiOutlinePhone size={16} />
                {restaurant.phone}
              </span>
            )}
          </div>

          {restaurant.address?.coordinates?.lat && restaurant.address?.coordinates?.lng && (
            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowLocationMap((isVisible) => !isVisible)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '999px',
                  border: '1px solid var(--color-border)',
                  background: showLocationMap ? 'rgba(59,130,246,0.15)' : 'var(--color-bg-input)',
                  color: showLocationMap ? '#bfdbfe' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <HiOutlineLocationMarker size={16} />
                {showLocationMap ? 'Hide map' : 'View map'}
              </button>
            </div>
          )}

          {showLocationMap && restaurant.address?.coordinates?.lat && restaurant.address?.coordinates?.lng && (
            <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}>
                Restaurant Location
              </div>
              <MapWrapper>
                <RestaurantMap
                  coordinates={restaurant.address.coordinates}
                  name={restaurant.name}
                  address={[restaurant.address.street, restaurant.address.city, restaurant.address.state].filter(Boolean).join(', ')}
                />
              </MapWrapper>
            </div>
          )}

          {/* Group Order Actions */}
          {restaurant.isOnline && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => navigate(`/group/create/${restaurant._id}`)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-primary-dark)', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                👥 Start Group Order
              </button>
              <button 
                onClick={() => navigate('/group/join')}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
              >
                Join with Code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          images={lightboxImage.source === 'gallery' ? galleryImages : [lightboxImage.url]}
          onClose={() => setLightboxImage(null)}
          onNavigate={lightboxImage.source === 'gallery' ? (url) => setLightboxImage({ url, source: 'gallery' }) : undefined}
        />
      )}

      {/* Recommended For You */}
      {recommendedItems.length > 0 && (
        <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✨ Recommended For You
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
            {recommendedItems.map((food) => (
              <div
                key={food._id}
                className="card"
                style={{
                  minWidth: '180px', maxWidth: '180px', padding: '0.75rem', flexShrink: 0,
                  cursor: 'pointer', transition: 'transform 0.2s',
                }}
                onClick={() => {
                  const el = document.getElementById(`food-${food._id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {food.image && (
                  <div style={{
                    width: '100%', height: '80px', borderRadius: '0.5rem', marginBottom: '0.5rem',
                    background: `url(${food.image}) center / cover no-repeat`,
                  }} />
                )}
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {food.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatPrice(food.price)}
                  </span>
                  {food.avgRating > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>★ {food.avgRating}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <ReviewList restaurantId={id} />

      {/* Menu Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Menu</h2>

        {/* Veg toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.85rem', color: 'var(--color-text-secondary)', cursor: 'pointer',
        }}>
          <div
            onClick={() => setVegOnly(!vegOnly)}
            style={{
              width: '38px', height: '20px', borderRadius: '10px',
              background: vegOnly ? '#22c55e' : 'var(--color-bg-input)',
              border: '1px solid var(--color-border)',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', position: 'absolute', top: '1px',
              left: vegOnly ? '20px' : '1px', transition: 'left 0.2s',
            }} />
          </div>
          Veg Only
        </label>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '0.25rem',
      }}>
        {['All', ...restaurantCategories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.8rem',
              fontWeight: 600, border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              ...(activeCategory === cat ? {
                background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff',
              } : {
                background: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)',
              }),
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Items */}
      {filteredFoods.length === 0 ? (
        <EmptyState icon="🍽️" title="No items found" message="Try a different category or toggle." />
      ) : activeCategory === 'All' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {groupedFoods.map((section, sectionIndex) => (
            <section key={section.category}>
              <div style={{ marginBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{section.category}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                  {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {section.items.map((food, itemIndex) => (
                  <div key={food._id} id={`food-${food._id}`}>
                    <FoodItemCard
                      food={food}
                      index={sectionIndex * 10 + itemIndex}
                      cartQty={getCartQty(food._id)}
                      onAdd={(cookingInstructions) => handleAddToCart(food, cookingInstructions)}
                      onUpdateQty={(newQty) => handleUpdateCartQty(food._id, newQty)}
                      adding={addingToCart === food._id}
                      isOnline={restaurant.isOnline}
                      onImageClick={food.image ? () => setLightboxImage({ url: food.image, source: 'food' }) : undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredFoods.map((food, i) => (
            <div key={food._id} id={`food-${food._id}`}>
              <FoodItemCard
                food={food}
                index={i}
                cartQty={getCartQty(food._id)}
                onAdd={(cookingInstructions) => handleAddToCart(food, cookingInstructions)}
                onUpdateQty={(newQty) => handleUpdateCartQty(food._id, newQty)}
                adding={addingToCart === food._id}
                isOnline={restaurant.isOnline}
                onImageClick={food.image ? () => setLightboxImage({ url: food.image, source: 'food' }) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Cart conflict modal */}
      <Modal
        isOpen={conflictModal}
        onClose={() => { setConflictModal(false); setPendingItem(null); }}
        title="Replace cart items?"
        maxWidth="400px"
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛒</div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Your cart has items from a different restaurant. Do you want to clear the cart and add this item?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => { setConflictModal(false); setPendingItem(null); }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleClearAndAdd}>
              Clear & Add
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const FoodItemCard = ({ food, index, cartQty, onAdd, onUpdateQty, adding, isOnline, onImageClick }) => {
  const isUnavailable = !food.isAvailable || food.availableQuantity <= 0 || !isOnline;
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionDraft, setInstructionDraft] = useState('');
  const gradients = [
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  ];

  const handleAddClick = async (event) => {
    event.preventDefault();
    // Capture and clear immediately to prevent duplicate sends on re-render
    const note = instructionDraft;
    setInstructionDraft('');
    setShowInstructions(false);
    const added = await onAdd(note);
    if (!added) {
      // Restore if add failed (e.g. restaurant conflict)
      setInstructionDraft(note);
      setShowInstructions(true);
    }
  };

  const handleIncrementClick = async (event) => {
    event.preventDefault();

    // If a note is typed, + should add a new cart line with that instruction.
    if (instructionDraft.trim()) {
      // Capture and clear immediately to prevent duplicate sends on re-render
      const note = instructionDraft;
      setInstructionDraft('');
      setShowInstructions(false);
      const added = await onAdd(note);
      if (!added) {
        // Restore if add failed (e.g. restaurant conflict)
        setInstructionDraft(note);
        setShowInstructions(true);
      }
      return;
    }

    onUpdateQty(cartQty + 1);
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        animationDelay: `${index * 0.03}s`,
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        opacity: isUnavailable ? 0.5 : 1,
      }}
    >
      {/* Food Image */}
      <div
        onClick={onImageClick}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          flexShrink: 0,
          background: food.image
            ? `url(${food.image}) center / cover no-repeat`
            : gradients[index % gradients.length],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onImageClick ? 'pointer' : 'default',
          transition: 'transform 0.2s',
        }}
        title={food.image ? 'Click to enlarge' : undefined}
      >
        {!food.image && <IoFastFoodOutline size={32} style={{ color: 'rgba(0,0,0,0.15)' }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          {/* Veg/Non-veg indicator */}
          <span style={{
            width: '16px', height: '16px', borderRadius: '3px',
            border: `2px solid ${food.isVeg ? '#22c55e' : '#ef4444'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: food.isVeg ? '#22c55e' : '#ef4444',
            }} />
          </span>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {food.name}
          </h3>
        </div>

        {food.description && (
          <p style={{
            color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.375rem',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            lineHeight: 1.4,
          }}>
            {food.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatPrice(food.price)}
          </span>
          <span className="badge" style={{
            background: 'rgba(148,163,184,0.1)', color: 'var(--color-text-muted)', fontSize: '0.7rem',
          }}>
            {food.category}
          </span>
          {food.avgRating > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              ★ {food.avgRating}
            </span>
          )}
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setShowInstructions((value) => !value)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
            }}
          >
            {showInstructions ? 'Hide note' : 'Add cooking note'}
          </button>
          {showInstructions && (
            <div style={{ marginTop: '0.5rem' }}>
              <textarea
                value={instructionDraft}
                onChange={(e) => setInstructionDraft(e.target.value.slice(0, 200))}
                placeholder="Example: less spicy, no onions, extra crispy"
                rows={2}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.8rem',
                  padding: '0.65rem 0.75rem',
                }}
              />
              <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Optional kitchen note, up to 200 characters.
              </div>
            </div>
          )}
        </div>

        {cartQty > 0 && (
          <div style={{ marginTop: '0.65rem', fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
            {cartQty} item{cartQty !== 1 ? 's' : ''} already in cart. Manage quantities in cart.
          </div>
        )}
      </div>

      {/* Add to cart */}
      <div style={{ flexShrink: 0 }}>
        {isUnavailable ? (
          <span style={{
            padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
            color: 'var(--color-text-muted)', background: 'var(--color-bg-input)',
            borderRadius: '0.5rem',
          }}>
            Unavailable
          </span>
        ) : cartQty > 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--color-bg-card)', border: '1px solid var(--color-primary)',
            borderRadius: '0.5rem', padding: '0.25rem', height: '36px',
          }}>
            <button
              onClick={(e) => { e.preventDefault(); onUpdateQty(cartQty - 1); }}
              disabled={adding}
              style={{
                width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(249,115,22,0.1)', color: 'var(--color-primary)', border: 'none',
                borderRadius: '4px', cursor: adding ? 'not-allowed' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
              }}
            >
              -
            </button>
            <span style={{
              fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: '16px', textAlign: 'center'
            }}>
              {adding ? '...' : cartQty}
            </span>
            <button
              onClick={handleIncrementClick}
              disabled={adding}
              style={{
                width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: '4px', cursor: adding ? 'not-allowed' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
              }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddClick}
            disabled={adding}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', height: '36px' }}
          >
            {adding ? '...' : 'Add'}
          </button>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;
