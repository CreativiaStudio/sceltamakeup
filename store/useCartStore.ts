import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/product";
import { PromoCoupon } from "@/types/coupon";
import {
  calculateCartDiscount,
  setStoredActiveCoupon,
} from "@/lib/couponStore";

export const FREE_SHIPPING_THRESHOLD = 49.00;

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  appliedCoupon: PromoCoupon | null;
  couponError: string | null;

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

  applyCoupon: (
    codeOrCoupon: string | PromoCoupon
  ) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;

  getTotalPrice: () => number;
  getDiscountAmount: () => number;
  getFinalTotal: () => number;
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
      appliedCoupon: null,
      couponError: null,

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

      clearCart: () => set({ items: [], appliedCoupon: null, couponError: null }),

      applyCoupon: async (codeOrCoupon) => {
        try {
          let couponToApply: PromoCoupon | null = null;

          if (typeof codeOrCoupon === "object" && codeOrCoupon !== null) {
            couponToApply = codeOrCoupon;
          } else {
            const res = await fetch(
              `/api/coupons?code=${encodeURIComponent(codeOrCoupon.trim())}`,
              { cache: "no-store" }
            );
            const data = await res.json();
            if (!res.ok || !data.success || !data.coupon) {
              set({ couponError: data.error || "Codice promo non valido." });
              return { success: false, message: data.error || "Codice promo non valido." };
            }
            couponToApply = data.coupon;
          }

          if (!couponToApply) {
            return { success: false, message: "Codice non trovato." };
          }

          // Valida contro gli articoli correnti (se presenti)
          const items = get().items;
          const validation = calculateCartDiscount(couponToApply, items);

          if (items.length > 0 && !validation.valid && validation.error) {
            set({ couponError: validation.error });
            return { success: false, message: validation.error };
          }

          set({ appliedCoupon: couponToApply, couponError: null });
          setStoredActiveCoupon(couponToApply);

          const successMsg =
            couponToApply.bannerText ||
            `Codice ${couponToApply.code} attivato con successo!`;
          return { success: true, message: successMsg };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Errore applicazione coupon";
          set({ couponError: msg });
          return { success: false, message: msg };
        }
      },

      removeCoupon: () => {
        set({ appliedCoupon: null, couponError: null });
        setStoredActiveCoupon(null);
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getDiscountAmount: () => {
        const { appliedCoupon, items } = get();
        if (!appliedCoupon) return 0;
        const result = calculateCartDiscount(appliedCoupon, items);
        return result.discountAmount;
      },

      getFinalTotal: () => {
        const subtotal = get().getTotalPrice();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal - discount);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getShippingProgress: () => {
        const total = get().getFinalTotal();
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
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
    }
  )
);
