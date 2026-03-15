import { create } from 'zustand';
import * as cartApi from '../api/cart.api';

const useCartStore = create((set, get) => ({
  items: [],
  restaurant: null,
  loading: false,

  fetchCart: async () => {
    try {
      set({ loading: true });
      const { data } = await cartApi.getCart();
      set({
        items: data.cart?.items || [],
        restaurant: data.cart?.restaurant || null,
        loading: false,
      });
    } catch {
      set({ items: [], restaurant: null, loading: false });
    }
  },

  addItem: async (foodItem, restaurantId, cookingInstructions = '') => {
    const { restaurant } = get();
    // Check for restaurant conflict (use String() to handle object vs string IDs)
    const cartRestId = typeof restaurant === 'object' ? restaurant?._id : restaurant;
    if (cartRestId && String(cartRestId) !== String(restaurantId)) {
      return { conflict: true };
    }
    try {
      const { data } = await cartApi.addToCart({
        foodItemId: foodItem._id || foodItem,
        quantity: 1,
        cookingInstructions,
      });
      set({
        items: data.cart?.items || [],
        restaurant: data.cart?.restaurant || null,
      });
      return { conflict: false };
    } catch (error) {
      throw error;
    }
  },

  updateItem: async (itemId, updates) => {
    try {
      const payload = typeof updates === 'number' ? { quantity: updates } : updates;
      const { data } = await cartApi.updateCartItem(itemId, payload);
      set({
        items: data.cart?.items || [],
      });
    } catch (error) {
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      const { data } = await cartApi.removeCartItem(itemId);
      set({
        items: data.cart?.items || [],
        restaurant: data.cart?.restaurant || null,
      });
    } catch (error) {
      throw error;
    }
  },

  clearCart: async () => {
    try {
      await cartApi.clearCart();
      set({ items: [], restaurant: null });
    } catch (error) {
      throw error;
    }
  },

  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));

export default useCartStore;
