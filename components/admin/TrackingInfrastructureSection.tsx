"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  Radio,
  Sparkles,
  Zap,
  Trash2,
  RefreshCw,
  Eye,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  Calendar,
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getTrackingConfig,
  getTrackingEvents,
  simulateTrackingEvent,
  clearTrackingEvents,
  resetTrackingEventsToDefault,
  TrackingEventRecord,
  TrackingEventName,
} from "@/lib/pixelTracker";

export default function TrackingInfrastructureSection() {
  const config = useMemo(() => getTrackingConfig(), []);
  const [events, setEvents] = useState<TrackingEventRecord[]>(() => getTrackingEvents());
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [lastSimulatedId, setLastSimulatedId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Subscribe to tracking events
  useEffect(() => {
    const handleEventUpdate = () => {
      setEvents(getTrackingEvents());
    };
    window.addEventListener("scelta_ecommerce_event", handleEventUpdate);
    return () => {
      window.removeEventListener("scelta_ecommerce_event", handleEventUpdate);
    };
  }, []);

  const handleSimulate = (name: TrackingEventName) => {
    const record = simulateTrackingEvent(name);
    setLastSimulatedId(record.id);
    setEvents(getTrackingEvents());
    setTimeout(() => {
      setLastSimulatedId(null);
    }, 2500);
  };

  const handleClear = () => {
    if (confirm("Vuoi cancellare lo storico locale degli eventi tracciati?")) {
      clearTrackingEvents();
      setEvents([]);
    }
  };

  const handleReset = () => {
    const seed = resetTrackingEventsToDefault();
    setEvents(seed);
  };

  const filteredEvents = useMemo(() => {
    if (selectedFilter === "all") return events;
    return events.filter((e) => e.eventName === selectedFilter);
  }, [events, selectedFilter]);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getEventBadge = (name: TrackingEventName) => {
    switch (name) {
      case "page_view":
        return { label: "page_view", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "view_item":
        return { label: "view_item", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "add_to_cart":
        return { label: "add_to_cart", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "remove_from_cart":
        return { label: "remove_from_cart", color: "bg-orange-50 text-orange-700 border-orange-200" };
      case "begin_checkout":
        return { label: "begin_checkout", color: "bg-purple-50 text-[#5E1788] border-purple-200" };
      case "purchase":
        return { label: "purchase", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "generate_lead":
        return { label: "generate_lead", color: "bg-pink-50 text-[#D462A6] border-pink-200" };
      default:
        return { label: name, color: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Tracking Summary */}
      <div className="bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] rounded-2xl p-6 text-white shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-[#D8C2E7] border border-white/20">
                Infrastruttura Tracciamento & Telemetria
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Pipeline Omnichannel Attiva
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight">
              Infrastruttura Tracciamento & Pixel E-Commerce
            </h2>
            <p className="text-xs text-[#D8C2E7] max-w-2xl">
              Stato dei connettori ufficiali Google Analytics 4, Google Tag Manager e Meta Conversions API (CAPI). Monitoraggio in tempo reale degli eventi di navigazione e acquisto del salone.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20 text-xs">
            <div className="text-right">
              <div className="text-[10px] text-[#D8C2E7] uppercase font-semibold">Eventi Tracciati</div>
              <div className="font-bold text-lg text-white">{events.length}</div>
            </div>
            <Activity className="w-5 h-5 text-emerald-300 ml-1" />
          </div>
        </div>
      </div>

      {/* 3 Provider Cards: GA4, GTM, Meta Pixel & CAPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Google Analytics 4 */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4 hover:border-[#5E1788]/30 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                GA4
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#1F1B24]">
                  Google Analytics 4
                </h3>
                <span className="text-[10px] text-gray-500">Enhanced E-Commerce v4</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Attivo
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                Measurement ID
              </span>
              <span className="font-mono font-bold text-sm text-[#5E1788] bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                {config.ga4MeasurementId}
              </span>
            </div>

            <div className="text-gray-600 text-[11px] leading-relaxed">
              <strong>Protocollo:</strong> {config.ga4Protocol}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Valuta Default:</span>
              <strong className="text-gray-800 font-mono">EUR (€)</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Google Tag Manager */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4 hover:border-[#5E1788]/30 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
                GTM
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#1F1B24]">
                  Google Tag Manager
                </h3>
                <span className="text-[10px] text-gray-500">Tag Container Web</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Operativo
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                Container ID
              </span>
              <span className="font-mono font-bold text-sm text-[#5E1788] bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                {config.gtmContainerId}
              </span>
            </div>

            <div className="text-gray-600 text-[11px] leading-relaxed">
              <strong>DataLayer:</strong> Iniezione automatica su <code className="text-[#5E1788] font-mono">window.dataLayer</code>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Stato Workspace:</span>
              <strong className="text-emerald-700 font-semibold">Live & Sincronizzato</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Meta Pixel & Conversions API */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4 hover:border-[#5E1788]/30 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5E1788] flex items-center justify-center font-bold text-sm">
                META
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#1F1B24]">
                  Meta Pixel & CAPI
                </h3>
                <span className="text-[10px] text-gray-500">Dataset + Server Gateway</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Doppio Canale
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                Dataset / Pixel ID
              </span>
              <span className="font-mono font-bold text-sm text-[#5E1788] bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                {config.metaPixelId}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <span>Qualità Corrispondenza (EMQ):</span>
              <span className="font-bold text-emerald-700 font-mono">
                {config.metaMatchQualityScore}/10 (Eccellente)
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>Deduplicazione Eventi:</span>
              <strong className="text-gray-800 font-semibold">Abilitata (event_id univoco)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Event Simulator Desk */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D462A6]" />
              <h3 className="font-serif text-base font-bold text-[#1F1B24]">
                Simulatore di Eventi E-Commerce Interattivo
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Clicca su un pulsante per emulare il dispatch istantaneo verso GA4, GTM e Meta CAPI con payload e-commerce reale.
            </p>
          </div>

          {lastSimulatedId && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-bounce">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Evento Simulato con Successo (200 OK)!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => handleSimulate("page_view")}
            className="p-3 rounded-xl border border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/50 transition-all text-left space-y-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Eye className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono text-gray-400">Step 1</span>
            </div>
            <div className="text-xs font-bold text-gray-900">Page View</div>
            <div className="text-[10px] text-gray-500 line-clamp-1">Visita Catalogo</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulate("view_item")}
            className="p-3 rounded-xl border border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/50 transition-all text-left space-y-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <ShoppingBag className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono text-gray-400">Step 2</span>
            </div>
            <div className="text-xs font-bold text-gray-900">View Item</div>
            <div className="text-[10px] text-gray-500 line-clamp-1">Rossetto Diego (€24.50)</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulate("add_to_cart")}
            className="p-3 rounded-xl border border-gray-200 hover:border-amber-400 bg-gray-50/50 hover:bg-amber-50/50 transition-all text-left space-y-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <ShoppingCart className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono text-gray-400">Step 3</span>
            </div>
            <div className="text-xs font-bold text-gray-900">Add To Cart</div>
            <div className="text-[10px] text-gray-500 line-clamp-1">Aggiunta Tonalità 01</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulate("begin_checkout")}
            className="p-3 rounded-xl border border-gray-200 hover:border-purple-400 bg-gray-50/50 hover:bg-purple-50/50 transition-all text-left space-y-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <CreditCard className="w-4 h-4 text-[#5E1788] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono text-gray-400">Step 4</span>
            </div>
            <div className="text-xs font-bold text-gray-900">Begin Checkout</div>
            <div className="text-[10px] text-gray-500 line-clamp-1">Avvio Cassa (€60.50)</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulate("purchase")}
            className="p-3 rounded-xl border border-gray-200 hover:border-emerald-400 bg-gray-50/50 hover:bg-emerald-50/50 transition-all text-left space-y-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono text-gray-400">Step 5</span>
            </div>
            <div className="text-xs font-bold text-gray-900">Purchase</div>
            <div className="text-[10px] text-gray-500 line-clamp-1">Ordine E-Commerce</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulate("generate_lead")}
            className="p-3 rounded-xl border border-gray-200 hover:border-pink-400 bg-gray-50/50 hover:bg-pink-50/50 transition-all text-left space-y-1.5 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Calendar className="w-4 h-4 text-[#D462A6] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono text-gray-400">Atelier</span>
            </div>
            <div className="text-xs font-bold text-gray-900">Generate Lead</div>
            <div className="text-[10px] text-gray-500 line-clamp-1">Prenotazione Make-up</div>
          </button>
        </div>
      </div>

      {/* Live Event Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5E1788]" />
              <h3 className="font-serif text-base font-bold text-[#1F1B24]">
                Registro Eventi Tracciati (Live Event Stream)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Eventi catturati dal browser e recapitati ai gateway cloud con protocollo HTTP 200.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedFilter === "all"
                    ? "bg-white text-[#5E1788] shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tutti ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter("purchase")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedFilter === "purchase"
                    ? "bg-white text-emerald-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Purchase
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter("add_to_cart")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedFilter === "add_to_cart"
                    ? "bg-white text-amber-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Add to Cart
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              title="Reimposta eventi demo"
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              title="Svuota registro eventi"
              className="p-2 rounded-xl border border-gray-200 hover:bg-rose-50 text-rose-600 text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Orario</th>
                <th className="py-3 px-4">Nome Evento</th>
                <th className="py-3 px-4">Canali & Destinazioni</th>
                <th className="py-3 px-4">Payload Sintesi</th>
                <th className="py-3 px-4">Stato Ricezione</th>
                <th className="py-3 px-4 text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nessun evento presente nel registro per il filtro selezionato.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((record) => {
                  const badge = getEventBadge(record.eventName);
                  const isExpanded = expandedRowId === record.id;
                  const isRecent = record.id === lastSimulatedId;

                  return (
                    <React.Fragment key={record.id}>
                      <tr
                        className={`hover:bg-gray-50/80 transition-colors ${
                          isRecent ? "bg-purple-50/60 font-medium" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                          {formatTime(record.timestamp)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {record.destinations.map((dest) => (
                              <span
                                key={dest}
                                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 uppercase"
                              >
                                {dest === "meta_pixel"
                                  ? "Pixel"
                                  : dest === "meta_capi"
                                  ? "CAPI"
                                  : dest.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate font-mono text-[11px] text-gray-600">
                          {record.payload.value
                            ? `Valore: €${record.payload.value} • ${
                                record.payload.items?.[0]?.item_name ||
                                record.payload.service_name ||
                                "Transazione"
                              }`
                            : record.payload.page_title || JSON.stringify(record.payload).slice(0, 45)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>200 OK</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : record.id)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                            aria-label="Visualizza JSON Payload"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={6} className="p-4 border-b border-gray-100">
                            <div className="p-3 bg-gray-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto">
                              <div className="text-gray-400 text-[10px] uppercase font-bold mb-1">
                                Event Payload (JSON) • ID: {record.id}
                              </div>
                              <pre>{JSON.stringify(record.payload, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
