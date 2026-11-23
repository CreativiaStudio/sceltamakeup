"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  ExternalLink,
  Barcode,
  Unlock,
  Receipt,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Lock,
  Smartphone,
  X,
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
import ActivityLogTab from "./ActivityLogTab";
import QuickScanBarcodeModal from "./QuickScanBarcodeModal";
import CatalogSyncIndicator from "./CatalogSyncIndicator";
import ServicesManagementTab from "./ServicesManagementTab";
import CouponsManagementTab from "./CouponsManagementTab";
import { AdminTab } from "@/types/admin";
import { startAuditOutboxAutoFlush } from "@/lib/auditLogger";
import { detectPwaEnvironment } from "@/lib/pwaUtils";
import {
  getAdminKpis,
  getAdminOrders,
  useAdminCatalogSync,
  AdminKpiSummary,
  SceltaAdminOrder,
} from "@/lib/adminStore";

const VALID_TABS: AdminTab[] = [
  "panoramica",
  "prodotti",
  "ordini",
  "spedizioni",
  "clienti",
  "pacchetti",
  "promozioni",
  "appuntamenti",
  "notifiche",
  "registro",
  "analytics",
];

export default function AdminClientWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Real-time multi-device cloud sync of catalog overrides & giacenze.
  useAdminCatalogSync();

  // Scatola nera: coda persistente con reinvio automatico (nessun evento perso).
  useEffect(() => startAuditOutboxAutoFlush(), []);

  // Derive active tab directly from URL query param with fallback to panoramica
  const queryTab = searchParams.get("tab") as AdminTab | null;
  const activeTab: AdminTab = queryTab && VALID_TABS.includes(queryTab) ? queryTab : "panoramica";

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [kpis, setKpis] = useState<AdminKpiSummary>(() => getAdminKpis());
  const [orders, setOrders] = useState<SceltaAdminOrder[]>(() => getAdminOrders());
  const [multiCartCount, setMultiCartCount] = useState<number>(0);
  const [showMobileAppBanner, setShowMobileAppBanner] = useState<boolean>(false);

  useEffect(() => {
    queueMicrotask(() => {
      const env = detectPwaEnvironment();
      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem("scelta_admin_pwa_banner_dismissed") === "1";
      } catch {
        dismissed = false;
      }
      setShowMobileAppBanner(!env.isStandalone && !dismissed);
    });
  }, []);

  const dismissMobileAppBanner = () => {
    setShowMobileAppBanner(false);
    try {
      sessionStorage.setItem("scelta_admin_pwa_banner_dismissed", "1");
    } catch {
      // ignore
    }
  };

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
      case "pacchetti":
        return "Pacchetti & Servizi Web (/prenota)";
      case "promozioni":
        return "Coupon Promozionali & Locandine QR";
      case "appuntamenti":
        return "Appuntamenti Cabina & Cassa RT";
      case "notifiche":
        return "Coda WhatsApp Anti-Ban & Email Transazionali";
      case "registro":
        return "Registro Attività & Cassa (Scatola Nera)";
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
            {/* Quick Barcode Scanner Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open_quick_scan_modal", { detail: "" })
                );
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5E1788] border border-purple-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Apri cassa e scanner barcode"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Barcode / Cassa</span>
            </button>

            {/* Quick Scontrino Multiplo Trigger if items present */}
            {multiCartCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open_multi_receipt_modal"));
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 text-xs font-bold transition-all shadow-md animate-pulse cursor-pointer active:scale-95"
                title="Apri scontrino multiplo in corso"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-300" />
                <span>Scontrino ({multiCartCount})</span>
              </button>
            )}

            {/* Quick Open Drawer Trigger (Solo Desktop Salone — hardware Epson RT locale) */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open_cash_drawer"));
              }}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Invia impulso elettrico alla cassa Epson per aprire il cassetto rendiresto"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Apri Cassetto</span>
            </button>

            {/* Mobile Lock Cockpit Button */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("scelta_admin_lock_request"));
              }}
              className="lg:hidden p-2 rounded-xl bg-[#1F1B24] text-white hover:bg-[#5E1788] transition-colors shadow-xs cursor-pointer"
              aria-label="Blocca Cockpit"
              title="Blocca Cockpit"
            >
              <Lock className="w-4 h-4 text-[#D462A6]" />
            </button>

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
        <main className="flex-1 p-4 sm:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {/* Mobile Install App Banner (nascosto se già aperta come App standalone) */}
          {showMobileAppBanner && (
            <div className="lg:hidden mb-4 rounded-2xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] text-white p-3.5 shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-[#D8C2E7]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-snug">
                    Aggiungi il Gestionale alla Home del tuo iPhone
                  </p>
                  <p className="text-[11px] text-[#D8C2E7] truncate">
                    Accesso diretto 1-tap senza refare il login
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("open_install_app_modal", { detail: { mode: "admin" } })
                    );
                  }}
                  className="px-3 py-1.5 rounded-full bg-white text-[#5E1788] text-xs font-bold shadow-xs hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  Salva App
                </button>
                <button
                  type="button"
                  onClick={dismissMobileAppBanner}
                  aria-label="Chiudi suggerimento App"
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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

          {activeTab === "pacchetti" && <ServicesManagementTab />}

          {activeTab === "promozioni" && <CouponsManagementTab />}

          {activeTab === "appuntamenti" && <AppointmentsBridgeTab />}

          {activeTab === "notifiche" && <NotificationQueueTab />}

          {activeTab === "registro" && <ActivityLogTab />}

          {activeTab === "analytics" && <AnalyticsTab kpis={kpis} />}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (App-style iPhone navigation) */}
      <nav
        aria-label="Navigazione rapida mobile gestionale"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D8C2E7]/60 shadow-[0_-4px_20px_rgba(94,23,136,0.08)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16">
          <button
            type="button"
            onClick={() => handleTabChange("panoramica")}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === "panoramica" ? "text-[#5E1788]" : "text-gray-500"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("ordini")}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === "ordini" ? "text-[#5E1788]" : "text-gray-500"
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {kpis.pendingOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#D462A6] text-white text-[9px] font-bold flex items-center justify-center">
                  {kpis.pendingOrdersCount}
                </span>
              )}
            </div>
            <span>Ordini</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("prodotti")}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === "prodotti" ? "text-[#5E1788]" : "text-gray-500"
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Catalogo</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("clienti")}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === "clienti" ? "text-[#5E1788]" : "text-gray-500"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Clienti</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-gray-500 hover:text-[#5E1788] transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Global Hardware Barcode Scanner Listener & Modal */}
      <QuickScanBarcodeModal />
      <CatalogSyncIndicator />
    </div>
  );
}
