"use client";

/**
 * Scelta Makeup — Modal QR Code & Stampa Locandina
 * Module: components/admin/QrCodeLocandinaModal.tsx
 *
 * Genera il QR Code ad alta risoluzione (1024px) in stile Scelta Makeup (#5E1788)
 * e permette di:
 * 1. Scaricare il file PNG per grafiche/locandine
 * 2. Stampare subito la locandina A4 con istruzioni
 * 3. Condividere il link su WhatsApp o copiarlo
 */

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Sparkles,
  QrCode as QrIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { PromoCoupon } from "@/types/coupon";

interface QrCodeLocandinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: PromoCoupon | null;
}

export default function QrCodeLocandinaModal({
  isOpen,
  onClose,
  coupon,
}: QrCodeLocandinaModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const targetUrl = typeof window !== "undefined" && coupon
    ? `${window.location.origin}/promo/${coupon.slug || coupon.code.toLowerCase()}`
    : "";

  useEffect(() => {
    if (!coupon || !isOpen) return;

    const generateQr = async () => {
      try {
        const urlToEncode = `https://www.sceltamakeup.it/promo/${coupon.slug || coupon.code.toLowerCase()}`;

        const dataUrl = await QRCode.toDataURL(urlToEncode, {
          width: 1024,
          margin: 2,
          color: {
            dark: "#5E1788", // Royal purple ufficiale Scelta Makeup
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H",
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("Errore generazione QR code:", err);
      }
    };

    generateQr();
  }, [coupon, isOpen]);

  const handleCopyLink = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl || !coupon) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QRCode_SceltaMakeup_${coupon.code}_Locandina.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleWhatsAppShare = () => {
    if (!coupon || !targetUrl) return;
    const msg = `Ciao cara! Ecco il tuo link speciale per ${coupon.name} su Scelta Makeup:\n${targetUrl}\n\nInquadra o clicca per attivare subito la promozione! ✨\nFederica - Scelta Makeup Napoli`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !coupon) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#D8C2E7]/70 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#5E1788] flex items-center justify-center font-bold">
              <QrIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#1F1B24]">
                QR Code Ufficiale Locandina
              </h3>
              <p className="text-xs text-neutral-500">
                Pronto per grafiche, volantini, vetrine e stampa salone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Presentation Box */}
        <div
          ref={printRef}
          className="p-6 rounded-3xl bg-gradient-to-b from-[#FAF7FC] to-white border border-[#D8C2E7]/60 text-center space-y-4"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A3293]">
              SCELTA MAKEUP • SALONE NAPOLI
            </span>
            <h4 className="font-serif text-lg font-bold text-[#1F1B24]">
              {coupon.headline || coupon.name}
            </h4>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/70 text-[#5E1788] text-xs font-mono font-bold">
              Codice: {coupon.code} • Sconto:{" "}
              {coupon.discountValue > 0
                ? coupon.discountType === "percentage"
                  ? `${coupon.discountValue}%`
                  : `€${coupon.discountValue.toFixed(2)}`
                : "Prezzo Speciale"}
            </div>
          </div>

          {/* QR Container */}
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-neutral-200 inline-block mx-auto">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={`QR Code ${coupon.code}`}
                width={240}
                height={240}
                className="w-52 h-52 sm:w-60 sm:h-60 mx-auto"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-xs text-neutral-400">
                Generazione QR...
              </div>
            )}
          </div>

          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Inquadra con la fotocamera del tuo smartphone per aprire la pagina con i prodotti selezionati e lo sconto attivo!
          </p>

          <div className="pt-2 text-[11px] text-neutral-400 font-mono truncate max-w-xs sm:max-w-md mx-auto">
            {targetUrl}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!qrDataUrl}
            className="p-3 rounded-2xl bg-[#5E1788] text-white text-xs font-bold hover:bg-[#7A3293] transition-all flex flex-col items-center justify-center gap-1.5 shadow-md shadow-purple-900/10 cursor-pointer disabled:opacity-50"
            title="Scarica file PNG alta risoluzione 1024x1024 per il grafico"
          >
            <Download className="w-4 h-4" />
            <span>Scarica PNG</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="p-3 rounded-2xl bg-white border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-neutral-600" />
            )}
            <span>{copied ? "Copiato!" : "Copia Link"}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Invia WhatsApp</span>
          </button>

          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-white border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-neutral-600" />
            <span>Apri Pagina</span>
          </a>
        </div>
      </div>
    </div>
  );
}
