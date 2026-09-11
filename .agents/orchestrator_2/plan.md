# Plan: Scelta Makeup E-Commerce Admin Suite

## Objective
Build a complete, standalone, production-ready E-Commerce Administration Suite at `/admin` for Scelta Makeup, preserving 100% of `/admin/appuntamenti`, ensuring zero cross-contamination with Isabel Pepe Supabase, and passing all checks (`tsc`, `lint`, `build` for 345+ pages).

## Execution Roadmap
1. **Survey Phase (Parallel Explorers)**:
   - Explorer 1: Inspect Scelta Makeup current codebase (`src/app/admin`, `src/lib`, existing data structures, products, appointments, RT cash, WhatsApp queue).
   - Explorer 2: Inspect Isabel Pepe reference backend architecture (features, UI patterns, schemas, orders, stock, CRM, shipping) and identify clean adaptation points.
   - Explorer 3: Audit current database setup, environment variables, Supabase references, and verify strict boundary requirements to isolate Scelta Makeup.
2. **Project Specification & Architecture (PROJECT.md)**:
   - Synthesize findings, define feature inventory, interface contracts, and storage model.
3. **Execution Milestones**:
   - Milestone 1: DDL & Isolated Storage Engine (`supabase_schema.sql` at workspace root + `lib/adminStore.ts` or equivalent client storage engine).
   - Milestone 2: Admin Shell, Responsive Sidebar, Theme Integration (Palette: Royal Violet #5E1788, Pastel Lilac #D8C2E7, Optical White #FFFFFF, Mauve Rose #D462A6).
   - Milestone 3: Overview & KPI Dashboard (Sales, revenue, orders feed, charts).
   - Milestone 4: Product Catalog & Stock Inventory (341 products, brand/category filters, search, variant stock editor).
   - Milestone 5: Orders & Shipping Dashboard (Order statuses, details, tracking number, in-store pickup).
   - Milestone 6: Customers & CRM (purchase history, appointments link, integration with `/admin/appuntamenti`).
4. **Verification & Audit**:
   - Verification of zero Isabel Pepe contamination.
   - Reviewer & Challenger passes.
   - Forensic Auditor verification.
   - Verification of `npx tsc --noEmit`, `npm run lint`, `npm run build`.
