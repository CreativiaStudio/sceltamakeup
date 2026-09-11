"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Truck, Store, ShieldCheck, HeartHandshake, ArrowRight, Calendar } from "lucide-react";

export interface HeroSectionProps {
  variant?: "split" | "fullwidth";
}

export default function HeroSection({ variant = "split" }: HeroSectionProps) {
  const scrollToBestseller = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById("bestseller");
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Full-width Cinematic Variant (Reversible Fallback)
  if (variant === "fullwidth") {
    return (
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1F1B24] via-[#2E143E] to-[#1F1B24] text-white py-16 sm:py-24 lg:py-28 border-b border-[#D8C2E7]/25">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none">
          <Image
            src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=85"
            alt="Scelta Makeup Atmosphere"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center mix-blend-overlay"
          />
        </div>
        <div className="absolute top-0 right-1/3 -z-10 h-96 w-96 rounded-full bg-[#D462A6]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -z-10 h-96 w-96 rounded-full bg-[#5E1788]/35 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          {/* Overline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D8C2E7]/40 text-[#D8C2E7] text-xs font-semibold tracking-wider uppercase shadow-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
            <span>Alta Cosmesi & Atelier di Bellezza • Napoli</span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.12] mb-6">
            L&apos;Arte del Viso Perfetto. <br />
            <span className="italic font-normal bg-gradient-to-r from-[#D8C2E7] via-white to-[#D462A6] bg-clip-text text-transparent">
              Senza Filtri, Senza Maschere.
            </span>
          </h1>

          {/* Payoff */}
          <p className="text-base sm:text-xl text-neutral-200 max-w-2xl mx-auto font-light leading-relaxed mb-8">
            La purezza formulativa Diego dalla Palma e la maestria professionale Cipria Makeup selezionate per esaltare la tua bellezza naturale a Napoli.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a
              href="#bestseller"
              onClick={scrollToBestseller}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] text-white font-medium text-sm tracking-wider uppercase shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-98 transition-all group"
            >
              <span>Esplora i Bestseller</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>

            <Link
              href="/prenota"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white font-medium text-sm tracking-wider uppercase hover:bg-white/20 hover:border-white/50 transition-all group"
            >
              <Calendar className="h-4 w-4 text-[#D462A6]" />
              <span>Prenota Make-Up in Atelier</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D462A6] text-white shadow-xs">
                -10% Online
              </span>
            </Link>
          </div>

          {/* Boutique Presence */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-neutral-200 mb-12">
            <Store className="h-4 w-4 text-[#D8C2E7]" />
            <span className="font-semibold text-white">Boutique Ufficiale:</span>
            <span>Via dei Pellegrini 28/29, Napoli Centro</span>
          </div>

          {/* Trust Bar */}
          <div className="pt-8 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-[#D8C2E7] shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Spedizione Gratuita</h4>
                <p className="text-xs text-neutral-300">Da €49 in tutta Italia</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-[#D8C2E7] shrink-0">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Ritiro in Boutique</h4>
                <p className="text-xs text-neutral-300">Via dei Pellegrini 28/29</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-[#D8C2E7] shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">100% Autentico</h4>
                <p className="text-xs text-neutral-300">Laboratori ufficiali italiani</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-[#D8C2E7] shrink-0">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Consulenza & Shade</h4>
                <p className="text-xs text-neutral-300">Make-up artist dedicate</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Split Editorial Variant (Default)
  return (
    <section className="relative overflow-hidden bg-brand-soft pt-6 sm:pt-10 pb-16 lg:pb-24 border-b border-[#D8C2E7]/30">
      {/* Subtle Background Glow Orbs */}
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 h-72 w-72 rounded-full bg-pink-100/50 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial Headline & Dual CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left space-y-6">
            
            {/* Overline Badge */}
            <div className="inline-flex items-center gap-2 self-center lg:self-start px-4 py-1.5 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-wider uppercase shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
              <span>ALTA COSMESI & ATELIER DI BELLEZZA • NAPOLI</span>
            </div>

            {/* Editorial Title */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#1F1B24] tracking-tight leading-[1.12]">
              L&apos;Arte del Viso Perfetto. <br className="hidden sm:inline" />
              <span className="text-brand-gradient italic font-normal">
                Senza Filtri, Senza Maschere.
              </span>
            </h1>

            {/* Payoff */}
            <p className="text-base sm:text-lg text-neutral-600 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
              La purezza formulativa Diego dalla Palma e la maestria professionale Cipria Makeup selezionate per esaltare la tua bellezza naturale a Napoli.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="#bestseller"
                onClick={scrollToBestseller}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-purple-900/20 hover:shadow-xl hover:scale-[1.02] active:scale-98 transition-all group"
              >
                <span>Esplora i Bestseller</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <Link
                href="/prenota"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white/90 backdrop-blur-md border border-[#D8C2E7] text-[#5E1788] font-medium text-sm tracking-wider uppercase hover:bg-[#FAF7FC] hover:border-[#5E1788]/40 transition-all group"
              >
                <Calendar className="h-4 w-4 text-[#D462A6]" />
                <span>Prenota Make-Up in Atelier</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#D462A6] to-[#5E1788] text-white shadow-xs">
                  -10% Online
                </span>
              </Link>
            </div>

            {/* Floating Boutique Official Badge */}
            <div className="pt-3 flex items-center justify-center lg:justify-start gap-2.5 text-xs text-neutral-700">
              <Store className="h-4 w-4 text-[#5E1788]" />
              <span className="font-semibold text-[#1F1B24]">Boutique Ufficiale •</span>
              <span className="text-neutral-600">Via dei Pellegrini 28/29, Napoli</span>
            </div>

          </div>

          {/* Right Column: Editorial Hero Visual Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Beauty Portrait Card */}
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90">
                <Image
                  src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85"
                  alt="Scelta Makeup Bellezza Autentica"
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover object-center transition-transform duration-700 hover:scale-105"
                />
                
                {/* Overlay Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24]/60 via-transparent to-transparent" />
                
                {/* Floating Product Packshot Card with Satin/Glass Finish */}
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/85 backdrop-blur-md border border-white/40 shadow-xl text-[#1F1B24]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Swatch Dot with Satin Ring */}
                      <div className="w-8 h-8 rounded-full bg-[#8B263E] ring-2 ring-white shadow-md shrink-0 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs tracking-wider uppercase font-semibold text-[#7A3293]">
                            Icona Maison
                          </span>
                          <span className="w-1 h-1 rounded-full bg-neutral-300" />
                          <span className="text-xs text-neutral-500 font-medium">Shade 03</span>
                        </div>
                        <h3 className="font-serif font-bold text-sm text-[#1F1B24] leading-tight">
                          Geisha Matte & Lifting Glow
                        </h3>
                        <p className="text-xs text-neutral-600 font-light mt-0.5">
                          Pigmenti puri e finish velluto satinato
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/prodotti/geisha-matte-liquid-lipstick"
                      className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#5E1788] text-white text-xs font-semibold hover:bg-[#7A3293] transition-colors shadow-xs"
                    >
                      Dettagli
                    </Link>
                  </div>
                </div>
              </div>

              {/* Floating Top Accent Badge: Boutique Napoli */}
              <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 p-3.5 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-[#D8C2E7]/70 hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7FC] flex items-center justify-center text-[#5E1788]">
                  <Store className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div className="text-left">
                  <p className="text-xs tracking-wider uppercase font-bold text-[#7A3293]">
                    Boutique Ufficiale
                  </p>
                  <p className="text-xs font-semibold text-[#1F1B24]">
                    Via dei Pellegrini 28/29
                  </p>
                  <p className="text-xs text-neutral-500 font-light">Napoli Centro</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* High-End Trust Badges Bar (All text >= 12px) */}
        <div className="mt-16 pt-8 border-t border-[#D8C2E7]/40 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/50 text-[#5E1788] shrink-0">
              <Truck className="h-5 w-5 text-[#5E1788]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1B24]">
                Spedizione Gratuita
              </h4>
              <p className="text-xs text-neutral-600">
                In tutta Italia per ordini da €49
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/50 text-[#5E1788] shrink-0">
              <Store className="h-5 w-5 text-[#5E1788]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1B24]">
                Ritiro in Boutique
              </h4>
              <p className="text-xs text-neutral-600">
                Via dei Pellegrini 28/29, Napoli
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/50 text-[#5E1788] shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#5E1788]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1B24]">
                100% Autentico & Cruelty-Free
              </h4>
              <p className="text-xs text-neutral-600">
                Garanzia ufficiale dai laboratori italiani
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/50 text-[#5E1788] shrink-0">
              <HeartHandshake className="h-5 w-5 text-[#5E1788]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1B24]">
                Consulenza & Shade Match
              </h4>
              <p className="text-xs text-neutral-600">
                Supporto make-up artist dedicato
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
