import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Informativa sulla Privacy & GDPR",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) per Scelta Makeup. Trasparenza, sicurezza e tutela dei tuoi dati.",
  openGraph: {
    title: "Informativa sulla Privacy & GDPR | Scelta Makeup",
    description:
      "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) per Scelta Makeup.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#FAF7FC] min-h-screen pt-32 pb-24 px-4 sm:px-6 text-[#1F1B24]">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-[#E8DEF8]/60">
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldCheck size={28} className="text-[#5E1788]" />
          <span className="text-xs font-semibold text-[#5E1788] uppercase tracking-[0.25em]">
            Conformità Regolamento UE 2016/679 (GDPR)
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-center font-bold tracking-tight text-[#1F1B24] mb-3">
          Informativa sulla Privacy
        </h1>
        <p className="text-xs text-gray-500 text-center uppercase tracking-widest mb-10">
          Ultimo aggiornamento: Settembre 2026
        </p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-8 font-light text-sm">
          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              1. Titolare del Trattamento dei Dati
            </h2>
            <p>
              Il Titolare del trattamento dei dati personali raccolti attraverso il presente sito web ed e-commerce{" "}
              <strong>Scelta Makeup</strong> è:
            </p>
            <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#E8DEF8] text-xs space-y-1.5 font-mono my-4 text-gray-800">
              <p><strong>Ditta Individuale:</strong> Cesiano Federica</p>
              <p><strong>Brand / Insegna:</strong> Scelta Makeup</p>
              <p><strong>Sede Operativa &amp; Salone:</strong> Via dei Pellegrini 28/29, 80132 Napoli (NA) - Italia</p>
              <p><strong>Email di Contatto:</strong> info@sceltamakeup.it</p>
              <p><strong>Email Ufficiale:</strong> marketing@sceltamakeup.it</p>
              <p><strong>Assistenza WhatsApp:</strong> +39 379 337 0322</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              2. Tipologia di Dati Trattati
            </h2>
            <p>
              Scelta Makeup raccoglie e tratta esclusivamente i dati necessari per la gestione degli ordini e-commerce, delle prenotazioni dei servizi in atelier e per la corretta navigazione del sito:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Dati di Spedizione e Fatturazione:</strong> Nome, Cognome, Indirizzo di consegna, CAP, Città, Numero di Telefono ed Email per l&apos;invio della merce e delle ricevute contabili.</li>
              <li><strong>Dati di Prenotazione Servizi Cabina:</strong> Nome, Telefono ed eventuali note fornite spontaneamente per il servizio make-up o consulenza estetica richiesta.</li>
              <li><strong>Dati di Pagamento:</strong> Le transazioni elettroniche sono gestite in modo crittografato conforme a PCI-DSS tramite il gateway sicuro <strong>Stripe</strong>. Nessun dato relativo a numeri completi di carte di credito viene salvato sui nostri server.</li>
              <li><strong>Dati Tecnici di Navigazione:</strong> Indirizzo IP anonimizzato, log di sistema per la prevenzione frodi e sicurezza dell&apos;infrastruttura.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              3. Finalità e Base Giuridica del Trattamento
            </h2>
            <p>I dati personali vengono trattati nel rispetto dei principi di correttezza, liceità e trasparenza per le seguenti finalità:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Esecuzione del Contratto (Art. 6.1.b GDPR):</strong> Spedizione dei prodotti ordinati, ritiro in salone a Napoli ed erogazione dei trattamenti prenotati.</li>
              <li><strong>Adempimento di Obblighi di Legge (Art. 6.1.c GDPR):</strong> Emissione dello scontrino fiscale/documento commerciale di cassa RT Epson e adempimenti fiscali.</li>
              <li><strong>Notifiche Transazionali:</strong> Invio via email (Resend) e WhatsApp dei riepiloghi d&apos;ordine e dei promemoria appuntamento 24h prima per contrastare i no-show.</li>
              <li><strong>Legittimo Interesse (Art. 6.1.f GDPR):</strong> Tutela e sicurezza della piattaforma da accessi non autorizzati e abusi.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              4. Destinatari dei Dati e Terze Parti
            </h2>
            <p>Per l&apos;espletamento dei servizi, i dati possono essere comunicati a soggetti terzi di comprovata affidabilità:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Corrieri Espressi e Vettori Logistici:</strong> per la consegna a domicilio dei prodotti cosmetici.</li>
              <li><strong>Fornitori di Servizi Tecnologici:</strong> Vercel (hosting e CDN del sito), Supabase (database isolato e protetto), Stripe (infrastruttura di pagamento), Resend (posta transazionale).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              5. Periodo di Conservazione dei Dati
            </h2>
            <p>
              I dati contabili e di fatturazione sono conservati per 10 anni in ottemperanza agli obblighi civilistici e fiscali italiani. I dati di contatto per prenotazioni e notifiche ordini vengono conservati per il tempo strettamente necessario all&apos;esecuzione del servizio.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-lg font-bold text-[#5E1788] uppercase tracking-wider mb-2">
              6. Diritti dell&apos;Interessato (Artt. 15-22 GDPR)
            </h2>
            <p>
              In ogni momento puoi esercitare i tuoi diritti: accesso ai dati, rettifica, cancellazione (diritto all&apos;oblio), limitazione del trattamento, portabilità dei dati o revoca del consenso inviando una comunicazione a:{" "}
              <a href="mailto:info@sceltamakeup.it" className="text-[#5E1788] font-medium underline">
                info@sceltamakeup.it
              </a>.
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
