## 2026-09-07T14:42:55Z
You are Worker M2 (Admin Suite UI & Integration Specialist) for Scelta Makeup.
Your working directory is: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m2
Your original request is at: c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md
Your project architecture is at: c:\Users\mario\Progetti Antigravity\Scelta Makeup\PROJECT.md
You MUST read c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md and c:\Users\mario\Progetti Antigravity\Scelta Makeup\PROJECT.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context from previous phases:
- `lib/adminStore.ts` is fully implemented and manages stock for all 341 products / 659 variants, orders, CRM customers, KPIs, and local persistence.
- `supabase_schema.sql` is delivered with 9 `scelta_*` tables.
- `app/admin/appuntamenti/page.tsx` (627 lines) exists and MUST be preserved 100% intact.
- Explorer 2 survey report at `c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_survey_isabel_pepe\report.md` details the Isabel Pepe admin architecture.

Mission:
Build the complete Unified E-Commerce Admin Suite at `/admin`:
1. Distraction-free layout:
   - Update `components/Header.tsx` and `components/Footer.tsx` (or `app/layout.tsx`) so that the public customer navbar and footer are hidden when the user is on `/admin` or `/admin/*`, providing a dedicated, clean administration cockpit.
2. Admin Shell & Sidebar (`app/admin/page.tsx`, `components/admin/AdminSidebar.tsx`, `components/admin/AdminClientWrapper.tsx`):
   - Responsive sidebar with Scelta Makeup brand identity: Royal Violet `#5E1788`, Vivid Orchid `#7A3293`, Pastel Lilac `#D8C2E7`, Mauve Rose `#D462A6`, Optical White `#FFFFFF`.
   - Sidebar tabs:
     - `panoramica`: Panoramica / Dashboard
     - `prodotti`: Catalogo & Stock (341 prodotti)
     - `ordini`: Ordini E-Commerce
     - `spedizioni`: Spedizioni & Ritiro Store
     - `clienti`: Clienti & CRM
     - `appuntamenti`: Appuntamenti & Cassa RT (links/embeds `/admin/appuntamenti`)
     - `notifiche`: Coda Notifiche & WhatsApp (embeds `NotificationQueueTab.tsx`)
     - `analytics`: Statistiche Vendite
   - Mobile responsive toggle (drawer/hamburger on mobile).
   - Sync `activeTab` with URL query param `?tab=...` and fallback to `panoramica`.
3. Overview / Dashboard (`components/admin/DashboardHome.tsx`):
   - Sales KPIs: Fatturato totale, Ordini evasi, Carrello medio, Clienti registrati, Conversion rate, Allarmi scorte basse.
   - Interactive revenue/sales trends chart (SVG/CSS responsive bars or line chart).
   - Recent orders feed with status badges and quick links.
4. Product Catalog & Stock Management (`components/admin/ProductCatalogTable.tsx`, `components/admin/ProductStockModal.tsx`):
   - Paginated table showing all 341 products from `data/catalog.json` linked with real-time stock from `lib/adminStore.ts`.
   - Search bar (filtering by title, brand, category, SKU).
   - Brand filter pills: All, Diego dalla Palma, Eveline Cosmetics, Pierre René, RVB LAB, Miyo, Cipria Make Up.
   - Category filter pills: All, Viso, Occhi, Skincare & Dermo, Labbra, Beauty & Accessori.
   - Stock level indicators: "Disponibile" (emerald), "Scorte Basse" (amber, < 5), "Esaurito" (rose, 0).
   - Edit modal to update price, discount price, and stock quantity for each variant/shade, persisting atomically to `lib/adminStore.ts`.
5. Orders & Shipping Management (`components/admin/OrdersTable.tsx`, `components/admin/ShippingTable.tsx`):
   - Orders Table: Filter by status ("In Elaborazione", "Spedito con Corriere Tracciato", "Pronto per Ritiro in Boutique", "Completato", "Annullato") and fulfillment type (`courier` vs `store_pickup`).
   - Status change dropdown directly updating `lib/adminStore.ts`.
   - Expandable order drawer/row with customer details, items with shades, totals.
   - Shipping Table: Dedicated desk for courier and pickup orders. 1-click clipboard address copy, tracking number entry with "Salva Tracking", and boutique pickup readiness toggle.
6. Customers & CRM (`components/admin/CrmTable.tsx`):
   - Omnichannel customer list showing total lifetime spend (e-commerce orders + salon appointments), orders count, appointments count, last active date.
   - Editable beauty / skin type notes.
   - 1-click WhatsApp launcher button (`https://wa.me/...`).
7. Preserved Modules Integration:
   - Tab `appuntamenti`: renders a seamless direct link or embed to `/admin/appuntamenti`, ensuring Federica can access the Epson FP-81II RT cassa XML generator, slot locks, and daily deposits without disruption.
   - Tab `notifiche`: renders `NotificationQueueTab.tsx` directly inside the admin shell.
8. Comprehensive E2E Test Suite (`tests/e2e-admin-suite.test.ts`):
   - Write tests covering all 4 tiers:
     - Tier 1: Database isolation check, 341 products loaded, brand and category distributions, stock status calculations, order status transitions, CRM aggregation.
     - Tier 2: Boundary cases (empty search, 0 stock transition, missing tracking, boundary filters).
     - Tier 3: Cross-feature interactions (order creation impacts stock and customer spend; stock edit updates badge).
     - Tier 4: Real-world scenarios (full courier workflow, full in-store pickup workflow).
   - Execute via `npx tsx --test tests/e2e-admin-suite.test.ts`.
   - Update `TEST_READY.md` with full coverage summary.
9. Verification:
   - Run `npx tsc --noEmit` and confirm 0 errors.
   - Run `npm run lint` and confirm 0 errors.
   - Run `npm run build` and confirm all 345+ static pages compile successfully.
10. Write your handoff report to `c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m2\handoff.md`.
Send a completion message back when done.
