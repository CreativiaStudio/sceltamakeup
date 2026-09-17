"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import DashboardHome from "./DashboardHome";
import ProductCatalogTable from "./ProductCatalogTable";
import OrdersTable from "./OrdersTable";
import ShippingTable from "./ShippingTable";
import CrmTable from "./CrmTable";
import AppointmentsBridgeTab from "./AppointmentsBridgeTab";
import NotificationQueueTab from "./NotificationQueueTab";
import AnalyticsTab from "./AnalyticsTab";
import { AdminTab } from "@/types/admin";
import {
  getAdminKpis,
  getAdminOrders,
  AdminKpiSummary,
  SceltaAdminOrder,
} from "@/lib/adminStore";

const VALID_TABS: AdminTab[] = [
  "panoramica",
  "prodotti",
  "ordini",
  "spedizioni",
  "clienti",
  "appuntamenti",
  "notifiche",
  "analytics",
];

export default function AdminClientWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive active tab directly from URL query param with fallback to panoramica
  const queryTab = searchParams.get("tab") as AdminTab | null;
  const activeTab: AdminTab = queryTab && VALID_TABS.includes(queryTab) ? queryTab : "panoramica";

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [kpis, setKpis] = useState<AdminKpiSummary>(() => getAdminKpis());
  const [orders, setOrders] = useState<SceltaAdminOrder[]>(() => getAdminOrders());

  const handleTabChange = useCallback(
    (tab: AdminTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`/admin?${params.toString()}`);
    },
    [router, searchParams]
  );

  const refreshData = useCallback(() => {
    setKpis(getAdminKpis());
    setOrders(getAdminOrders());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener("scelta_admin_store_updated", handleUpdate);
    window.addEventListener("scelta_admin_store_reset", handleUpdate);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", handleUpdate);
      window.removeEventListener("scelta_admin_store_reset", handleUpdate);
    };
  }, [refreshData]);

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case "panoramica":
        return "Panoramica / Dashboard";
      case "prodotti":
        return "Catalogo & Giacenze Stock (341 Prodotti)";
      case "ordini":
        return "Ordini E-Commerce";
      case "spedizioni":
        return "Banco Spedizioni Corriere & Ritiro Salone";
      case "clienti":
        return "Clienti & CRM Omnichannel";
      case "appuntamenti":
        return "Appuntamenti Cabina & Cassa RT";
      case "notifiche":
        return "Coda WhatsApp Anti-Ban & Email Transazionali";
      case "analytics":
        return "Statistiche & Performance Vendite";
      default:
        return "Cockpit Amministrativo";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7FC] text-[#1F1B24] flex">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        kpis={kpis}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#D8C2E7]/40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-gray-600 hover:text-[#5E1788] hover:bg-[#5E1788]/10 lg:hidden transition-colors"
              aria-label="Apri menu laterale"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#5E1788]">
                  Scelta Makeup Cockpit
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 font-medium">
                  {getTabTitle(activeTab)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Right Badges & Indicators */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Storage Isolato Locale</span>
            </div>

            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-[#5E1788] text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5E1788]" />
              <span>DDL Supabase 9 Tabelle</span>
            </div>

            {/* Quick Public Link */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-gray-500 hover:text-[#5E1788] hover:bg-[#5E1788]/10 transition-colors"
              title="Apri e-commerce pubblico"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === "panoramica" && (
            <DashboardHome
              kpis={kpis}
              orders={orders}
              onNavigateTab={handleTabChange}
            />
          )}

          {activeTab === "prodotti" && <ProductCatalogTable />}

          {activeTab === "ordini" && <OrdersTable />}

          {activeTab === "spedizioni" && <ShippingTable />}

          {activeTab === "clienti" && <CrmTable />}

          {activeTab === "appuntamenti" && <AppointmentsBridgeTab />}

          {activeTab === "notifiche" && <NotificationQueueTab />}

          {activeTab === "analytics" && <AnalyticsTab kpis={kpis} />}
        </main>
      </div>
    </div>
  );
}
