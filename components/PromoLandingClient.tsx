"use client";

/**
 * Scelta Makeup — Curated Landing Page Client Component
 * Module: components/PromoLandingClient.tsx
 *
 * Pagina di destinazione visualizzata da chi scansiona il QR Code della locandina
 * o apre lo Smart Link promozionale.
 * - Sconto auto-applicato al carrello
 * - Vetrina curata dei soli prodotti sparati con la pistola barcode da Federica
 * - Selezione shade e aggiunta immediata al carrello
 * - Checkout rapido (Ritiro in Salone Napoli o Spedizione 24/48h)
 */

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Check,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Store,
  MessageCircle,
  Tag,
  ArrowRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import { PromoCoupon } from "@/types/coupon";
import { Product, Shade } from "@/types/product";
import { useCartStore } from "@/store/useCartStore";
import { safeImageSrc } from "@/lib/r2";

interface PromoLandingClientProps {
  coupon: PromoCoupon;
  products: Product[];
}

export default function PromoLandingClient({
  coupon,
  products,
}: PromoLandingClientProps) {
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const isCartOpen = useCartStore((state) => state.isOpen);
  const cartItems = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);

  // Selected shade for each product (productId -> shade)
  const [selectedShades, setSelectedShades] = useState<Record<string, Shade | undefined>>({});
  const [addedAnimation, setAddedAnimation] = useState<Record<string, boolean>>({});

  // Auto-apply coupon on mount
  useEffect(() => {
    if (coupon && coupon.active) {
      applyCoupon(coupon);
    }
  }, [coupon, applyCoupon]);

  const handleSelectShade = (productId: string, shade: Shade) => {
    setSelectedShades((prev) => ({ ...prev, [productId]: shade }));
  };

  const handleAddToCart = (product: Product) => {
    const chosenShade = selectedShades[product.id] || product.shades?.[0];
    const image = safeImageSrc(chosenShade?.image, product.images?.[0]);

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.price || 0,
      image,
      shade: chosenShade
        ? {
            id: chosenShade.id,
            name: chosenShade.name,
            code: chosenShade.code,
            hex: chosenShade.hex,
            image: chosenShade.image || image,
          }
        : undefined,
    });

    setAddedAnimation((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedAnimation((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  const calculateDiscountedPrice = (price: number) => {
    if (!coupon.discountValue || coupon.discountValue <= 0) return price;
    if (coupon.discountType === "percentage") {
      return Math.max(0, price * (1 - coupon.discountValue / 100));
    }
    return Math.max(0, price - coupon.discountValue);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getTotalPrice();
  const discountAmount = getDiscountAmount();
  const finalCartTotal = Math.max(0, subtotal - discountAmount);

  const handleWhatsAppInquiry = () => {
    const msg = `Ciao Federica! Sto guardando la selezione "${coupon.headline || coupon.name}" sul sito e vorrei un consiglio per il mio makeup.`;
    window.open(`https://wa.me/393288289452?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF7FC] text-[#1F1B24] pb-36 sm:pb-24 selection:bg-[#5E1788] selection:text-white">
      {/* Top Banner Announcement */}
      <div className="bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white text-xs py-2.5 px-4 text-center font-medium shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
          <span>
            {coupon.badgeText || "Offerta Esclusiva Salone"} • Ritiro Gratuito in Salone (Napoli) o Spedizione 24/48h
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-10">
        {/* Hero Section — Testata scenica ad alto impatto */}
        <section className="group relative isolate overflow-hidden rounded-[2rem] border border-[#D8C2E7]/40 bg-[#1F1B24] shadow-[0_40px_95px_-45px_rgba(94,23,136,0.85)]">
          {/* Foto del Salone come sfondo scenico */}
          <Image
            src={safeImageSrc(
              coupon.heroImage || "/boutique/salone-postazioni-makeup-frontale.webp"
            )}
            alt="Salone Scelta Makeup — postazioni make-up e specchi illuminati a Napoli"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover object-center transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
          />

          {/* Overlay scuro/scenico: il salone si intravede maestoso */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24] via-[#1F1B24]/75 to-[#1F1B24]/65" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(122,50,147,0.42),transparent_62%)]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#5E1788]/35 via-transparent to-[#D462A6]/20" />

          {/* Contenuto centrato sopra l'immagine */}
          <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 px-5 sm:px-8 lg:px-12 py-12 sm:py-16 lg:py-20 text-center">
            {/* Pillola glassmorphic */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]">
              <Sparkles className="w-3.5 h-3.5 text-[#D8C2E7]" />
              <span>SCELTA MAKEUP • SALONE NAPOLI</span>
              <Tag className="w-3.5 h-3.5 text-[#D462A6]" />
            </div>

            {/* Titolo */}
            <h1 className="font-serif text-[2rem] sm:text-5xl lg:text-[3.6rem] font-bold text-white leading-[1.08] tracking-tight max-w-3xl drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]">
              {coupon.headline || coupon.name}
            </h1>

            {/* Descrizione */}
            <p className="text-sm sm:text-base text-white/75 font-light leading-relaxed max-w-xl">
              {coupon.description ||
                "I prodotti essenziali selezionati personalmente da Federica Cesiano per un look professionale ed elegante a lunga tenuta."}
            </p>

            {/* Box Sconto Attivo — glassmorphic bianco in rilievo */}
            <div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_28px_70px_-30px_rgba(0,0,0,0.8)] p-4 sm:p-5 space-y-3 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-center sm:self-auto">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Sconto Attivo nel Carrello</span>
                </div>

                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  {coupon.discountValue > 0 ? (
                    <>
                      <span className="font-serif text-3xl sm:text-4xl font-bold text-[#5E1788] leading-none">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}%`
                          : `€${coupon.discountValue.toFixed(2)}`}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A3293]/80">
                        di sconto
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-neutral-700">
                      Selezione Ufficiale Salone Scelta Makeup
                    </span>
                  )}
                </div>

                {coupon.code && (
                  <div className="sm:ml-auto flex items-center gap-2 rounded-xl border border-dashed border-[#5E1788]/40 bg-[#FAF7FC] px-3 py-1.5 self-center sm:self-auto">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                      Codice
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#5E1788] tracking-wider">
                      {coupon.code}
                    </span>
                  </div>
                )}
              </div>

              {coupon.endDate && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-neutral-500 pt-1 border-t border-neutral-200/70">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Valido fino al {coupon.endDate}</span>
                </div>
              )}
            </div>

            {/* Didascalia location e consegna */}
            <p className="text-[11px] sm:text-xs font-semibold text-white/85 leading-relaxed max-w-xl">
              📍 Via dei Pellegrini 28/29, Montesanto (Napoli) • Ritiro gratuito in Salone o
              Spedizione 24/48h
            </p>
          </div>
        </section>

        {/* Curated Products Showcase */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F1B24]">
                I Prodotti Selezionati da Federica
              </h2>
              <p className="text-xs text-neutral-500">
                Aggiungi al carrello i tuoi preferiti per completare l&apos;acquisto con lo sconto dedicato
              </p>
            </div>
            <span className="text-xs font-bold text-[#5E1788] bg-purple-100 px-3 py-1 rounded-full">
              {products.length} {products.length === 1 ? "prodotto" : "prodotti"}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-neutral-200 space-y-4">
              <p className="text-neutral-500 text-sm">
                Questa promozione è attiva su tutto il catalogo Scelta Makeup!
              </p>
              <Link
                href="/#catalogo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5E1788] text-white text-xs font-bold uppercase hover:bg-[#7A3293] transition-colors"
              >
                <span>Esplora il Catalogo Completo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const basePrice = product.price || 0;
                const discountedPrice = calculateDiscountedPrice(basePrice);
                const hasDiscount = coupon.discountValue > 0 && discountedPrice < basePrice;
                const savings = basePrice - discountedPrice;

                const currentShade = selectedShades[product.id] || product.shades?.[0];
                const displayImage = safeImageSrc(currentShade?.image, product.images?.[0]);
                const isAdded = !!addedAnimation[product.id];

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl p-5 border border-[#D8C2E7]/60 shadow-sm hover:shadow-xl hover:border-[#5E1788]/60 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Image Box */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FAF7FC] border border-neutral-100">
                      <Image
                        src={displayImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Savings Pill */}
                      {hasDiscount && (
                        <div className="absolute top-3 left-3 bg-[#5E1788] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                          {coupon.discountType === "percentage"
                            ? `-${coupon.discountValue}%`
                            : `-€${coupon.discountValue.toFixed(2)}`}
                        </div>
                      )}

                      {/* Brand Label */}
                      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-[#1F1B24] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-neutral-200">
                        {product.brand}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="space-y-2">
                      <h3 className="font-serif text-lg font-bold text-[#1F1B24] line-clamp-1 group-hover:text-[#5E1788] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xs text-neutral-500 line-clamp-2">
                        {product.shortDescription || product.description || "Prodotto professionale di alta cosmesi."}
                      </p>

                      {/* Shade Selector if available */}
                      {product.shades && product.shades.length > 1 && (
                        <div className="pt-2 space-y-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">
                            Tonalità: {currentShade?.name}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {product.shades.map((shade) => (
                              <button
                                key={shade.id}
                                type="button"
                                onClick={() => handleSelectShade(product.id, shade)}
                                className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                                  currentShade?.id === shade.id
                                    ? "ring-2 ring-[#5E1788] ring-offset-1 scale-110"
                                    : "border-neutral-300 opacity-80 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: shade.hex || "#D8C2E7" }}
                                title={shade.name}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price and Action */}
                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div>
                        {hasDiscount && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-neutral-400 line-through">
                              €{basePrice.toFixed(2)}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              Risparmi €{savings.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <span className="text-xl font-serif font-bold text-[#5E1788]">
                          €{discountedPrice.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-[#5E1788] text-white hover:bg-[#7A3293] active:scale-95"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Aggiunto!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Aggiungi</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Salon Guarantees & Trust Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
            <Store className="w-6 h-6 text-[#5E1788] mx-auto" />
            <h4 className="font-serif text-sm font-bold text-[#1F1B24]">
              Ritiro Gratuito in Salone
            </h4>
            <p className="text-xs text-neutral-500">
              Via dei Pellegrini 28/29, Napoli. Il tuo ordine sarà pronto e confezionato con cura.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
            <Truck className="w-6 h-6 text-[#5E1788] mx-auto" />
            <h4 className="font-serif text-sm font-bold text-[#1F1B24]">
              Spedizione Rapida 24/48h
            </h4>
            <p className="text-xs text-neutral-500">
              Consegna tracciata con corriere espresso in tutta Italia in confezione lusso protetta.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs text-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-[#5E1788] mx-auto" />
            <h4 className="font-serif text-sm font-bold text-[#1F1B24]">
              Autenticità Garantita al 100%
            </h4>
            <p className="text-xs text-neutral-500">
              Solo cosmetici originali e certificati, con campioncino omaggio in ogni confezione.
            </p>
          </div>
        </div>

        {/* WhatsApp Direct Advice */}
        <div className="bg-gradient-to-r from-purple-50 via-pink-50/40 to-purple-50 p-6 rounded-3xl border border-[#D8C2E7]/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-[#1F1B24]">
              Hai dubbi sulle tonalità o sui prodotti?
            </h3>
            <p className="text-xs text-neutral-600">
              Chiedi consiglio direttamente a Federica su WhatsApp per scegliere la nuance perfetta per la tua pelle.
            </p>
          </div>
          <button
            type="button"
            onClick={handleWhatsAppInquiry}
            className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consulenza WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Cart Bar (Mobile & Desktop) */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-8 sm:w-[400px] z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-[#5E1788]/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          <button
            type="button"
            onClick={openCart}
            className="flex flex-col text-left cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block group-hover:text-[#5E1788] transition-colors">
              Carrello ({cartCount} {cartCount === 1 ? "art." : "art."}) • Vedi dettagli
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-serif font-bold text-[#5E1788]">
                €{finalCartTotal.toFixed(2)}
              </span>
              {discountAmount > 0 && (
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  -€{discountAmount.toFixed(2)}
                </span>
              )}
            </div>
          </button>

          <Link
            href="/checkout"
            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white text-xs font-bold uppercase tracking-wider hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
          >
            <span>Vai al Checkout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
