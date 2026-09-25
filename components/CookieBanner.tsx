"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Settings, Check, X, Lock } from "lucide-react";

export function generateId(prefix: string) {
  return prefix + "_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [visitorId, setVisitorId] = useState<string>("");
  const [consentId, setConsentId] = useState<string>("");

  // Categorie di consenso GDPR (Opt-in esplicito disattivato di default per legge)
  const [categories, setCategories] = useState({
    essential: true,   // Sempre attivo per funzionamento carrello & sicurezza
    functional: false, // Disattivato di default (Opt-in)
    analytics: false,  // Disattivato di default (Opt-in)
    marketing: false,  // Disattivato di default (Opt-in)
  });

  useEffect(() => {
    // Inizializzazione client-side one-shot: localStorage non è disponibile in SSR,
    // quindi i setState avvengono qui al mount (pattern SSR-safe controllato).
    /* eslint-disable react-hooks/set-state-in-effect */
    // 1. Inizializza o recupera Visitor ID
    let currentVid = localStorage.getItem("scelta_visitor_id");
    if (!currentVid) {
      currentVid = generateId("vid");
      localStorage.setItem("scelta_visitor_id", currentVid);
    }
    setVisitorId(currentVid);

    // 2. Inizializza o recupera Consent ID & scelte
    const savedConsent = localStorage.getItem("scelta_cookie_consent");
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsentId(parsed.consentId || generateId("csnt"));
        if (parsed.categories) {
          setCategories(parsed.categories);
        }
      } catch {
        setShowBanner(true);
      }
    } else {
      const newCid = generateId("csnt");
      setConsentId(newCid);
      setShowBanner(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    // 3. Listener globale per consentire la riapertura del banner da link nel footer ("Preferenze Cookie")
    const handleReopen = () => {
      setShowModal(true);
    };
    window.addEventListener("open_cookie_preferences", handleReopen);
    return () => window.removeEventListener("open_cookie_preferences", handleReopen);
  }, []);

  const saveConsent = async (type: "all" | "essential" | "custom", customCategories?: typeof categories) => {
    const finalCategories = customCategories || (
      type === "all"
        ? { essential: true, functional: true, analytics: true, marketing: true }
        : type === "essential"
        ? { essential: true, functional: false, analytics: false, marketing: false }
        : categories
    );

    const activeCid = consentId || generateId("csnt");
    const activeVid = visitorId || localStorage.getItem("scelta_visitor_id") || generateId("vid");

    const consentData = {
      consentId: activeCid,
      visitorId: activeVid,
      categories: finalCategories,
      consentType: type,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    // Salva localmente
    localStorage.setItem("scelta_cookie_consent", JSON.stringify(consentData));
    localStorage.setItem("scelta_consent_id", activeCid);
    localStorage.setItem("scelta_visitor_id", activeVid);

    // Aggiorna stato UI
    setCategories(finalCategories);
    setShowBanner(false);
    setShowModal(false);

    // Emetti evento globale per i tracker
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("scelta_cookie_consent", { detail: consentData }));
    }

    // Invia al server (Registrazione Legale del Consenso GDPR)
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentData),
      });
    } catch (err) {
      console.warn("Errore salvataggio consenso server-side:", err);
    }
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* 0. OVERLAY MORBIDO DI SFONDO */}
      {(showBanner || showModal) && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* 1. BANNER PRINCIPALE DI PRIMO LIVELLO (LUSSO & COMPATTO) */}
      {showBanner && !showModal && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 bg-[#1F1B24]/95 backdrop-blur-md border-t border-[#D462A6]/40 text-white shadow-2xl transition-all duration-500 animate-slide-up">
          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-5">
            
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck size={18} className="text-[#D462A6]" />
                <h4 className="font-serif text-base sm:text-lg text-white uppercase tracking-wider font-semibold">
                  Privacy &amp; Consenso Cookie
                </h4>
              </div>
              <p className="font-sans text-gray-300 text-xs leading-relaxed font-light tracking-wide max-w-4xl">
                Scelta Makeup utilizza cookie tecnici indispensabili per il funzionamento dell&apos;e-commerce e del carrello, e previo tuo consenso, cookie analitici e di profilazione per offrirti un&apos;esperienza su misura (Regolamento UE 2016/679 GDPR). Consulta la nostra{" "}
                <Link href="/privacy-policy" className="text-[#D462A6] underline hover:text-white transition">Privacy Policy</Link> e la{" "}
                <Link href="/cookie-policy" className="text-[#D462A6] underline hover:text-white transition">Cookie Policy</Link>.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto bg-transparent border border-white/20 hover:border-[#D462A6] text-gray-300 hover:text-white text-[11px] uppercase tracking-[0.2em] px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings size={14} />
                <span>Personalizza</span>
              </button>

              <button
                type="button"
                onClick={() => saveConsent("essential")}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-[11px] uppercase tracking-[0.2em] px-5 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X size={14} />
                <span>Solo Tecnici</span>
              </button>

              <button
                type="button"
                onClick={() => saveConsent("all")}
                className="w-full sm:w-auto bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#9242AD] text-white text-[11px] uppercase tracking-[0.2em] px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-lg shadow-[#5E1788]/30 cursor-pointer"
              >
                <Check size={14} />
                <span>Accetta Tutti</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. MODALE DI PERSONALIZZAZIONE GRANULARE SECONDO LIVELLO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#1F1B24] border border-[#5E1788]/60 rounded-3xl p-6 sm:p-8 text-white shadow-2xl max-h-[90vh] flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={22} className="text-[#D462A6]" />
                  <h3 className="font-serif text-lg sm:text-xl uppercase tracking-wider font-semibold">
                    Centro Preferenze Privacy &amp; Cookie
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white p-1 transition"
                  aria-label="Chiudi finestra"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-gray-300 text-xs font-light leading-relaxed mb-6">
                Rispettiamo la tua privacy. Puoi scegliere liberamente quali categorie di cookie attivare. I cookie tecnici essenziali non possono essere disattivati in quanto necessari per la sicurezza, il carrello e la prenotazione dei servizi.
              </p>

              <div className="space-y-4 overflow-y-auto max-h-[45vh] pr-2">
                
                {/* 1. Essenziali */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-white">Cookie Tecnici &amp; Necessari</span>
                      <span className="text-[10px] bg-[#5E1788]/40 text-[#D8C2E7] border border-[#5E1788] px-2 py-0.5 rounded-full uppercase font-mono">
                        Sempre Attivi
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      Indispensabili per consentire la navigazione, il carrello acquisti e il checkout sicuro con Stripe. Non memorizzano informazioni personali a fini commerciali.
                    </p>
                  </div>
                  <div className="p-2 text-gray-500">
                    <Lock size={18} />
                  </div>
                </div>

                {/* 2. Funzionali */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="font-medium text-sm text-white block mb-1">Cookie di Funzionalità</span>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      Permettono al sito di ricordare le tue scelte (es. operatore preferito per il trucco in atelier, filtri catalogo) per offrirti un&apos;esperienza personalizzata.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={categories.functional}
                      onChange={(e) => setCategories({ ...categories, functional: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5E1788]"></div>
                  </label>
                </div>

                {/* 3. Analitici */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="font-medium text-sm text-white block mb-1">Cookie Analitici &amp; Statistiche</span>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      Ci consentono di comprendere quante persone visitano il sito e quali prodotti cosmetici sono più apprezzati, in forma rigorosamente aggregata e anonima.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={categories.analytics}
                      onChange={(e) => setCategories({ ...categories, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5E1788]"></div>
                  </label>
                </div>

                {/* 4. Marketing */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="font-medium text-sm text-white block mb-1">Marketing &amp; Profilazione</span>
                    <p className="text-gray-400 text-xs font-light leading-relaxed">
                      Utilizzati per presentare annunci pubblicitari pertinenti e promozioni speciali sulle nuove uscite Diego della Palma e Cipria Make Up.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={categories.marketing}
                      onChange={(e) => setCategories({ ...categories, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5E1788]"></div>
                  </label>
                </div>

              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/10 mt-6">
              <button
                type="button"
                onClick={() => saveConsent("essential")}
                className="w-full sm:w-auto bg-transparent border border-white/20 hover:border-white text-gray-300 hover:text-white text-xs uppercase tracking-wider px-5 py-3 rounded-xl font-medium transition cursor-pointer"
              >
                Rifiuta Non Necessari
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => saveConsent("custom")}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-wider px-5 py-3 rounded-xl font-medium transition cursor-pointer"
                >
                  Salva Preferenze
                </button>

                <button
                  type="button"
                  onClick={() => saveConsent("all")}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#9242AD] text-white text-xs uppercase tracking-wider px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-[#5E1788]/30 cursor-pointer"
                >
                  Accetta Tutti
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
