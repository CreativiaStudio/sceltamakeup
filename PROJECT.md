# Project: Scelta Makeup E-Commerce Admin Suite

## Architecture
The E-Commerce Administration Suite for Scelta Makeup (`/admin`) is built as a unified, responsive client-side SPA within Next.js App Router, inspired by the architecture of Isabel Pepe while strictly isolated from its database.

### System Components:
1. **Database Schema (`supabase_schema.sql` at root)**:
   - Completely autonomous, idempotent PostgreSQL DDL for a future dedicated Scelta Makeup Supabase project.
   - All tables prefixed with `scelta_`:
     - `scelta_customers`
     - `scelta_products`
     - `scelta_variants`
     - `scelta_inventory`
     - `scelta_inventory_logs`
     - `scelta_orders`
     - `scelta_order_items`
     - `scelta_appointments`
     - `scelta_blocked_slots`
     - `scelta_notification_logs`
   - Includes automatic triggers (`updated_at`, inventory deduction), barcode indexes for ePOS scanner, and complete RLS policies.
   - Zero connection, zero credentials, zero shared tables with Isabel Pepe.

2. **Isolated Local Storage Engine (`lib/adminStore.ts`)**:
   - Zero external cloud dependency during development/offline mode.
   - Manages inventory for all 341 catalog products and 659 variants.
   - Manages e-commerce orders (courier delivery and in-store boutique pickup).
   - Manages omnichannel CRM profiles (combining e-commerce orders and salon appointments).
   - Atomic localStorage persistence with 1-click factory reset.

3. **Admin Shell & Navigation (`/admin`)**:
   - Responsive sidebar styled with official Scelta Makeup brand tokens:
     - Royal Violet: `#5E1788`
     - Vivid Orchid: `#7A3293`
     - Pastel Lilac: `#D8C2E7`
     - Mauve Rose: `#D462A6`
     - Optical White: `#FFFFFF`
   - Coordinated tab routing (`?tab=...`) with persistent client state:
     - `panoramica` (Executive Dashboard & Sales KPIs)
     - `prodotti` (Catalog of 341 Products & Stock Management)
     - `ordini` (Order Management & Status State Machine)
     - `spedizioni` (Courier Dispatch & In-Store Pickup Desk)
     - `clienti` (Omnichannel CRM & Customer Profiles)
     - `appuntamenti` (Full In-Store Appointments & RT Cash Register)
     - `notifiche` (WhatsApp Anti-Ban Queue & Transactional Email Logs)
     - `analytics` (Sales & Conversion Performance)

4. **Preserved Modules**:
   - `/admin/appuntamenti` remains 100% intact and functional (RT ePOS XML, WhatsApp queue with 20-45s human jitter, Resend email logs, slot blocking).
   - Public storefront (`/`, `/prodotti/[slug]`, `/prenota`, `/servizi`, Zustand cart) remains 100% unregressed.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Standalone Supabase DDL | Complete DDL schema with `scelta_` prefix, RLS, triggers, indexes in `supabase_schema.sql` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Offline Mock Storage Engine | `lib/adminStore.ts` with inventory, orders, CRM, and reset capability | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Responsive Admin Shell & Sidebar | `/admin` layout with brand palette (#5E1788, #D8C2E7, #D462A6), collapsible mobile sidebar | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Distraction-Free Admin Layout | Clean admin view bypassing public storefront header/footer on `/admin` routes | M2 | Codebase Survey |
| 5 | Executive KPI Cards | Total Revenue, Orders Processed, Average Order Value, Registered Customers, Low Stock Alerts | M3 | ORIGINAL_REQUEST §R2 |
| 6 | Sales Trends & Orders Feed | Interactive revenue/order charts and recent orders stream | M3 | ORIGINAL_REQUEST §R2 |
| 7 | 341 Products Catalog Table | Interactive table for 341 products with pagination, search, and image previews | M4 | ORIGINAL_REQUEST §R2 |
| 8 | Multi-Brand & Category Filters | Filters for 6 brands (Diego dalla Palma, Eveline, Pierre René, RVB LAB, Miyo, Cipria) and 5 categories | M4 | ORIGINAL_REQUEST §R2 |
| 9 | Variant & Shade Stock Manager | Stock indicators ("Disponibile", "Scorte Basse", "Esaurito"), color swatches, stock count edit modal | M4 | ORIGINAL_REQUEST §R2 |
| 10 | Order Management & State Machine | Orders table with states: In Elaborazione, Spedito con Corriere Tracciato, Pronto per Ritiro in Boutique, Completato, Annullato | M5 | ORIGINAL_REQUEST §R2 |
| 11 | Shipping & Boutique Pickup Desk | Dedicated shipping actions: 1-click clipboard address, tracking number entry, pickup readiness toggle | M5 | ORIGINAL_REQUEST §R2 |
| 12 | Omnichannel Customer CRM | Customer list with aggregated spend (orders + appointments), beauty notes, and 1-click WhatsApp link | M6 | ORIGINAL_REQUEST §R2 |
| 13 | Appuntamenti & RT Cash Integration | 100% intact embedding/linking of `/admin/appuntamenti` (Epson FP-81II RT XML, slot locks, deposits) | M6 | ORIGINAL_REQUEST §R2 |
| 14 | WhatsApp Anti-Ban & Email Queue Integration | Direct access to the live WhatsApp queue monitor and transactional email logs | M6 | ORIGINAL_REQUEST §R2 |
| 15 | E2E Testing Suite (Tiers 1-4) | Opaque-box test suite verifying all admin features, catalog filters, stock states, and isolation | Test Track | Dual Track Mandate |
| 16 | Final Adversarial Hardening & Build Verification | Tier 5 adversarial tests, zero error `tsc`, `lint`, and 346 static page build | M7 | ORIGINAL_REQUEST §R3 |
| 17 | R1 Catalog Image Remediation | Zero mismatch: replace 38 matita-31 clones and DDP skincare placeholders with real packshots, update `data/catalog.json` | M_R1 | ORIGINAL_REQUEST 2026-09-15 |
| 18 | R2 Product Full Editor | Full photo gallery, texts, SKU/EAN, price, stock per variant, atomic persistence in `lib/adminStore.ts` | M_R2 | ORIGINAL_REQUEST 2026-09-15 |
| 19 | R3 Orders & Quick Tracking | Printable packing slip modal, manual order form, clickable courier tracking (BRT/GLS/DHL/Poste) & 1-click WhatsApp | M_R3 | ORIGINAL_REQUEST 2026-09-15 |
| 20 | R4 Site Tracking & Analytics | Pixel infrastructure (GA4, GTM, Meta Pixel/CAPI), live events log, interactive event simulator | M_R4 | ORIGINAL_REQUEST 2026-09-15 |
| 21 | R5 Multi-Operator Hourly Agenda | Hourly slot grid (09:30-20:30), Federica Cesiano vs Cabina Estetica, quick filter, al-volo booking, 20%/80% deposit, Epson FP-81II RT | M_R5 | ORIGINAL_REQUEST 2026-09-15 |
| 22 | R6 E2E Test Suite & Gate | Extend `tests/e2e-admin-suite.test.ts` to validate R1-R5, run Reviewers, Challengers, Forensic Auditor | M_TEST | ORIGINAL_REQUEST 2026-09-15 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Suite | Create test infrastructure (`TEST_INFRA.md`) and automated test runner covering all requirements | None | DONE |
| M1 | Standalone Schema DDL & Mock Store | Deliver `supabase_schema.sql` (10 `scelta_*` tables) and `lib/adminStore.ts` | None | DONE |
| M2 | Admin Shell & Navigation | Implement `app/admin/page.tsx`, `AdminSidebar.tsx`, `AdminClientWrapper.tsx` | M1 | DONE |
| M3 | Executive KPI & Analytics Dashboard | Implement `DashboardHome.tsx` (KPIs, charts, recent orders feed) | M2 | DONE |
| M4 | Products Catalog & Stock Manager | Implement `ProductCatalogTable.tsx`, filter pills, variant stock edit modal | M1, M2 | DONE |
| M5 | Orders & Shipping Management | Implement `OrdersTable.tsx` and `ShippingTable.tsx` | M1, M2 | DONE |
| M6 | Omnichannel CRM & Appointments Bridge | Implement `CrmTable.tsx` and integrate `/admin/appuntamenti` & WhatsApp queue | M1, M2, M5 | DONE |
| M7 | Final E2E Verification & Adversarial Gate | Pass 100% E2E tests, pass adversarial challenger, verify `tsc`, `lint`, `build` | M0-M6 | DONE |
| M_R1 | R1 Catalog Image Remediation | Eliminate 38 matita labbra clones, fetch/download HD packshots for 93 products, update `data/catalog.json` | None | IN_PROGRESS |
| M_R2 | R2 Product Full Editor | Full editor modal (photos, texts, variants/SKU/EAN/stock), atomic store overrides, sync `/prodotti/[slug]` | None | IN_PROGRESS |
| M_R3 | R3 Orders & Quick Tracking | Printable packing slip modal, manual order modal, clickable courier URLs & 1-click WhatsApp notification | None | IN_PROGRESS |
| M_R4 | R4 Site Tracking & Analytics | Pixel infrastructure, GA4/GTM/Meta IDs, live events log & simulator in `/admin?tab=analytics` | None | IN_PROGRESS |
| M_R5 | R5 Multi-Operator Hourly Agenda | Hourly slot grid (09:30-20:30), Federica Cesiano vs Cabina Estetica, quick filter, al-volo booking, 20%/80% deposit, Epson FP-81II RT | None | IN_PROGRESS |
| M_TEST | R6 E2E Test Suite & Gate | Extend `tests/e2e-admin-suite.test.ts` for R1-R5, Reviewers, Challengers, Forensic Auditor | M_R1-M_R5 | PLANNED |

---

## Interface Contracts

### 1. Storage Contract (`lib/adminStore.ts`)
```typescript
export interface SceltaVariantStock {
  variantId: string;
  productId: string;
  sku: string;
  ean?: string;
  name: string;
  colorHex?: string;
  stockQuantity: number;
  stockStatus: 'available' | 'low_stock' | 'out_of_stock';
  price: number;
  originalWholesalePrice?: number;
}

export interface SceltaAdminOrder {
  id: string; // e.g. "SC-ORD-2026-0001"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: 'processing' | 'shipped' | 'ready_for_pickup' | 'completed' | 'cancelled';
  fulfillmentType: 'courier' | 'store_pickup';
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    province: string;
  };
  trackingCode?: string;
  courierName?: string;
  items: Array<{
    productId: string;
    productTitle: string;
    variantName?: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SceltaCrmCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpend: number;
  ordersCount: number;
  appointmentsCount: number;
  lastActive: string;
  notes: string;
  skinType?: string;
  preferredBrands?: string[];
}
```

### 2. Admin Tab Contract
```typescript
export type AdminTab = 
  | 'panoramica'
  | 'prodotti'
  | 'ordini'
  | 'spedizioni'
  | 'clienti'
  | 'appuntamenti'
  | 'notifiche'
  | 'analytics';
```

---

## Code Layout
- `supabase_schema.sql` — Dedicated PostgreSQL DDL schema with `scelta_` prefix (10 tables, triggers, RLS, indexes).
- `lib/adminStore.ts` — Isolated local storage engine for admin mock data & stock management.
- `app/admin/page.tsx` — Root entry point for `/admin` dashboard.
- `app/admin/layout.tsx` — Dedicated admin layout container.
- `components/admin/AdminSidebar.tsx` — Responsive brand sidebar navigation.
- `components/admin/AdminClientWrapper.tsx` — Tab switcher and shared admin state coordinator.
- `components/admin/DashboardHome.tsx` — Executive KPI cards, SVG charts, and recent activity.
- `components/admin/ProductCatalogTable.tsx` — 341 products table with brand/category filters and stock levels.
- `components/admin/ProductStockModal.tsx` — Edit price and stock per variant/shade.
- `components/admin/OrdersTable.tsx` — Order status transitions and details.
- `components/admin/ShippingTable.tsx` — Courier tracking, address copy, and store pickup readiness.
- `components/admin/CrmTable.tsx` — Unified customer LTV, beauty notes, and WhatsApp launcher.
- `app/admin/appuntamenti/page.tsx` — Preserved 100% intact (RT ePOS XML, WhatsApp anti-ban queue, slot locks).
- `components/admin/NotificationQueueTab.tsx` — Preserved 100% intact.
- `tests/e2e-admin-suite.test.ts` — E2E opaque-box test suite for the admin suite.
- `tests/adversarial-admin-store.test.ts` — Adversarial stress tests on state and stock.
- `tests/adversarial-storefront-regression.test.ts` — Adversarial regression and layout tests.
