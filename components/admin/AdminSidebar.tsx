"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Calendar,
  Radio,
  BarChart3,
  ExternalLink,
  Sparkles,
  X,
  Store,
  Printer,
} from "lucide-react";
import { AdminTab } from "@/types/admin";
import { AdminKpiSummary } from "@/lib/adminStore";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  kpis?: AdminKpiSummary;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  category?: string;
}

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  kpis,
}: AdminSidebarProps) {
  const navItems: NavItem[] = [
    {
      id: "panoramica",
      label: "Panoramica",
      icon: LayoutDashboard,
      category: "Gestione Principale",
    },
    {
      id: "prodotti",
      label: "Catalogo & Stock",
      icon: Package,
      badge: kpis?.lowStockCount ? `${kpis.lowStockCount} scorte` : "341",
      badgeColor: kpis?.lowStockCount ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-purple-100 text-purple-800 border-purple-200",
      category: "Gestione Principale",
    },
    {
      id: "ordini",
      label: "Ordini E-Commerce",
      icon: ShoppingCart,
      badge: kpis?.pendingOrdersCount ? `${kpis.pendingOrdersCount} nuovi` : undefined,
      badgeColor: "bg-[#D462A6]/20 text-[#5E1788] border-[#D462A6]/30",
      category: "Gestione Principale",
    },
    {
      id: "spedizioni",
      label: "Spedizioni & Ritiro",
      icon: Truck,
      badge: kpis?.readyForPickupCount ? `${kpis.readyForPickupCount} ritiro` : undefined,
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      category: "Gestione Principale",
    },
    {
      id: "clienti",
      label: "Clienti & CRM",
      icon: Users,
      badge: kpis?.registeredCustomers ? `${kpis.registeredCustomers}` : undefined,
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      category: "Gestione Principale",
    },
    {
      id: "appuntamenti",
      label: "Appuntamenti & Cassa RT",
      icon: Calendar,
      category: "Store & Servizi",
    },
    {
      id: "notifiche",
      label: "Coda WhatsApp & Email",
      icon: Radio,
      badge: "Anti-Ban",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      category: "Store & Servizi",
    },
    {
      id: "analytics",
      label: "Statistiche Vendite",
      icon: BarChart3,
      category: "Analisi & Report",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-[#1F1B24]/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#5E1788] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#7A3293]/80 flex items-center justify-between bg-[#531478]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D462A6] to-[#7A3293] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#5E1788] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#D8C2E7]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-lg font-bold tracking-wide text-white">
                  Scelta Makeup
                </span>
                <span className="text-[10px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#D462A6]/40 text-[#D8C2E7] border border-[#D462A6]/40">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-[#D8C2E7]/80 tracking-wider">
                Cockpit Salone Napoli
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#D8C2E7] hover:text-white hover:bg-[#7A3293] lg:hidden"
            aria-label="Chiudi menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Chip: Local Isolated Engine */}
        <div className="px-5 py-2.5 bg-[#4B126D] border-b border-[#7A3293]/50 flex items-center justify-between text-[11px] text-[#D8C2E7]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Storage Isolato</span>
          </div>
          <span className="text-[10px] text-[#D8C2E7]/70 font-mono">
            341 Prodotti
          </span>
        </div>

        {/* Navigation Tabs List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-[#7A3293]">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isFirstOfCategory =
              idx === 0 || navItems[idx - 1].category !== item.category;

            return (
              <React.Fragment key={item.id}>
                {isFirstOfCategory && item.category && (
                  <div className="pt-3 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#D8C2E7]/60">
                    {item.category}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-left ${
                    isActive
                      ? "bg-white text-[#5E1788] shadow-md shadow-[#4B126D]/50 font-semibold"
                      : "text-[#D8C2E7] hover:text-white hover:bg-[#7A3293]/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? "text-[#5E1788]" : "text-[#D8C2E7]"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${
                        isActive
                          ? "bg-[#5E1788]/10 text-[#5E1788] border-[#5E1788]/20"
                          : item.badgeColor || "bg-[#7A3293] text-white border-transparent"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#7A3293]/80 bg-[#531478]/80 space-y-2">
          {/* Quick Cassa RT Test Button */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("open_quick_scan_modal", { detail: "8000000000015" })
              );
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-[#D462A6]" />
            <span>🧾 Prova Scontrino 1€</span>
          </button>

          {/* Public Store Link */}
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[#D8C2E7] hover:text-white hover:bg-[#7A3293] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-[#D462A6]" />
              <span>Vedi Salone Online</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Link>

          {/* Physical Address */}
          <div className="pt-1 text-[10px] text-center text-[#D8C2E7]/60">
            Via dei Pellegrini 28/29, Napoli
          </div>
        </div>
      </aside>
    </>
  );
}
