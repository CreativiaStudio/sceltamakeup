"use client";

import Image from "next/image";
import { useState } from "react";
import {
  MapPin,
  Clock,
  Phone,
  Sparkles,
  Navigation,
  HeartHandshake,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react";
import { WHATSAPP_DISPLAY_NUMBER, buildWhatsAppUrl } from "@/lib/whatsapp";

interface BoutiquePhoto {
  src: string;
  alt: string;
  title: string;
  description: string;
}

const BOUTIQUE_GALLERY: BoutiquePhoto[] = [
  {
    src: "/boutique/salone-postazioni-makeup-frontale.webp",
    alt: "Postazioni make-up professionali del salone Scelta Makeup a Napoli con specchi retroilluminati",
    title: "Postazioni Make-up Professionali",
    description: "Specchiere d'autore con luce neutra calibrata e poltrone ergonomiche per sedute trucco",
  },
  {
    src: "/boutique/salone-salottino-attesa-panoramico.webp",
    alt: "Salottino d'attesa della boutique Scelta Makeup con poltrone in velluto rosa cipria",
    title: "Salottino d'Attesa & Welcome Lounge",
    description: "Poltrone a conchiglia in velluto rosa cipria e accoglienza riservata in salone",
  },
  {
    src: "/boutique/salone-area-diego-dalla-palma-rvb.webp",
    alt: "Espositore ufficiale Diego dalla Palma Professional e RVB LAB Make Up",
    title: "Corner Diego dalla Palma & RVB LAB",
    description: "Tutta la linea cosmetica professionale, trattamenti viso-corpo e make-up alta definizione",
  },
  {
    src: "/boutique/salone-espositori-cipria-makeup.webp",
    alt: "Espositori make-up completi Cipria Milano con tester viso occhi e labbra",
    title: "Espositori Make-up Cipria",
    description: "Collezioni complete viso, occhi, labbra e pennelli professionali disponibili in prova",
  },
  {
    src: "/boutique/salone-espositori-pierre-rene-eveline.webp",
    alt: "Espositore Pierre René Professional ed Eveline Cosmetics in salone",
    title: "Corner Pierre René & Eveline",
    description: "Palette occhi, polveri viso vellutate e prodotti skincare per ogni esigenza",
  },
  {
    src: "/boutique/salone-panoramica-boutique-completa.webp",
    alt: "Panoramica completa del salone Scelta Makeup con illuminazione LED diffusa",
    title: "Panoramica del Salone",
    description: "Uno spazio moderno ed elegante studiato per la resa cromatica ottimale del trucco",
  },
  {
    src: "/boutique/salone-prospettiva-boutique-retail.webp",
    alt: "Prospettiva dell'area retail ed espositiva del salone Scelta Makeup",
    title: "Area Espositiva & Prova Collezioni",
    description: "Ambiente accogliente nel cuore di Napoli per scoprire e testare dal vivo le novità beauty",
  },
];

export default function BoutiqueSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPhoto = (index: number) => {
    setActiveIndex((index + BOUTIQUE_GALLERY.length) % BOUTIQUE_GALLERY.length);
  };

  const activePhoto = BOUTIQUE_GALLERY[activeIndex];

  return (
    <section
      id="boutique"
      className="py-16 sm:py-24 bg-[#FAF7FC] border-t border-[#D8C2E7]/40 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* Left Column: Taller Photo Gallery Viewer (aspect-[4/5] to preserve vertical salon shots) */}
          <div className="lg:col-span-6 space-y-4">

            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-wider uppercase shadow-xs">
                <Camera className="h-3.5 w-3.5 text-[#D462A6]" />
                <span>Galleria del Salone</span>
              </div>
              <span className="text-xs font-semibold text-neutral-500 tabular-nums">
                Foto {activeIndex + 1} di {BOUTIQUE_GALLERY.length}
              </span>
            </div>

            <div className="relative aspect-[4/5] sm:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#1F1B24] select-none">
              {BOUTIQUE_GALLERY.map((photo, index) => (
                <Image
                  key={photo.src}
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className={`object-cover object-center transition-opacity duration-700 ease-out ${
                    index === activeIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24]/85 via-[#1F1B24]/15 to-transparent pointer-events-none" />

              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-white/95 text-[#5E1788] shadow-sm backdrop-blur-xs">
                  Salone Napoli
                </span>
              </div>

              <button
                type="button"
                onClick={() => goToPhoto(activeIndex - 1)}
                aria-label="Foto precedente"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/35 backdrop-blur-md text-white border border-white/20 hover:bg-[#5E1788]/80 active:scale-95 transition-all shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => goToPhoto(activeIndex + 1)}
                aria-label="Foto successiva"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/35 backdrop-blur-md text-white border border-white/20 hover:bg-[#5E1788]/80 active:scale-95 transition-all shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 pointer-events-none">
                <h3
                  key={activePhoto.title}
                  className="font-serif text-lg sm:text-2xl font-bold text-white leading-tight drop-shadow-md"
                >
                  {activePhoto.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-neutral-200 font-light max-w-xl drop-shadow">
                  {activePhoto.description}
                </p>
              </div>
            </div>

            {/* Vertical-friendly Thumbnail Strip */}
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {BOUTIQUE_GALLERY.map((photo, index) => (
                <button
                  key={photo.src}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Vedi foto ${index + 1}: ${photo.title}`}
                  aria-current={index === activeIndex}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-xl overflow-hidden border-2 snap-start transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D462A6] ${
                    index === activeIndex
                      ? "border-[#5E1788] shadow-[0_0_0_2px_rgba(197,155,39,0.45)] scale-[1.03]"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-[#D8C2E7]"
                  }`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 1024px) 70px, 90px"
                    className="object-cover object-center"
                  />
                </button>
              ))}
            </div>

          </div>

          <div className="lg:col-span-6 space-y-6 text-[#1F1B24]">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#D8C2E7]/70 text-[#7A3293] text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
              <span>Esperienza Esclusiva a Napoli</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight">
              Vieni a trovarci <br />
              <span className="text-brand-gradient italic font-normal">
                nel nostro Atelier
              </span>
            </h2>

            <p className="text-neutral-600 text-sm sm:text-base font-light leading-relaxed">
              Nel cuore di Napoli, il salone <strong>Scelta Makeup</strong> di{" "}
              <strong>Federica Cesiano</strong> è il tempio della cosmesi professionale. Un ambiente raffinato dove scoprire dal vivo le nuove collezioni <strong>Diego dalla Palma</strong> e <strong>Cipria Makeup</strong>, provare le sfumature perfette per il tuo sottotono e ricevere consigli su misura.
            </p>

            <div className="space-y-4 pt-2 border-t border-[#D8C2E7]/40">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-[#D8C2E7]/60 text-[#5E1788] shrink-0 mt-0.5">
                  <MapPin className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div>
                  <h4 className="text-xs tracking-wider uppercase font-semibold text-neutral-400">
                    Indirizzo
                  </h4>
                  <p className="text-sm font-semibold text-[#1F1B24]">
                    Via dei Pellegrini 28/29, 80132 Napoli (NA)
                  </p>
                  <p className="text-xs text-neutral-500">
                    Disponibile il servizio <strong>Ritiro Gratuito in Negozio</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-[#D8C2E7]/60 text-[#5E1788] shrink-0 mt-0.5">
                  <Clock className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div>
                  <h4 className="text-xs tracking-wider uppercase font-semibold text-neutral-400">
                    Orari di Apertura
                  </h4>
                  <p className="text-sm font-semibold text-[#1F1B24]">
                    Martedì – Sabato: 09:30 – 14:00 / 16:00 – 19:30
                  </p>
                  <p className="text-xs text-neutral-500">Lunedì e Domenica: Chiuso</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-[#D8C2E7]/60 text-[#5E1788] shrink-0 mt-0.5">
                  <Phone className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div>
                  <h4 className="text-xs tracking-wider uppercase font-semibold text-neutral-400">
                    Telefono & WhatsApp
                  </h4>
                  <a
                    href={buildWhatsAppUrl("Salve, vorrei informazioni sui prodotti o servizi Scelta Makeup")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#5E1788] hover:underline text-left cursor-pointer"
                  >
                    {WHATSAPP_DISPLAY_NUMBER} (Federica)
                  </a>
                  <p className="text-xs text-neutral-500">
                    Contattaci per appuntamenti make-up e informazioni
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#D8C2E7]/70 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#5E1788] text-white flex items-center justify-center shrink-0">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-[#1F1B24]">Consulenza Make-up</p>
                <p className="text-neutral-500 text-xs font-light">
                  Seduta personalizzata con le nostre esperte di bellezza.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-4">
              <a
                href="https://maps.google.com/?q=Via+dei+Pellegrini+28+Napoli"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1F1B24] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#5E1788] transition-colors"
              >
                <Navigation className="h-4 w-4" />
                <span>Ottieni Indicazioni</span>
              </a>

              <a
                href={buildWhatsAppUrl("Salve, vorrei informazioni sui prodotti Scelta Makeup")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white text-xs font-semibold tracking-wider uppercase hover:bg-emerald-700 transition-colors cursor-pointer shadow-md shadow-emerald-700/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Scrivici su WhatsApp</span>
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
