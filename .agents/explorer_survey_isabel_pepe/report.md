# Scelta Makeup — Reference Architecture Survey & Admin Suite Blueprint
**Investigator:** Explorer 2 (Reference Architecture Investigator)  
**Date:** September 7, 2026  
**Reference Source:** Isabel Pepe E-Commerce Platform (`c:\Users\mario\Progetti Antigravity\isabel-pepe` and `C:\Users\mario\.gemini\config\skills\isabel_pepe`)  
**Target Project:** Scelta Makeup (`c:\Users\mario\Progetti Antigravity\Scelta Makeup`)  
**Status:** Completed  

---

## 1. Executive Summary & Core Objectives

This investigation analyzes the backend and administration architecture of **Isabel Pepe** (luxury jewelry e-commerce developed by Mario and Elena) to extract best practices, UI/UX patterns, state machines, and component hierarchies, and to adapt them specifically for **Scelta Makeup** (Federica Cesiano's cosmetics boutique and beauty salon in Naples, Via dei Pellegrini 28/29).

### Key Architectural Takeaways:
1. **Unified Administration Shell:** Isabel Pepe uses a high-performance Next.js App Router admin architecture (`app/admin/page.tsx`, `AdminSidebar.tsx`, `DashboardClientWrapper.tsx`) that consolidates orders, catalog, logistics, CRM, and analytics into a cohesive, tab-driven workspace with instant URL synchronization (`/admin?tab=...`).
2. **Deterministic State Machine:** Orders move through an explicit, auditable lifecycle (`pending` → `paid` → `shipped` → `delivered`), where state transitions trigger automated side effects (email confirmations, tracking code assignment, and status logging).
3. **Rapid Catalog & Inventory Control:** The catalog table couples high-density data visualization with inline cell editing (quick price, discount, and stock adjustments without leaving the table), instant visibility toggles, and dedicated modals/panels for comprehensive metadata and multi-slot media management.
4. **CRM with Omnichannel Context:** Isabel Pepe tracks customers with lifetime value (LTV), order frequency, acquisition sources, marketing tags, staff internal notes, and direct 1-click WhatsApp messaging.
5. **Absolute Database Isolation:** Scelta Makeup must **never** connect to, read from, or write to Isabel Pepe's Supabase instance. All Scelta Makeup admin workflows must run on an isolated, autonomous data layer (local JSON/localStorage mock service, fully compatible with the dedicated `supabase_schema.sql` prepared for Scelta Makeup).

---

## 2. Deep Dive: Isabel Pepe Admin Architecture Analysis

### 2.1 Navigation & Workspace Shell
- **Entry Point (`app/admin/page.tsx`):**
  - Next.js Server Component with `export const revalidate = 0` to prevent stale caches.
  - Server-side auth guard: validates admin email session before querying data.
  - Parallel data fetching across Supabase tables (`products`, `orders`, `customers`, `abandoned_carts`, `cookie_consents`, `daily_analytics`, `support_messages`, `page_views`).
  - Graceful fallback: handles paused or offline Supabase instances gracefully.
  - Delegates rendering to `DashboardClientWrapper.tsx`.
- **Sidebar Navigation (`AdminSidebar.tsx`):**
  - Fixed left sidebar (`w-64 bg-white border-r border-gray-100 h-screen`).
  - Typography: Serif branding header (`font-serif text-2xl tracking-widest text-[#1A1A1A]`), subtitle in uppercase tracked font (`text-[9px] uppercase tracking-[0.2em]`).
  - Navigation items:
    - `dashboard` (Dashboard) — LayoutDashboard
    - `messages` (Messaggi & Concierge) — MessageSquareQuote (dynamic unread count badge)
    - `privilege_club` (Privilege Club) — Crown
    - `analytics` (Analytics & Traffico) — BarChart3
    - `jarvis` (Jarvis AI) — Bot
    - `orders` (Ordini) — ShoppingCart
    - `crm` (Clienti CRM) — Users
    - `carts` (Carrelli Abbandonati) — ShoppingBag
    - `consents` (Privacy & Consensi) — ShieldCheck
    - `products` (Prodotti) — Package
    - `shipping` (Spedizioni) — Truck
    - Footer items: `settings` (Impostazioni) and `logout` (Esci).
- **Client Workspace Router (`DashboardClientWrapper.tsx`):**
  - Keeps `activeTab` synchronized with URL query params (`/admin?tab=...`).
  - Layout: Flexbox container with sticky sidebar on the left and full-height scrollable workspace on the right (`flex-1 overflow-y-auto h-screen bg-[#FAFAFA]`).

### 2.2 Product Catalog & Stock Inventory (`ProductTable.tsx` & `ProductForm.tsx`)
- **ProductTable Mechanics:**
  - **Header & Metrics:** Displays total catalog size, completed/active count (green eye indicator), draft/hidden count (eye-off indicator), and quick CTA buttons ("Nuovo Prodotto", "Genera Demo").
  - **Search & Filtering:**
    - Real-time search by Product Name and SKU.
    - Category filter dropdown.
    - Status filter dropdown (`tutti`, `attivi`, `bozze`).
    - Multi-column sort: toggle price (asc/desc), toggle visibility status.
  - **Inline Cell Editing:**
    - Clicking on product name, regular price, discount price, or stock converts the cell into an inline input field with autofocus and a green checkmark button.
    - Optimistic UI updates: updates local React state immediately, sends background update via Server Action / REST API PATCH (`/api/admin/products`), and reverts on error.
  - **One-Click Visibility Toggle:**
    - Direct eye icon button on each table row toggles `is_active` without opening forms.
  - **2-Column Layout during Full Edit:**
    - When an item is selected for editing (`onEdit(product)`), the layout transforms: the table shrinks to `lg:col-span-2`, and the full `ProductForm` appears in the right `lg:col-span-1` sticky column.
- **ProductForm Architecture:**
  - Standardized metadata fields: Name, SKU, Price, Discount Price, Stock, Category, Materials, Plating, Gemstone, Carats, Long Description, Ring Sizes.
  - **5-Slot Gallery Architecture:**
    - Fixed slot definitions (Slot 1: On-Model 2:3, Slot 2: Still Life 1:1, Slot 3: Panoramica 1:1, Slot 4 & 5: Extra).
    - Client-side Canvas WebP compression (`max 2000px`, 85% quality) supporting JPEG, PNG, WebP, HEIC/HEIF.
    - 2-Tier upload resilience: REST `POST /api/upload` with automatic fallback to Server Action `uploadProductImageAction`.
    - Instant blob preview with loading spinner and 1-click retry on error.

### 2.3 Orders Dashboard & State Machine (`OrdersTable.tsx` & `actions_orders.ts`)
- **Table Structure:**
  - Filters: Status filter (`all`, `pending`, `paid`, `shipped`, `delivered`), search by customer name, email, or Stripe Session ID.
  - Columns: Order Date, Customer info (name, email), Total Amount (€), Status (color-coded badge/dropdown), Actions (Eye button for expandable row).
- **Expandable Order Drawer/Row:**
  - Left pane: Purchased Items breakdown (quantity, product name, line item total).
  - Right pane: Shipping Address formatted block, Stripe Session link to Stripe Dashboard, Tracking Code, and Shipped Date.
- **Order State Machine & Side Effects:**
  - Dropdown selector allows changing order status directly in the row.
  - When status changes to `shipped`:
    1. Sets `shipped_at = new Date().toISOString()`.
    2. Saves tracking code.
    3. Triggers transactional email notification via `sendShippingNotificationEmail` (GLS Express 24/48h).
    4. Calls `revalidatePath('/admin')`.

### 2.4 Shipping & Logistics Engine (`ShippingTable.tsx` & `actions_packlink.ts`)
- Focuses exclusively on actionable orders (`paid` and `shipped`).
- Quick actions:
  - Copy customer shipping address to clipboard with 1 click (formatted for carrier web interfaces).
  - Tracking code input per order row.
  - 1-Click Packlink PRO label creation (REST API integration).
  - "Segna Spedito" (marks order as shipped with tracking code and triggers email).
  - "Segna Consegnato" (marks order as delivered).

### 2.5 Customers & CRM (`CrmTable.tsx` & `actions_crm.ts`)
- **KPI Metrics:** Total Customers, Privilege Club Members count, Customers with Orders count.
- **Filters:** All Customers, Club Privé / VIP, With Orders.
- **Data Columns:**
  - Customer Name, Privilege Status badge, total orders count, custom tag badges.
  - Contacts (email, phone).
  - Acquisition Source (e.g. Google Ads, Instagram, Direct, In-Store).
  - Customer Lifetime Value (LTV): total spent formatted in EUR, last purchase date.
- **Expandable CRM Drawer:**
  - VIP/Privilege toggle button with instant tag persistence.
  - Registered date, ad campaign attribution.
  - Editable comma-separated tags input.
  - Direct WhatsApp CTA: opens `https://wa.me/{phone}` for 1-to-1 concierge assistance.
  - Internal Staff Notes (`internal_notes` textarea) with dedicated save button.

### 2.6 Analytics Dashboard (`AnalyticsDashboard.tsx`)
- Time Range Filters: Today (24h hourly), 7 Days, 30 Days, Current Month, Custom Date Range modal.
- Executive KPI Cards: Unique Visitors, Total Page Views, Total Sessions, Bounce Rate, Average Duration, Orders Count, Total Revenue, Conversion Rate.
- Interactive Traffic Trend Chart (SVG).
- 5-Stage Conversion Funnel: Visit → View Product → Add to Cart → Checkout → Completed Order.
- Attribution breakdown by channel (Organic, Direct, Paid Social, Google Ads, Referral) and Top Products/Jewels.
- Live Visitor Stream and CSV Report Export.

---

## 3. Comparative Matrix: Isabel Pepe vs. Scelta Makeup

| Domain / Dimension | Isabel Pepe (Reference Architecture) | Scelta Makeup (Target Boutique Architecture) | Adaptation Requirement |
| :--- | :--- | :--- | :--- |
| **Catalog Domain** | Handcrafted Luxury Jewelry (30-50 products) | Professional Cosmetics & Dermocosmetics (**341 products**) | High-performance catalog table with multi-brand & category filtering, shade/variant support. |
| **Brand Structure** | Monobrand ("Isabel Pepe") | **6 Official Brands:**<br>• Diego dalla Palma (82)<br>• RVB LAB (53)<br>• Cipria Make Up (23)<br>• Eveline Cosmetics (98)<br>• Pierre René (59)<br>• Miyo (26) | First-class Brand Filter pill/selector in Catalog table. |
| **Categories** | Collane, Bracciali, Orecchini, Anelli, Set | **5 Store Categories:**<br>• Viso (129)<br>• Occhi (90)<br>• Labbra (39)<br>• Skincare & Dermo (82)<br>• Beauty & Accessori (1) | Exact match with physical boutique shelves and navigation taxonomy. |
| **Product Variants** | Ring sizes (10, 12, 14, 16, 18, 20), single finish | **Cosmetic Shades & Textures:**<br>Color hex codes, shade names, EAN-13 barcodes, manufacturer SKUs, texture images. | Variant/shade matrix in product drawer; stock tracking per shade. |
| **Stock Management** | Single product-level stock integer | Dual-level stock: product-level total + variant/shade-level stock with EAN-13 barcode gun support. | Visual stock badges (🟢 Disponibile, 🟠 Scorte Basse <5, 🔴 Esaurito), inline stock adjustment, shade breakdown. |
| **Fulfillment Channels** | Courier shipping only (Packlink / GLS / Poste) | **Dual Delivery Modes:**<br>1. Corriere Espresso Tracciato (24/48h)<br>2. Ritiro Gratuito in Boutique (Napoli) | Order state machine must handle both Courier Shipping and In-Store Boutique Pickup. |
| **Order State Machine** | `pending` → `paid` → `shipped` → `delivered` | **5-Stage Dedicated State Machine:**<br>1. "In Elaborazione" (`processing`)<br>2. "Spedito con Corriere Tracciato" (`shipped`)<br>3. "Pronto per Ritiro in Boutique" (`ready_for_pickup`)<br>4. "Completato" (`completed`)<br>5. "Annullato" (`cancelled`) | Support boutique pickup notification & courier tracking notification. |
| **Customer Profiling** | E-commerce buyers only | **Omnichannel Customers:**<br>• E-commerce cosmetic buyers<br>• Salon/Cabina clients (Makeup, Beauty)<br>• Hybrid clients (Book services & buy skincare) | CRM must display both Purchase History AND In-store Appointment History, calculating combined LTV. |
| **In-Store Services** | None (pure e-commerce) | **Cabin Services & RT Cash Register:**<br>Federica Cesiano's appointments, 20% online deposit, 80% balance in store, ePOS RT XML fiscal receipt, slot protection, anti-ban WhatsApp queue. | **100% Preservation:** Unified integration of `/admin/appuntamenti`, Cassa RT, and WhatsApp queue in `/admin`. |
| **Database Boundary** | Supabase `isabel-pepe` project | **Strictly Isolated:** Autonomous storage layer (localStorage/mock/dedicated Scelta Makeup Supabase). | **Zero Database Dependency:** Absolutely no calls to Isabel Pepe's DB or credentials. |

---

## 4. Scelta Makeup Admin Suite (`/admin`) Component Hierarchy & Design System

### 4.1 Visual Styling & Design System
In accordance with Scelta Makeup's Brand Identity guidelines:
- **Palette:**
  - **Royal Violet (`#5E1788`):** Primary brand color, active sidebar items, primary action buttons, key metrics.
  - **Vivid Orchid (`#7A3293`):** Secondary accents, hover states, active category pills.
  - **Pastel Lilac (`#D8C2E7`):** Subtle borders, badges, card divider lines.
  - **Soft Lilac Wash (`#FAF7FC` / `#F6EFFB`):** Admin workspace background.
  - **Optical White (`#FFFFFF`):** Table cards, modals, dropdowns, sidebar surface.
  - **Mauve Rose (`#D462A6`):** Highlight tags, notification badges, WhatsApp channel accents.
  - **Charcoal Deep (`#1F1B24`):** High-contrast body text, primary table headers.
- **Typography:**
  - Serif headings (`font-serif font-bold text-[#1F1B24]`) matching luxury boutique aesthetic.
  - Sans-serif metadata (`font-sans text-xs tracking-wider`).

### 4.2 Component Tree Hierarchy

```
app/admin/
├── page.tsx                           # Master Next.js entry component (Server/Client router)
├── AdminSidebar.tsx                   # Responsive left sidebar with Scelta Makeup navigation
├── DashboardClientWrapper.tsx         # Tab state manager & main container (synchronizes ?tab=...)
├── tabs/
│   ├── PanoramicaTab.tsx              # Executive Dashboard (E-Comm + Salon Turnover, AOV, Recent Orders)
│   ├── CatalogoStockTab.tsx           # 341 Products Table, Brand filters, Category filters, Inline edit
│   ├── OrdiniTab.tsx                  # E-Commerce Orders Table with dual delivery & status machine
│   ├── SpedizioniRitiroTab.tsx        # Logistics desk: Courier Shipments + Boutique Pickup Dispatch
│   ├── ClientiCrmTab.tsx              # Omnichannel CRM (E-commerce + Salon history, LTV, skin notes)
│   ├── AppuntamentiCassaTab.tsx       # Preserved `/admin/appuntamenti` view (Cassa RT XML, slots)
│   ├── NotificheQueueTab.tsx          # Preserved WhatsApp Anti-Ban & Resend Email queue monitor
│   └── AnalyticsTab.tsx               # Performance metrics, conversion rate, top products/services
├── modals/
│   ├── ProductEditModal.tsx           # Modal for editing product details, prices, and descriptions
│   ├── VariantStockModal.tsx          # Modal for inspecting/editing shade-level stock & EAN-13
│   ├── OrderDetailModal.tsx           # Modal for order items, shade breakdown, address, tracking
│   └── CassaReceiptModal.tsx          # Preserved RT XML scontrino modal
```

---

## 5. Detailed Specification for Each Admin Module

### 5.1 Module 1: Panoramica / Dashboard (`PanoramicaTab.tsx`)
- **Executive KPI Cards:**
  1. **Fatturato Totale Combinato:** Sum of e-commerce revenue + salon deposit & in-store collected balances.
  2. **Ordini E-Commerce:** Count of total orders, breakdown of pending vs. evasi.
  3. **Carrello Medio (AOV):** Total e-commerce turnover divided by total orders.
  4. **Clienti Attivi:** Total unique customers across e-commerce and salon bookings.
  5. **Appuntamenti Oggi:** Daily appointments count with balance collection status.
- **Quick Alerts Widget:**
  - **Scorte in Esaurimento (Low Stock Alert):** Displays products/variants with stock `< 5` or `= 0`.
  - **Ordini da Evadere:** Highlights orders in `"In Elaborazione"` or pending courier dispatch.
  - **Ordini Pronti per Ritiro:** In-store pickup orders waiting for customer pickup.
- **Feed Ordini Recenti:** Last 5 orders with customer name, items count, total (€), and status badge.

### 5.2 Module 2: Catalogo Prodotti & Stock (`CatalogoStockTab.tsx`)
- **Data Source:** Pre-loaded with Scelta Makeup's 341 products (`catalog.json` / `lib/catalog.ts`).
- **Brand Filter Bar:**
  - Quick-filter pills: `Tutti i Brand (341)`, `Diego dalla Palma (82)`, `RVB LAB (53)`, `Eveline (98)`, `Pierre René (59)`, `Miyo (26)`, `Cipria Make Up (23)`.
- **Category Filter Bar:**
  - `Tutte le Categorie`, `Viso (129)`, `Occhi (90)`, `Labbra (39)`, `Skincare & Dermo (82)`, `Beauty & Accessori (1)`.
- **Search & Sort Mechanics:**
  - Instant live search by Product Name, SKU, EAN-13 barcode, and shade name.
  - Sort by Price (asc/desc), Stock (asc/desc), and Brand.
- **Interactive Table Columns:**
  1. **Thumbnail:** Product packshot preview (`/products/...` or Cloudflare R2 URL).
  2. **Brand & Categoria:** Badge pill with brand name and store category.
  3. **Nome Prodotto & SKU:** Title, SKU, and badge indicators (e.g. `Bestseller`, `Iconico`, `Cruelty Free`).
  4. **Prezzo Listino & Sconto:** Inline editable price with checkmark save.
  5. **Varianti & Sfumature:** Count of shades/variants (e.g. `6 tonalità`) with clickable button to inspect shades.
  6. **Giacenza Stock:**
     - Visual badge: 🟢 `> 5 pz` (Disponibile), 🟠 `1-5 pz` (Scorte Basse), 🔴 `0 pz` (Esaurito).
     - Inline editable stock count.
  7. **Azioni:**
     - Modifica rapida (opens `ProductEditModal`).
     - Gestione sfumature (opens `VariantStockModal`).
     - Visualizza nello store pubblico (`/prodotti/[slug]`).

### 5.3 Module 3: Ordini & State Machine (`OrdiniTab.tsx`)
- **Dual Delivery Method Differentiation:**
  - **Corriere Espresso Tracciato:** Blue truck badge, includes shipping address, courier tracking field.
  - **Ritiro in Boutique:** Purple store badge, free shipping, customer pickup note.
- **The 5-Stage Order State Machine:**
  ```
                 ┌────────────────────────┐
                 │    In Elaborazione     │  (processing)
                 └───────────┬────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Corriere Spedizione]              [Ritiro Boutique]
  ┌────────────────────────┐        ┌────────────────────────┐
  │  Spedito con Corriere  │        │   Pronto per Ritiro    │
  │       Tracciato        │        │      in Boutique       │
  │       (shipped)        │        │   (ready_for_pickup)   │
  └───────────┬────────────┘        └───────────┬────────────┘
              │                                 │
              └────────────────┬────────────────┘
                               ▼
                    ┌────────────────────────┐
                    │       Completato       │  (completed)
                    └────────────────────────┘
                               │
               (O Annullato in qualsiasi fase)
                    ┌────────────────────────┐
                    │       Annullato        │  (cancelled)
                    └────────────────────────┘
  ```
- **State Transition Side-Effects:**
  - Transition to `"Spedito con Corriere Tracciato"`:
    - Sets `trackingNumber`.
    - Automatically sends Order Shipped email via Resend (`sendOrderPlacedEmail` variant or shipping notification).
    - Enqueues WhatsApp shipping update with anti-ban delay (20-45s jitter).
  - Transition to `"Pronto per Ritiro in Boutique"`:
    - Enqueues WhatsApp message: *"Ciao [Nome]! Il tuo ordine #[Numero] è stato preparato con cura ed è pronto per il ritiro in boutique da Scelta Makeup (Via dei Pellegrini 28/29, Napoli). Ti aspettiamo!"*.
  - Transition to `"Completato"`:
    - For boutique pickup: marks payment as completed if paid in cash/card at the counter.
- **Order Items Inspection:**
  - Displays product title, brand, quantity, unit price, and crucially the **cosmetic shade/tonalità** (with color preview swatch hex and code).
  - Sample indicator (`Campioncini omaggio inclusi: Sì`).

### 5.4 Module 4: Spedizioni & Ritiro in Boutique (`SpedizioniRitiroTab.tsx`)
- Split-screen or dual-tab view:
  1. **Tavolo Spedizioni (Corriere):**
     - Lists all orders with `deliveryMethod === 'shipping'` requiring dispatch.
     - 1-Click "Copia Indirizzo Completo" for carrier software (GLS / BRT / Packlink).
     - Tracking number input with 1-click "Spedisci & Notifica Cliente".
  2. **Banco Ritiro in Negozio:**
     - Lists all orders with `deliveryMethod === 'boutique'`.
     - Order packaging checklist (products checked against shade and quantity, complimentary samples included).
     - 1-Click "Notifica Pronto per il Ritiro".
     - 1-Click "Consegna al Cliente & Incasso".

### 5.5 Module 5: Clienti & CRM Omnichannel (`ClientiCrmTab.tsx`)
- **Customer Identity Model:**
  - Merges customer data across e-commerce orders and salon appointments based on email / phone number.
- **CRM Columns:**
  - **Cliente:** Full Name, VIP / Sposa badge, registration date.
  - **Contatti:** Email, Mobile Phone with direct WhatsApp button.
  - **Storico Ordini:** Total orders placed, list of products & favorite brands.
  - **Storico Appuntamenti:** Total salon appointments attended, favorite treatments (e.g. *Trucco Sposa Luxury*, *Trattamento HA Hero*).
  - **Valore Totale (LTV):** Combined monetary spend across cosmetics purchases + in-store cabin services.
- **Expanded Customer Profile Card:**
  - **Scheda Bellezza & Skin Profile (Note Interne di Federica):** Textarea for skin type, color tone preferences, allergies, or personalized beauty protocols.
  - **Tag Personalizzati:** Editable tags (e.g. `VIP`, `Sposa 2026`, `Pelle Sensibile`, `Fedele RVB LAB`).
  - **Direct WhatsApp Chat Launcher:** Click to message with pre-filled salon greeting.

### 5.6 Module 6: Appuntamenti & Cassa RT (`AppuntamentiCassaTab.tsx`)
- **Strict Requirement:** Must preserve 100% of the existing, fully-tested features in `/admin/appuntamenti`:
  - Daily appointment calendar view and date picker (`selectedDate`).
  - Financial KPIs: Today's Appointments, Online Deposits (20% collected via Stripe), Pending In-Store Balances (80%), Collected Balances.
  - 1-Click Balance Checkout (`handleExecuteCheckout`): marks appointment as paid (Cash or myPOS Card) and generates ePOS XML fiscal receipt for RT cash register.
  - Slot Availability Protection (`handleToggleSlot`): 1-click block/unblock for lunch breaks (13:30), post-20:00, or bridal outside events.
  - Fast Telephone Booking Modal (`Nuovo al Volo`).
  - Sub-tab for WhatsApp Anti-Ban Notification Queue (`NotificationQueueTab`).

---

## 6. Zero Database Dependency on Isabel Pepe (Strict Isolation Guarantee)

To satisfy the user constraint and prevent any cross-contamination:

### 6.1 Audit Findings & Verification
- **Codebase Check:** `c:\Users\mario\Progetti Antigravity\Scelta Makeup` has **zero** imports from `isabel-pepe`.
- **Environment Variables:** No shared `.env` files. Scelta Makeup will use its own dedicated Supabase URL and keys when configured.
- **Local Storage Layer:** All mock data and services in Scelta Makeup (`lib/orderService.ts`, `lib/bookingService.ts`, `lib/catalog.ts`, `lib/whatsappQueueService.ts`) use isolated keys:
  - `scelta_makeup_orders_v1`
  - `scelta_makeup_appointments_v1`
  - `scelta_makeup_blocked_slots_v1`
  - `scelta_makeup_wa_queue_v1`
- **Supabase Schema Independence:** The project already contains a dedicated, standalone `supabase_schema.sql` (408 lines, 16.2 KB) with tables (`products`, `variants`, `inventory`, `appointments`, `orders`, `blocked_slots`, `notification_logs`), indexes, triggers, and RLS policies tailored exclusively for Scelta Makeup.

---

## 7. Implementation Blueprint & File Layout for Workers

When transitioning to the build phase, the implementers should follow this structure:

### File System Layout
```
c:/Users/mario/Progetti Antigravity/Scelta Makeup/
├── app/
│   └── admin/
│       ├── page.tsx                      # Unified admin entry point
│       ├── layout.tsx                    # Clean admin layout
│       ├── AdminSidebar.tsx              # Brand-styled responsive sidebar
│       └── components/
│           ├── DashboardHome.tsx         # Unified Executive KPIs
│           ├── ProductCatalogTable.tsx   # 341 Products, Brand & Category filters
│           ├── ProductEditModal.tsx      # Price/details edit modal
│           ├── VariantStockModal.tsx     # Shade & stock adjustment modal
│           ├── OrdersManagementTable.tsx # 5-stage order state machine
│           ├── ShippingLogisticsTable.tsx# Courier & Boutique Pickup desk
│           ├── CustomerCrmTable.tsx      # Omnichannel CRM profile
│           └── AnalyticsDashboard.tsx    # Sales & Booking analytics
├── lib/
│   ├── adminService.ts                  # Centralized client-safe data adapter
│   ├── catalog.ts                       # 341 products query functions
│   ├── orderService.ts                  # Orders CRUD & state transitions
│   ├── bookingService.ts                # Preserved appointments service
│   ├── resendService.ts                 # Transactional emails
│   └── whatsappQueueService.ts          # Anti-ban WhatsApp queue
└── supabase_schema.sql                  # Autonomous Supabase DDL
```

### Key Type Extensions in `types/admin.ts`
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

export interface AdminCustomerProfile {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  totalSpent: number;
  ordersCount: number;
  appointmentsCount: number;
  lastInteractionDate: string;
  tags: string[];
  internalNotes: string;
  favoriteBrands: string[];
  skinProfile?: string;
}
```

---

## 8. Summary Conclusion

The reference architecture of Isabel Pepe provides an exemplary, high-performance foundation for e-commerce administration. By adapting its proven navigation shell, deterministic state machines, inline catalog editing, and CRM profiling to Scelta Makeup's specific multi-brand cosmetics catalog (341 products, 6 brands, 5 categories, shades/variants), dual delivery channels (Courier vs. Boutique Pickup), and in-store cabin appointments, Scelta Makeup will obtain a luxury, unified management platform with zero database dependency on Isabel Pepe and zero disruption to the existing salon gestionale.
