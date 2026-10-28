"use client";

/**
 * Scelta Makeup — Floating Toast Promo Listener
 * Module: components/PromoBannerListener.tsx
 *
 * Ascolta i parametri ?coupon=... o ?promo=... nell'URL.
 * Regole anti-sovrapposizione rigorose:
 * 1. Se il carrello è aperto (isCartOpen), non viene MAI mostrato.
 * 2. Se l'utente è già su una pagina /promo/[slug], non viene mostrato (la pagina stessa è già la promo).
 * 3. Se l'utente è nella pagina di /checkout, non viene mostrato.
 * 4. Si auto-chiude dopo 7 secondi e rispetta il click della X.
 * 5. Ha z-index 30, quindi rimane sempre rigorosamente sotto il cassetto carrello (z-[101]) e qualsiasi modale.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Sparkles, X, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export default function PromoBannerListener() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const openCart = useCartStore((state) => state.openCart);
  const isCartOpen = useCartStore((state) => state.isOpen);

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

  // Auto-dismiss after 7 seconds to keep mobile screen pristine
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // NEVER render if:
  // - user closed it or not visible
  // - cart drawer is currently open
  // - user is already on a dedicated /promo page
  // - user is on /checkout
  if (
    !isVisible ||
    isCartOpen ||
    pathname.startsWith("/promo") ||
    pathname === "/checkout"
  ) {
    return null;
  }

  const displayMessage =
    toastMessage ||
    appliedCoupon?.bannerText ||
    `🎉 Sconto ${appliedCoupon?.discountValue}${
      appliedCoupon?.discountType === "percentage" ? "%" : "€"
    } (${appliedCoupon?.code}) applicato al tuo carrello!`;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-30 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] p-3.5 sm:p-4 text-white shadow-2xl border border-white/20">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Sparkles className="h-5 w-5 text-[#D8C2E7]" />
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <p className="font-bold tracking-wide">Promozione Attiva</p>
          <p className="text-[#D8C2E7] mt-0.5 font-light truncate">{displayMessage}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {appliedCoupon && (
            <Link
              href={`/promo/${appliedCoupon.slug || appliedCoupon.code.toLowerCase()}`}
              className="flex items-center gap-1 rounded-lg bg-pink-100 px-2.5 py-1.5 text-[11px] font-bold text-[#5E1788] shadow-sm hover:bg-white transition active:scale-95 cursor-pointer"
            >
              <span>Vedi Prodotti</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#5E1788] shadow-sm hover:bg-[#FAF7FC] transition active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="h-3 w-3" />
            <span className="hidden sm:inline">Carrello</span>
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
