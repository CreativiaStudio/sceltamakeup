# Dispatch for Explorer M0-3: Booking Wizard (/prenota) & Build Environment

Inspect the current codebase for:
1. Booking wizard route (`/prenota`) and its subcomponents (treatment selection, date/time luxury calendar, summary, deposit/pricing calculations with 10% discount and 20% deposit).
2. Existing packages, dependencies, Lucide icons, Framer Motion, Tailwind setup, and build configuration in `package.json` / `tsconfig.json`.
3. Check current TypeScript and build health (`package.json` scripts).
4. Identify exact file paths, current calculation formulas, and produce a structured report in `handoff.md` in your working directory.

## 2026-09-11T08:19:06Z
- Locate the `/prenota` route file and all its components and state management.
- Inspect how treatments are defined, how the -10% online discount, 20% deposit, and in-store balance are computed and displayed.
- Inspect the calendar and time slot selection UX/UI. Are there styling, readability, or luxury polish improvements needed?
- Inspect `package.json`, dependencies (lucide-react, framer-motion, etc.), `tsconfig.json`, and run a check on TypeScript (`npx tsc --noEmit`) and build (`npm run build`) to establish baseline build status.
- Output detailed findings, exact file paths, line numbers, calculation formulas, and build verification status in `handoff.md`.
- Send a completion message back to orchestrator.
