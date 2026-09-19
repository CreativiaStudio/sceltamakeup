"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Activity, Sparkles, Eye, Users, Smartphone, Monitor, MapPin, RefreshCw } from "lucide-react";
import { AdminKpiSummary } from "@/lib/adminStore";
import TrackingInfrastructureSection from "./TrackingInfrastructureSection";

interface AnalyticsTabProps {
  kpis: AdminKpiSummary;
}

interface LiveTrafficData {
  date: string;
  totalViews: number;
  uniqueVisitors: number;
  pages: Record<string, number>;
  devices: { mobile: number; desktop: number };
  cities: Record<string, number>;
}

export default function AnalyticsTab({ kpis }: AnalyticsTabProps) {
  const [activeSection, setActiveSection] = useState<"traffic" | "sales" | "tracking">("traffic");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [trafficData, setTrafficData] = useState<LiveTrafficData>({
    date: new Date().toISOString().split("T")[0],
    totalViews: 0,
    uniqueVisitors: 0,
    pages: {},
    devices: { mobile: 0, desktop: 0 },
    cities: {},
  });
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);

  const fetchTraffic = async () => {
    setIsLoadingTraffic(true);
    try {
      const res = await fetch("/api/track/visit");
      if (res.ok) {
        const data = await res.json();
        setTrafficData(data);
      }
    } catch (e) {
      // Ignora silenziosamente
    } finally {
      setIsLoadingTraffic(false);
    }
  };

  useEffect(() => {
    fetchTraffic();
    const interval = setInterval(fetchTraffic, 30000); // Polling ogni 30s
    return () => clearInterval(interval);
  }, []);

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  const totalDeviceVisits = (trafficData.devices.mobile || 0) + (trafficData.devices.desktop || 0);
  const mobilePct = totalDeviceVisits > 0 ? Math.round((trafficData.devices.mobile / totalDeviceVisits) * 100) : 0;
  const desktopPct = totalDeviceVisits > 0 ? 100 - mobilePct : 0;

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection("traffic")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "traffic"
              ? "bg-[#5E1788] text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-[#D462A6]" />
          <span>Traffico Live &amp; Visitatori Reali</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("sales")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "sales"
              ? "bg-[#5E1788] text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Performance Vendite &amp; Ordini</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("tracking")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "tracking"
              ? "bg-[#5E1788] text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#D462A6]" />
          <span>Infrastruttura Pixel (GA4 / Meta CAPI)</span>
        </button>
      </div>

      {activeSection === "tracking" && <TrackingInfrastructureSection />}

      {activeSection === "traffic" && (
        <div className="space-y-6">
          {/* Header Traffico Live */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
                  Traffico in Tempo Reale
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live First-Party
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tracciamento visite in tempo reale a salvaguardia della privacy (GDPR Compliant). Dati aggregati da Vercel Edge.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchTraffic}
              disabled={isLoadingTraffic}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw size={14} className={isLoadingTraffic ? "animate-spin text-[#5E1788]" : "text-gray-500"} />
              <span>Aggiorna Dati</span>
            </button>
          </div>

          {/* Metric Cards Traffico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Visualizzazioni Totali Oggi</div>
              <div className="text-3xl font-bold text-[#1F1B24]">
                {trafficData.totalViews.toLocaleString("it-IT")}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium">
                Pagine viste dal pubblico
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Visitatori Unici Oggi</div>
              <div className="text-3xl font-bold text-[#5E1788]">
                {trafficData.uniqueVisitors.toLocaleString("it-IT")}
              </div>
              <div className="text-[11px] text-[#7A3293] font-medium">
                Sessioni attive registrate
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Dispositivo Mobile</div>
              <div className="text-3xl font-bold text-[#1F1B24]">
                {totalDeviceVisits > 0 ? `${mobilePct}%` : "—"}
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <Smartphone size={12} />
                <span>Smartphone ({trafficData.devices.mobile || 0} visite)</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Dispositivo Desktop / PC</div>
              <div className="text-3xl font-bold text-[#1F1B24]">
                {totalDeviceVisits > 0 ? `${desktopPct}%` : "—"}
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <Monitor size={12} />
                <span>Computer ({trafficData.devices.desktop || 0} visite)</span>
              </div>
            </div>
          </div>

          {/* Due Colonne: Pagine Più Viste & Provenienza Geografica */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Pagine Più Visitate */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-serif text-base font-bold text-[#1F1B24]">
                  Pagine Più Visitate Oggi
                </h3>
                <span className="text-xs text-gray-400">Classifica URL</span>
              </div>

              {Object.keys(trafficData.pages || {}).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 font-light">
                  Nessuna visualizzazione registrata nelle ultime ore. Il tracker è pronto ad accogliere i visitatori.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(trafficData.pages)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([path, count]) => {
                      const pct = trafficData.totalViews > 0 ? Math.round((count / trafficData.totalViews) * 100) : 0;
                      return (
                        <div key={path} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-gray-800 truncate max-w-[280px]">
                              {path === "/" ? "/ (Home Page)" : path}
                            </span>
                            <span className="font-semibold text-[#5E1788]">
                              {count} {count === 1 ? "visita" : "visite"} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-[#5E1788] to-[#D462A6]"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Aree Geografiche & Città */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-serif text-base font-bold text-[#1F1B24]">
                  Aree Geografiche Rilevate
                </h3>
                <span className="text-xs text-gray-400">Origine traffico Vercel</span>
              </div>

              {Object.keys(trafficData.cities || {}).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 font-light">
                  In attesa delle prime sessioni per mappare le aree geografiche.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(trafficData.cities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([city, count]) => {
                      const pct = trafficData.totalViews > 0 ? Math.round((count / trafficData.totalViews) * 100) : 0;
                      return (
                        <div key={city} className="flex items-center justify-between p-3 bg-[#FAF7FC] rounded-xl border border-[#E8DEF8]/60 text-xs">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-[#D462A6]" />
                            <span className="font-semibold text-gray-800">{city}</span>
                          </div>
                          <span className="font-bold text-[#5E1788]">
                            {count} visite ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="pt-2 text-[11px] text-gray-600 bg-purple-50/60 p-3 rounded-xl border border-purple-100/80 font-medium">
                💡 <strong>Nota Inaugurazione:</strong> I dati catturati prima della propagazione DNS possono essere visualizzati direttamente nel pannello <strong>Vercel ➔ Analytics / Logs</strong> dove ogni singola richiesta HTTP verso <code>sceltamakeup.it</code> è registrata all&apos;edge.
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSection === "sales" && (
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
                  Statistiche Vendite &amp; Ordini Reali
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20">
                  Dati di Produzione
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fatturato, ordini registrati, scontrini emessi da cassa RT e valore medio carrello.
              </p>
            </div>
          </div>

          {/* Top Metric Cards Vendite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Fatturato Ordini Reali</div>
              <div className="text-2xl font-bold text-[#1F1B24]">{formatEuro(kpis.totalRevenue)}</div>
              <div className="text-[11px] text-gray-400">
                {kpis.totalRevenue === 0 ? "In attesa delle prime vendite" : "Totale incassato"}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Numero Ordini Ricevuti</div>
              <div className="text-2xl font-bold text-[#1F1B24]">{kpis.ordersCount}</div>
              <div className="text-[11px] text-gray-400">
                {kpis.ordersCount === 0 ? "Nessun ordine di test attivo" : "Ordini processati"}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Valore Medio Carrello (AOV)</div>
              <div className="text-2xl font-bold text-[#1F1B24]">{formatEuro(kpis.averageOrderValue)}</div>
              <div className="text-[11px] text-gray-400">Calcolato su ordini reali</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-1">
              <div className="text-xs text-gray-500">Clienti Registrati in CRM</div>
              <div className="text-2xl font-bold text-[#5E1788]">{kpis.registeredCustomers}</div>
              <div className="text-[11px] text-[#7A3293]">Clienti verificati</div>
            </div>
          </div>

          {/* Box Informativo Stato Pulito */}
          {kpis.ordersCount === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center mx-auto">
                <Sparkles size={24} />
              </div>
              <h4 className="font-serif text-lg font-bold text-[#1F1B24]">
                Cockpit Pulito &amp; Pronto per la Produzione
              </h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Tutti gli ordini finti e i clienti di prova sono stati rimossi con successo. Il magazzino con i 341 prodotti ufficiali Diego della Palma e Cipria Make Up è allineato e pronto per registrare i primi incassi.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
