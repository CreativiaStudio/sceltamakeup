"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  X,
} from "lucide-react";
import { updateOrderTracking, type SceltaAdminOrder } from "@/lib/adminStore";
import type { PacklinkNormalizedStatus, PacklinkTracking } from "@/lib/packlink";
import {
  getCourierTrackingUrl,
  isPacklinkReference,
  resolveCarrierTrackingCode,
} from "@/lib/trackingUtils";

interface OrderTrackingModalProps {
  order: SceltaAdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: (updated: SceltaAdminOrder) => void;
}

const STATUS_BADGES: Record<
  PacklinkNormalizedStatus,
  { label: string; className: string }
> = {
  created: {
    label: "Etichetta creata · In attesa di ritiro",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  in_transit: {
    label: "In transito",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  out_for_delivery: {
    label: "In consegna oggi",
    className: "bg-purple-50 text-[#5E1788] border-[#D8C2E7]",
  },
  delivered: {
    label: "Consegnato",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  exception: {
    label: "Avviso / Giacenza corriere",
    className: "bg-rose-50 text-rose-800 border-rose-200",
  },
  unknown: {
    label: "In aggiornamento",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderTrackingModal({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}: OrderTrackingModalProps) {
  const packlinkRef = order?.packlinkReference?.trim() ?? "";
  const [tracking, setTracking] = useState<PacklinkTracking | null>(null);
  const [loading, setLoading] = useState(Boolean(isOpen && packlinkRef));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onOrderUpdatedRef = useRef(onOrderUpdated);
  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
  }, [onOrderUpdated]);

  const applyTrackingResponse = useCallback(
    (
      targetOrder: SceltaAdminOrder,
      ref: string,
      ok: boolean,
      data: { success?: boolean; error?: string; tracking?: PacklinkTracking }
    ) => {
      if (!ok || !data.success || !data.tracking) {
        setError(data.error || "Impossibile recuperare gli aggiornamenti da Packlink.");
        return;
      }

      setError(null);
      setTracking(data.tracking);

      const liveCode = data.tracking.trackingNumber?.trim();
      const needsSync =
        Boolean(liveCode) &&
        !isPacklinkReference(liveCode) &&
        (!targetOrder.trackingCode ||
          targetOrder.trackingCode === targetOrder.packlinkReference ||
          isPacklinkReference(targetOrder.trackingCode));

      if (needsSync && liveCode) {
        try {
          const updated = updateOrderTracking(
            targetOrder.id,
            liveCode,
            data.tracking.carrier || targetOrder.courierName,
            ref
          );
          onOrderUpdatedRef.current?.(updated);
        } catch {
          // ignore local store sync error if order is only server-side
        }
      }
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    if (!order || !packlinkRef) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        reference: packlinkRef,
        orderId: order.id,
      });
      const res = await fetch(`/api/shipping/packlink?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        tracking?: PacklinkTracking;
      };
      applyTrackingResponse(order, packlinkRef, res.ok, data);
    } catch {
      setError("Errore di rete nel recupero del tracciamento.");
    } finally {
      setLoading(false);
    }
  }, [order, packlinkRef, applyTrackingResponse]);

  useEffect(() => {
    if (!isOpen || !order || !packlinkRef) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      reference: packlinkRef,
      orderId: order.id,
    });
    fetch(`/api/shipping/packlink?${qs.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          tracking?: PacklinkTracking;
        };
        return { ok: res.ok, data };
      })
      .then(({ ok, data }) => {
        if (cancelled) return;
        applyTrackingResponse(order, packlinkRef, ok, data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Errore di rete nel recupero del tracciamento.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, order, packlinkRef, applyTrackingResponse]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const carrierCode = resolveCarrierTrackingCode(order, tracking?.trackingNumber);
  const courier =
    order.courierName ||
    tracking?.carrier ||
    (carrierCode ? "Poste Italiane" : "Corriere Espresso");
  const trackingUrl = carrierCode ? getCourierTrackingUrl(courier, carrierCode) : "";
  const statusInfo = tracking
    ? STATUS_BADGES[tracking.status] ?? STATUS_BADGES.unknown
    : null;

  const handleCopyCode = () => {
    const valueToCopy = carrierCode || packlinkRef || order.trackingCode || "";
    if (!valueToCopy) return;
    navigator.clipboard?.writeText(valueToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#D8C2E7]/60 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-[#F3D9F1]" />
            </div>
            <div className="min-w-0">
              <h2
                id="tracking-modal-title"
                className="font-serif text-base sm:text-lg font-bold truncate"
              >
                Dov&apos;è il pacco · #{order.id}
              </h2>
              <p className="text-[11px] text-[#F3D9F1]/90 truncate">
                {order.customerName} · {courier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {packlinkRef && (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                title="Aggiorna stato dal corriere"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Aggiorna</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              aria-label="Chiudi pop-up tracciamento"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#1F1B24]">
          {/* Carrier & Code Summary */}
          <div className="rounded-2xl border border-[#D8C2E7]/60 bg-[#FAF7FC] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A3293]">
                  Codice Tracciamento {courier}
                </p>
                {carrierCode ? (
                  <p className="mt-0.5 font-mono text-base font-bold text-[#5E1788]">
                    {carrierCode}
                  </p>
                ) : (
                  <p className="mt-0.5 font-mono text-sm font-semibold text-gray-600">
                    {packlinkRef || order.trackingCode || "In attesa di assegnazione"}
                  </p>
                )}
              </div>

              {(carrierCode || packlinkRef || order.trackingCode) && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#D8C2E7] hover:bg-purple-50 text-xs font-semibold text-[#5E1788] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiato</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copia codice</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {packlinkRef && carrierCode && packlinkRef !== carrierCode && (
              <p className="text-[11px] text-gray-500">
                Riferimento Packlink PRO:{" "}
                <span className="font-mono font-medium text-gray-700">{packlinkRef}</span>
              </p>
            )}

            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-opacity flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Apri su {courier} (codice già inserito)</span>
              </a>
            )}
          </div>

          {/* Live Packlink Status & Timeline */}
          {packlinkRef ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#5E1788]" />
                  <span>Stato Spedizione Live</span>
                </h3>
                {statusInfo && (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                )}
              </div>

              {loading && !tracking ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#5E1788] bg-gray-50 rounded-2xl border border-gray-100">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recupero posizione pacco in corso...</span>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                  {error}
                </div>
              ) : tracking && tracking.events.length > 0 ? (
                <ul className="space-y-4 border-l-2 border-[#D8C2E7] pl-5 py-1">
                  {tracking.events.map((ev, idx) => (
                    <li key={`${ev.date}-${idx}`} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                          idx === 0 ? "bg-[#D462A6]" : "bg-[#7A3293]"
                        }`}
                      />
                      <p className="text-xs font-semibold text-[#1F1B24]">{ev.description}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <span>{formatDateTime(ev.date)}</span>
                        {ev.city && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5 text-[#5E1788] font-medium">
                              <MapPin className="w-3 h-3" />
                              {ev.city}
                            </span>
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
                  La spedizione è registrata ma il corriere non ha ancora pubblicato scansioni di transito.
                  {trackingUrl
                    ? " Puoi controllare subito sul portale ufficiale con il pulsante qui sopra."
                    : ""}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed">
              Spedizione inserita manualmente (senza Packlink PRO). Usa il pulsante qui sopra per
              vedere subito la posizione del pacco direttamente sul portale ufficiale di{" "}
              <strong className="text-[#1F1B24]">{courier}</strong> con il codice già precompilato.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
