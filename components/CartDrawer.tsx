"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Sparkles,
  Truck,
  ArrowRight,
  ShieldCheck,
  Lock,
  Tag,
  Check,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useIsMounted } from "@/lib/useIsMounted";

export default function CartDrawer() {
  const mounted = useIsMounted();
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);
  const getFinalTotal = useCartStore((state) => state.getFinalTotal);
  const getShippingProgress = useCartStore((state) => state.getShippingProgress);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const removeCoupon = useCartStore((state) => state.removeCoupon);
  const couponError = useCartStore((state) => state.couponError);

  const [couponInput, setCouponInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  // Prevent background scrolling when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const subtotal = getTotalPrice();
  const discountAmount = getDiscountAmount();
  const finalSubtotal = getFinalTotal();
  const shippingInfo = getShippingProgress();
  const shippingCost = shippingInfo.isFree || items.length === 0 ? 0 : 4.90;
  const total = finalSubtotal + shippingCost;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplying(true);
    setLocalFeedback(null);
    try {
      const res = await applyCoupon(couponInput.trim());
      setLocalFeedback(res.message);
      if (res.success) {
        setCouponInput("");
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrello della Spesa"
        className={`fixed inset-y-0 right-0 max-w-full w-full sm:w-[460px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#D8C2E7]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#5E1788]" />
            <h2 className="font-serif font-bold text-xl text-[#1F1B24]">
              Il tuo Carrello ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Chiudi carrello"
            className="p-2 text-neutral-400 hover:text-[#1F1B24] rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="bg-[#FAF7FC] px-6 py-3.5 border-b border-[#D8C2E7]/30">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-medium text-[#1F1B24]">
              <Truck className="h-3.5 w-3.5 text-[#5E1788]" />
              {shippingInfo.isFree ? (
                <span className="text-emerald-700 font-bold">
                  Hai sbloccato la Spedizione Gratuita!
                </span>
              ) : (
                <span>
                  Aggiungi{" "}
                  <strong className="text-[#5E1788]">
                    €{shippingInfo.remaining.toFixed(2)}
                  </strong>{" "}
                  per la Spedizione Gratuita
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-neutral-400">
              {shippingInfo.percentage}%
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] transition-all duration-500"
              style={{ width: `${shippingInfo.percentage}%` }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-neutral-100">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-[#7A3293] mb-4">
                <ShoppingBag className="h-8 w-8 text-[#5E1788]/60" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-[#1F1B24]">
                Il carrello è vuoto
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                Scopri la nostra collezione di alta cosmesi e lasciati ispirare dalle formule Diego della Palma e Cipria Makeup.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-6 px-6 py-2.5 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors cursor-pointer"
              >
                Inizia lo Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="py-4 flex gap-4 items-start group">
                {/* Thumbnail */}
                <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-[#FAF7FC] border border-[#E2E8F0] shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                {/* Info & Quantity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] tracking-wider uppercase font-semibold text-[#7A3293]">
                        {item.brand}
                      </span>
                      <h4 className="font-serif font-bold text-sm text-[#1F1B24] truncate">
                        <Link
                          href={`/prodotti/${item.slug}`}
                          onClick={closeCart}
                          className="hover:text-[#5E1788]"
                        >
                          {item.name}
                        </Link>
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-neutral-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                      aria-label="Rimuovi dal carrello"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Shade Swatch Badge (if any) */}
                  {item.shade && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
                      <span
                        className="h-3 w-3 rounded-full border border-neutral-300 inline-block shrink-0"
                        style={{ backgroundColor: item.shade.hex }}
                      />
                      <span className="truncate text-[11px]">
                        {item.shade.name}
                      </span>
                    </div>
                  )}

                  {/* Price & Quantity Controls */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center border border-[#E2E8F0] rounded-lg bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2.5 py-1 text-neutral-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        aria-label="Riduci quantità"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 py-1 text-xs font-semibold text-[#1F1B24]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2.5 py-1 text-neutral-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        aria-label="Aumenta quantità"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="font-bold text-sm text-[#1F1B24]">
                      €{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary, Coupon Box & Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#D8C2E7]/40 bg-[#FAF7FC] space-y-4">
            {/* Box Codice Sconto / Coupon */}
            <div className="bg-white rounded-xl p-3 border border-[#D8C2E7]/60 shadow-xs space-y-2">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-emerald-700" />
                    <div>
                      <span className="font-bold text-emerald-900 font-mono">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-emerald-700 ml-1.5">
                        ({appliedCoupon.discountValue}
                        {appliedCoupon.discountType === "percentage" ? "%" : "€"}{" "}
                        {appliedCoupon.targetBrand ? `su ${appliedCoupon.targetBrand}` : "sconto"}
                        )
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-neutral-400 hover:text-red-500 text-xs font-semibold p-1 transition cursor-pointer"
                    title="Rimuovi coupon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Codice coupon o smart link..."
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isApplying || !couponInput.trim()}
                    className="px-4 py-2 rounded-lg bg-[#5E1788] text-white text-xs font-bold hover:bg-[#7A3293] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isApplying ? "Verifica..." : "Applica"}
                  </button>
                </form>
              )}

              {(couponError || localFeedback) && (
                <p
                  className={`text-[11px] px-1 ${
                    couponError ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {couponError || localFeedback}
                </p>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotale</span>
                <span className="font-medium text-[#1F1B24]">
                  €{subtotal.toFixed(2)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold animate-in fade-in duration-200">
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Sconto ({appliedCoupon?.code})
                  </span>
                  <span>-€{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600">
                <span>Spedizione</span>
                <span className="font-medium">
                  {shippingInfo.isFree ? (
                    <span className="text-emerald-600 font-semibold uppercase tracking-wider text-[11px]">
                      Gratuita
                    </span>
                  ) : (
                    `€${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-200 flex justify-between text-base font-bold text-[#1F1B24]">
                <span>Totale Ordine</span>
                <span className="text-[#5E1788]">€{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Action */}
            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-purple-900/20 hover:shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span>Procedi al Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Micro Trust Indicators */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-neutral-500 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Pagamenti Protetti & Sicuri
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#D462A6]" />
                100% Cosmesi Originale
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
