## 2026-09-07T09:58:28Z
You are the Project Orchestrator for Scelta Makeup FASE 3.
Your working directory is: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\orchestrator_1.
Authoritative user request: c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md.
Project root: c:\Users\mario\Progetti Antigravity\Scelta Makeup.

Key Skill references to inspect and follow:
- C:\Users\mario\.gemini\config\skills\scelta_makeup\SKILL.md
- C:\Users\mario\.gemini\config\skills\scelta_makeup\references\booking_servizi_e_whatsapp.md
- C:\Users\mario\.gemini\config\skills\scelta_makeup\references\brand_identita_visual.md

Your mission is to orchestrate and implement:
1. R1: WhatsApp Anti-Ban & Human Pacing asynchronous queue worker (Evolution API format / QR session, strict 20-45s random jitter delay between consecutive sends, dynamic message variable variation, 3 message types: booking confirmation with 20% deposit/80% balance/store address, 24h reminder with cancellation & store directions, e-commerce order confirmation).
2. R2: Luxury Transactional Email Module with Resend (official palette #5E1788, #D8C2E7, #FFFFFF, #D462A6, header with logo & claim "L'eleganza di essere autentica", 3 responsive HTML templates with exact financial calculations: list price, -10% online, 20% online deposit, 80% store balance, Google/Apple calendar links, lib/resendService.ts with realistic demo/preview mode).
3. R3: Real-Time Queue Monitor & Channels Dashboard in /admin/appuntamenti ("Canali Notifiche & Coda" tab, WhatsApp connection state & QR, real-time queue monitor with countdown, test single send button).
4. R4: Complete standalone Supabase SQL schema in c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql (products, variants, inventory, appointments, orders, blocked_slots, notification_logs, RLS policies).
5. Rigorous testing and validation:
- Automated queue test verifying measured delay between consecutive sends is strictly 20-45s with jitter.
- Verified email HTML generation and calculation correctness.
- npx tsc --noEmit passes with 0 errors.
- npm run lint passes with 0 errors and 0 warnings.
- npm run build succeeds cleanly on all routes.

Maintain plan.md, BRIEFING.md, and progress.md in your working directory. When complete and verified, report completion back with full evidence.
