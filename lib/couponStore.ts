"use client";

/**
 * Scelta Makeup — Client Coupon & Smart Link Store
 * Module: lib/couponStore.ts
 */

import { useState, useEffect, useCallback } from "react";
import { PromoCoupon, CouponValidationResult } from "@/types/coupon";
import { CartItem } from "@/types/product";

export const COUPONS_STORAGE_KEY = "scelta_makeup_coupons_v1";
export const ACTIVE_COUPON_STORAGE_KEY = "scelta_active_coupon_v1";
export const COUPONS_API_ENDPOINT = "/api/coupons";
export const COUPONS_SYNC_EVENT = "scelta_coupons_updated";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCartDiscount(
  coupon: PromoCoupon | null,
  items: CartItem[]
): CouponValidationResult {
  if (!coupon || !coupon.active) {
    return { valid: false, discountAmount: 0, eligibleSubtotal: 0 };
  }

  const today = new Date().toISOString().split("T")[0];
  if (coupon.startDate && coupon.startDate > today) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `La promozione inizierà il ${coupon.startDate}.`,
    };
  }
  if (coupon.endDate && coupon.endDate < today) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: "Questo codice promozionale è scaduto.",
    };
  }
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: "Questo codice promo ha raggiunto il limite massimo di utilizzi.",
    };
  }

  const totalCartSubtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  if (coupon.minSpend && totalCartSubtotal < coupon.minSpend) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: totalCartSubtotal,
      error: `Aggiungi ancora €${(coupon.minSpend - totalCartSubtotal).toFixed(2)} per attivare lo sconto.`,
    };
  }

  // Filtro articoli eleggibili
  const eligibleItems = items.filter((item) => {
    if (coupon.scope === "all") return true;
    if (coupon.scope === "brand" && coupon.targetBrand) {
      return (item.brand || "").toLowerCase().includes(coupon.targetBrand.toLowerCase());
    }
    if (coupon.scope === "category" && coupon.targetCategory) {
      return ((item as any).category || "").toLowerCase().includes(coupon.targetCategory.toLowerCase());
    }
    if (coupon.scope === "products" && Array.isArray(coupon.targetProductIds)) {
      return (
        coupon.targetProductIds.includes(item.id) ||
        coupon.targetProductIds.includes(item.productId || "")
      );
    }
    return false;
  });

  const eligibleSubtotal = eligibleItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

  if (eligibleSubtotal <= 0) {
    const targetLabel =
      coupon.scope === "brand"
        ? coupon.targetBrand
        : coupon.scope === "category"
        ? coupon.targetCategory
        : "in promozione";
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Questo codice è valido solo sui prodotti ${targetLabel || ""}. Aggiungine uno al carrello!`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = roundMoney((eligibleSubtotal * coupon.discountValue) / 100);
  } else if (coupon.discountType === "fixed") {
    discountAmount = roundMoney(Math.min(eligibleSubtotal, coupon.discountValue));
  }

  return {
    valid: true,
    coupon,
    discountAmount,
    eligibleSubtotal,
  };
}

export function getStoredActiveCoupon(): PromoCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_COUPON_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredActiveCoupon(coupon: PromoCoupon | null): void {
  if (typeof window === "undefined") return;
  try {
    if (coupon) {
      localStorage.setItem(ACTIVE_COUPON_STORAGE_KEY, JSON.stringify(coupon));
    } else {
      localStorage.removeItem(ACTIVE_COUPON_STORAGE_KEY);
    }
  } catch {}
}

export async function fetchCouponsFromCloud(): Promise<PromoCoupon[]> {
  try {
    const res = await fetch(COUPONS_API_ENDPOINT, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.coupons) ? data.coupons : [];
  } catch {
    return [];
  }
}

export function useCouponsSync() {
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchCouponsFromCloud();
      setCoupons(list);
      if (typeof window !== "undefined") {
        localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(list));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carica subito da cache locale
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COUPONS_STORAGE_KEY);
        if (raw) setCoupons(JSON.parse(raw));
      } catch {}
    }
    void refresh();

    const handleUpdate = () => void refresh();
    window.addEventListener(COUPONS_SYNC_EVENT, handleUpdate);
    return () => window.removeEventListener(COUPONS_SYNC_EVENT, handleUpdate);
  }, [refresh]);

  return { coupons, isLoading, refresh };
}

export async function saveClientCoupon(coupon: PromoCoupon): Promise<boolean> {
  try {
    const res = await fetch(COUPONS_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coupon }),
    });
    if (res.ok && typeof window !== "undefined") {
      window.dispatchEvent(new Event(COUPONS_SYNC_EVENT));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function deleteClientCoupon(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${COUPONS_API_ENDPOINT}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok && typeof window !== "undefined") {
      window.dispatchEvent(new Event(COUPONS_SYNC_EVENT));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
