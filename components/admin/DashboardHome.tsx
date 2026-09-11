"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Users,
  AlertTriangle,
  Package,
  Truck,
  Store,
  Calendar,
  Radio,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { AdminKpiSummary, SceltaAdminOrder } from "@/lib/adminStore";
import { AdminTab } from "@/types/admin";

interface DashboardHomeProps {
  kpis: AdminKpiSummary;
  orders: SceltaAdminOrder[];
  onNavigateTab: (tab: AdminTab) => void;
}

export default function DashboardHome({
  kpis,
  orders,
  onNavigateTab,
}: DashboardHomeProps) {
  const [activeChartPeriod, setActiveChartPeriod] = useState<"7d" | "30d">("7d");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Sales trend demo data for responsive SVG bar chart
  const trendData7d = [
    { label: "Lun", revenue: 420, orders: 4 },
    { label: "Mar", revenue: 580, orders: 6 },
    { label: "Mer", revenue: 710, orders: 8 },
    { label: "Gio", revenue: 630, orders: 7 },
    { label: "Ven", revenue: 890, orders: 11 },
    { label: "Sab", revenue: 1240, orders: 15 },
    { label: "Dom", revenue: 950, orders: 10 },
  ];

  const trendData30d = [
    { label: "Sett 1", revenue: 3840, orders: 42 },
    { label: "Sett 2", revenue: 4620, orders: 51 },
    { label: "Sett 3", revenue: 5190, orders: 58 },
    { label: "Sett 4", revenue: 6410, orders: 72 },
  ];

  const chartData = activeChartPeriod === "7d" ? trendData7d : trendData30d;
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue));

  // Recent 5 orders
  const recentOrders = orders.slice(0, 5);

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-[#D8C2E7] border border-white/20">
              Cockpit E-Commerce & Atelier
            </span>
            <span className="text-xs text-[#D8C2E7]/90 font-medium">
              Via dei Pellegrini 28/29, Napoli
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Benvenuta, Federica
          </h1>
          <p className="text-xs sm:text-sm text-[#D8C2E7] max-w-2xl mt-1 font-light">
            Monitoraggio in tempo reale del catalogo 341 prodotti, spedizioni con corriere espresso, ritiri in boutique e storico clienti.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateTab("prodotti")}
            className="px-4 py-2.5 rounded-xl bg-white text-[#5E1788] hover:bg-[#D8C2E7] text-xs font-semibold shadow-md transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Gestisci Stock</span>
          </button>
          <button
            onClick={() => onNavigateTab("ordini")}
            className="px-4 py-2.5 rounded-xl bg-[#5E1788]/50 hover:bg-[#5E1788] text-white border border-white/30 text-xs font-medium transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Nuovi Ordini</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Fatturato Totale */}
        <div className="bg-white p-4 rounded-2xl border border-[#D8C2E7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Fatturato Totale</span>
            <div className="w-8 h-8 rounded-lg bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#1F1B24]">
            {formatEuro(kpis.totalRevenue)}
          </div>
          <div className="mt-2 flex items-center text-[11px] text-emerald-600 font-medium">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>+18.4% questo mese</span>
          </div>
        </div>

        {/* 2. Ordini Evasi */}
        <div className="bg-white p-4 rounded-2xl border border-[#D8C2E7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Ordini Totali</span>
            <div className="w-8 h-8 rounded-lg bg-[#7A3293]/10 text-[#7A3293] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#1F1B24]">
            {kpis.ordersCount}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            {kpis.shippedOrdersCount + kpis.completedOrdersCount} evasi con successo
          </div>
        </div>

        {/* 3. Carrello Medio */}
        <div className="bg-white p-4 rounded-2xl border border-[#D8C2E7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Carrello Medio</span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-[#D462A6] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#1F1B24]">
            {formatEuro(kpis.averageOrderValue)}
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>AOV sano (+5.2%)</span>
          </div>
        </div>

        {/* 4. Clienti Registrati */}
        <div className="bg-white p-4 rounded-2xl border border-[#D8C2E7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Clienti Registrati</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#5E1788] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#1F1B24]">
            {kpis.registeredCustomers}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Omnichannel (Store & Web)
          </div>
        </div>

        {/* 5. Conversion Rate */}
        <div className="bg-white p-4 rounded-2xl border border-[#D8C2E7]/40 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Tasso Conversione</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#1F1B24]">
            3.42%
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">
            Sopra benchmark (2.8%)
          </div>
        </div>

        {/* 6. Allarmi Scorte Basse */}
        <div className={`p-4 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
          kpis.lowStockCount > 0 || kpis.outOfStockCount > 0
            ? "bg-amber-50/60 border-amber-300"
            : "bg-white border-[#D8C2E7]/40"
        }`}>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Scorte in Esaurimento</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              kpis.lowStockCount > 0 || kpis.outOfStockCount > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-800">
            {kpis.lowStockCount + kpis.outOfStockCount}
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium flex items-center justify-between">
            <span>{kpis.outOfStockCount} esauriti</span>
            <button
              onClick={() => onNavigateTab("prodotti")}
              className="underline text-[10px] hover:text-amber-900"
            >
              Rifornisci
            </button>
          </div>
        </div>
      </div>

      {/* Operational Fulfilment Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab("ordini")}
          className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-[#5E1788]/40 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#5E1788] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-[#1F1B24]">
              {kpis.pendingOrdersCount}
            </div>
            <div className="text-[11px] text-gray-500">In Elaborazione</div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("spedizioni")}
          className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-[#5E1788]/40 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-[#1F1B24]">
              {kpis.shippedOrdersCount}
            </div>
            <div className="text-[11px] text-gray-500">Spediti Corriere</div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("spedizioni")}
          className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-[#5E1788]/40 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-pink-50 text-[#D462A6] flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-[#1F1B24]">
              {kpis.readyForPickupCount}
            </div>
            <div className="text-[11px] text-gray-500">Pronti Ritiro Boutique</div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("ordini")}
          className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-[#5E1788]/40 transition-colors flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-[#1F1B24]">
              {kpis.completedOrdersCount}
            </div>
            <div className="text-[11px] text-gray-500">Ordini Completati</div>
          </div>
        </div>
      </div>

      {/* Main Content Split: Sales Trends Chart & Recent Orders Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Revenue Trend Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1F1B24]">
                Andamento Vendite
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Fatturato generato da ordini e-commerce e ritiri
              </p>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveChartPeriod("7d")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeChartPeriod === "7d"
                    ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Ultimi 7 Giorni
              </button>
              <button
                type="button"
                onClick={() => setActiveChartPeriod("30d")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeChartPeriod === "30d"
                    ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Ultimi 30 Giorni
              </button>
            </div>
          </div>

          {/* Interactive Responsive SVG Bar Chart */}
          <div className="my-6">
            <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
              {chartData.map((item, index) => {
                const heightPercent = Math.max(12, Math.round((item.revenue / maxRevenue) * 100));
                const isHovered = hoveredBarIndex === index;

                return (
                  <div
                    key={item.label}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Tooltip on hover */}
                    <div
                      className={`text-[10px] font-semibold mb-1.5 transition-opacity px-1.5 py-0.5 rounded shadow-sm ${
                        isHovered
                          ? "opacity-100 bg-[#5E1788] text-white"
                          : "opacity-0 group-hover:opacity-100 bg-gray-800 text-white"
                      }`}
                    >
                      {formatEuro(item.revenue)}
                    </div>

                    {/* Bar element */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${
                        isHovered
                          ? "bg-gradient-to-t from-[#5E1788] to-[#D462A6] shadow-lg shadow-purple-200"
                          : "bg-gradient-to-t from-[#5E1788]/80 to-[#7A3293]/70 hover:from-[#5E1788] hover:to-[#D462A6]"
                      }`}
                    />

                    {/* Bottom label */}
                    <div className="mt-2 text-[11px] font-medium text-gray-500 group-hover:text-[#5E1788]">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5E1788]" />
                <span>E-Commerce (€)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D462A6]" />
                <span>Picco Weekend</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab("analytics")}
              className="text-[#5E1788] hover:underline font-medium flex items-center gap-1"
            >
              <span>Vedi Statistiche Dettagliate</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Recent Orders Feed */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#1F1B24]">
                  Ordini Recenti
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ultime richieste da corriere e boutique
                </p>
              </div>
              <button
                onClick={() => onNavigateTab("ordini")}
                className="text-xs font-semibold text-[#5E1788] hover:underline flex items-center gap-1"
              >
                <span>Tutti ({orders.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Orders Feed List */}
            <div className="divide-y divide-gray-100 mt-2">
              {recentOrders.map((order) => {
                const isCourier = order.fulfillmentType === "courier";

                return (
                  <div
                    key={order.id}
                    className="py-3.5 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#5E1788] font-mono">
                          {order.id}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                            isCourier
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-[#5E1788] border border-purple-200"
                          }`}
                        >
                          {isCourier ? (
                            <>
                              <Truck className="w-2.5 h-2.5" />
                              <span>Corriere</span>
                            </>
                          ) : (
                            <>
                              <Store className="w-2.5 h-2.5" />
                              <span>Ritiro Store</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-gray-800">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {order.items.length} {order.items.length === 1 ? "articolo" : "articoli"} • {formatEuro(order.total)}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div>
                        {order.status === "processing" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                            In Elaborazione
                          </span>
                        )}
                        {order.status === "shipped" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                            Spedito
                          </span>
                        )}
                        {order.status === "ready_for_pickup" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-[#5E1788] font-medium">
                            Pronto Ritiro
                          </span>
                        )}
                        {order.status === "completed" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            Completato
                          </span>
                        )}
                        {order.status === "cancelled" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
                            Annullato
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onNavigateTab("ordini")}
                        className="text-[11px] text-[#5E1788] hover:underline font-medium"
                      >
                        Gestisci
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-2">
            <button
              onClick={() => onNavigateTab("spedizioni")}
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-[#5E1788] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Vai al Banco Spedizioni & Ritiro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Module Shortcuts Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Salon Appointments & RT Cash */}
        <div
          onClick={() => onNavigateTab("appuntamenti")}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-[#5E1788] cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#5E1788]/10 text-[#5E1788] group-hover:bg-[#5E1788] group-hover:text-white transition-colors flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F1B24]">
                Appuntamenti & Cassa RT
              </h3>
              <p className="text-[11px] text-gray-500">
                Epson FP-81II XML fiscal receipts
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Gestisci saldi 80%, scontrini fiscali telematici RT ed esportazione XML compatibile ePOS.
          </p>
        </div>

        {/* WhatsApp Anti-Ban Queue */}
        <div
          onClick={() => onNavigateTab("notifiche")}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-[#5E1788] cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F1B24]">
                WhatsApp Anti-Ban Queue
              </h3>
              <p className="text-[11px] text-gray-500">
                Pacing umano 20–45s
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Monitoraggio coda asincrona messaggi transazionali con delay casuale e log email Resend.
          </p>
        </div>

        {/* Omnichannel CRM */}
        <div
          onClick={() => onNavigateTab("clienti")}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm hover:border-[#5E1788] cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#D462A6] group-hover:bg-[#D462A6] group-hover:text-white transition-colors flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F1B24]">
                CRM Clienti Omnichannel
              </h3>
              <p className="text-[11px] text-gray-500">
                Spesa aggregata E-Comm + Salone
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Schede bellezza personalizzate, LTV totale cliente e launcher WhatsApp 1-click.
          </p>
        </div>
      </div>
    </div>
  );
}
