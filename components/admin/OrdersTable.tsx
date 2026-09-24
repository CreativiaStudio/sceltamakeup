"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Truck,
  Store,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  MapPin,
  Check,
  Printer,
  Plus,
  Receipt,
  CreditCard,
} from "lucide-react";
import {
  getAdminOrders,
  updateOrderStatus,
  SceltaAdminOrder,
} from "@/lib/adminStore";
import OrderPrintModal from "./OrderPrintModal";
import NewManualOrderModal from "./NewManualOrderModal";

export default function OrdersTable() {
  const [orders, setOrders] = useState<SceltaAdminOrder[]>(() => getAdminOrders());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<SceltaAdminOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [multiCartCount, setMultiCartCount] = useState<number>(0);

  const posOrders = useMemo(
    () => orders.filter((o) => o.fulfillmentType === "pos_receipt"),
    [orders]
  );
  const posRevenue = useMemo(
    () => posOrders.reduce((sum, o) => sum + o.total, 0),
    [posOrders]
  );

  useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem("scelta_makeup_multi_receipt_cart_v1");
        if (raw) {
          const items = JSON.parse(raw);
          setMultiCartCount(items.reduce((s: number, i: { quantity?: number }) => s + (i.quantity || 1), 0));
        } else {
          setMultiCartCount(0);
        }
      } catch {
        setMultiCartCount(0);
      }
    };
    updateCount();
    window.addEventListener("multi_receipt_cart_updated", updateCount);
    return () => window.removeEventListener("multi_receipt_cart_updated", updateCount);
  }, []);

  useEffect(() => {
    const handleStoreUpdate = () => setOrders(getAdminOrders());
    window.addEventListener("scelta_admin_store_updated", handleStoreUpdate);
    window.addEventListener("scelta_admin_store_reset", handleStoreUpdate);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", handleStoreUpdate);
      window.removeEventListener("scelta_admin_store_reset", handleStoreUpdate);
    };
  }, []);

  const handleStatusChange = (orderId: string, newStatus: SceltaAdminOrder["status"]) => {
    try {
      updateOrderStatus(orderId, newStatus);
      setOrders(getAdminOrders());
    } catch (error) {
      console.error("Errore aggiornamento stato ordine:", error);
    }
  };

  const handleCopyAddress = (order: SceltaAdminOrder) => {
    if (!order.shippingAddress) return;
    const addr = `${order.customerName}\n${order.shippingAddress.street}\n${order.shippingAddress.postalCode} ${order.shippingAddress.city} (${order.shippingAddress.province})\nItalia\nTel: ${order.customerPhone}`;
    navigator.clipboard.writeText(addr);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      if (fulfillmentFilter !== "all" && order.fulfillmentType !== fulfillmentFilter) {
        return false;
      }
      if (q) {
        const matchId = order.id.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchEmail = order.customerEmail.toLowerCase().includes(q);
        const matchPhone = order.customerPhone.includes(q);
        if (!matchId && !matchName && !matchEmail && !matchPhone) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, fulfillmentFilter, searchQuery]);

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Gestione Ordini & Vendite Banco
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20">
              {orders.length} Totali
            </span>
            {posOrders.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>{posOrders.length} in Negozio ({formatEuro(posRevenue)})</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestione integrata ordini e-commerce spediti, ritiri in salone e scontrini fiscali al banco cassa RT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (multiCartCount > 0) {
                window.dispatchEvent(new CustomEvent("open_multi_receipt_modal"));
              } else {
                window.dispatchEvent(new CustomEvent("open_quick_scan_modal", { detail: "" }));
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] hover:shadow-md text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Crea nuovo ordine tramite la cassa barcode e scontrino multiplo"
          >
            <Plus className="w-4 h-4" />
            <span>
              + Nuovo Ordine Manuale
              {multiCartCount > 0 ? ` (${multiCartCount} in scontrino)` : ""}
            </span>
          </button>
          <div className="text-xs text-gray-500 font-medium">
            Filtrati: <strong className="text-[#1F1B24]">{filteredOrders.length}</strong> ordini
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per numero ordine, cliente, email o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Fulfillment Type Toggle */}
          <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 p-1 rounded-xl border border-gray-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFulfillmentFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                fulfillmentFilter === "all"
                  ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tutti i Canali
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentFilter("pos_receipt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                fulfillmentFilter === "pos_receipt"
                  ? "bg-white text-emerald-800 shadow-sm font-semibold border border-emerald-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Venduti in Negozio ({posOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentFilter("courier")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                fulfillmentFilter === "courier"
                  ? "bg-white text-blue-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Truck className="w-3 h-3 text-blue-600" />
              <span>Corriere</span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentFilter("store_pickup")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                fulfillmentFilter === "store_pickup"
                  ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Store className="w-3 h-3 text-[#5E1788]" />
              <span>Ritiro Salone</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-gray-500 shrink-0 uppercase tracking-wider">
            Stato:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              statusFilter === "all"
                ? "bg-[#5E1788] text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tutti gli Stati
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("processing")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              statusFilter === "processing"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            In Elaborazione
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("shipped")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              statusFilter === "shipped"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100"
            }`}
          >
            Spedito con Corriere
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ready_for_pickup")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              statusFilter === "ready_for_pickup"
                ? "bg-[#7A3293] text-white shadow-sm"
                : "bg-purple-50 text-purple-900 hover:bg-purple-100"
            }`}
          >
            Pronto per Ritiro in Salone
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              statusFilter === "completed"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            Completato
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("cancelled")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              statusFilter === "cancelled"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            Annullato
          </button>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                <th className="py-3 px-4">Ordine & Data</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Consegna</th>
                <th className="py-3 px-4">Totale</th>
                <th className="py-3 px-4">Stato Operativo</th>
                <th className="py-3 px-4 text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Nessun ordine trovato per i filtri selezionati.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const isCourier = order.fulfillmentType === "courier";
                  const isPos = order.fulfillmentType === "pos_receipt";

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-purple-50/30 transition-colors">
                        {/* Order ID & Date */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-[#5E1788]">
                              {order.id}
                            </span>
                            <div className="text-[11px] text-gray-400">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#1F1B24] flex items-center gap-1.5">
                              <span>{order.customerName}</span>
                              {isPos && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                                  Banco Cassa RT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {isPos ? (
                                <span className="text-emerald-700 font-medium">
                                  {order.paymentMethod === "card" ? "💳 Carta / POS" : "💶 Contanti"}
                                  {order.change ? ` • Resto: €${order.change.toFixed(2)}` : ""}
                                </span>
                              ) : (
                                order.customerEmail
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {order.customerPhone}
                            </div>
                          </div>
                        </td>

                        {/* Fulfillment Mode */}
                        <td className="py-3.5 px-4">
                          {isPos ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Scontrino Cassa RT</span>
                            </span>
                          ) : isCourier ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-blue-50 text-blue-800 border-blue-200">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>Corriere Espresso</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-purple-50 text-[#5E1788] border-purple-200">
                              <Store className="w-3 h-3 text-[#5E1788]" />
                              <span>Ritiro in Boutique</span>
                            </span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#1F1B24]">
                            {formatEuro(order.total)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {order.items.length} {order.items.length === 1 ? "pezzo" : "pezzi"}
                          </div>
                        </td>

                        {/* Status Select */}
                        <td className="py-3.5 px-4">
                          {isPos ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Incassato al Banco</span>
                            </span>
                          ) : (
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  order.id,
                                  e.target.value as SceltaAdminOrder["status"]
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer focus:outline-none transition-colors ${
                                order.status === "processing"
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : order.status === "shipped"
                                  ? "bg-blue-50 text-blue-800 border-blue-300"
                                  : order.status === "ready_for_pickup"
                                  ? "bg-purple-50 text-[#5E1788] border-purple-300"
                                  : order.status === "completed"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-rose-50 text-rose-800 border-rose-300"
                              }`}
                            >
                              <option value="processing">In Elaborazione</option>
                              <option value="shipped">Spedito con Corriere</option>
                              <option value="ready_for_pickup">Pronto Ritiro Salone</option>
                              <option value="completed">Completato</option>
                              <option value="cancelled">Annullato</option>
                            </select>
                          )}
                        </td>

                        {/* Actions / Expand */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPrintingOrder(order)}
                              className="px-2.5 py-1.5 rounded-lg text-gray-600 hover:text-[#5E1788] hover:bg-purple-50 transition-colors flex items-center gap-1 text-xs font-semibold border border-gray-200"
                              title="Stampa Ricevuta e Bolla"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#5E1788]" />
                              <span className="hidden sm:inline">Stampa</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderId(isExpanded ? null : order.id)
                              }
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#5E1788] hover:bg-purple-50 transition-colors"
                              aria-label={isExpanded ? "Nascondi dettagli" : "Mostra dettagli"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-[#5E1788]" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Order Detail Drawer */}
                      {isExpanded && (
                        <tr className="bg-gradient-to-b from-purple-50/20 to-gray-50/50">
                          <td colSpan={6} className="p-4 sm:p-6 border-b border-gray-200">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                              {/* Left: Items Breakdown */}
                              <div className="lg:col-span-7 space-y-3">
                                <h3 className="font-serif text-sm font-bold text-[#1F1B24] flex items-center gap-2">
                                  <ShoppingCart className="w-4 h-4 text-[#5E1788]" />
                                  <span>Articoli Acquistati ({order.items.length})</span>
                                </h3>

                                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                  {order.items.map((item, idx) => (
                                    <div
                                      key={`${item.productId}-${idx}`}
                                      className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 relative overflow-hidden shrink-0 p-0.5">
                                          <Image
                                            src={item.image || "/brand/logo.png"}
                                            alt={item.productTitle}
                                            fill
                                            className="object-contain"
                                            sizes="40px"
                                          />
                                        </div>
                                        <div>
                                          <div className="font-semibold text-xs text-[#1F1B24]">
                                            {item.productTitle}
                                          </div>
                                          {item.variantName && (
                                            <div className="text-[11px] text-gray-500">
                                              Tonalità/Variante: <strong className="text-gray-700">{item.variantName}</strong>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <div className="font-bold text-xs text-[#1F1B24]">
                                          {formatEuro(item.price * item.quantity)}
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                          {item.quantity} × {formatEuro(item.price)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Packaging protetto con sigillo:</span>
                                  <span className="font-semibold text-[#5E1788]">Verificato & Confezionato</span>
                                </div>
                              </div>

                              {/* Right: Logistics & Customer Actions */}
                              <div className="lg:col-span-5 space-y-4">
                                <h3 className="font-serif text-sm font-bold text-[#1F1B24] flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-[#D462A6]" />
                                  <span>Destinazione & Recapiti</span>
                                </h3>

                                {isPos ? (
                                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2 text-xs">
                                    <div className="flex items-center gap-2 font-semibold text-emerald-800">
                                      <Receipt className="w-4 h-4 text-emerald-600" />
                                      <span>Scontrino Fiscale Hardware Cassa RT</span>
                                    </div>
                                    <p className="text-emerald-700 leading-relaxed">
                                      Vendita al banco registrata ed emessa su registratore telematico Epson FP-81II RT.
                                    </p>
                                    <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
                                      <span>Metodo di Pagamento:</span>
                                      <strong className="font-semibold">
                                        {order.paymentMethod === "card" ? "💳 Carta / POS" : "💶 Contanti"}
                                        {order.change ? ` (Resto dato: €${order.change.toFixed(2)})` : ""}
                                      </strong>
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-mono">
                                      ID Transazione POS: {order.id}
                                    </div>
                                  </div>
                                ) : isCourier && order.shippingAddress ? (
                                  <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                                    <div className="text-xs font-semibold text-gray-800">
                                      Indirizzo di Spedizione:
                                    </div>
                                    <div className="text-xs text-gray-600 leading-relaxed font-mono">
                                      {order.customerName}<br />
                                      {order.shippingAddress.street}<br />
                                      {order.shippingAddress.postalCode} {order.shippingAddress.city} ({order.shippingAddress.province})<br />
                                      Italia
                                    </div>

                                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                      <span className="text-[11px] text-gray-500">
                                        Corriere: {order.courierName || "BRT Express"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyAddress(order)}
                                        className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-[11px] text-gray-700 font-medium transition-colors flex items-center gap-1.5"
                                      >
                                        {copiedOrderId === order.id ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            <span className="text-emerald-700">Copiato!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3 text-gray-500" />
                                            <span>Copia Indirizzo</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {order.trackingCode && (
                                      <div className="pt-2 border-t border-gray-200 text-xs">
                                        <span className="text-gray-500">Tracking Code: </span>
                                        <strong className="font-mono text-[#5E1788]">
                                          {order.trackingCode}
                                        </strong>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2 text-xs">
                                    <div className="flex items-center gap-2 font-semibold text-[#5E1788]">
                                      <Store className="w-4 h-4" />
                                      <span>Ritiro Gratuito in Salone</span>
                                    </div>
                                    <p className="text-gray-600">
                                      Salone Scelta Makeup, Via dei Pellegrini 28/29, Napoli.
                                    </p>
                                    <div className="pt-2 border-t border-purple-200/60 text-[11px] text-purple-900">
                                      Cliente avvisato appena l&apos;ordine passa a &quot;Pronto per Ritiro&quot;.
                                    </div>
                                  </div>
                                )}

                                {/* Stampa Ricevuta & WhatsApp Launcher CTA */}
                                <div className="pt-1 space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => setPrintingOrder(order)}
                                    className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5E1788] text-xs font-semibold border border-purple-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Printer className="w-4 h-4" />
                                    <span>Stampa Ricevuta & Bolla Confezionamento</span>
                                  </button>

                                  <a
                                    href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                      `Ciao ${order.customerName}! Ti scriviamo dal salone Scelta Makeup di Napoli in merito al tuo ordine #${order.id}.`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Contatta Cliente su WhatsApp</span>
                                  </a>
                                </div>
                              </div>
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

      {/* Printable Receipt Modal */}
      <OrderPrintModal
        order={printingOrder}
        isOpen={Boolean(printingOrder)}
        onClose={() => setPrintingOrder(null)}
      />

      {/* Manual Order Creation Modal */}
      <NewManualOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onOrderCreated={() => setOrders(getAdminOrders())}
      />
    </div>
  );
}
