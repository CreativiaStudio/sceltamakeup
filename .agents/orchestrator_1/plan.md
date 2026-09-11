# Master Orchestration Plan: Scelta Makeup FASE 3

## Objectives
1. **R1: WhatsApp Anti-Ban & Human Pacing Queue Worker**
   - Asynchronous queue with Evolution API / QR session integration.
   - Pacing: strict 20-45s random jitter delay between consecutive sends.
   - Dynamic message variations (booking confirmation, 24h reminder, order confirmation).
2. **R2: Luxury Transactional Email Module with Resend**
   - Palette: #5E1788, #D8C2E7, #FFFFFF, #D462A6.
   - Header with vector logo and claim "L'eleganza di essere autentica".
   - 3 responsive HTML templates with exact financial calculations (-10% online, 20% deposit, 80% store balance).
   - lib/resendService.ts with realistic demo/preview mode.
3. **R3: Real-Time Queue Monitor & Channels Dashboard**
   - `/admin/appuntamenti` dedicated tab "Canali Notifiche & Coda".
   - WhatsApp session status & QR display.
   - Real-time queue monitor with countdown and status badges.
   - Test single send action.
4. **R4: Dedicated Supabase SQL Schema**
   - `c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql`
   - Complete schema: products, variants, inventory, appointments, orders, blocked_slots, notification_logs, RLS policies.
5. **Quality & Acceptance Verification**
   - Automated queue test: measured delay strictly between 20-45s with jitter.
   - Email calculations and HTML verified.
   - `npx tsc --noEmit` passes with 0 errors.
   - `npm run lint` passes with 0 errors and 0 warnings.
   - `npm run build` succeeds cleanly.

## Execution Phases
- **Phase 0**: Codebase & Spec Survey (3 parallel Explorers: Existing App/Routes/Tech Stack, Skill References & Visual Brand Identity, Existing WhatsApp/Email/DB Implementations).
- **Phase 1**: Architecture, Feature Inventory & Test Infrastructure Setup (`PROJECT.md` and `TEST_INFRA.md`).
- **Phase 2**: E2E Testing Suite Implementation (Tiers 1-4).
- **Phase 3**: Core Implementation Milestones:
  - M1: Supabase SQL Schema (`supabase_schema.sql`).
  - M2: WhatsApp Anti-Ban Engine (`lib/whatsapp/` or similar queue system).
  - M3: Luxury Resend Email System (`lib/resendService.ts`, templates, preview/demo mode).
  - M4: Admin Dashboard Tab (`/admin/appuntamenti`).
- **Phase 4**: Verification, Audit, and Final Gate (Typecheck, Lint, Build, Queue Delay Measurement, Adversarial Hardening).
