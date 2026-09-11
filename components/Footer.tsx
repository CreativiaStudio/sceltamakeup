"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import {
  MapPin,
  Phone,
  Clock,
  Mail,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Heart,
} from "lucide-react";

import { useWhatsAppModalStore } from "@/store/useWhatsAppModalStore";

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const openWhatsAppModal = useWhatsAppModalStore((state) => state.openModal);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setIsSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-[#1F1B24] text-white pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Newsletter & Atelier Club Row */}
        <div className="pb-12 border-b border-neutral-800/80 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 text-[#D8C2E7] text-xs font-semibold tracking-widest uppercase mb-2">
              <Sparkles className="h-4 w-4 text-[#D462A6]" />
              <span>Scelta Privilège Club</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-white font-normal">
              Ricevi anteprime esclusive e il 10% di benvenuto
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-light">
              Iscriviti alla newsletter per consigli dai nostri make-up artist, inviti agli eventi in boutique e promozioni riservate.
            </p>
          </div>

          <div className="lg:col-span-5">
            {isSubscribed ? (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/50 text-purple-200 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Grazie per l&apos;iscrizione! Controlla la tua email per il codice sconto benvenuto.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Inserisci la tua email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 rounded-full bg-neutral-900 border border-neutral-700 text-white placeholder:text-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-[#D462A6]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#D462A6] text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-md active:scale-95 shrink-0"
                >
                  Iscriviti
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main Footer Columns */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Col 1: Brand & Philosophy */}
          <div className="lg:col-span-4 space-y-4">
            <BrandLogo variant="footer" />
            <p className="text-xs text-neutral-400 font-light leading-relaxed pt-2">
              Boutique cosmetica e atelier di bellezza a Napoli. Selezioniamo le migliori formulazioni Diego della Palma e Cipria Makeup per esaltare l&apos;eleganza di ogni donna con autenticità e maestria.
            </p>
            <div className="flex items-center gap-3 pt-2 text-neutral-400">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center hover:text-white hover:bg-[#5E1788] transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center hover:text-white hover:bg-[#5E1788] transition-colors"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Boutique Fisica Napoli */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs tracking-widest uppercase font-semibold text-[#D8C2E7]">
              Boutique Napoli
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-300 font-light">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-[#D462A6] shrink-0 mt-0.5" />
                <span>Via dei Pellegrini 28/29, 80138 Napoli (NA)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-[#D462A6] shrink-0" />
                <button
                  type="button"
                  onClick={() => openWhatsAppModal("Salve, vorrei informazioni sui prodotti o servizi della boutique", "Footer Info")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  WhatsApp: In attivazione (Demo)
                </button>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-[#D462A6] shrink-0 mt-0.5" />
                <span>
                  Lunedì – Sabato: 09:30 – 13:30 / 16:30 – 20:00 <br />
                  <span className="text-neutral-500">Domenica Chiuso</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-[#D462A6] shrink-0" />
                <span>info@sceltamakeup.it</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Macro-Categorie & Navigazione */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs tracking-widest uppercase font-semibold text-[#D8C2E7]">
              Collezioni
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li>
                <Link href="/?categoria=Viso#catalogo" className="hover:text-white transition-colors">
                  Viso & Fondotinta
                </Link>
              </li>
              <li>
                <Link href="/?categoria=Occhi#catalogo" className="hover:text-white transition-colors">
                  Occhi & Mascara
                </Link>
              </li>
              <li>
                <Link href="/?categoria=Labbra#catalogo" className="hover:text-white transition-colors">
                  Labbra & Rossetti
                </Link>
              </li>
              <li>
                <Link href="/?categoria=Skincare+%26+Dermo#catalogo" className="hover:text-white transition-colors">
                  Skincare & Dermo
                </Link>
              </li>
              <li>
                <Link href="/?categoria=Beauty+%26+Accessori#catalogo" className="hover:text-white transition-colors">
                  Beauty & Pennelli
                </Link>
              </li>
              <li className="pt-2 border-t border-neutral-800">
                <Link href="/servizi" className="text-[#D8C2E7] font-semibold hover:text-white transition-colors flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#D462A6]" />
                  Atelier Servizi (-10%)
                </Link>
              </li>
              <li>
                <Link href="/prenota" className="text-[#D8C2E7] hover:text-white transition-colors">
                  Prenota Make-Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Servizio Clienti & Garanzie */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs tracking-widest uppercase font-semibold text-[#D8C2E7]">
              Garanzie Boutique
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-neutral-500" />
                <span>Spedizioni Rapide 24/48h</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
                <span>100% Originali Garantiti</span>
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
                <span>Campioncini Omaggio</span>
              </li>
              <li className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-neutral-500" />
                <span>Consulenza Dedicata</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Cassa Link & Creativia Studio Credits */}
        <div className="pt-8 mt-8 border-t border-neutral-800 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Scelta Makeup. Tutti i diritti riservati. P.IVA e Dati Societari registrati a Napoli.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/appuntamenti"
              className="hover:text-[#D8C2E7] transition-colors underline decoration-dotted text-[11px]"
            >
              Cassa & Appuntamenti Store
            </Link>
            <span className="opacity-30">|</span>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span>Sviluppato con eleganza da</span>
              <span className="text-white font-medium tracking-wider hover:text-[#D8C2E7] transition-colors">
                Creativia Studio
              </span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
