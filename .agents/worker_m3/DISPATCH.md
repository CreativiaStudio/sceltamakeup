# Dispatch for Worker M3: Booking Wizard (/prenota) Polish & Full Verification

## Objective
Implement Milestone 3: Polish the interactive booking wizard in `components/booking/BookingWizard.tsx`, elevate all sub-12px font sizes for R4 compliance, enhance the luxury calendar UX (chevrons, session grouping, royal violet styling), and execute the full project verification suite (`tsc`, `lint`, `build`).

### Tasks
1. `components/booking/BookingWizard.tsx`:
   - Elevate all 6 sub-12px font size instances to `text-xs` (12px) or `text-sm` (14px):
     - Line 275: `text-[11px]` on deposit explanation note -> `text-xs`
     - Line 343: `text-[11px]` on calendar weekday names -> `text-xs font-semibold`
     - Line 350: `text-[9px]` on "Oggi" pill -> `text-xs font-semibold px-2 py-0.5`
     - Line 393: `text-[10px]` on time slot label -> `text-xs font-medium`
     - Line 578: `text-[11px]` on Step 4 deposit explanation -> `text-xs text-neutral-600`
     - Line 617: `text-[10px]` on SSL encryption badge -> `text-xs`
   - Luxury Calendar Polish:
     - Add desktop left/right navigation chevrons for smooth scrolling across the 14-day date strip.
     - Selected date card: apply refined `bg-brand-royal` gradient (`bg-gradient-to-br from-[#5E1788] via-[#7B2CBF] to-[#5E1788] text-white shadow-lg shadow-[#5E1788]/25 border-transparent`).
     - Group time slots into two distinct luxury session blocks:
       - **Sessione Pomeriggio** (`13:30`, `14:15`, `15:00`) — Pausa pranzo boutique
       - **Sessione Serale** (`20:00`, `20:45`) — Atelier esclusivo post-chiusura
       with clear session headers (`text-xs uppercase tracking-wider font-semibold text-[#5E1788]`).
   - Pricing & Financial Transparency:
     - Ensure the breakdown formula (`listino`, `-10% online`, `acconto 20%`, `saldo in boutique 80%`) is displayed clearly and elegantly across Steps 1, 2, 4, and 5.
2. Full Build & Verification:
   - Run `npx tsc --noEmit` -> MUST exit with 0 errors.
   - Run `npm run lint` -> MUST exit with 0 errors.
   - Run `npm run build` -> MUST compile all 350 static pages cleanly with exit code 0.
3. Write comprehensive report in `c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/worker_m3/handoff.md`.
