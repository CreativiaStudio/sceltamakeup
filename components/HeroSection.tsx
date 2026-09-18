"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Truck, Store, ShieldCheck, HeartHandshake, ArrowRight, Calendar, Play } from "lucide-react";

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

  const scrollToVideoMasterclass = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById("video-masterclass");
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
            src="/brand/hero-makeup-model.webp"
            alt="Make-up model Scelta Makeup - Bellezza Autentica"
            fill
            priority
            sizes="100vw"
            className="object-cover object-top mix-blend-overlay"
          />
        </div>
        <div className="absolute top-0 right-1/3 -z-10 h-96 w-96 rounded-full bg-[#D462A6]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -z-10 h-96 w-96 rounded-full bg-[#5E1788]/35 blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          {/* Overline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D8C2E7]/40 text-[#D8C2E7] text-xs font-semibold tracking-wider uppercase shadow-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
            <span>Alta Cosmesi Professionale • Spedizione 24/48h in tutta Italia</span>
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
            La purezza formulativa Diego dalla Palma e la maestria professionale Cipria Makeup selezionate per esaltare la tua bellezza naturale. Spedizione gratuita da €49 con consegna 24/48h in tutta Italia e salone fisico di proprietà come garanzia di professionalità.
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

            <a
              href="#video-masterclass"
              onClick={scrollToVideoMasterclass}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-[#5E1788] font-medium text-sm tracking-wider uppercase shadow-xl hover:bg-[#FAF7FC] hover:scale-[1.02] active:scale-98 transition-all group"
            >
              <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#5E1788] to-[#D462A6]">
                <Play className="h-3 w-3 text-white fill-white ml-px" />
              </span>
              <span>Guarda Video Tutorial</span>
            </a>
          </div>

          {/* Salone Presence */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-neutral-200 mb-12">
            <Store className="h-4 w-4 text-[#D8C2E7]" />
            <span className="font-semibold text-white">Salone Fisico Ufficiale:</span>
            <span>Via dei Pellegrini 28/29, Napoli • Garanzia di professionalità e consulenza dal vivo</span>
          </div>

          {/* Trust Bar */}
          <div className="pt-8 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-[#D8C2E7] shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Spedizione Gratuita 24/48h</h4>
                <p className="text-xs text-neutral-300">Da €49 in tutta Italia</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-[#D8C2E7] shrink-0">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Ritiro in Salone</h4>
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
              <span>BOUTIQUE UFFICIALE & ALTA COSMESI PROFESSIONALE</span>
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
              La purezza formulativa Diego dalla Palma Milano e l&apos;eccellenza Cipria Make Up: collezioni esclusive per esaltare la tua bellezza autentica, con spedizione rapida in tutta Italia e atelier a Napoli.
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

              <a
                href="#video-masterclass"
                onClick={scrollToVideoMasterclass}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#1F1B24] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-[#1F1B24]/25 hover:bg-[#5E1788] hover:scale-[1.02] active:scale-98 transition-all group"
              >
                <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#7A3293] to-[#D462A6] shadow-inner">
                  <Play className="h-3 w-3 text-white fill-white ml-px" />
                </span>
                <span>Guarda Video Tutorial</span>
              </a>
            </div>

            {/* E-Commerce Guarantee Row with subtle Atelier mention */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3.5 text-xs text-neutral-600">
              <div className="flex items-center gap-1.5 font-medium text-[#5E1788]">
                <Truck className="h-4 w-4 text-[#D462A6]" />
                <span>Spedizione Rapida 24/48h</span>
              </div>
              <span className="opacity-40">•</span>
              <div className="flex items-center gap-1.5 font-medium text-[#1F1B24]">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>100% Cosmesi Originale</span>
              </div>
              <span className="opacity-40">•</span>
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Store className="h-4 w-4 text-[#7A3293]" />
                <span>Atelier Napoli (Via dei Pellegrini)</span>
              </div>
            </div>

          </div>

          {/* Right Column: Editorial Hero Visual Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Beauty Portrait Card with Real Makeup Model */}
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90">
                <Image
                  src="/brand/hero-makeup-model.webp"
                  alt="Make-up Professionale Scelta Makeup - Bellezza Autentica"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover object-top transition-transform duration-700 hover:scale-105"
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
                      href="/prodotti/diego-dalla-palma-sun-shampoo-doccia-dhc110160"
                      className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#5E1788] text-white text-xs font-semibold hover:bg-[#7A3293] transition-colors shadow-xs"
                    >
                      Dettagli
                    </Link>
                  </div>
                </div>
              </div>

              {/* Floating Top Accent Badge: E-commerce Fast Delivery & Free Samples */}
              <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 p-3.5 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-[#D8C2E7]/70 hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7FC] flex items-center justify-center text-[#5E1788]">
                  <Truck className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div className="text-left">
                  <p className="text-xs tracking-wider uppercase font-bold text-[#7A3293]">
                    Spedizione Gratuita
                  </p>
                  <p className="text-xs font-semibold text-[#1F1B24]">
                    Da €49 in tutta Italia
                  </p>
                  <p className="text-xs text-neutral-500 font-light">Consegna rapida 24/48h</p>
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
                Ritiro in Salone
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
