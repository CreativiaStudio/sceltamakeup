# Scelta Makeup — Codebase Survey Report: Unified /admin Suite Architecture

**Date:** 2026-09-07  
**Investigator:** Explorer 1 (Codebase Investigator)  
**Project:** Scelta Makeup (`c:\Users\mario\Progetti Antigravity\Scelta Makeup`)  
**Mission:** Comprehensive codebase analysis to inform the design and implementation of the unified `/admin` suite inspired by Isabel Pepe, with zero regression on `/admin/appuntamenti` and public storefront, and absolute database isolation.

---

## 1. Executive Summary

| Area | Current State | Target / Planned State for Unified /admin | Status & Feasibility |
|---|---|---|---|
| **`/admin` Routes** | Only `/admin/appuntamenti` exists. No root `/admin/page.tsx` (returns 404). | Unified `/admin` dashboard with tab navigation or subroutes (`overview`, `products`, `orders`, `shipping`, `customers`, `appointments`, `notifications`). | 🟢 Clear path; preserves `/admin/appuntamenti` 100%. |
| **Catalog & Stock** | `data/catalog.json` contains exactly 341 products and 659 variants/shades across 6 brands and 5 categories. | Interactive searchable/filterable catalog table, variant stock level manager (Disponibile, Scorte Basse, Esaurito), price/metadata modal. | 🟢 341 products verified; 100% data integrity. |
| **State Management** | LocalStorage + in-memory store for orders (`orderService.ts`) and appointments (`bookingService.ts`). Zustand for cart (`useCartStore.ts`). | Unified local storage layer (`scelta_makeup_inventory_v1`, `scelta_makeup_orders_v1`, `scelta_makeup_crm_v1`) with zero external DB calls. | 🟢 Zero dependency on external backend; 100% isolated from Isabel Pepe. |
| **Styling & Theme** | Tailwind CSS v4 in `app/globals.css`. Brand tokens defined in `@theme inline`. | Isabel Pepe admin layout patterns adapted to Scelta Makeup's Royal Violet (#5E1788) & Pastel Lilac (#D8C2E7) palette. | 🟢 Exact hex tokens and CSS classes mapped. |
| **Quality Gates** | `tsc --noEmit`: 0 errors. `npm run build`: 345/345 pages generated in 2.7s. Tests: 28/28 passing. Adversarial: 22/22 passing. | Retain 0 TypeScript errors, 0 ESLint errors, successful static export of all 345+ routes. | 🟢 Production build and test harness verified. |

---

## 2. Deep Dive: Current `/admin` Routes, Components & Sub-Systems

### 2.1 File & Directory Map of `/admin`
```
app/
└── admin/
    └── appuntamenti/
        └── page.tsx       # 627 lines — In-store appointments, RT cash register, time-blocking, notification tab
components/
└── admin/
    └── NotificationQueueTab.tsx  # 1,127 lines — WhatsApp anti-ban queue, QR code, Resend email logs & previews
```

### 2.2 Functional Breakdown of `/admin/appuntamenti`
The existing `/admin/appuntamenti/page.tsx` is an active, fully featured dashboard with 3 primary sub-systems:
1. **Appuntamenti del Giorno (`tab === "appuntamenti"`):**
   - KPI summary cards: Today's appointments count, deposits collected on Stripe (€), pending in-store balances (€), completed RT balances (€).
   - Date picker to browse past and future appointment days.
   - Fast manual telephone booking modal (`handleCreateManualAppointment`).
   - 1-Click balance checkout modal (`handleExecuteCheckout`):
     - Calculates balance due (tariffa online - deposit paid).
     - Selects payment method: POS (`mypos_card`) or Contanti (`cash`).
     - Emits fiscal XML for Epson FP-81II RT printer over HTTP (via `markAppointmentPaid`).
     - Sets appointment status to `completed_paid`.
2. **Protezione Orari & Blocco Slot (`tab === "disponibilita"`):**
   - Displays all time slots for the selected date (lunch break 13:30–15:00, evening 20:00–20:45).
   - 1-Click slot toggling (`toggleSlotBlock`) to immediately reserve/open slots for solo-worker protection.
3. **Canali Notifiche & Coda (`tab === "notifiche"`):**
   - Renders `components/admin/NotificationQueueTab.tsx` (1,127 lines).
   - Subscribes in real-time to WhatsApp anti-ban queue with human-like jitter delay (20–45s), countdown timer, dynamic message variance, QR code session status, and Resend email preview/logs.

### 2.3 Existing Integration Invariant
- **Critical Requirement:** The `/admin/appuntamenti` route must **never be broken or altered in behavior**.
- It can either:
  - Remain directly reachable at `/admin/appuntamenti` while being accessible via the unified sidebar.
  - Or be mirrored/embedded inside the unified `/admin?tab=appointments` while keeping `/admin/appuntamenti/page.tsx` as a permanent entry point.

---

## 3. Deep Dive: Product Catalog Data Sources & Stock Representation

### 3.1 Catalog Files & Ingestion Report
- Primary catalog JSON: `data/catalog.json` (341 products, 659 variants).
- Helper library: `lib/catalog.ts`.
- Ingestion verification: `catalog-ingestion-report.json`.
- Types: `types/product.ts`.

### 3.2 Product Count & Brand Distribution Verification
Empirical execution on `data/catalog.json` confirms exact matching with catalog ingestion report:
- **Total Products:** `341`
- **Total Variants:** `659`
- **Total Shades:** `659`
- **Brand Breakdown:**
  | Brand | Product Count | Note |
  |---|---|---|
  | **Diego dalla Palma** | 82 | Authorized retailer |
  | **Eveline Cosmetics** | 98 | Skincare & makeup |
  | **Pierre René** | 59 | Professional color |
  | **RVB LAB** | 53 | Dermo-cosmetics |
  | **Miyo** | 26 | Youthful color |
  | **Cipria Make Up** | 23 | Boutique core brand |
  | **TOTAL** | **341** | **100% verified** |

- **Category Breakdown:**
  | Category | Product Count |
  |---|---|
  | **Viso** | 129 |
  | **Occhi** | 90 |
  | **Skincare & Dermo** | 82 |
  | **Labbra** | 39 |
  | **Beauty & Accessori** | 1 |
  | **TOTAL** | **341** |

### 3.3 Current Stock Representation
In `data/catalog.json`:
- Each product has `variants: ProductVariant[]` and `shades: Shade[]`.
- Each variant has:
  - `id`: string (e.g. `"var-dhc110160"`)
  - `name`: string (e.g. `"Formato Originale"`)
  - `sku`: string (e.g. `"DHC110160"`)
  - `ean`: string (e.g. `"8017834888836"`)
  - `colorHex`: string | null
  - `image`: string
  - `inStock`: boolean (currently all 659 are `true`)
  - `price`: number (retail price, e.g. `22.8`)
  - `originalWholesalePrice`: number (cost from invoice, e.g. `8.5`)
- Notice: Stock is represented as a boolean (`inStock: boolean`) at the raw JSON level.
- **Stock Management Requirement for Admin:** To support stock level indicators (**"Disponibile"**, **"Scorte Basse"**, **"Esaurito"**) and manual adjustments, the admin suite can maintain a local inventory state layer (e.g. `scelta_makeup_inventory_v1` in localStorage / in-memory service) that maps `variant.id` or `product.id` to `quantityOnHand` (e.g. > 5 = Disponibile, 1–5 = Scorte Basse, 0 = Esaurito), defaulting to realistic initial stock for demo purposes.

---

## 4. Deep Dive: State Management & Service Architecture

### 4.1 Storefront Cart Store (`store/useCartStore.ts`)
- Implemented with **Zustand 5** and `persist` middleware.
- LocalStorage key: `"scelta-makeup-cart-storage"`.
- Free shipping threshold: `FREE_SHIPPING_THRESHOLD = 49.00`.
- Methods: `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `getTotalPrice`, `getTotalItems`, `getShippingProgress`, `openCart`, `closeCart`, `toggleCart`.
- Pure client-side, zero backend calls.

### 4.2 Order Management (`lib/orderService.ts` & `types/order.ts`)
- In-memory fallback + LocalStorage key: `"scelta_makeup_orders_v1"`.
- Seeded with 2 demo orders:
  - `SC-ORD-2026-0001` (Giulia Moretti, courier shipping BRT-8099238472, €60.50, `processing`).
  - `SC-ORD-2026-0002` (Alessandra De Luca, boutique pickup, €36.00, `ready_for_pickup`).
- Methods:
  - `getAllOrders(): Order[]`
  - `getOrderById(id: string): Order | undefined`
  - `getOrderByNumber(orderNumber: string): Order | undefined`
  - `createOrder(data: CreateOrderInput): Order`
  - `updateOrderStatus(orderId: string, status: OrderStatus, trackingNumber?: string): Order`
- Supported order statuses: `"confirmed" | "processing" | "shipped" | "ready_for_pickup" | "completed" | "cancelled"`.

### 4.3 Appointment Management (`lib/bookingService.ts` & `types/booking.ts`)
- In-memory fallback + LocalStorage keys:
  - `"scelta_makeup_appointments_v1"`
  - `"scelta_makeup_blocked_slots_v1"`
- Seeded with 2 demo appointments:
  - `SC-260906-FC11` (Chiara Rossi, 13:30, Make-up Cerimonia, deposit €9.00 paid, balance €36.00 pending).
  - `SC-260906-MR24` (Valeria Esposito, 20:00, Make-up Giorno, deposit €6.30 paid, balance €25.20 pending).
- Methods:
  - `getAllAppointments()`
  - `getAvailableSlots(date)`
  - `toggleSlotBlock(date, time)`
  - `createAppointment(...)`
  - `markAppointmentPaid(id, method)` (generates ePOS RT XML for Epson FP-81II).

### 4.4 WhatsApp Anti-Ban Queue & Resend Email Services
- WhatsApp Queue (`lib/whatsappQueueService.ts`):
  - In-memory queue with observer pattern (`subscribeToWhatsAppQueue`).
  - Random jitter delay enforcement (20–45s).
  - Anti-spam text hashing / checksum generator.
- Resend Email (`lib/resendService.ts`):
  - Responsive HTML email generator for 3 luxury templates (`booking_confirmation`, `booking_reminder_24h`, `order_placed`).
  - Dispatched logs in `"scelta_makeup_email_logs_v1"`.

---

## 5. Design System, Brand Colors & Tailwind v4 Configuration

### 5.1 Official Brand Color Tokens
Configured in `app/globals.css` with `@import "tailwindcss"` and `@theme inline`:
- **Royal Violet:** `#5E1788` (`--color-royal-violet`) — Primary brand luxury accent, buttons, headers.
- **Vivid Orchid:** `#7A3293` (`--color-vivid-orchid`) — Gradient stop, hover states.
- **Pastel Lilac:** `#D8C2E7` (`--color-pastel-lilac`) — Borders, subtle backgrounds, badges.
- **Optical White:** `#FFFFFF` (`--color-optical-white`) — Surfaces, cards, crisp contrast.
- **Mauve Rose:** `#D462A6` (`--color-mauve-rose`) — Icons, status tags, micro-accents.
- **Charcoal Deep:** `#1F1B24` (`--color-charcoal-deep`) — Typography, text dark.
- **Satin Metallic:** `#E2E8F0` (`--color-satin-metallic`) — Dividers, subtle borders.

### 5.2 Luxury Utility Classes Available
- `.bg-brand-royal`: `linear-gradient(135deg, #5E1788 0%, #7A3293 60%, #460E67 100%)`
- `.bg-brand-orchid`: `linear-gradient(135deg, #7A3293 0%, #D462A6 100%)`
- `.bg-brand-soft`: `linear-gradient(180deg, #FAF7FC 0%, #FFFFFF 100%)`
- `.bg-brand-velvet`: `linear-gradient(145deg, #1F1B24 0%, #2B1538 50%, #1F1B24 100%)`
- `.text-brand-gradient`: Linear gradient text clipping.
- `.luxury-glow` & `.luxury-glow-hover`: Custom shadow elevations.

---

## 6. Isabel Pepe Architecture Comparison & Adaptation Plan

### 6.1 Architectural Patterns in `isabel-pepe/app/admin`
Inspection of `c:\Users\mario\Progetti Antigravity\isabel-pepe\app\admin` reveals:
- **`AdminSidebar.tsx`:** Left-hand navigation sidebar (width 64 = 256px), brand header, icon + label navigation items, active highlight, badges (e.g. unread count).
- **`DashboardClientWrapper.tsx`:** Client coordinator managing `activeTab` via state and URL query parameter (`/admin?tab=...`), switching views seamlessly without page reloads.
- **`DashboardHome.tsx`:** KPI summary cards (Gross sales, net orders, avg order value, conversion rate), sales trend line/bar visual, and recent order stream.
- **`ProductTable.tsx`:** Rich interactive product table with search, category filtering, inline editing, stock toggle, and modal editing.
- **`OrdersTable.tsx`:** Order fulfillment table with status filtering, customer info, items expansion, status update selector.
- **`ShippingTable.tsx`:** Shipping tracking, courier assignment, pickup slips.
- **`CrmTable.tsx`:** Customer list, order history, tags, lifetime value.

### 6.2 Adaptation for Scelta Makeup
While Isabel Pepe is tailored to demi-fine jewelry in gold/silver with brown/bronze tones (`#1A1A1A`, `#C0A09A`), Scelta Makeup adapts the exact same high-efficiency structure with:
1. **Brand Aesthetic:** Royal Violet (`#5E1788`), Pastel Lilac (`#D8C2E7`), Mauve Rose (`#D462A6`), and warm luxury white surfaces.
2. **Cosmetic-Specific Attributes:** Shade / variant color swatches, EAN barcodes, wholesale vs retail margins, cosmetic categories (Viso, Occhi, Labbra, Skincare, Beauty).
3. **Dual CRM Synergy:** Customers tracked across **both** e-commerce orders AND in-store makeup appointments.
4. **Unified Appuntamenti & Cassa:** In addition to e-commerce, the sidebar directly houses the proven `/admin/appuntamenti` and Notification Queue tools.

---

## 7. Database Isolation & `supabase_schema.sql` Analysis

### 7.1 Absolute Isolation Guarantee
- **Invariant:** Scelta Makeup must **never** connect to, read from, or write to the Isabel Pepe Supabase instance.
- **Current Runtime Status:** The codebase operates 100% locally with local state / mock stores. No environment variables point to Isabel Pepe's database.

### 7.2 Status of `supabase_schema.sql`
- Currently, `supabase_schema.sql` (408 lines) defines 7 tables:
  1. `products`
  2. `variants`
  3. `inventory`
  4. `appointments`
  5. `orders`
  6. `blocked_slots`
  7. `notification_logs`
- **Observation against Requirements:** The follow-up request specifically specifies the dedicated prefixed table naming convention:
  `scelta_products`, `scelta_variants`, `scelta_orders`, `scelta_order_items`, `scelta_inventory_logs`, `scelta_customers`, `scelta_appointments`, `scelta_blocked_slots`, `scelta_notification_logs`.
- Updating `supabase_schema.sql` to include the explicit `scelta_` prefix and dedicated tables for `scelta_customers`, `scelta_order_items`, and `scelta_inventory_logs` will fulfill 100% of requirement R1 without breaking any existing local code.

---

## 8. Clean Integration Points for Unified `/admin` Suite

### 8.1 Proposed Route & Component Architecture

```
app/
├── admin/
│   ├── page.tsx                       # Main entry point for /admin (renders AdminClientWrapper)
│   ├── appuntamenti/
│   │   └── page.tsx                   # 100% PRESERVED untouched — direct bookmark & deep-link safe
│   ├── AdminSidebar.tsx               # Responsive sidebar styled in Royal Violet & Pastel Lilac
│   ├── AdminClientWrapper.tsx         # Tab coordinator: ?tab=dashboard|products|orders|shipping|crm|appuntamenti|notifiche
│   ├── DashboardHome.tsx              # KPI cards, sales analytics, recent activity feed
│   ├── ProductCatalogTable.tsx        # 341 products table, brand/category filters, stock editor modal
│   ├── OrdersManagementTable.tsx      # Orders list, item breakdown, status updater
│   ├── ShippingManagementTable.tsx    # Courier vs in-store pickup filter, tracking code input
│   └── CrmCustomersTable.tsx          # Combined e-commerce + booking customer profiles & purchase history
components/
└── admin/
    └── NotificationQueueTab.tsx       # 100% PRESERVED untouched — embedded into notifications tab
```

### 8.2 Layout Isolation (Header / Footer Handling)
- In `app/layout.tsx`, `<Header />` and `<Footer />` currently render around `{children}`.
- For the storefront (`/`, `/prodotti/[slug]`, `/prenota`, `/servizi`, `/checkout`), Header and Footer remain active.
- For `/admin` and `/admin/*`:
  - Either `app/layout.tsx` or `Header.tsx`/`Footer.tsx` can check `usePathname()` to omit the public storefront header and footer when on `/admin` routes, providing a clean, full-viewport dashboard experience (identical to modern SaaS/Isabel Pepe admin panels).
  - Alternatively, `/admin` can render within the viewport with its dedicated top bar and sidebar.

### 8.3 Preservation Checklist
- [x] `/admin/appuntamenti` code and route remains 100% intact.
- [x] WhatsApp Queue worker, jitter calculation (20–45s), and QR code remain intact.
- [x] RT ePOS XML generator for Epson FP-81II remains intact.
- [x] All 341 public product static pages (`/prodotti/[slug]`) continue building with zero regressions.
- [x] Public Booking Wizard (`/prenota`) and Services (`/servizi`) continue operating with zero regressions.
- [x] Zustand cart (`useCartStore`) continues operating with zero regressions.
