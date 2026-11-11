"use client";

import React, { useRef } from "react";
import { X, Printer, Download, ExternalLink, Sparkles, AlertCircle } from "lucide-react";
import type { SceltaAdminOrder } from "@/lib/adminStore";

interface ShippingLabelModalProps {
  order: SceltaAdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShippingLabelModal({
  order,
  isOpen,
  onClose,
}: ShippingLabelModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  if (!isOpen || !order) return null;

  const reference = order.packlinkReference?.trim() || "";
  const pdfUrl = reference
    ? `/api/shipping/packlink/label-pdf?reference=${encodeURIComponent(reference)}`
    : null;

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      }
    } catch (e) {
      console.warn("Impossibile stampare direttamente da iframe:", e);
    }
    // Fallback
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `etichetta-${reference || order.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-purple-200 flex flex-col h-[92vh] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1F1B24] via-[#33133D] to-[#1F1B24] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5E1788] flex items-center justify-center text-white">
              <Printer className="w-4 h-4 text-[#D8C2E7]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-white tracking-tight">
                  Etichetta di Spedizione #{order.id}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Pronta per la Stampa
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 flex items-center gap-2 mt-0.5">
                <span>Corriere: <strong>{order.courierName || "Poste Italiane"}</strong></span>
                <span>•</span>
                <span>Rif. Packlink: <strong className="font-mono text-white">{reference}</strong></span>
                {order.trackingCode && (
                  <>
                    <span>•</span>
                    <span>Tracking: <strong className="font-mono text-emerald-300">{order.trackingCode}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] hover:opacity-95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa Subito</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Scarica PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recipient Ribbon */}
        {order.shippingAddress && (
          <div className="px-5 py-2.5 bg-purple-50/70 border-b border-purple-100 flex flex-wrap items-center justify-between text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#5E1788]">Destinatario:</span>
              <span className="font-medium text-gray-900">{order.customerName}</span>
              <span>—</span>
              <span className="text-gray-600">
                {order.shippingAddress.street}, {order.shippingAddress.postalCode} {order.shippingAddress.city} ({order.shippingAddress.province})
              </span>
            </div>
            <div className="text-[11px] text-gray-500">
              Tel: <strong className="text-gray-800">{order.customerPhone}</strong>
            </div>
          </div>
        )}

        {/* Embedded PDF Viewer */}
        <div className="flex-1 bg-gray-100 p-2 sm:p-4 overflow-hidden relative">
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full rounded-2xl bg-white shadow-inner border border-gray-300"
              title="Etichetta di Spedizione Corriere"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-gray-200">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <h3 className="text-sm font-bold text-gray-900">Nessuna etichetta disponibile</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                La spedizione per questo ordine non ha ancora un riferimento Packlink PRO associato.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
            <span>Stampa su foglio A4 o carta adesiva e incolla sul pacco senza coprire il codice a barre.</span>
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#5E1788] hover:text-[#7A3293] font-semibold text-[11px] flex items-center gap-1"
            >
              <span>Apri PDF in nuova scheda</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
