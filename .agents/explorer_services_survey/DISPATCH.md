## 2026-09-07T09:59:29Z
You are teamwork_preview_explorer for Scelta Makeup FASE 3 Services & DB Survey.
Working directory: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_services_survey

Read the authoritative user request at:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md

Project root:
c:\Users\mario\Progetti Antigravity\Scelta Makeup

Your mission:
1. Investigate existing database and Supabase setup:
   - Look for existing SQL files, migration files, types, or Supabase client helpers in the repository.
   - Analyze requirements for standalone `supabase_schema.sql` at project root covering:
     products, variants, inventory, appointments, orders, blocked_slots, notification_logs, RLS policies.
   - Check table schemas, enum types, indexes, triggers, and foreign keys needed.
2. Investigate existing notification / communication services:
   - Look for existing `lib/` or service files (e.g. email, whatsapp, resend, evolution api).
   - Detail what needs to be created or extended for:
     a) `lib/resendService.ts` with responsive HTML templates and realistic preview/demo mode.
     b) WhatsApp queue worker with persistent or in-memory queue, human pacing (20-45s random jitter), Evolution API client, QR session mock/demo mode.
     c) API routes or server actions for queue polling, status checking, and manual test dispatch.

Scope boundaries:
- READ-ONLY. Do not write or edit any source code.
- Write your comprehensive services survey report to:
  c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_services_survey\survey_report.md
- Write handoff.md in your working directory and notify the parent orchestrator via send_message.
