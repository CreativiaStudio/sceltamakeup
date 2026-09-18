"use client";

import Image from "next/image";
import { MapPin, Clock, Phone, Sparkles, Navigation, HeartHandshake, MessageCircle } from "lucide-react";
import { WHATSAPP_DISPLAY_NUMBER, buildWhatsAppUrl } from "@/lib/whatsapp";

export default function BoutiqueSection() {
  return (
    <section id="boutique" className="py-16 sm:py-24 bg-[#FAF7FC] border-t border-[#D8C2E7]/40 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Visual & Boutique Architecture Photo */}
          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <Image
                src="/brand/negozio-fisico.png"
                alt="Salone Scelta Makeup a Napoli"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F1B24]/40 via-transparent to-transparent" />
              
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-white/95 text-[#5E1788] shadow-sm backdrop-blur-xs">
                  Salone Napoli
                </span>
              </div>
            </div>

            {/* Floating Mini Card */}
            <div className="absolute -bottom-6 -right-4 sm:right-6 bg-white p-4 sm:p-5 rounded-2xl shadow-xl border border-[#D8C2E7]/70 hidden sm:flex items-center gap-3.5 max-w-xs">
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
          </div>

          {/* Right Column: Narrative & Boutique Details */}
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
              Nel cuore di Napoli, il salone <strong>Scelta Makeup</strong> è il tempio della cosmesi professionale. Un ambiente raffinato dove scoprire dal vivo le nuove collezioni <strong>Diego della Palma</strong> e <strong>Cipria Makeup</strong>, provare le sfumature perfette per il tuo sottotono e ricevere consigli su misura.
            </p>

            <div className="space-y-4 pt-2 border-t border-[#D8C2E7]/40">
              {/* Address */}
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

              {/* Hours */}
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-[#D8C2E7]/60 text-[#5E1788] shrink-0 mt-0.5">
                  <Clock className="h-5 w-5 text-[#5E1788]" />
                </div>
                <div>
                  <h4 className="text-xs tracking-wider uppercase font-semibold text-neutral-400">
                    Orari di Apertura
                  </h4>
                  <p className="text-sm font-semibold text-[#1F1B24]">
                    Lunedì – Sabato: 09:30 – 13:30 / 16:30 – 20:00
                  </p>
                  <p className="text-xs text-neutral-500">Domenica: Chiuso</p>
                </div>
              </div>

              {/* Phone / Contact */}
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
