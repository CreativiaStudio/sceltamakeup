"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, X, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export default function PromoBannerListener() {
  const searchParams = useSearchParams();
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const openCart = useCartStore((state) => state.openCart);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!searchParams) return;
    const code = searchParams.get("coupon") || searchParams.get("promo");
    if (!code) return;

    applyCoupon(code).then((result) => {
      if (result.success) {
        setToastMessage(result.message);
        setIsVisible(true);
      }
    });
  }, [searchParams, applyCoupon]);

  if (!isVisible && !appliedCoupon) return null;

  const displayMessage =
    toastMessage ||
    appliedCoupon?.bannerText ||
    `🎉 Sconto ${appliedCoupon?.discountValue}${appliedCoupon?.discountType === "percentage" ? "%" : "€"} (${appliedCoupon?.code}) applicato al tuo carrello!`;

  return (
    <div
      role="alert"
      className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] p-4 text-white shadow-2xl border border-white/20">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Sparkles className="h-5 w-5 text-[#D8C2E7]" />
        </div>
        <div className="flex-1 text-xs">
          <p className="font-bold tracking-wide">Promozione Attiva</p>
          <p className="text-[#D8C2E7] mt-0.5 font-light">{displayMessage}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#5E1788] shadow-sm hover:bg-[#FAF7FC] transition active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="h-3 w-3" />
            <span>Carrello</span>
          </button>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            aria-label="Chiudi notifica promo"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
