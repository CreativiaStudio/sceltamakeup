import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Informativa Cookie",
  description:
    "Informativa completa sull'utilizzo dei cookie tecnici, analitici e di funzionalità sul sito e-commerce Scelta Makeup.",
  openGraph: {
    title: "Informativa Cookie | Scelta Makeup",
    description:
      "Informativa completa sull'utilizzo dei cookie tecnici, analitici e di funzionalità sul sito e-commerce Scelta Makeup.",
  },
};

export default function CookiePolicyPage() {
  return (
    <div className="bg-[#FAF7FC] min-h-screen pt-32 pb-24 px-4 sm:px-6 text-[#1F1B24]">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-[#E8DEF8]/60">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Cookie size={28} className="text-[#5E1788]" />
          <span className="text-xs font-semibold text-[#5E1788] uppercase tracking-[0.25em]">
            Direttiva ePrivacy &amp; Linee Guida Garante Privacy
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-center font-bold tracking-tight text-[#1F1B24] mb-3">
          Cookie Policy
        </h1>
        <p className="text-xs text-gray-500 text-center uppercase tracking-widest mb-10">
          Informativa estesa sull&apos;uso dei Cookie e strumenti di tracciamento
        </p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-8 font-light text-sm">
          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              1. Cosa sono i Cookie
            </h2>
            <p>
              I cookie sono piccoli file di testo che i siti web visitati inviano al dispositivo dell&apos;utente (computer, tablet, smartphone), dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alle visite successive. Servono a garantire il corretto funzionamento delle pagine, memorizzare gli articoli nel carrello e migliorare l&apos;esperienza di navigazione.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              2. Tipologie di Cookie Utilizzati da Scelta Makeup
            </h2>
            <div className="space-y-4 mt-3">
              <div className="bg-[#FAF7FC] p-4 rounded-2xl border border-[#E8DEF8]">
                <h3 className="font-bold text-[#5E1788] text-sm mb-1">
                  A. Cookie Tecnici &amp; Strettamente Necessari (Sempre Attivi)
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Indispensabili per consentire la navigazione tra le pagine, la conservazione dei cosmetici aggiunti al carrello, il checkout sicuro con Stripe e la memorizzazione della scelta del consenso cookie. Ai sensi dell&apos;art. 122 del Codice Privacy, non richiedono il preventivo consenso dell&apos;utente.
                </p>
              </div>

              <div className="bg-[#FAF7FC] p-4 rounded-2xl border border-[#E8DEF8]">
                <h3 className="font-bold text-[#5E1788] text-sm mb-1">
                  B. Cookie Analitici e di Statistica (Anonimizzati o su Consenso)
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Utilizzati per raccogliere informazioni in forma aggregata sul numero dei visitatori e su come questi interagiscono con le schede prodotto (es. Diego della Palma Milano o Cipria Make Up), consentendoci di migliorare la qualità del catalogo e la velocità del sito.
                </p>
              </div>

              <div className="bg-[#FAF7FC] p-4 rounded-2xl border border-[#E8DEF8]">
                <h3 className="font-bold text-[#5E1788] text-sm mb-1">
                  C. Cookie di Funzionalità &amp; Preferenze
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Permettono di memorizzare le preferenze espresse dall&apos;utente (come la data selezionata per la prenotazione make-up in salone o il canale di consulenza).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              3. Come Gestire o Revocare le Tue Preferenze
            </h2>
            <p>
              Puoi modificare in qualsiasi momento le tue scelte cliccando sul pulsante{" "}
              <strong>&quot;Preferenze Cookie&quot;</strong> presente nel piè di pagina (Footer) del sito, oppure personalizzando le impostazioni del tuo browser per bloccare o cancellare i cookie.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              4. Contatti
            </h2>
            <p>
              Per qualunque domanda o chiarimento sul trattamento dei dati e sui cookie, puoi scrivere al Titolare del trattamento Cesiano Federica all&apos;indirizzo email:{" "}
              <a href="mailto:info@sceltamakeup.it" className="text-[#5E1788] font-medium underline">
                info@sceltamakeup.it
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-gray-100 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#5E1788] text-white px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#7A3293] transition-all shadow-md"
          >
            <ArrowLeft size={16} />
            <span>Torna all&apos;E-commerce</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
