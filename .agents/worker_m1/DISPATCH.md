## 2026-09-07T14:35:16Z
You are Worker M1 for Scelta Makeup.
Your working directory is: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m1
Your original request is at: c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md
Your project architecture is at: c:\Users\mario\Progetti Antigravity\Scelta Makeup\PROJECT.md
You MUST read c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md and c:\Users\mario\Progetti Antigravity\Scelta Makeup\PROJECT.md before starting work.
Read Explorer 3's report at: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_survey_isolation_schema\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
- `c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql`
- `c:\Users\mario\Progetti Antigravity\Scelta Makeup\lib\adminStore.ts`
- `c:\Users\mario\Progetti Antigravity\Scelta Makeup\.env.example`

Mission:
Implement Milestone 1: Standalone Supabase DDL & Isolated Local Storage Engine:
1. Deliver `supabase_schema.sql` at workspace root:
   - Idempotent DDL script with the mandatory `scelta_` prefix for all 9 tables:
     `scelta_products`, `scelta_variants`, `scelta_orders`, `scelta_order_items`, `scelta_inventory_logs`, `scelta_customers`, `scelta_appointments`, `scelta_blocked_slots`, `scelta_notification_logs`.
   - Appropriate columns, foreign keys with ON DELETE CASCADE, updated_at triggers, automated stock deduction trigger (`scelta_handle_order_item_stock_deduction`), POS sale stored procedure (`scelta_record_pos_sale`), high-performance indexes (including EAN barcode index for cassa RT gun scans), and complete Row Level Security (RLS) policies.
   - Zero references, zero tables, zero credentials relating to Isabel Pepe.
2. Deliver `lib/adminStore.ts`:
   - Offline-first mock storage engine managing:
     a) Variant stock levels initialized from `data/catalog.json` (341 products, 659 variants) with status badges: 'available', 'low_stock' (< 5), 'out_of_stock' (0). Functions to get all stock, update variant stock count, update variant price.
     b) Orders management initialized with realistic multi-status demo orders (courier & store pickup) with functions: `getAdminOrders()`, `updateOrderStatus()`, `updateOrderTracking()`, `createAdminOrder()`.
     c) Omnichannel CRM customers initialized with customer profiles merging order history and appointment history, with functions: `getAdminCustomers()`, `updateCustomerNotes()`.
     d) 1-click Reset function (`resetAdminStoreToDefaults()`).
     e) Atomic persistence in localStorage (`scelta_makeup_admin_store_v1`) with robust SSR in-memory fallback.
3. Deliver `.env.example` with clear documentation of future dedicated Supabase environment variables and warning against using Isabel Pepe credentials.
4. Run `npx tsc --noEmit` and verify 0 TypeScript errors.
5. Write your completion report to `c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m1\handoff.md`.
Send a completion message back when done.
