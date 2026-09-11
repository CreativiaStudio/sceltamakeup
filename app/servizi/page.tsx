import Link from "next/link";
import { Metadata } from "next";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Award,
  ChevronRight,
  Heart,
  Lock,
} from "lucide-react";
import { getAllServicesWithFuture } from "@/lib/bookingService";

export const metadata: Metadata = {
  title: "Servizi Make-up & Beauty Bar | Scelta Makeup Napoli",
  description:
    "Scopri i nostri trattamenti make-up esclusivi a Napoli curati da Federica Cesiano. Prenota online con il 10% di sconto immediato.",
};

export default function ServiziPage() {
  const allServices = getAllServicesWithFuture();
  const makeupServices = allServices.filter((s) => s.channel === "makeup");
  const beautyServices = allServices.filter((s) => s.channel === "beauty");

  return (
    <div className="min-h-screen bg-[#FAF7FC] text-[#1F1B24] flex flex-col font-sans">
      <main className="flex-grow">
        {/* Editorial Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#5E1788]/10 via-[#FAF7FC] to-white py-16 sm:py-24 border-b border-[#D8C2E7]/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D8C2E7]/60 text-xs font-semibold text-[#5E1788] shadow-sm mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
              Atelier Make-Up & Beauty Bar • Napoli
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1F1B24] tracking-tight max-w-4xl mx-auto leading-tight">
              L&apos;Arte di Esaltare la tua Bellezza Autentica
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#1F1B24]/75 max-w-2xl mx-auto leading-relaxed">
              Dalla consulenza armocromatica al trucco cerimonia ad alta tenuta: ogni seduta è un&apos;esperienza sartoriale creata per valorizzare la tua unicità, guidata personalmente da <strong>Federica Cesiano</strong>.
            </p>

            {/* Special Promo Online Banner */}
            <div className="mt-8 max-w-xl mx-auto bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white p-4 sm:p-5 rounded-2xl shadow-xl shadow-[#5E1788]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="inline-block px-2 py-0.5 rounded bg-white/20 text-[11px] font-bold tracking-wider uppercase mb-1">
                  Vantaggio Web
                </span>
                <p className="text-sm font-semibold">
                  10% di Sconto Immediato su tutte le prenotazioni online
                </p>
                <p className="text-xs text-[#D8C2E7] mt-0.5">
                  Versa solo il 20% di acconto con carta, saldi il resto comodamente in boutique
                </p>
              </div>
              <Link
                href="/prenota"
                className="shrink-0 px-6 py-2.5 rounded-xl bg-white text-[#5E1788] text-xs font-bold hover:bg-[#FAF7FC] transition-all shadow-md"
              >
                Prenota Ora
              </Link>
            </div>
          </div>
        </section>

        {/* Channel 1: MAKEUP (ACTIVE NOW) */}
        <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5E1788]">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                Canale 1 — Postazione Trucco Boutique
              </div>
              <h2 className="text-3xl font-serif font-bold text-[#1F1B24] mt-1">
                Servizi Make-Up & Atelier Viso
              </h2>
              <p className="text-sm text-[#1F1B24]/70 mt-1">
                Eseguiti da Federica Cesiano con cosmetici professionali Diego della Palma e Cipria Milano.
              </p>
            </div>
            <Link
              href="/prenota"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5E1788] hover:underline"
            >
              Apri il calendario completo
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {makeupServices.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-[#D8C2E7]/60 p-6 shadow-sm hover:shadow-xl hover:border-[#5E1788] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-[#5E1788]/10 text-xs font-bold text-[#5E1788]">
                      -10% Online
                    </span>
                    <span className="text-xs text-[#1F1B24]/60 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5E1788]" />
                      {service.durationMinutes} min
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-[#1F1B24]">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-xs text-[#1F1B24]/70 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#FAF7FC]">
                    <span className="text-[11px] font-bold text-[#5E1788] uppercase tracking-wider block mb-2">
                      Cosa Include:
                    </span>
                    <ul className="space-y-1.5">
                      {service.includes.map((inc, i) => (
                        <li key={i} className="text-xs text-[#1F1B24]/80 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#5E1788] shrink-0 mt-0.5" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#D8C2E7]/30">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-xs text-[#1F1B24]/50 line-through mr-1.5">
                        €{service.priceList.toFixed(2)}
                      </span>
                      <span className="text-2xl font-serif font-bold text-[#5E1788]">
                        €{service.priceOnline.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#1F1B24]/60">
                      Acconto: <strong>€{service.depositAmount.toFixed(2)}</strong>
                    </span>
                  </div>

                  <Link
                    href={`/prenota?servizio=${service.id}`}
                    className="w-full py-2.5 rounded-xl bg-brand-royal text-white text-xs font-bold hover:bg-[#7A3293] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#5E1788]/20"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Riserva il tuo Posto
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Channel 2: BEAUTY CABIN (FUTURE-READY) */}
        <section className="py-16 bg-white border-t border-[#D8C2E7]/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A3293] mb-1">
              <Lock className="w-3.5 h-3.5" />
              Canale 2 — Stanza Cabina Estetica Privata (In Arrivo)
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#1F1B24]">
              Trattamenti Dermocosmetici in Cabina
            </h2>
            <p className="text-sm text-[#1F1B24]/70 mt-1 max-w-2xl">
              Stiamo allestendo per te una stanza cabina riservata per percorsi di rigenerazione cutanea avanzata Diego della Palma Professional. Questo canale viaggerà su orari e personale dedicato in parallelo al make-up.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {beautyServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-dashed border-[#D8C2E7] p-6 bg-[#FAF7FC]/60 opacity-80 relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#1F1B24] text-white text-[10px] font-bold uppercase tracking-wider">
                    Prossima Apertura
                  </div>
                  <h3 className="text-xl font-serif font-bold text-[#1F1B24]">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-xs text-[#1F1B24]/70">
                    {service.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-[#1F1B24]/60">
                    <span>Durata: {service.durationMinutes} min</span>
                    <span>•</span>
                    <span>Tariffa lancio stimata: €{service.priceOnline.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quality & Trust Bar */}
        <section className="py-12 bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#D8C2E7]">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base">Cosmetici Professionali Top Brand</h4>
                <p className="text-xs text-[#D8C2E7] leading-relaxed">
                  Utilizziamo esclusivamente prodotti anallergici, testati dermatologicamente e cruelty-free RVB LAB e Cipria Milano.
                </p>
              </div>

              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#D8C2E7]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base">Igiene & Sicurezza Rigorosa</h4>
                <p className="text-xs text-[#D8C2E7] leading-relaxed">
                  Pennelli e postazione sanificati con sterilizzatore a raggi UV tra un appuntamento e il successivo.
                </p>
              </div>

              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#D8C2E7]">
                  <Heart className="w-5 h-5" />
                </div>
                <h4 className="font-serif font-bold text-base">Consulenza Sartoriale su Misura</h4>
                <p className="text-xs text-[#D8C2E7] leading-relaxed">
                  Non applichiamo un trucco standard: studiamo la luce, la forma del viso e il tuo stile per farti sentire al meglio.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
