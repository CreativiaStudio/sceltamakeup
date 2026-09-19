import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowLeft, ShoppingBag, Truck, Undo2, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Termini e Condizioni di Vendita",
  description:
    "Condizioni generali di vendita e-commerce e prenotazione trattamenti Scelta Makeup: pagamenti sicuri Stripe, spedizioni corriere 24/48h e diritto di recesso.",
  openGraph: {
    title: "Termini e Condizioni di Vendita | Scelta Makeup",
    description:
      "Condizioni generali di vendita e-commerce e prenotazione trattamenti Scelta Makeup.",
  },
};

export default function TerminiCondizioniPage() {
  return (
    <div className="bg-[#FAF7FC] min-h-screen pt-32 pb-24 px-4 sm:px-6 text-[#1F1B24]">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-[#E8DEF8]/60">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Scale size={28} className="text-[#5E1788]" />
          <span className="text-xs font-semibold text-[#5E1788] uppercase tracking-[0.25em]">
            Condizioni Generali di Contratto &amp; Codice del Consumo
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-center font-bold tracking-tight text-[#1F1B24] mb-3">
          Termini e Condizioni di Vendita
        </h1>
        <p className="text-xs text-gray-500 text-center uppercase tracking-widest mb-10">
          Acquisti E-commerce &amp; Prenotazione Servizi Cabina
        </p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-8 font-light text-sm">
          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              1. Identificazione del Venditore
            </h2>
            <p>
              I prodotti e i servizi estetici presenti su questo sito sono venduti ed erogati direttamente da:
            </p>
            <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#E8DEF8] text-xs space-y-1.5 font-mono my-4 text-gray-800">
              <p><strong>Ditta Individuale:</strong> Cesiano Federica</p>
              <p><strong>Insegna:</strong> Scelta Makeup</p>
              <p><strong>Sede Legale &amp; Boutique:</strong> Via dei Pellegrini 28/29, 80132 Napoli (NA)</p>
              <p><strong>Email Assistenza:</strong> info@sceltamakeup.it</p>
              <p><strong>WhatsApp Ufficiale:</strong> +39 379 337 0322</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              2. Prodotti Cosmetici &amp; Prezzi
            </h2>
            <p>
              Scelta Makeup è rivenditore ufficiale e autorizzato di marchi di prestigio quali <strong>Diego della Palma Milano</strong>, <strong>Cipria Make Up</strong> e linee cosmetiche professionali. Tutti i prezzi pubblicati sul sito sono espressi in Euro (€) e si intendono <strong>comprensivi di IVA di legge</strong>. Le promozioni e i prezzi online possono differire dalle tariffe a banco fisico.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              3. Modalità di Pagamento Protette
            </h2>
            <p>
              Gli ordini possono essere saldati tramite il circuito internazionale sicuro <strong>Stripe</strong> con:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Carte di Credito e Debito (Visa, Mastercard, Maestro, American Express, PostePay) con 3D Secure 2.0.</li>
              <li>Apple Pay e Google Pay in un clic.</li>
              <li>Pagamento a rate a tasso zero tramite Klarna o Scalapay.</li>
              <li>Opzione Ritiro in Boutique a Napoli con saldo diretto in contanti o POS fisico al banco.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              4. Spedizioni &amp; Consegna
            </h2>
            <p>
              Le spedizioni vengono effettuate con corriere espresso in tutta Italia entro <strong>24/48 ore lavorative</strong> dall&apos;affidamento.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li><strong>Spedizione Gratuita:</strong> per tutti gli ordini pari o superiori a <strong>49,00 €</strong>.</li>
              <li><strong>Spedizione Standard:</strong> contributo fisso di 4,90 € per ordini inferiori a 49,00 €.</li>
              <li><strong>Ritiro Gratuito in Store:</strong> sempre gratuito presso il punto vendita in Via dei Pellegrini 28/29, Napoli.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              5. Prenotazioni Servizi Cabina &amp; Politica Acconti
            </h2>
            <p>
              Per i trattamenti estetici e le sessioni trucco personalizzate prenotate online:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>All&apos;atto della prenotazione è richiesto il versamento di un <strong>acconto confirmatorio del 20%</strong> con sconto esclusivo del 10% sul prezzo di listino.</li>
              <li>Il restante 80% verrà comodamente saldato in salone al termine della seduta.</li>
              <li><strong>Cancellazione o Spostamento Gratuito:</strong> consentito fino a <strong>24 ore prima</strong> dell&apos;orario concordato, contattando l&apos;assistenza al numero WhatsApp +39 379 337 0322 o via email. Per disdette pervenute con meno di 24 ore di preavviso o no-show, l&apos;acconto del 20% viene trattenuto a copertura dello slot riservato.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              6. Diritto di Recesso (Art. 52 Codice del Consumo)
            </h2>
            <p>
              Il Cliente ha diritto di recedere dal contratto di acquisto dei prodotti fisici entro <strong>14 giorni di calendario</strong> dal ricevimento della merce.
            </p>
            <div className="bg-[#FAF7FC] p-4 rounded-2xl border border-[#E8DEF8] my-3">
              <strong className="text-[#5E1788] text-xs uppercase tracking-wider block mb-1">
                Eccezione Igienico-Sanitaria per Cosmetici (Art. 59 lett. e Codice del Consumo):
              </strong>
              <p className="text-xs text-gray-600">
                Per motivi di tutela della salute e igiene, il diritto di recesso è rigorosamente <strong>escluso</strong> su prodotti cosmetici, profumi, rossetti, mascara, creme o trucchi che siano stati aperti, dissigillati, provati o privati dell&apos;involucro protettivo originale dopo la consegna.
              </p>
            </div>
            <p>
              I prodotti da restituire devono essere perfettamente integri, sigillati e nella loro confezione originale. Le spese di spedizione per la restituzione sono a carico del cliente.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              7. Foro Competente e Risoluzione Controversie
            </h2>
            <p>
              Il contratto di vendita è regolato dalla Legge Italiana. Per qualunque controversia civile tra professionista e consumatore, la competenza territoriale inderogabile è quella del giudice del luogo di residenza o di domicilio del consumatore, ai sensi del D.Lgs. 206/2005.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center border-t border-gray-100 pt-8">
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
