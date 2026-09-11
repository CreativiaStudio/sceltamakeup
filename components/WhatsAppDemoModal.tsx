"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, CheckCheck, Sparkles, Phone, ShieldCheck } from "lucide-react";
import { useWhatsAppModalStore } from "@/store/useWhatsAppModalStore";

const QUICK_PROMPTS = [
  "Salve, vorrei una consulenza sulla tonalità di fondotinta adatta a me",
  "Vorrei prenotare una seduta make-up in boutique a Napoli",
  "Ho una domanda sulla disponibilità di un prodotto a catalogo",
  "Vorrei informazioni sui tempi di spedizione e consegna",
];

function WhatsAppModalDialog({
  initialMessage,
  sourceContext,
  onClose,
}: {
  initialMessage: string;
  sourceContext?: string;
  onClose: () => void;
}) {
  const [typedMessage, setTypedMessage] = useState(initialMessage);
  const [simulatedSent, setSimulatedSent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#D8C2E7]/60 z-10 flex flex-col max-h-[90vh]"
      >
        {/* Top Header - WhatsApp & Scelta Makeup Hybrid Style */}
        <div className="bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#25D366] p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-serif font-bold text-lg border border-white/40">
                S
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif font-bold text-base leading-tight">
                  Federica Cesiano
                </h3>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <p className="text-xs text-white/80 font-light flex items-center gap-1">
                <span>Scelta Makeup Boutique</span>
                <span>•</span>
                <span className="text-emerald-200 font-medium">Boutique Napoli</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Chiudi finestra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="bg-[#FAF7FC] border-b border-[#D8C2E7]/40 px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#5E1788]">
          <ShieldCheck className="w-4 h-4 text-[#7A3293] shrink-0" />
          <p className="font-light leading-snug">
            <strong className="font-semibold">Simulazione Assistenza Live:</strong> Il numero ufficiale WhatsApp di Federica verrà attivato al lancio dello store.
          </p>
        </div>

        {/* Chat Body - WhatsApp Aesthetic */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#EFEAE2]/30 min-h-[220px]">
          {/* Timestamp Pill */}
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-lg bg-white/80 backdrop-blur-xs text-[10px] uppercase tracking-wider text-neutral-500 font-medium shadow-2xs">
              Oggi • Assistenza Scelta Makeup
            </span>
          </div>

          {/* Incoming Message from Federica */}
          <div className="flex items-start gap-2 max-w-[85%]">
            <div className="bg-white p-3.5 rounded-2xl rounded-tl-xs shadow-xs border border-neutral-100 text-xs text-[#1F1B24] space-y-1.5">
              <p className="font-semibold text-[#5E1788]">
                Federica Cesiano — Scelta Makeup
              </p>
              <p className="text-neutral-700 leading-relaxed font-light">
                Ciao! ✨ Benvenuta nell&apos;assistenza ufficiale di <strong>Scelta Makeup</strong>.
              </p>
              <p className="text-neutral-700 leading-relaxed font-light">
                Come posso aiutarti oggi? Posso consigliarti le nuance perfette per il tuo incarnato, darti dettagli su un ordine o riservare il tuo appuntamento trucco in boutique a Napoli.
              </p>
              <span className="text-[10px] text-neutral-400 block text-right">
                10:00
              </span>
            </div>
          </div>

          {/* Outgoing Message Preview (Client) */}
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-xs text-[#1F1B24] max-w-[85%] space-y-1">
              {sourceContext && (
                <div className="text-[10px] font-semibold text-[#5E1788]/80 uppercase tracking-wider border-b border-[#25D366]/30 pb-1 mb-1">
                  Riferimento: {sourceContext}
                </div>
              )}
              <p className="leading-relaxed font-light">
                {typedMessage}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                <span>10:01</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
              </div>
            </div>
          </div>

          {simulatedSent && (
            <div className="flex items-start gap-2 max-w-[85%] animate-in fade-in duration-300">
              <div className="bg-white p-3 rounded-2xl rounded-tl-xs shadow-xs border border-neutral-100 text-xs text-[#1F1B24]">
                <p className="text-emerald-700 font-medium">
                  ✓ Messaggio simulato inviato! Al lancio ufficiale, questa azione aprirà istantaneamente l&apos;app WhatsApp reale sul cellulare o desktop.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-white border-t border-neutral-100">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Domande di esempio da provare:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setTypedMessage(prompt);
                  setSimulatedSent(false);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#FAF7FC] hover:bg-[#5E1788] hover:text-white text-[#7A3293] border border-[#D8C2E7]/50 transition-colors cursor-pointer text-left truncate max-w-full"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Simulated Input Area */}
        <div className="p-3 sm:p-4 bg-white border-t border-neutral-200/80 flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder="Scrivi un messaggio di assistenza..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm bg-neutral-100 border border-neutral-200 rounded-full text-[#1F1B24] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setSimulatedSent(true)}
            className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-md shadow-[#25D366]/30 transition-all cursor-pointer shrink-0"
            title="Invia simulazione"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Footer */}
        <div className="p-3 bg-[#FAF7FC] border-t border-neutral-100 text-center text-[11px] text-neutral-500 font-light flex items-center justify-center gap-2">
          <Phone className="w-3.5 h-3.5 text-[#5E1788]" />
          <span>Numero ufficiale boutique: <strong>In assegnazione da parte di Federica</strong></span>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppDemoModal() {
  const { isOpen, prefilledMessage, sourceContext, closeModal } =
    useWhatsAppModalStore();

  if (!isOpen) return null;

  return (
    <WhatsAppModalDialog
      key={`${isOpen}-${prefilledMessage}`}
      initialMessage={prefilledMessage}
      sourceContext={sourceContext}
      onClose={closeModal}
    />
  );
}
