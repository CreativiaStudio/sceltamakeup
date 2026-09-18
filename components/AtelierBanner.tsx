"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Calendar, ArrowRight, CheckCircle2, ShieldCheck, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

const atelierSlides = [
  {
    src: "/atelier/atelier-federica-sessione-1.webp",
    alt: "Federica Cesiano - Make-up Cerimonia & Sfumature Occhi",
    title: "Federica Cesiano",
    treatment: "Make-up Cerimonia & Sfumature Occhi"
  },
  {
    src: "/atelier/atelier-federica-sessione-2.webp",
    alt: "Federica Cesiano - Base Viso & Contouring Sartoriale",
    title: "Federica Cesiano",
    treatment: "Base Viso & Contouring Sartoriale"
  },
  {
    src: "/atelier/atelier-federica-sessione-3.webp",
    alt: "Federica Cesiano - Make-up Fotografico Alta Definizione",
    title: "Federica Cesiano",
    treatment: "Make-up Fotografico & Beauty"
  }
];

export default function AtelierBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % atelierSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? atelierSlides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % atelierSlides.length);
  };

  return (
    <section className="py-12 sm:py-16 bg-[#FAF7FC]/70 border-b border-[#D8C2E7]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Luxury Card Container */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#1F1B24] via-[#2D163B] to-[#1F1B24] border border-[#D8C2E7]/30 text-white p-8 sm:p-12 lg:p-14 shadow-2xl overflow-hidden">
          
          {/* Subtle Glow Accents */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#D462A6]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#5E1788]/30 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D8C2E7]/40 text-[#D8C2E7] text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
                <span>Atelier di Bellezza & Cabina Trucco • Napoli</span>
              </div>

              {/* Heading */}
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-tight">
                L&apos;Arte del Make-Up <br className="hidden sm:inline" />
                <span className="italic font-normal bg-gradient-to-r from-[#D8C2E7] via-[#F3E8FA] to-[#D462A6] bg-clip-text text-transparent">
                  Sartoriale & Senza Filtri
                </span>
              </h2>

              {/* Story */}
              <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed max-w-xl">
                Dalla consulenza armocromatica al trucco cerimonia ad alta definizione: vivi un&apos;esperienza esclusiva con <strong>Federica Cesiano</strong> nel nostro salone di <strong>Via dei Pellegrini 28/29, Napoli</strong>. Solo cosmetici professionali Diego dalla Palma e Cipria Makeup.
              </p>

              {/* Special Offer Highlight Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-[#D462A6]/50 shadow-inner max-w-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-[#D462A6] to-[#5E1788] text-white shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D462A6] text-white">
                        Vantaggio Esclusivo
                      </span>
                      <span className="text-xs text-[#D8C2E7] font-medium">
                        Promozione Maison
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-white mt-1">
                      -10% di Sconto Immediato su tutte le prenotazioni online
                    </p>
                    <p className="text-xs text-neutral-300 font-light mt-0.5">
                      Versi solo il 20% di acconto per bloccare la data, il saldo comodamente in salone dopo la seduta.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/prenota"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#D462A6] via-[#7A3293] to-[#5E1788] text-white font-semibold text-sm tracking-wider uppercase shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-98 transition-all group"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Prenota la Tua Seduta (-10%)</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/servizi"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-sm tracking-wider uppercase hover:bg-white/20 transition-all"
                >
                  <span>Scopri i Trattamenti</span>
                </Link>
              </div>

              {/* Mini Guarantees */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Consulenza viso inclusa
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#D8C2E7]" />
                  Cancellazione gratuita fino a 24h
                </span>
              </div>

            </div>

            {/* Right Visual Column: Interactive Atelier Storytelling Carousel */}
            <div 
              className="lg:col-span-5 relative"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-neutral-950 group">
                
                {/* Image Slides with Crossfade */}
                {atelierSlides.map((slide, idx) => (
                  <div
                    key={slide.src}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      idx === currentSlide ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 pointer-events-none scale-105"
                    }`}
                  >
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24]/90 via-transparent to-black/20" />
                  </div>
                ))}

                {/* Top Slide Counter */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md text-white/90 border border-white/15 shadow-sm">
                    {currentSlide + 1} / {atelierSlides.length}
                  </span>
                </div>

                {/* Prev/Next Navigation Controls */}
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                  aria-label="Foto precedente"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                  aria-label="Foto successiva"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Bottom Overlay: Slide Info & Salon Location */}
                <div className="absolute bottom-3 left-3 right-3 z-20 space-y-2">
                  
                  {/* Slide Title / Context Pill */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 text-white shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#D8C2E7]">
                          {atelierSlides[currentSlide].title}
                        </p>
                        <p className="text-xs text-neutral-200 font-light mt-0.5">
                          {atelierSlides[currentSlide].treatment}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-[#D462A6]" />
                        <span className="text-[11px] text-neutral-300">Napoli</span>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail / Dot Selector Pills */}
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    {atelierSlides.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === currentSlide
                            ? "w-8 bg-gradient-to-r from-[#D462A6] to-[#D8C2E7]"
                            : "w-2 bg-white/40 hover:bg-white/70"
                        }`}
                        aria-label={`Vai alla foto ${idx + 1}`}
                      />
                    ))}
                  </div>

                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
