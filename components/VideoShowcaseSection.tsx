"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Play,
  X,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Clapperboard,
} from "lucide-react";

interface RecommendedProductLink {
  name: string;
  href: string;
}

interface VideoLook {
  id: string;
  title: string;
  brand: string;
  duration: string;
  focus: string;
  youtubeId: string;
  products: RecommendedProductLink[];
}

const VIDEO_LOOKS: VideoLook[] = [
  {
    id: "base-seta-contouring",
    title: "Base Seta & Contouring Professionale",
    brand: "Diego dalla Palma",
    duration: "2:15 min",
    focus:
      "Focus su fondotinta correttivo e polveri viso per una base impeccabile, levigata e a lunga tenuta.",
    youtubeId: "WSoEgv8XAWU",
    products: [
      { name: "Fondotinta Correttivi", href: "/prodotti?categoria=Viso" },
      { name: "Ciprie & Polveri HD", href: "/prodotti?cerca=cipria" },
      { name: "Blush & Contouring", href: "/prodotti?cerca=blush" },
    ],
  },
  {
    id: "labbra-iconiche-matt-velvet",
    title: "Labbra Iconiche & Matt Velvet",
    brand: "Cipria Make Up",
    duration: "1:45 min",
    focus:
      "Focus su rossetto a lunga tenuta e finish vellutato per labbra dal colore pieno, definito e confortevole.",
    youtubeId: "yr-gDp2hx54",
    products: [
      { name: "Rossetti Lunga Tenuta", href: "/prodotti?categoria=Labbra" },
      { name: "Matite Labbra", href: "/prodotti?cerca=matita%20labbra" },
      { name: "Gloss & Oli Labbra", href: "/prodotti?cerca=gloss" },
    ],
  },
  {
    id: "sguardo-magnetico-smokey",
    title: "Sguardo Magnetico & Smokey Shading",
    brand: "Diego dalla Palma",
    duration: "2:30 min",
    focus:
      "Focus su sfumature ombretti e mascara extra volume per uno sguardo profondo, magnetico e ad alta definizione.",
    youtubeId: "8DIA_WEMGio",
    products: [
      { name: "Palette & Ombretti", href: "/prodotti?categoria=Occhi" },
      { name: "Mascara Extra Volume", href: "/prodotti?cerca=mascara" },
      { name: "Eyeliner & Kajal", href: "/prodotti?cerca=eyeliner" },
    ],
  },
];

export default function VideoShowcaseSection() {
  const [activeLookId, setActiveLookId] = useState(VIDEO_LOOKS[0].id);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const activeLook = VIDEO_LOOKS.find((look) => look.id === activeLookId) ?? VIDEO_LOOKS[0];

  useEffect(() => {
    if (!isVideoOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVideoOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVideoOpen]);

  return (
    <section
      id="video-masterclass"
      className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-b from-[#1F1B24] via-[#2B1538] to-[#1F1B24] text-white border-y border-[#D8C2E7]/25"
    >
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#5E1788]/35 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#D462A6]/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="max-w-3xl mx-auto text-center space-y-5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D8C2E7]/40 text-[#D8C2E7] text-xs font-semibold tracking-wider uppercase shadow-xs">
            <Clapperboard className="h-3.5 w-3.5 text-[#D462A6]" />
            <span>Beauty in Motion • Video Masterclass & Texture</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12] text-white">
            Beauty in Motion:{" "}
            <span className="italic font-normal bg-gradient-to-r from-[#D8C2E7] via-white to-[#D462A6] bg-clip-text text-transparent">
              Formule & Video Masterclass
            </span>
          </h2>

          <p className="text-sm sm:text-lg text-neutral-300 font-light leading-relaxed">
            Scopri l&apos;applicazione perfetta dei prodotti{" "}
            <strong className="font-semibold text-white">Diego dalla Palma Milano</strong> e{" "}
            <strong className="font-semibold text-white">Cipria Make Up</strong> guidata dalle
            tecniche dei make-up artist ufficiali.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          <div className="lg:col-span-7 space-y-6">

            <button
              type="button"
              onClick={() => setIsVideoOpen(true)}
              aria-label={`Riproduci il video: ${activeLook.title}`}
              className="group relative block w-full aspect-video rounded-3xl overflow-hidden border border-white/20 shadow-2xl shadow-black/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#D462A6]/60"
            >
              <Image
                src={`https://i.ytimg.com/vi/${activeLook.youtubeId}/maxresdefault.jpg`}
                alt={`Anteprima video masterclass: ${activeLook.title}`}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24]/90 via-[#1F1B24]/25 to-[#1F1B24]/30" />

              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 text-[#5E1788] text-xs font-bold tracking-wider uppercase shadow-lg ring-1 ring-white/60">
                <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
                {activeLook.brand}
              </span>

              <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-semibold tabular-nums shadow-md">
                <Clock className="h-3.5 w-3.5 text-[#D8C2E7]" />
                {activeLook.duration}
              </span>

              <span className="absolute inset-0 flex items-center justify-center">
                <span className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#D462A6]/40 animate-ping" />
                  <span className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-[#5E1788] via-[#7A3293] to-[#D462A6] p-5 sm:p-6 shadow-2xl ring-4 ring-white/30 transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
                    <Play className="h-7 w-7 sm:h-8 sm:w-8 text-white fill-white ml-0.5" />
                  </span>
                </span>
              </span>

              <span className="absolute bottom-4 left-4 right-28 text-left">
                <span className="block font-serif text-lg sm:text-2xl font-bold text-white leading-tight drop-shadow-md">
                  {activeLook.title}
                </span>
              </span>
            </button>

            <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-[#D8C2E7]/25 shadow-inner">
              <h3 className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#D8C2E7]">
                <ShoppingBag className="h-4 w-4 text-[#D462A6]" />
                Prodotti Consigliati del Look
              </h3>
              <p className="mt-2 text-xs text-neutral-400 font-light">{activeLook.focus}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {activeLook.products.map((product) => (
                  <Link
                    key={product.name}
                    href={product.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white hover:text-[#5E1788] hover:border-white transition-all group"
                  >
                    {product.name}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
                <Link
                  href="#bestseller"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#5E1788]/30 hover:scale-[1.03] active:scale-95 transition-all"
                >
                  Acquista i Bestseller
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

          </div>

          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
              Seleziona il Look • 3 Video Masterclass
            </h3>

            {VIDEO_LOOKS.map((look, index) => {
              const isActive = look.id === activeLookId;
              return (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => setActiveLookId(look.id)}
                  aria-pressed={isActive}
                  className={`group w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D462A6] ${
                    isActive
                      ? "bg-gradient-to-r from-[#5E1788]/50 via-[#7A3293]/35 to-[#D462A6]/25 border-[#D462A6]/70 shadow-xl shadow-[#5E1788]/25 scale-[1.01]"
                      : "bg-white/5 border-white/15 hover:bg-white/10 hover:border-[#D8C2E7]/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 text-sm font-serif font-bold transition-colors ${
                        isActive
                          ? "bg-gradient-to-br from-[#D462A6] to-[#5E1788] text-white shadow-md"
                          : "bg-white/10 text-[#D8C2E7]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                            isActive
                              ? "bg-white text-[#5E1788] shadow-sm"
                              : "bg-white/10 text-[#D8C2E7]"
                          }`}
                        >
                          {look.brand}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-400 font-medium tabular-nums">
                          <Clock className="h-3 w-3" />
                          {look.duration}
                        </span>
                      </div>
                      <h4
                        className={`mt-1.5 font-serif text-base sm:text-lg font-bold leading-snug ${
                          isActive ? "text-white" : "text-neutral-200"
                        }`}
                      >
                        {look.title}
                      </h4>
                      <p className="mt-1 text-xs text-neutral-400 font-light leading-relaxed line-clamp-2">
                        {look.focus}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 mt-1 flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                        isActive
                          ? "bg-[#D462A6] text-white shadow-lg shadow-[#D462A6]/40"
                          : "bg-white/10 text-neutral-300 group-hover:bg-white/20"
                      }`}
                    >
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}

            <p className="px-1 pt-2 text-xs text-neutral-500 font-light leading-relaxed">
              I video tutorial dimostrano le tecniche professionali di applicazione. Per una
              consulenza personalizzata dal vivo, prenota una seduta make-up nel nostro atelier.
            </p>
          </div>

        </div>
      </div>

      {isVideoOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Video masterclass: ${activeLook.title}`}
        >
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setIsVideoOpen(false)}
          />

          <div className="relative w-full max-w-5xl z-10">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-[#D462A6]">
                  {activeLook.brand} • Masterclass
                </p>
                <h3 className="font-serif text-base sm:text-xl font-bold text-white truncate">
                  {activeLook.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoOpen(false)}
                aria-label="Chiudi il video"
                className="shrink-0 p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-[#D462A6] hover:border-[#D462A6] active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeLook.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={`${activeLook.title} — Video tutorial make-up`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {activeLook.products.map((product) => (
                <Link
                  key={product.name}
                  href={product.href}
                  onClick={() => setIsVideoOpen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 border border-white/25 text-white text-xs font-semibold hover:bg-white hover:text-[#5E1788] transition-all"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-[#D462A6]" />
                  {product.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
