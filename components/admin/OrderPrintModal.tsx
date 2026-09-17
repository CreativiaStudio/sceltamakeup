"use client";

import React from "react";
import Image from "next/image";
import { X, Printer, MapPin, Phone, Mail, ShoppingBag, Sparkles, CheckCircle2 } from "lucide-react";
import { SceltaAdminOrder } from "@/lib/adminStore";

interface OrderPrintModalProps {
  order: SceltaAdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderPrintModal({
  order,
  isOpen,
  onClose,
}: OrderPrintModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = order.fulfillmentType === "store_pickup" || order.total >= 49 ? 0 : 5.90;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-purple-100 flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Modal Top Bar (Hidden during print) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1F1B24] via-[#2D1637] to-[#1F1B24] text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#D8C2E7]" />
            <h2 className="font-serif text-base sm:text-lg font-bold">
              Bolla di Confezionamento & Ricevuta Ordine #{order.id}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] hover:shadow-md text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa Ricevuta</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Chiudi modale"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-order-receipt" className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-[#1F1B24]">
          {/* Header Brand & Boutique Info */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-200 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5E1788] text-white flex items-center justify-center font-serif font-bold text-xl">
                  S
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1F1B24] tracking-tight">
                    Scelta Makeup
                  </h1>
                  <p className="text-[11px] text-[#7A3293] uppercase font-semibold tracking-widest">
                    Atelier di Bellezza & Alta Cosmesi
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-light italic mt-1">
                &ldquo;L&apos;eleganza di essere autentica&rdquo;
              </p>
            </div>

            <div className="text-right text-xs text-gray-600 space-y-0.5">
              <div className="font-bold text-gray-900">Salone & Atelier Ufficiale Napoli</div>
              <div>Via dei Pellegrini 28/29, 80121 Napoli (NA)</div>
              <div>Tel / WhatsApp: +39 081 123 4567</div>
              <div>Email: salone@sceltamakeup.it</div>
            </div>
          </div>

          {/* Order Details & Customer Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#FAF7FC] p-5 rounded-2xl border border-[#D8C2E7]/40">
            {/* Order meta */}
            <div className="space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-[#7A3293] uppercase tracking-wider">
                Dati Documento
              </div>
              <div className="font-bold text-base text-[#1F1B24]">
                Ordine: <span className="font-mono text-[#5E1788]">{order.id}</span>
              </div>
              <div className="text-gray-600">
                Data ricezione: <strong>{formatDate(order.createdAt)}</strong>
              </div>
              <div className="text-gray-600">
                Canale:{" "}
                <span className="font-semibold text-gray-800">
                  {order.fulfillmentType === "courier"
                    ? `Corriere Espresso (${order.courierName || "BRT Express"})`
                    : "Ritiro Gratuito in Salone a Napoli"}
                </span>
              </div>
              {order.trackingCode && (
                <div className="text-gray-600 font-mono">
                  Codice Tracking: <strong>{order.trackingCode}</strong>
                </div>
              )}
            </div>

            {/* Customer meta */}
            <div className="space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-[#7A3293] uppercase tracking-wider">
                Destinatario & Recapiti
              </div>
              <div className="font-bold text-sm text-gray-900">
                {order.customerName}
              </div>
              <div className="text-gray-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{order.customerPhone}</span>
              </div>
              <div className="text-gray-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>{order.customerEmail}</span>
              </div>
              {order.shippingAddress ? (
                <div className="text-gray-700 flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {order.shippingAddress.street}, {order.shippingAddress.postalCode}{" "}
                    {order.shippingAddress.city} ({order.shippingAddress.province})
                  </span>
                </div>
              ) : (
                <div className="text-purple-800 font-medium">
                  Ritiro in sede concordato presso il salone di Napoli.
                </div>
              )}
            </div>
          </div>

          {/* Order Items Table */}
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-bold text-[#1F1B24] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#5E1788]" />
              <span>Dettaglio Articoli Confezionati ({order.items.length})</span>
            </h3>

            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4">Articolo</th>
                    <th className="py-2.5 px-3">Tonalità / Variante</th>
                    <th className="py-2.5 px-3 text-center">Quantità</th>
                    <th className="py-2.5 px-3 text-right">Prezzo Unit.</th>
                    <th className="py-2.5 px-4 text-right">Totale Riga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 relative overflow-hidden shrink-0">
                            <Image
                              src={item.image || "/brand/logo.png"}
                              alt={item.productTitle}
                              fill
                              className="object-contain p-0.5"
                              sizes="36px"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{item.productTitle}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Cod: {item.productId.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {item.variantName || "Standard"}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">
                        {formatEuro(item.price)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-gray-900">
                        {formatEuro(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals & Packaging Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start pt-2">
            {/* Packaging notes */}
            <div className="sm:col-span-7 bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs">
              <div className="font-bold text-[#5E1788] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D462A6]" />
                <span>Note per il Banco & Confezionamento:</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Includere nella scatola o shopper elegante <strong>n. 2 campioncini omaggio</strong> di alta profumeria/cosmesi e il bigliettino istituzionale Scelta Makeup con i ringraziamenti di Federica Cesiano.
              </p>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sigillo di garanzia di integrità e purezza formulativa verificato.</span>
              </div>
            </div>

            {/* Totals Table */}
            <div className="sm:col-span-5 bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotale Articoli:</span>
                <span className="font-mono font-semibold">{formatEuro(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Spedizione:</span>
                <span className="font-mono font-semibold">
                  {shippingCost === 0 ? "Gratuita (0,00 €)" : formatEuro(shippingCost)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-sm font-bold text-[#1F1B24]">
                <span>Totale Ordine:</span>
                <span className="font-serif text-lg text-[#5E1788]">
                  {formatEuro(order.total)}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 text-right">
                Importi comprensivi di IVA di legge al 22%
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center text-xs text-gray-400 pt-6 border-t border-gray-100">
            Grazie per aver scelto Scelta Makeup • Via dei Pellegrini 28/29, Napoli • www.sceltamakeup.it
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during print) */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-gray-500">
            Il layout è ottimizzato sia per la visualizzazione a schermo che per la stampa cartacea A4.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
            >
              Chiudi
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] hover:shadow-md text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa Ricevuta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
