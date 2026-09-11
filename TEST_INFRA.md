# E2E Test Infrastructure: Scelta Makeup E-Commerce Admin Suite (/admin)

## 1. Test Philosophy & Architectural Principles
- **Opaque-Box & Requirement-Driven**: Tests are designed strictly from business requirements defined in `ORIGINAL_REQUEST.md` (Follow-up) and architecture specifications in `PROJECT.md`. Tests observe system behavior from public interfaces, contracts, data schemas, and state transitions without coupling to private implementation trivia.
- **Zero Dependency on Isabel Pepe (Strict Isolation)**:
  - Total database isolation: Zero connection strings, zero shared credentials, zero foreign keys, and zero cross-project queries targeting Isabel Pepe's Supabase instance.
  - Complete local resilience: All administrative workflows (catalog stock adjustment, order state transitions, tracking numbers, omnichannel CRM) operate deterministically offline and via local state engines (`lib/adminStore.ts`) without requiring cloud credentials.
  - Idempotent dedicated DDL: Supabase schema is completely isolated, self-contained, and idempotent with the explicit `scelta_` prefix across all 9+ tables in `supabase_schema.sql`.
- **Dual-Track Quality Assurance**:
  - Progressive testability: Milestone 1 features (`supabase_schema.sql`, `lib/adminStore.ts`) and administrative contracts are verified directly.
  - Non-regression guarantee: Public storefront (`/`, `/prodotti/[slug]`, `/prenota`, `/servizi`) and existing operational modules (`/admin/appuntamenti`, RT ePOS XML, WhatsApp anti-ban pacing queue) remain 100% intact and unregressed.

---

## 2. 4-Tier Test Methodology

### Tier 1: Category-Partition Feature Coverage
Decomposes each administrative domain into disjoint partitions and asserts deterministic state handling:
1. **Database Isolation & Standalone DDL**:
   - Verification that `supabase_schema.sql` contains zero references to Isabel Pepe (`isabel_pepe`, `isabelpepe`, `isabel`).
   - DDL integrity for all 9 `scelta_*` tables: `scelta_customers`, `scelta_products`, `scelta_variants`, `scelta_inventory`, `scelta_inventory_logs`, `scelta_orders`, `scelta_order_items`, `scelta_appointments`, `scelta_blocked_slots`, `scelta_notification_logs`.
   - Automatic triggers (`scelta_set_updated_at`, `scelta_handle_order_item_stock_deduction`), stored procedures (`scelta_record_pos_sale`), high-frequency indexes, and comprehensive Row Level Security (RLS) policies.
2. **Admin Tabs & Navigation Architecture**:
   - Contract compliance across all 8 core tabs: `panoramica`, `prodotti`, `ordini`, `spedizioni`, `clienti`, `appuntamenti`, `notifiche`, `analytics`.
   - Routing verification and brand token compliance (`#5E1788`, `#7A3293`, `#D8C2E7`, `#D462A6`, `#FFFFFF`).
3. **Product Catalog & Multi-Brand Ingestion**:
   - Ingestion of 341 products and 659 variants across 6 verified cosmetic brands (Diego dalla Palma, RVB LAB, Cipria Make Up, Eveline Cosmetics, Pierre René, Miyo) and 5 primary categories (Viso, Occhi, Labbra, Skincare & Dermo, Beauty & Accessori).
4. **Stock Status Classification**:
   - Partitioning quantities into badges:
     - `available`: $\ge 5$ units
     - `low_stock`: $1 \le Q \le 4$ units
     - `out_of_stock`: $0$ units
5. **Order Lifecycle & State Transitions**:
   - State transition validation across order states: `processing`, `shipped`, `ready_for_pickup`, `completed`, `cancelled`.
   - Fulfillment paths: Courier shipping (`shipping` / `courier`) vs. In-store boutique pickup (`boutique` / `store_pickup`).
6. **Shipping & Fulfillment Operations**:
   - Tracking code assignment, carrier assignment (`BRT Express`), clipboard address extraction, and pickup readiness notifications.
7. **Omnichannel CRM & Customer Profiles**:
   - Customer profile composition, purchase history tracking, salon appointments count, and lifetime value (LTV) calculation.
8. **Preservation of Existing Modules**:
   - Guarantee that `/admin/appuntamenti/page.tsx` exists, imports remain valid, RT ePOS XML receipt generator and WhatsApp queue components are preserved with zero regression.

---

### Tier 2: Boundary Value Analysis (BVA) & Corner Cases
Tests boundaries where off-by-one errors and edge conditions occur:
1. **Search & Filter Boundaries**:
   - Empty search string `""` -> returns full catalog (341 products) without crash or exception.
   - Whitespace-only search `"   "` -> handled cleanly as empty query.
   - Special characters & SQL metacharacters (`' OR '1'='1`, `<script>`, `"--`) -> safely sanitized, zero unhandled exceptions.
   - Non-existent query `"xyznonexistentbrand123"` -> returns empty array `[]` cleanly.
2. **Stock Count Boundaries**:
   - Zero stock: $Q = 0$ -> strictly classified as `'out_of_stock'`, variant `in_stock = false`.
   - Critical threshold: $Q = 1$ -> strictly classified as `'low_stock'`.
   - Boundary threshold: $Q = 4$ -> strictly classified as `'low_stock'`.
   - Normal threshold: $Q = 5$ -> strictly classified as `'available'`.
   - Negative stock: $Q < 0$ (e.g. $-5$) -> clamped to $0$ or rejected with invariant protection.
   - Extreme large stock: $Q = 99999$ -> handled cleanly without integer overflow.
3. **Order State Validation Boundaries**:
   - Attempting to transition courier order to `'shipped'` without tracking number -> validation gate or warning flag.
   - Attempting to transition store pickup order to `'ready_for_pickup'` without customer contact info -> validation guard.
   - Illegal state transition (e.g. from `'cancelled'` back to `'shipped'`) -> validation rejection or invariant protection.
4. **Customer CRM Extremes**:
   - Customer with 0 orders and 0 appointments -> Total spend strictly $0.00$€, counts $0$, lastActive handled cleanly without `NaN` or invalid date.
   - Customer with large transaction counts -> accurate floating point summation with zero cent drift.

---

### Tier 3: Cross-Feature Combinations & Invariants
Validates inter-module data synchronization, transactional invariants, and multi-entity side effects:
1. **Order Creation to CRM Spend Synchronization**:
   - Placing a new e-commerce order for Customer $C$ automatically updates $C$'s `totalSpend` by $+Total_{order}$ and increments `ordersCount` by $+1$.
2. **Omnichannel Lifetime Value (LTV) Invariant**:
   - Omnichannel LTV is the exact sum of E-Commerce spend and Salon Appointments spend:
     $$\text{TotalSpend} \equiv \sum \text{OrderTotals} + \sum \text{AppointmentPrices}$$
   - Zero cent discrepancy across mixed online orders and in-store salon visits.
3. **Variant Stock Update Synchronization**:
   - Updating stock quantity on variant $V$ immediately recomputes the variant's `stockStatus` badge and updates inventory on hand.
4. **Price Update Propagation**:
   - Modifying a variant's retail price updates both the variant catalog record and subsequent order calculations.

---

### Tier 4: Real-World Workload Scenarios
Simulates realistic end-to-end operational workflows executed by Federica in the boutique:
1. **Scenario 1: Courier Order Fulfillment Lifecycle**:
   - Customer places e-commerce order with courier delivery -> Order created in `'processing'` state -> Admin views order in `/admin?tab=ordini` -> Generates shipping details in `/admin?tab=spedizioni` -> Copies formatted address -> Assigns BRT tracking code -> Transitions status to `'shipped'` -> Delivery completed -> Marked `'completed'`.
2. **Scenario 2: In-Store Boutique Pickup Lifecycle**:
   - Customer orders online selecting "Ritiro in Boutique" -> Order in `'processing'` state with free shipping -> Staff packs items in boutique -> Toggles pickup readiness (`'ready_for_pickup'`) -> Customer visits boutique via dei Pellegrini 28/29 -> Staff delivers package -> Order transitioned to `'completed'`.
3. **Scenario 3: Product Price & Stock Restocking Scenario**:
   - High-demand cosmetic (e.g. Diego dalla Palma Mascara) stock drops to 0 -> Badge shows `'out_of_stock'` -> Supplier delivery arrives -> Admin updates stock count to 25 -> Badge updates to `'available'` -> Retail price adjusted -> Updated record persists.
4. **Scenario 4: Omnichannel Customer Engagement Scenario**:
   - Customer books bridal makeup appointment (€120 list -> €108 online, €21.60 deposit) -> Appears in CRM -> Later buys skincare products online (€85.00) -> CRM profile merges both touchpoints into single profile with total spend (€193.00), 1 appointment, 1 order, and personalized beauty notes.
5. **Scenario 5: Database Isolation Audit & Schema Integrity Gate**:
   - Automated scanner verifies workspace root and codebase: zero occurrences of Isabel Pepe database URLs, credentials, or schema tables. Full DDL script validation of all 9 `scelta_*` tables.

---

## 3. Feature Inventory & Coverage Matrix

| # | Feature Domain | Requirement | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|----------------|-------------|:------:|:------:|:------:|:------:|
| 1 | Database Isolation (Zero Isabel Pepe) | ORIGINAL_REQUEST §R1 | ✓ | ✓ | ✓ | ✓ |
| 2 | Standalone Supabase DDL (9 scelta_* tables) | ORIGINAL_REQUEST §R1 | ✓ | ✓ | ✓ | ✓ |
| 3 | Automated Triggers & RLS Policies | ORIGINAL_REQUEST §R1 | ✓ | ✓ | ✓ | ✓ |
| 4 | Admin Navigation Shell & Tab Contract | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 5 | 341 Products Catalog Ingestion & Brand Distribution | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 6 | Stock Status Classification (available/low/out) | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 7 | Order Management & State Transitions | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 8 | Shipping Tracking & Pickup Readiness Desk | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 9 | Omnichannel CRM & Customer LTV Engine | ORIGINAL_REQUEST §R2 | ✓ | ✓ | ✓ | ✓ |
| 10 | Preservation of /admin/appuntamenti & RT Cash | ORIGINAL_REQUEST §R3 | ✓ | ✓ | ✓ | ✓ |

---

## 4. Coverage Thresholds & Quality Gates

| Metric | Target Threshold | Validation Gate |
|:---|:---:|:---|
| **Tier 1 Feature Coverage** | 100% of functional requirements | Automated E2E test assertions |
| **Tier 2 Boundary Cases** | ≥ 4 edge partitions per feature | BVA test cases |
| **Tier 3 Combinatorial Invariants** | 100% financial and inventory parity | Zero cent / zero unit discrepancy |
| **Tier 4 Workload Scenarios** | 5 complete lifecycles | Stateful sequential tests |
| **Database Isolation** | 0 Isabel Pepe references in DDL / store | String and AST scanning |
| **TypeScript Strictness** | 0 errors | `npx tsc --noEmit` |
| **Linting Compliance** | 0 errors, 0 warnings | `npm run lint` |
