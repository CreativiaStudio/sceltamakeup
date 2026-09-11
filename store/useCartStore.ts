import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/product";

export const FREE_SHIPPING_THRESHOLD = 49.00;

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: {
    productId: string;
    slug: string;
    name: string;
    brand: string;
    price: number;
    quantity?: number;
    shade?: {
      id: string;
      name: string;
      code: string;
      hex: string;
      image: string;
    };
    image: string;
  }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getShippingProgress: () => {
    threshold: number;
    current: number;
    remaining: number;
    isFree: boolean;
    percentage: number;
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (data) => {
        const shadeId = data.shade?.id || "default";
        const compositeId = `${data.productId}-${shadeId}`;
        const qtyToAdd = data.quantity && data.quantity > 0 ? data.quantity : 1;

        set((state) => {
          const existingIndex = state.items.findIndex((item) => item.id === compositeId);

          if (existingIndex > -1) {
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + qtyToAdd,
            };
            return { items: updatedItems, isOpen: true };
          } else {
            const newItem: CartItem = {
              id: compositeId,
              productId: data.productId,
              slug: data.slug,
              name: data.name,
              brand: data.brand,
              price: data.price,
              quantity: qtyToAdd,
              shade: data.shade,
              image: data.shade?.image || data.image,
            };
            return { items: [...state.items, newItem], isOpen: true };
          }
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, delta) => {
        set((state) => {
          const updatedItems = state.items
            .map((item) => {
              if (item.id === id) {
                const newQuantity = item.quantity + delta;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
              }
              return item;
            })
            .filter(Boolean) as CartItem[];

          return { items: updatedItems };
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getShippingProgress: () => {
        const total = get().getTotalPrice();
        const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
        const isFree = total >= FREE_SHIPPING_THRESHOLD;
        const percentage = Math.min(100, Math.round((total / FREE_SHIPPING_THRESHOLD) * 100));

        return {
          threshold: FREE_SHIPPING_THRESHOLD,
          current: total,
          remaining,
          isFree,
          percentage,
        };
      },
    }),
    {
      name: "scelta-makeup-cart-storage",
      storage: createJSONStorage(() => localStorage),
      // Don't persist isOpen
      partialize: (state) => ({ items: state.items }),
    }
  )
);
