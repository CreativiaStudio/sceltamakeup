"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, CheckCheck, Phone, BadgeCheck } from "lucide-react";
import { useWhatsAppModalStore } from "@/store/useWhatsAppModalStore";
import {
  WHATSAPP_DISPLAY_NUMBER,
  WHATSAPP_DEFAULT_MESSAGE,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";

const QUICK_PROMPTS = [
  "Salve, vorrei una consulenza sulla tonalità di fondotinta adatta a me",
  "Vorrei prenotare una seduta make-up in salone a Napoli",
  "Ho una domanda sulla disponibilità di un prodotto a catalogo",
  "Vorrei informazioni sui tempi di spedizione e consegna",
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const openChat = (message?: string) => {
    const text = message || typedMessage || WHATSAPP_DEFAULT_MESSAGE;
    window.open(buildWhatsAppUrl(text), "_blank", "noopener,noreferrer");
    onClose();
  };

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
                F
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif font-bold text-base leading-tight">
                  Federica Cesiano
                </h3>
                <BadgeCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <p className="text-xs text-white/80 font-light flex items-center gap-1">
                <span>Titolare Scelta Makeup</span>
                <span>•</span>
                <span className="text-emerald-200 font-medium">Online</span>
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

        {/* Official Number Banner */}
        <div className="bg-[#FAF7FC] border-b border-[#D8C2E7]/40 px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#5E1788]">
          <Phone className="w-4 h-4 text-[#7A3293] shrink-0" />
          <p className="font-light leading-snug">
            Numero ufficiale assistenza:{" "}
            <strong className="font-semibold">{WHATSAPP_DISPLAY_NUMBER}</strong>
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
                Come posso aiutarti oggi? Posso consigliarti le nuance perfette per il tuo incarnato, darti dettagli su un ordine o riservare il tuo appuntamento trucco in salone a Napoli.
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
                {typedMessage || WHATSAPP_DEFAULT_MESSAGE}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                <span>10:01</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-white border-t border-neutral-100">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Domande rapide per Federica:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => openChat(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#FAF7FC] hover:bg-[#5E1788] hover:text-white text-[#7A3293] border border-[#D8C2E7]/50 transition-colors cursor-pointer text-left truncate max-w-full"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Area */}
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
            onClick={() => openChat()}
            className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-md shadow-[#25D366]/30 transition-all cursor-pointer shrink-0"
            title="Invia su WhatsApp"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Primary CTA */}
        <div className="p-3 bg-[#FAF7FC] border-t border-neutral-100">
          <button
            type="button"
            onClick={() => openChat()}
            className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/25 transition-all cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Avvia Chat su WhatsApp con Federica</span>
          </button>
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
