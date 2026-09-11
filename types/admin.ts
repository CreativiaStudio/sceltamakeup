/**
 * Scelta Makeup — Unified Admin Suite Type Definitions
 * Module: types/admin.ts
 */

import {
  SceltaVariantStock,
  SceltaAdminOrder,
  SceltaCrmCustomer,
  AdminKpiSummary,
} from "@/lib/adminStore";

export type AdminTab =
  | "panoramica"
  | "prodotti"
  | "ordini"
  | "spedizioni"
  | "clienti"
  | "appuntamenti"
  | "notifiche"
  | "analytics";

export interface AdminTabItem {
  id: AdminTab;
  label: string;
  badge?: string | number;
  iconName: string;
  group?: "commerce" | "salon" | "settings";
}

export type {
  SceltaVariantStock,
  SceltaAdminOrder,
  SceltaCrmCustomer,
  AdminKpiSummary,
};
