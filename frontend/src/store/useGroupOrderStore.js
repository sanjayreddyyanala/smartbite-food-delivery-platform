import { create } from 'zustand';

const useGroupOrderStore = create((set, get) => ({
  // Session data
  session: null,
  code: null,
  isHost: false,
  status: null,
  cartPermission: 'open',
  members: [],
  items: [],
  restaurant: null,
  expiresAt: null,
  timeRemaining: null,

  // ===== Set full session state =====
  setSession: (groupOrder, userId) => {
    if (!groupOrder) return;
    const hostId = String(groupOrder.host?._id || groupOrder.host || '');
    const uid = String(userId || '');

    set({
      session: groupOrder,
      code: groupOrder.code,
      isHost: hostId === uid,
      status: groupOrder.status,
      cartPermission: groupOrder.cartPermission,
      members: groupOrder.members || [],
      items: groupOrder.items || [],
      restaurant: groupOrder.restaurant,
      expiresAt: groupOrder.expiresAt,
    });
  },

  // ===== Sync helpers (partial updates from socket events) =====
  syncCart: (items) => set({ items }),
  syncMembers: (members) => set({ members }),
  syncStatus: (status) => set({ status }),
  syncPermission: (cartPermission) => set({ cartPermission }),
  syncRestaurant: (restaurant, items) => set({ restaurant, items: items || [] }),
  syncOrder: (order) => set((state) => ({ session: { ...state.session, order } })),
  syncDriverLocation: (driverLocation) => set({ driverLocation }),

  // ===== Timer =====
  setTimeRemaining: (ms) => set({ timeRemaining: ms }),

  // ===== Computed =====
  canModifyItem: (itemId, userId) => {
    const { status, cartPermission, isHost, items } = get();
    // Locked → nobody
    if (status === 'locked') return false;
    // Not active → nobody
    if (status !== 'active') return false;
    // Host can always
    if (isHost) return true;
    // Open permission → anyone
    if (cartPermission === 'open') return true;
    // Personal → only own items
    const item = items.find((i) => (i._id || i.id) === itemId);
    if (!item) return false;
    const addedById = String(item.addedBy?._id || item.addedBy || '');
    return addedById === String(userId);
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  isAllReady: () => {
    const { members } = get();
    return members.length > 0 && members.every((m) => m.isReady);
  },

  canPlaceOrder: (userId) => {
    const { isHost, status, items } = get();
    if (items.length === 0) return false;
    if (!['active', 'locked'].includes(status)) return false;
    if (isHost) return true;
    return get().isAllReady();
  },

  // ===== Clear =====
  clearGroup: () =>
    set({
      session: null,
      code: null,
      isHost: false,
      status: null,
      cartPermission: 'open',
      members: [],
      items: [],
      restaurant: null,
      expiresAt: null,
      timeRemaining: null,
      driverLocation: null,
    }),
}));

export default useGroupOrderStore;
