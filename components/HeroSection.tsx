"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Truck, Store, ShieldCheck, HeartHandshake, ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-soft pt-6 sm:pt-10 pb-16 lg:pb-24 border-b border-[#D8C2E7]/30">
      {/* Subtle Background Glow Orbs */}
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 -z-10 h-72 w-72 rounded-full bg-pink-100/50 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial Headline & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left space-y-6">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 self-center lg:self-start px-4 py-1.5 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-wider uppercase shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
              <span>Alta Cosmesi & Atelier di Bellezza • Napoli</span>
            </div>

            {/* Editorial Title */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#1F1B24] tracking-tight leading-[1.12]">
              L&apos;eleganza di <br className="hidden sm:inline" />
              <span className="text-brand-gradient italic font-normal">
                essere autentica
              </span>
            </h1>

            {/* Subtitle / Story */}
            <p className="text-base sm:text-lg text-neutral-600 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
              Esplora la collezione esclusiva di <strong>Scelta Makeup</strong>:
              la purezza delle formule professionali <strong>Diego della Palma</strong> e{" "}
              <strong>Cipria Makeup</strong>, per valorizzare la tua unicità senza maschere.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="#catalogo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-purple-900/20 hover:shadow-xl hover:scale-[1.02] active:scale-98 transition-all group"
              >
                <span>Scopri la Collezione</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="#boutique"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white/80 backdrop-blur-md border border-[#D8C2E7] text-[#5E1788] font-medium text-sm tracking-wider uppercase hover:bg-[#FAF7FC] hover:border-[#5E1788]/40 transition-all"
              >
                <span>Boutique Experience</span>
              </a>
            </div>

            {/* Boutique Trust Bar */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-neutral-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-neutral-800">Boutique Ufficiale</span>
                <span className="text-neutral-500">Via dei Pellegrini 28/29, Napoli</span>
              </div>
              <span className="hidden sm:inline text-neutral-300">•</span>
              <span className="hidden sm:inline font-medium text-[#5E1788]">100% Cosmetici Ufficiali & Originali</span>
            </div>
          </div>

          {/* Right Column: Editorial Hero Visual Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Editorial Packshot / Beauty Portrait Card */}
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90">
                <Image
                  src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85"
                  alt="Scelta Makeup Bellezza Autentica"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover object-center transition-transform duration-700 hover:scale-105"
                />
                
                {/* Overlay Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24]/60 via-transparent to-transparent" />
                
                {/* Floating Bottom Card */}
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl glass-card backdrop-blur-md text-[#1F1B24] border border-white/80 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] tracking-widest uppercase font-semibold text-[#7A3293]">
                        In Evidenza
                      </span>
                      <h3 className="font-serif font-bold text-sm text-[#1F1B24]">
                        Geisha Matte & Lifting Glow
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Pigmenti puri e finish velluto satinato
                      </p>
                    </div>
                    <Link
                      href="/prodotti/geisha-matte-liquid-lipstick"
                      className="px-3 py-1.5 rounded-full bg-[#5E1788] text-white text-[11px] font-medium hover:bg-[#7A3293] transition-colors"
                    >
                      Dettagli
                    </Link>
                  </div>
                </div>
              </div>

              {/* Floating Accent Badge: Boutique Napoli */}
              <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 p-3 sm:p-4 rounded-2xl bg-white shadow-xl border border-[#D8C2E7]/60 hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7FC] flex items-center justify-center text-[#5E1788]">
                  <Store className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] tracking-widest uppercase font-bold text-[#7A3293]">
                    Atelier Fisico
                  </p>
                  <p className="text-xs font-semibold text-[#1F1B24]">
                    Via dei Pellegrini 28/29
                  </p>
                  <p className="text-[10px] text-neutral-400">Napoli Centro</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* High-End Trust Badges Bar */}
        <div className="mt-16 pt-8 border-t border-[#D8C2E7]/40 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/50 text-[#5E1788] shrink-0">
              <Truck className="h-5 w-5 text-[#5E1788]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#1F1B24]">
                Spedizione Gratuita
              </h4>
              <p className="text-[11px] text-neutral-500">
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
              <p className="text-[11px] text-neutral-500">
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
              <p className="text-[11px] text-neutral-500">
                Garanzia ufficiale e clinicamente testato
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
              <p className="text-[11px] text-neutral-500">
                Supporto diretto telefonico e WhatsApp
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
