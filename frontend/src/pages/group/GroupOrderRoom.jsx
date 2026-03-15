import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as groupApi from '../../api/groupOrder.api';
import { getRestaurantFoods } from '../../api/food.api';
import { getRestaurants } from '../../api/restaurant.api';
import useGroupOrderStore from '../../store/useGroupOrderStore';
import useAuthStore from '../../store/useAuthStore';
import useGroupOrder from '../../hooks/useGroupOrder';
import Loading from '../../components/common/Loading';
import GroupHeader from '../../components/group/GroupHeader';
import GroupCartItem from '../../components/group/GroupCartItem';
import GroupFoodCard from '../../components/group/GroupFoodCard';
import MemberList from '../../components/group/MemberList';
import InviteCodeBox from '../../components/group/InviteCodeBox';
import MemberBreakdown from '../../components/group/MemberBreakdown';
import MapWrapper from '../../components/map/MapWrapper';
import DeliveryMap from '../../components/map/DeliveryMap';
import { DEFAULT_RESTAURANT_CATEGORIES, ORDER_STATUS } from '../../constants';
import { formatPrice } from '../../utils/formatPrice';
import { getStatusColor, getStatusLabel } from '../../utils/getStatusColor';
import { formatDate } from '../../utils/formatDate';
import toast from 'react-hot-toast';
import { HiOutlineSearch } from 'react-icons/hi';

const STATUS_STEPS = [
  { key: ORDER_STATUS.PLACED, label: 'Placed', icon: '📝' },
  { key: ORDER_STATUS.ACCEPTED, label: 'Accepted', icon: '✅' },
  { key: ORDER_STATUS.PREPARING, label: 'Preparing', icon: '👨‍🍳' },
  { key: ORDER_STATUS.READY, label: 'Ready', icon: '📦' },
  { key: ORDER_STATUS.PICKED_UP, label: 'Picked Up', icon: '🚴' },
  { key: ORDER_STATUS.DELIVERED, label: 'Delivered', icon: '🎉' },
];

const GroupOrderRoom = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    session, isHost, status, cartPermission, members, items,
    restaurant, expiresAt, timeRemaining, setSession, clearGroup,
    canModifyItem, getSubtotal, isAllReady, canPlaceOrder, syncPermission, driverLocation
  } = useGroupOrderStore();

  const [loading, setLoading] = useState(true);
  const [foodItems, setFoodItems] = useState([]);
  const [loadingFood, setLoadingFood] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [addingItemId, setAddingItemId] = useState(null);

  // Restaurant change modal
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [changingRestaurant, setChangingRestaurant] = useState(false);

  // Email invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Socket listeners
  useGroupOrder(code);

  useEffect(() => {
    loadSession();
  }, [code]);

  // Reload food items when restaurant changes
  useEffect(() => {
    if (restaurant) {
      const rId = restaurant?._id || restaurant;
      loadFoodItems(rId);
    }
  }, [restaurant?._id || restaurant]);

  const loadSession = async () => {
    try {
      const { data } = await groupApi.getGroupOrder(code);
      setSession(data.groupOrder, user?._id);
      const restaurantId = data.groupOrder.restaurant?._id || data.groupOrder.restaurant;
      await loadFoodItems(restaurantId);
    } catch (err) {
      toast.error('Failed to load group session');
      navigate('/group');
    } finally {
      setLoading(false);
    }
  };

  const loadFoodItems = async (restaurantId) => {
    setLoadingFood(true);
    try {
      const { data: foodData } = await getRestaurantFoods(restaurantId);
      setFoodItems(foodData.foods || []);
    } catch {
      setFoodItems([]);
    } finally {
      setLoadingFood(false);
    }
  };

  const handleAddItem = async (food, quantity) => {
    setAddingItemId(food._id);
    try {
      const { data } = await groupApi.addItem(code, { foodItemId: food._id, quantity });
      setSession(data.groupOrder, user?._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setAddingItemId(null);
    }
  };

  const handleUpdateQty = async (itemId, qty) => {
    try {
      const { data } = await groupApi.updateItem(code, itemId, { quantity: qty });
      setSession(data.groupOrder, user?._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const { data } = await groupApi.removeItem(code, itemId);
      setSession(data.groupOrder, user?._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleToggleReady = async () => {
    try {
      const { data } = await groupApi.toggleReady(code);
      useGroupOrderStore.getState().syncMembers(data.members);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleLockToggle = async () => {
    try {
      if (status === 'active') {
        await groupApi.lockCart(code);
      } else if (status === 'locked') {
        await groupApi.unlockCart(code);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleKick = async (userId) => {
    if (!window.confirm('Kick this member? Their items will be removed.')) return;
    try {
      await groupApi.kickMember(code, userId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleLeave = async () => {
    const msg = isHost ? 'Cancel this group for everyone?' : 'Leave this group?';
    if (!window.confirm(msg)) return;
    try {
      if (isHost) {
        await groupApi.cancelSession(code);
      } else {
        await groupApi.leaveGroupOrder(code);
      }
      toast.success(isHost ? 'Session cancelled' : 'Left group');
      clearGroup();
      navigate('/group');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  // ─── Permission toggle (host only) ───
  const handleChangePermission = async () => {
    const newPerm = cartPermission === 'open' ? 'personal' : 'open';
    try {
      const { data } = await groupApi.changePermission(code, { cartPermission: newPerm });
      setSession(data.groupOrder, user?._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change permission');
    }
  };

  // ─── Restaurant change (host only) ───
  const openRestaurantModal = async () => {
    setShowRestaurantModal(true);
    setLoadingRestaurants(true);
    try {
      const { data } = await getRestaurants({ status: 'approved', isOnline: true });
      setRestaurants(data.restaurants || []);
    } catch {
      toast.error('Failed to load restaurants');
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const handleChangeRestaurant = async (restaurantId) => {
    if (!window.confirm('Changing restaurant will clear the entire cart. Continue?')) return;
    setChangingRestaurant(true);
    try {
      const { data } = await groupApi.changeRestaurant(code, { restaurantId });
      setSession(data.groupOrder, user?._id);
      setShowRestaurantModal(false);
      toast.success('Restaurant changed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setChangingRestaurant(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const emails = inviteEmail.split(',').map(e => e.trim()).filter(Boolean);
      const { data } = await groupApi.inviteByEmail(code, { emails });
      const sent = data.results?.filter(r => r.status === 'sent').length || 0;
      const failed = data.results?.filter(r => r.status === 'failed') || [];
      if (sent > 0) toast.success(`${sent} invite(s) sent!`);
      failed.forEach(f => toast.error(`${f.email}: ${f.reason}`));
      setInviteEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invites');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading || !session) return <Loading message="Entering Room..." />;

  const hostId = String(session.host?._id || session.host || '');
  const currentUserId = String(user?._id || '');
  const subtotal = getSubtotal();
  const allReady = isAllReady();
  const canPlace = canPlaceOrder(user?._id);
  const isActive = status === 'active';
  const isLocked = status === 'locked';
  const isOrdered = status === 'ordered';
  
  const orderData = session?.order || {};
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === orderData?.status);
  const isDelivered = orderData?.status === ORDER_STATUS.DELIVERED;
  const showMap = orderData?.status === ORDER_STATUS.PICKED_UP; // hide map after delivery
  const showOtp = orderData?.status === ORDER_STATUS.PICKED_UP;
  
  // Rule: Only the host and whoever physically placed the order sees the map
  const canSeeMap = isHost || (orderData?.placedBy && String(orderData.placedBy) === currentUserId);

  // Restaurant coordinates for map
  const restaurantCoords = restaurant?.address?.coordinates || session?.restaurant?.address?.coordinates;


  const shareableLink = `${window.location.origin}/group/join/${code}`;

  // Food categories
  const categoryList = restaurant?.categories?.length
    ? [...restaurant.categories]
    : [...DEFAULT_RESTAURANT_CATEGORIES];
  for (const food of foodItems) {
    if (food.category && !categoryList.includes(food.category)) {
      categoryList.push(food.category);
    }
  }
  const categories = ['All', ...categoryList];
  const filtered = activeCategory === 'All'
    ? foodItems
    : foodItems.filter(f => f.category === activeCategory);

  // Current user's ready status
  const currentMember = members.find(m => String(m.user?._id || m.user || '') === currentUserId);

  // Filtered restaurant list for modal
  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '1.5rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Group Order</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Ordering from <strong>{restaurant?.name || 'Restaurant'}</strong>
            {isHost && (isActive || isLocked) && (
              <button
                onClick={openRestaurantModal}
                style={{
                  marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Change
              </button>
            )}
          </p>
        </div>
      </div>

      <GroupHeader
        code={code}
        status={status}
        cartPermission={cartPermission}
        memberCount={members.length}
        maxMembers={session?.maxMembers || 10}
        timeRemaining={timeRemaining}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* ═══ LEFT: Menu ═══ */}
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>Menu</h2>

          {/* Categories */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1rem', paddingBottom: '0.25rem' }}>
            {categories.map(cat => (
              <button
                key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.4rem 0.875rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s',
                  background: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-bg-input)',
                  color: activeCategory === cat ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Food items */}
          {loadingFood ? <Loading /> : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filtered.map(food => (
                <GroupFoodCard
                  key={food._id}
                  food={food}
                  onAdd={handleAddItem}
                  adding={addingItemId === food._id}
                  disabled={status === 'locked'}
                />
              ))}
              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  No items in this category.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Cart + Members + Controls ═══ */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          {/* Shared Cart */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              🛒 Shared Cart ({items.length})
            </h3>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                <span style={{ fontSize: '2.5rem' }}>🍽️</span>
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Cart is empty — add items from the menu!</p>
              </div>
            ) : (
              <>
                {items.map((item) => {
                  const itemId = item._id || item.id;
                  const addedById = String(item.addedBy?._id || item.addedBy || '');
                  const isOwn = addedById === currentUserId;
                  return (
                    <GroupCartItem
                      key={itemId}
                      item={item}
                      canEdit={canModifyItem(itemId, user?._id)}
                      isOwn={isOwn}
                      onRemove={handleRemoveItem}
                      onUpdateQty={handleUpdateQty}
                    />
                  );
                })}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed var(--color-border)' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Subtotal</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatPrice(subtotal)}</span>
                </div>
              </>
            )}
          </div>

          {/* Member Breakdown */}
          {items.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <MemberBreakdown members={members} items={items} />
            </div>
          )}

          {/* Invite Code */}
          <InviteCodeBox code={code} />

          {/* Share Link */}
          <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Share Link</div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input type="text" readOnly value={shareableLink} className="input-field" style={{ flex: 1, fontSize: '0.7rem', padding: '0.4rem' }} />
              <button onClick={() => { navigator.clipboard.writeText(shareableLink); toast.success('Copied!'); }} className="btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                Copy
              </button>
            </div>
          </div>

          {/* Email Invite — Host only, active/locked */}
          {isHost && (isActive || isLocked) && (
            <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>📧 Invite by Email</div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <input
                  type="text"
                  placeholder="email@example.com (comma-separated)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
                />
                <button
                  onClick={handleSendInvite}
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.7rem', whiteSpace: 'nowrap', opacity: sendingInvite ? 0.6 : 1 }}
                >
                  {sendingInvite ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Members ({members.length})
            </h3>
            <MemberList
              members={members}
              hostId={hostId}
              currentUserId={currentUserId}
              isHost={isHost}
              onKick={handleKick}
            />
          </div>

          {/* Host Settings */}
          {isHost && (isActive || isLocked) && (
            <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>⚙️ Host Settings</h3>

              {/* Permission toggle */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Cart Permission</p>
                <div style={{ display: 'flex', background: 'var(--color-bg-input)', borderRadius: '0.5rem', padding: '0.25rem', border: '1px solid var(--color-border)' }}>
                  <button
                    onClick={cartPermission !== 'personal' ? handleChangePermission : undefined}
                    style={{
                      flex: 1, padding: '0.5rem', border: 'none', borderRadius: '0.375rem',
                      fontSize: '0.85rem', fontWeight: 700, cursor: cartPermission === 'personal' ? 'default' : 'pointer',
                      background: cartPermission === 'personal' ? 'var(--color-bg-card)' : 'transparent',
                      color: cartPermission === 'personal' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      boxShadow: cartPermission === 'personal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                    }}
                  >
                    👤 Personal
                  </button>
                  <button
                    onClick={cartPermission !== 'open' ? handleChangePermission : undefined}
                    style={{
                      flex: 1, padding: '0.5rem', border: 'none', borderRadius: '0.375rem',
                      fontSize: '0.85rem', fontWeight: 700, cursor: cartPermission === 'open' ? 'default' : 'pointer',
                      background: cartPermission === 'open' ? 'var(--color-bg-card)' : 'transparent',
                      color: cartPermission === 'open' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      boxShadow: cartPermission === 'open' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                    }}
                  >
                    🔓 Open
                  </button>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {cartPermission === 'open' ? 'Everyone can edit all items.' : 'Members edit their own items only.'}
                </p>
              </div>

              {/* Lock/unlock */}
              <button
                onClick={handleLockToggle}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}
              >
                {isActive ? '🔒 Lock Cart' : '🔓 Unlock Cart'}
              </button>

              {/* Change Restaurant */}
              <button
                onClick={openRestaurantModal}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', marginBottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                🔄 Change Restaurant
              </button>
            </div>
          )}

          {/* ═══ Order Status (shown after order is placed) ═══ */}
          {isOrdered && orderData?._id && (
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', border: `2px solid ${getStatusColor(orderData.status).color}` }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>
                  {orderData.status === ORDER_STATUS.DELIVERED ? '🎉' : '🛵'}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  {orderData.status === ORDER_STATUS.DELIVERED ? 'Order Delivered!' : 'Order is on the way!'}
                </h3>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 0.75rem', borderRadius: '999px', marginBottom: '0.5rem',
                  background: getStatusColor(orderData.status).bg, color: getStatusColor(orderData.status).text, fontWeight: 700, fontSize: '0.8rem',
                }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(orderData.status).color,
                    animation: orderData.status !== ORDER_STATUS.DELIVERED ? 'pulse 2s ease infinite' : 'none',
                  }} />
                  {getStatusLabel(orderData.status)}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Order ID: <span style={{ fontFamily: 'monospace' }}>{orderData._id.slice(-8).toUpperCase()}</span>
                </p>
              </div>

              {/* Status Tracker */}
              {orderData.status !== ORDER_STATUS.REJECTED && (
                <div style={{ margin: '1rem 0 2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {STATUS_STEPS.map((step, i) => {
                      const isComplete = i <= currentStepIdx;
                      const isCurrent = i === currentStepIdx;
                      return (
                        <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                          {i > 0 && (
                            <div style={{
                              position: 'absolute', top: '16px', right: '50%', left: '-50%', height: '3px', borderRadius: '2px',
                              background: isComplete ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.3s',
                            }} />
                          )}
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: isCurrent ? 'var(--color-primary)' : isComplete ? 'rgba(249,115,22,0.2)' : 'var(--color-bg-input)',
                            border: `2px solid ${isComplete ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', zIndex: 1,
                            boxShadow: isCurrent ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
                          }}>
                            {step.icon}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {STATUS_STEPS[currentStepIdx]?.label || 'Updating...'}
                  </div>
                </div>
              )}

              {/* Live Map (Host / Placer only) — only during PICKED_UP */}
              {showMap && canSeeMap && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    🗺️ Live Driver Tracking
                  </h4>
                  <div style={{ height: '220px', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <MapWrapper>
                      <DeliveryMap
                        restaurantCoords={restaurantCoords}
                        customerCoords={session.deliveryAddress?.coordinates}
                        driverLocation={driverLocation}
                      />
                    </MapWrapper>
                  </div>
                </div>
              )}
              
              {showMap && !canSeeMap && (
                 <div style={{
                  marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem',
                  background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>🛵</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Driver is on the way!</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    The host is tracking the driver's live location.
                  </div>
                </div>
              )}

              {/* Delivery OTP — visible to ALL members */}
              {showOtp && orderData.deliveryOtpPlain && (
                <div style={{
                  marginTop: '1rem', padding: '0.75rem', borderRadius: '0.75rem',
                  background: 'rgba(249,115,22,0.1)', border: '1px dashed var(--color-primary)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Delivery OTP</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.3em', color: 'var(--color-primary)' }}>
                    {orderData.deliveryOtpPlain}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Share this code with the delivery partner upon arrival
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Controls — only show during active/locked */}
          {(isActive || isLocked) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {/* Ready toggle — ALL members (including host) */}
            <button
              onClick={handleToggleReady}
              style={{
                width: '100%', padding: '0.85rem', fontSize: '0.95rem',
                background: currentMember?.isReady ? 'var(--color-bg-input)' : '#10b981',
                color: currentMember?.isReady ? 'var(--color-text-secondary)' : '#fff',
                border: currentMember?.isReady ? '1px solid var(--color-border)' : 'none',
                borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {currentMember?.isReady ? '✓ I\'m Ready (click to undo)' : '✔️ Mark as Ready'}
            </button>

            {/* Place Order — host can ALWAYS order, members can only when all ready */}
            {canPlace && (
              <button
                onClick={() => navigate(`/group/checkout/${code}`)}
                className="btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.25rem' }}
                disabled={items.length === 0}
              >
                Place Order ({formatPrice(subtotal)})
              </button>
            )}

            {/* Non-host: waiting message */}
            {!isHost && !canPlace && items.length > 0 && (
              <div style={{
                textAlign: 'center', padding: '0.75rem', borderRadius: '0.5rem',
                background: 'var(--color-bg-input)', fontSize: '0.8rem', color: 'var(--color-text-muted)',
              }}>
                {!allReady ? 'Waiting for all members to be ready...' : 'Waiting for host to place order...'}
              </div>
            )}

            {/* Leave / Cancel */}
            <button
              onClick={handleLeave}
              style={{
                width: '100%', padding: '0.75rem', background: 'transparent',
                border: '1px solid var(--color-error)', color: 'var(--color-error)',
                borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              {isHost ? 'Cancel Session' : 'Leave Group'}
            </button>
          </div>
          )}
        </div>
      </div>

      {/* ═══ Restaurant Change Modal ═══ */}
      {showRestaurantModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={() => setShowRestaurantModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '1.5rem 1.5rem 0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Change Restaurant</h2>
              <p style={{ color: 'var(--color-warning)', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                ⚠️ Changing restaurant will clear the entire group cart!
              </p>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <HiOutlineSearch size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text" placeholder="Search restaurants..." className="input-field"
                  value={restaurantSearch} onChange={(e) => setRestaurantSearch(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '0 1.5rem 1.5rem', flex: 1 }}>
              {loadingRestaurants ? <Loading /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredRestaurants.map(r => {
                    const isCurrent = (restaurant?._id || restaurant) === r._id;
                    return (
                      <div
                        key={r._id}
                        onClick={() => !isCurrent && !changingRestaurant && handleChangeRestaurant(r._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem',
                          borderRadius: '0.5rem', border: `1px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          cursor: isCurrent ? 'default' : 'pointer', opacity: changingRestaurant ? 0.5 : 1,
                          background: isCurrent ? 'rgba(249,115,22,0.05)' : 'transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ width: '44px', height: '44px', borderRadius: '0.375rem', background: r.coverImage ? `url(${r.coverImage}) center/cover` : '#eee', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{r.name}</h4>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.address?.city || ''}</p>
                        </div>
                        {isCurrent && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)' }}>Current</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <button onClick={() => setShowRestaurantModal(false)} className="btn-secondary" style={{ width: '100%' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupOrderRoom;
