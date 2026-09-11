"use client";

import { useEffect } from "react";
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
  const getShippingProgress = useCartStore((state) => state.getShippingProgress);

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
  const shippingInfo = getShippingProgress();
  const shippingCost = shippingInfo.isFree || items.length === 0 ? 0 : 4.90;
  const total = subtotal + shippingCost;

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={closeCart}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Carrello Scelta Makeup"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-[#FAF7FC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#5E1788] text-white flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1F1B24]">
                Il Tuo Carrello
              </h2>
              <span className="text-[11px] text-[#7A3293] font-medium tracking-wider uppercase">
                {items.length} {items.length === 1 ? "creazione" : "creazioni"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
            aria-label="Chiudi carrello"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-b border-[#D8C2E7]/40">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span className="flex items-center gap-1.5 text-[#5E1788]">
              <Truck className="h-3.5 w-3.5 text-[#D462A6]" />
              {shippingInfo.isFree ? (
                <span className="font-semibold text-emerald-700">
                  🎉 Hai sbloccato la Spedizione Gratuita!
                </span>
              ) : (
                <span>
                  Aggiungi ancora{" "}
                  <strong className="text-[#5E1788]">
                    €{shippingInfo.remaining.toFixed(2)}
                  </strong>{" "}
                  per la Spedizione Gratuita
                </span>
              )}
            </span>
            <span className="text-[11px] font-bold text-[#7A3293]">
              {shippingInfo.percentage}%
            </span>
          </div>

          <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-[#D8C2E7]/40 p-0.5">
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
                className="mt-6 px-6 py-2.5 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
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
                      className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
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
                        className="px-2.5 py-1 text-neutral-600 hover:bg-purple-50 transition-colors"
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
                        className="px-2.5 py-1 text-neutral-600 hover:bg-purple-50 transition-colors"
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

        {/* Footer Summary & Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#D8C2E7]/40 bg-[#FAF7FC] space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotale</span>
                <span className="font-medium text-[#1F1B24]">
                  €{subtotal.toFixed(2)}
                </span>
              </div>
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
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-purple-900/20 hover:shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition-all"
            >
              <Lock className="h-4 w-4" />
              <span>Procedi al Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Micro Trust Indicators */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-neutral-500 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Pagamenti Protetti SSL
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#D462A6]" />
                Campioncini in Omaggio
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
