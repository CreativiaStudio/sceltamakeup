"use client";

import React, { useState } from "react";
import { TrendingUp, Activity, Sparkles, Layers } from "lucide-react";
import { AdminKpiSummary } from "@/lib/adminStore";
import TrackingInfrastructureSection from "./TrackingInfrastructureSection";

interface AnalyticsTabProps {
  kpis: AdminKpiSummary;
}

export default function AnalyticsTab({ kpis }: AnalyticsTabProps) {
  const [activeSection, setActiveSection] = useState<"sales" | "tracking">("sales");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const brandBreakdown = [
    { brand: "Diego dalla Palma", percentage: 38, revenue: 2450, color: "bg-[#5E1788]" },
    { brand: "RVB LAB", percentage: 26, revenue: 1680, color: "bg-[#7A3293]" },
    { brand: "Pierre René", percentage: 16, revenue: 1030, color: "bg-[#D462A6]" },
    { brand: "Eveline Cosmetics", percentage: 11, revenue: 710, color: "bg-purple-400" },
    { brand: "Cipria Make Up", percentage: 6, revenue: 390, color: "bg-pink-300" },
    { brand: "Miyo", percentage: 3, revenue: 190, color: "bg-indigo-300" },
  ];

  const categoryBreakdown = [
    { category: "Viso", percentage: 42, count: 129 },
    { category: "Occhi", percentage: 28, count: 90 },
    { category: "Skincare & Dermo", percentage: 18, count: 82 },
    { category: "Labbra", percentage: 11, count: 39 },
    { category: "Beauty & Accessori", percentage: 1, count: 1 },
  ];

  const funnelStages = [
    { stage: "Visite Salone Online", count: 14250, conversion: "100%" },
    { stage: "Visualizzazioni Prodotto", count: 9120, conversion: "64.0%" },
    { stage: "Aggiunte al Carrello", count: 1680, conversion: "11.8%" },
    { stage: "Inizio Checkout", count: 720, conversion: "5.05%" },
    { stage: "Ordini Finalizzati", count: 488, conversion: "3.42%" },
  ];

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection("sales")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "sales"
              ? "bg-[#5E1788] text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Performance Vendite & Imbuto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("tracking")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "tracking"
              ? "bg-[#5E1788] text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#D462A6]" />
          <span>Infrastruttura Tracciamento & Pixel (GA4 / GTM / Meta CAPI)</span>
        </button>
      </div>

      {activeSection === "tracking" ? (
        <TrackingInfrastructureSection />
      ) : (
        <>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
                  Statistiche & Performance Vendite
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20">
                  Report E-Commerce
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Analisi del fatturato, quote di mercato per brand, canali di spedizione e imbuto di conversione.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs">
                <button
                  onClick={() => setTimeRange("7d")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    timeRange === "7d"
                      ? "bg-[#5E1788] text-white font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  7 Giorni
                </button>
                <button
                  onClick={() => setTimeRange("30d")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    timeRange === "30d"
                      ? "bg-[#5E1788] text-white font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  30 Giorni
                </button>
                <button
                  onClick={() => setTimeRange("90d")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    timeRange === "90d"
                      ? "bg-[#5E1788] text-white font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Trimestre
                </button>
              </div>
            </div>
          </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="text-xs text-gray-500">Fatturato Periodo</div>
          <div className="text-2xl font-bold text-[#1F1B24]">{formatEuro(kpis.totalRevenue)}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% rispetto al periodo prec.</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="text-xs text-gray-500">Valore Medio Ordine (AOV)</div>
          <div className="text-2xl font-bold text-[#1F1B24]">{formatEuro(kpis.averageOrderValue)}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+5.2% crescita carrello</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="text-xs text-gray-500">Tasso di Conversione E-Commerce</div>
          <div className="text-2xl font-bold text-[#1F1B24]">3.42%</div>
          <div className="text-[11px] text-purple-700 font-medium">
            Ottimo engagement mobile
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
          <div className="text-xs text-gray-500">Ritiro Salone vs Corriere</div>
          <div className="text-2xl font-bold text-[#1F1B24]">42% / 58%</div>
          <div className="text-[11px] text-gray-500">
            Forte preferenza in-store a Napoli
          </div>
        </div>
      </div>

      {/* Brand & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Sales Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-serif text-base font-bold text-[#1F1B24]">
              Quota di Vendite per Brand Ufficiale
            </h3>
            <span className="text-xs text-gray-400">Quote % stimata</span>
          </div>

          <div className="space-y-3">
            {brandBreakdown.map((item) => (
              <div key={item.brand} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">{item.brand}</span>
                  <span className="font-mono text-gray-600">
                    {formatEuro(item.revenue)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Share */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-serif text-base font-bold text-[#1F1B24]">
              Distribuzione Vendite per Categoria Store
            </h3>
            <span className="text-xs text-gray-400">341 articoli a catalogo</span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">{cat.category}</span>
                  <span className="font-mono text-gray-600">
                    {cat.count} prodotti ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${cat.percentage}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-[#5E1788] to-[#D462A6]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-serif text-base font-bold text-[#1F1B24]">
              Imbuto di Conversione Store & Salone
            </h3>
            <p className="text-xs text-gray-500">
              Dalla prima visita anonima fino alla transazione completata
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Performance Ottimale
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnelStages.map((stage, i) => (
            <div
              key={stage.stage}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1.5 relative"
            >
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                Fase {i + 1}
              </div>
              <div className="text-xs font-bold text-[#1F1B24] line-clamp-1">
                {stage.stage}
              </div>
              <div className="text-base font-bold text-[#5E1788]">
                {stage.count.toLocaleString("it-IT")}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium">
                {stage.conversion} conv.
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
