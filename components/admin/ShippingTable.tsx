"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Truck,
  Store,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Clock,
  Save,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Printer,
} from "lucide-react";
import {
  getAdminOrders,
  updateOrderTracking,
  updateOrderStatus,
  SceltaAdminOrder,
} from "@/lib/adminStore";
import {
  getCourierTrackingUrl,
  getWhatsAppTrackingMessage,
  getWhatsAppDirectUrl,
  resolveCarrierTrackingCode,
} from "@/lib/trackingUtils";
import ShippingLabelModal from "./ShippingLabelModal";
import OrderTrackingModal from "@/components/orders/OrderTrackingModal";

const PACKLINK_PRO_URL = "https://pro.packlink.it/private/shipments";

const COURIER_OPTIONS = [
  { value: "Poste Italiane", label: "Poste Italiane / SDA" },
  { value: "BRT Express", label: "BRT Express" },
  { value: "GLS Italy", label: "GLS Italy" },
  { value: "DHL Express", label: "DHL Express" },
  { value: "UPS", label: "UPS" },
  { value: "InPost", label: "InPost" },
] as const;

export default function ShippingTable() {
  const [orders, setOrders] = useState<SceltaAdminOrder[]>(() => getAdminOrders());
  const [channelTab, setChannelTab] = useState<"all" | "courier" | "store_pickup">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>(() => {
    const initialTrk: Record<string, string> = {};
    for (const o of getAdminOrders()) {
      if (o.trackingCode) initialTrk[o.id] = o.trackingCode;
    }
    return initialTrk;
  });
  const [courierInputs, setCourierInputs] = useState<Record<string, string>>(() => {
    const initialCour: Record<string, string> = {};
    for (const o of getAdminOrders()) {
      if (o.courierName) initialCour[o.id] = o.courierName;
    }
    return initialCour;
  });
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [savedTrackingId, setSavedTrackingId] = useState<string | null>(null);
  const [packlinkLoadingId, setPacklinkLoadingId] = useState<string | null>(null);
  const [activeLabelOrder, setActiveLabelOrder] = useState<SceltaAdminOrder | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<SceltaAdminOrder | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleStoreUpdate = () => {
      const list = getAdminOrders();
      setOrders(list);
      const updatedTrk: Record<string, string> = {};
      const updatedCour: Record<string, string> = {};
      for (const o of list) {
        if (o.trackingCode) updatedTrk[o.id] = o.trackingCode;
        if (o.courierName) updatedCour[o.id] = o.courierName;
      }
      setTrackingInputs((prev) => ({ ...updatedTrk, ...prev }));
      setCourierInputs((prev) => ({ ...updatedCour, ...prev }));
    };

    window.addEventListener("scelta_admin_store_updated", handleStoreUpdate);
    window.addEventListener("scelta_admin_store_reset", handleStoreUpdate);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", handleStoreUpdate);
      window.removeEventListener("scelta_admin_store_reset", handleStoreUpdate);
    };
  }, []);

  const handleCopyAddress = (order: SceltaAdminOrder) => {
    if (!order.shippingAddress) return;
    const formatted = `${order.customerName}\n${order.shippingAddress.street}\n${order.shippingAddress.postalCode} ${order.shippingAddress.city} (${order.shippingAddress.province})\nItalia\nTel: ${order.customerPhone}`;
    navigator.clipboard.writeText(formatted);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleSaveTracking = (orderId: string) => {
    const code = (trackingInputs[orderId] || "").trim();
    if (!code) {
      alert("Inserisci un codice di tracking valido");
      return;
    }
    const courier = courierInputs[orderId] || "BRT Express";

    try {
      updateOrderTracking(orderId, code, courier);
      setOrders(getAdminOrders());
      setSavedTrackingId(orderId);
      setTimeout(() => setSavedTrackingId(null), 2500);
    } catch (err) {
      console.error("Errore salvataggio tracking:", err);
    }
  };

  const handleCreatePacklink = async (orderId: string) => {
    setPacklinkLoadingId(orderId);
    try {
      const res = await fetch("/api/shipping/packlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        mock?: boolean;
        shipment?: { reference: string; carrier: string; trackingCode: string };
      };

      if (!res.ok || !data.success || !data.shipment) {
        setToast({ message: data.error || "Creazione spedizione Packlink non riuscita", type: "error" });
        return;
      }

      const { reference, carrier, trackingCode } = data.shipment;
      updateOrderTracking(orderId, trackingCode, carrier, reference);
      setOrders(getAdminOrders());
      setTrackingInputs((prev) => ({ ...prev, [orderId]: trackingCode }));
      setCourierInputs((prev) => ({ ...prev, [orderId]: carrier }));
      setToast(
        data.mock
          ? {
              message: `Packlink non raggiungibile: generata spedizione di prova ${reference}`,
              type: "warning",
            }
          : { message: `Spedizione Packlink creata (${carrier}) · Rif. ${reference}`, type: "success" }
      );
    } catch (err) {
      console.error("Errore creazione spedizione Packlink:", err);
      setToast({ message: "Errore di rete durante la creazione della spedizione", type: "error" });
    } finally {
      setPacklinkLoadingId(null);
    }
  };



  const handleCompleteCourierOrder = (orderId: string) => {
    try {
      updateOrderStatus(orderId, "completed");
      setOrders(getAdminOrders());
      setToast({ message: "Ordine chiuso e segnato come completato", type: "success" });
    } catch (err) {
      console.error("Errore chiusura ordine:", err);
      setToast({ message: "Impossibile chiudere l'ordine: riprova", type: "error" });
    }
  };

  const handlePickupStatus = (orderId: string, status: "ready_for_pickup" | "completed") => {
    try {
      updateOrderStatus(orderId, status);
      setOrders(getAdminOrders());
    } catch (err) {
      console.error("Errore aggiornamento stato ritiro:", err);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((o) => {
      if (channelTab !== "all" && o.fulfillmentType !== channelTab) {
        return false;
      }
      if (q) {
        const matchId = o.id.toLowerCase().includes(q);
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchCity = o.shippingAddress?.city.toLowerCase().includes(q) || false;
        const matchTrk = o.trackingCode?.toLowerCase().includes(q) || false;
        if (!matchId && !matchName && !matchCity && !matchTrk) {
          return false;
        }
      }
      return true;
    });
  }, [orders, channelTab, searchQuery]);

  const courierPendingCount = orders.filter(
    (o) => o.fulfillmentType === "courier" && o.status === "processing"
  ).length;

  const pickupReadyCount = orders.filter(
    (o) => o.fulfillmentType === "store_pickup" && o.status === "ready_for_pickup"
  ).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : toast.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-300"
                : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Banco Spedizioni & Ritiro in Salone
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Logistica Operativa
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestione lettere di vettura corriere (BRT/GLS/Poste), copia indirizzo 1-click e preparazione pacchetti per ritiro in negozio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 font-medium">
            <Truck className="w-3.5 h-3.5 text-amber-700" />
            <span>Da Spedire: <strong>{courierPendingCount}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 text-[#5E1788] font-medium">
            <Store className="w-3.5 h-3.5 text-[#5E1788]" />
            <span>Pronti in Store: <strong>{pickupReadyCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Channel Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChannelTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channelTab === "all"
                  ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tutti ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setChannelTab("courier")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                channelTab === "courier"
                  ? "bg-white text-blue-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Corriere Espresso ({orders.filter((o) => o.fulfillmentType === "courier").length})</span>
            </button>
            <button
              type="button"
              onClick={() => setChannelTab("store_pickup")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                channelTab === "store_pickup"
                  ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Store className="w-3.5 h-3.5 text-[#5E1788]" />
              <span>Ritiro Salone ({orders.filter((o) => o.fulfillmentType === "store_pickup").length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca ordine, cliente, città o tracking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
            />
          </div>
        </div>
      </div>

      {/* Operational Shipping Cards List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-400 text-xs">
            Nessun ordine trovato per questa vista logistica.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCourier = order.fulfillmentType === "courier";
            const tracking = trackingInputs[order.id] !== undefined ? trackingInputs[order.id] : (order.trackingCode || '');
            const courier = courierInputs[order.id] || order.courierName || "BRT Express";
            const isTrackingSaved = savedTrackingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 hover:border-[#5E1788]/30 transition-all space-y-4"
              >
                {/* Top Row: Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[#5E1788]">
                      {order.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
                        isCourier
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-purple-50 text-[#5E1788] border-purple-200"
                      }`}
                    >
                      {isCourier ? (
                        <>
                          <Truck className="w-3 h-3 text-blue-600" />
                          <span>Corriere Espresso 24/48h</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3 h-3 text-[#5E1788]" />
                          <span>Ritiro Salone Napoli</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {order.status === "processing" && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        In Elaborazione (Da Preparare)
                      </span>
                    )}
                    {order.status === "shipped" && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Spedito con Corriere
                      </span>
                    )}
                    {order.status === "ready_for_pickup" && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-[#5E1788] font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        Pronto per Ritiro Salone
                      </span>
                    )}
                    {order.status === "completed" && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Consegnato / Concluso
                      </span>
                    )}
                    {order.status === "cancelled" && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold">
                        Annullato
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Grid: Customer & Items */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Customer info & Address */}
                  <div className="md:col-span-4 space-y-2">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Destinatario
                    </div>
                    <div className="text-xs font-bold text-[#1F1B24]">
                      {order.customerName}
                    </div>
                    <div className="text-xs text-gray-600 font-mono">
                      {order.customerPhone}
                    </div>

                    {isCourier && order.shippingAddress ? (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-700 leading-relaxed space-y-1">
                        <div>{order.shippingAddress.street}</div>
                        <div>
                          {order.shippingAddress.postalCode} {order.shippingAddress.city} ({order.shippingAddress.province})
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleCopyAddress(order)}
                            className="w-full py-1.5 px-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-[11px] text-gray-700 font-medium transition-colors flex items-center justify-center gap-1.5"
                          >
                            {copiedOrderId === order.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Indirizzo Copiato!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-gray-500" />
                                <span>Copia per Software Corriere</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
                        <div className="font-semibold flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-[#5E1788]" />
                          <span>Ritiro Salone</span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          Via dei Pellegrini 28/29, Napoli (Salone Federica Cesiano).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Items to Pack */}
                  <div className="md:col-span-4 space-y-2">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Articoli da Includere nel Pacco ({order.items.length})
                    </div>
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white text-xs">
                      {order.items.map((item, i) => (
                        <div key={i} className="p-2.5 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{item.productTitle}</div>
                            {item.variantName && (
                              <div className="text-[11px] text-gray-500">Tonalità: {item.variantName}</div>
                            )}
                          </div>
                          <span className="font-bold text-[#5E1788] px-2 py-0.5 rounded bg-purple-50">
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D462A6]" />
                      <span>Includere sigillo di garanzia e biglietto profumato</span>
                    </div>
                  </div>

                  {/* Action Desk */}
                  <div className="md:col-span-4 space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                    <div className="text-xs text-gray-700 font-semibold uppercase tracking-wider">
                      Azioni Operative
                    </div>

                    {isCourier ? (
                      /* Courier Actions */
                      <div className="space-y-2.5">
                        {order.packlinkReference ? (
                          <>
                            <div className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-[11px] text-[#5E1788] font-medium flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
                              <span>
                                Packlink PRO · Rif. <span className="font-mono font-bold">{order.packlinkReference}</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveLabelOrder(order)}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] hover:opacity-95 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                              <span>Apri & Stampa Etichetta (PDF)</span>
                            </button>
                          </>
                        ) : (
                          !order.trackingCode &&
                          order.status === "processing" && (
                            <button
                              type="button"
                              onClick={() => handleCreatePacklink(order.id)}
                              disabled={packlinkLoadingId === order.id}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-[#7A3293] to-[#D462A6] hover:opacity-95 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-semibold shadow-xs transition-opacity flex items-center justify-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>
                                {packlinkLoadingId === order.id ? "Creazione in corso..." : "Crea con Packlink PRO"}
                              </span>
                            </button>
                          )
                        )}

                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Seleziona Corriere:
                          </label>
                          <select
                            value={courier}
                            onChange={(e) =>
                              setCourierInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#5E1788]"
                          >
                            {courier.trim() !== "" &&
                              !COURIER_OPTIONS.some((option) => option.value === courier) && (
                                <option value={courier}>{courier}</option>
                              )}
                            {COURIER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Numero Lettera di Vettura (Tracking):
                          </label>
                          <input
                            type="text"
                            placeholder="Es: BRT-9921448102"
                            value={tracking}
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:border-[#5E1788]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveTracking(order.id)}
                          className="w-full py-2 rounded-xl bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          {isTrackingSaved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Tracking Registrato!</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Salva Tracking & Segna Spedito</span>
                            </>
                          )}
                        </button>

                        {/* Direct Clickable Tracking Link, Live Pop-up & WhatsApp 1-Click Button */}
                        {(() => {
                          const rawInput = (tracking || order.trackingCode || "").trim();
                          const resolvedCode =
                            (rawInput && rawInput !== order.packlinkReference
                              ? resolveCarrierTrackingCode({ trackingCode: rawInput, packlinkReference: order.packlinkReference })
                              : "") || resolveCarrierTrackingCode(order);
                          const hasTrackingOrPacklink = Boolean(rawInput || order.packlinkReference);
                          if (!hasTrackingOrPacklink) return null;

                          const effectiveCodeForWa = resolvedCode || rawInput;
                          return (
                            <div className="pt-1.5 space-y-2">
                              <button
                                type="button"
                                onClick={() => setTrackingModalOrder(order)}
                                className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-[#D8C2E7] text-[#5E1788] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Vedi stato pacco (Pop-up)</span>
                              </button>

                              {resolvedCode && (
                                <a
                                  href={getCourierTrackingUrl(courier, resolvedCode)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Apri Portale Tracking ({courier})</span>
                                </a>
                              )}

                              {effectiveCodeForWa && (
                                <a
                                  href={getWhatsAppDirectUrl(
                                    order.customerPhone,
                                    getWhatsAppTrackingMessage(order, effectiveCodeForWa, courier)
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Notifica Spedizione WhatsApp (1-Click)</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}

                        {order.status !== "completed" &&
                          order.status !== "cancelled" &&
                          (order.status === "shipped" ||
                            Boolean((tracking || order.trackingCode || "").trim())) && (
                            <button
                              type="button"
                              onClick={() => handleCompleteCourierOrder(order.id)}
                              className="w-full py-2 rounded-xl bg-[#1F1B24] hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#D8C2E7]" />
                              <span>Chiudi Ordine (Segna Completato)</span>
                            </button>
                          )}
                      </div>
                    ) : (
                      /* Boutique Pickup Actions */
                      <div className="space-y-2">
                        {order.status === "processing" ? (
                          <button
                            type="button"
                            onClick={() => handlePickupStatus(order.id, "ready_for_pickup")}
                            className="w-full py-2.5 rounded-xl bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4 text-[#D8C2E7]" />
                            <span>Pacco Pronto per Ritiro</span>
                          </button>
                        ) : order.status === "ready_for_pickup" ? (
                          <button
                            type="button"
                            onClick={() => handlePickupStatus(order.id, "completed")}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Consegna al Cliente al Banco</span>
                          </button>
                        ) : (
                          <div className="text-xs text-emerald-700 font-semibold p-2 bg-emerald-50 rounded-lg text-center">
                            Ordine ritirato e completato
                          </div>
                        )}

                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Ciao ${order.customerName}! Il tuo ordine #${order.id} è stato preparato con cura ed è pronto per essere ritirato in salone da Scelta Makeup (Via dei Pellegrini 28/29, Napoli). Ti aspettiamo!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-xs font-medium text-gray-700 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Notifica WhatsApp Ritiro</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* In-App Shipping Label PDF Modal */}
      <ShippingLabelModal
        order={activeLabelOrder}
        isOpen={Boolean(activeLabelOrder)}
        onClose={() => setActiveLabelOrder(null)}
      />

      {/* Live Parcel Tracking Pop-up Modal */}
      <OrderTrackingModal
        key={trackingModalOrder?.id ?? "shipping-tracking-closed"}
        order={trackingModalOrder}
        isOpen={Boolean(trackingModalOrder)}
        onClose={() => setTrackingModalOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          setTrackingModalOrder((prev) => (prev && prev.id === updated.id ? updated : prev));
          if (updated.trackingCode) {
            setTrackingInputs((prev) => ({ ...prev, [updated.id]: updated.trackingCode! }));
          }
          if (updated.courierName) {
            setCourierInputs((prev) => ({ ...prev, [updated.id]: updated.courierName! }));
          }
        }}
      />
    </div>
  );
}
