# BRIEFING — 2026-09-11T08:35:05Z

## Mission
Transform the Scelta Makeup homepage from a 341-product infinite scroll into a dynamic, luxury editorial experience with modular split/fullwidth HeroSection, CategoryStoryCircles, BestsellerCarousel, AtelierBanner, CuratedProductGrid (12 items), and full-catalog `/prodotti` page.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m2
- Original parent: 7cfc832a-7e16-4b7c-bcd9-d4b8fe5ad7c7
- Milestone: M2 Split Editorial Hero & Dynamic Homepage Restyling

## 🔒 Key Constraints
- STRICT ISOLATION: Zero database dependency, zero calls to Isabel Pepe. Autonomous local storage engine (`lib/adminStore.ts`) & standalone `supabase_schema.sql`.
- DO NOT CHEAT: Genuine logic only, real state updates, no hardcoding, no dummy facades.
- PRESERVE 100%: `app/admin/appuntamenti/page.tsx` (627 lines) must remain 100% intact and functional.
- BRAND IDENTITY: Scelta Makeup official palette: Royal Violet `#5E1788`, Vivid Orchid `#7A3293`, Pastel Lilac `#D8C2E7`, Mauve Rose `#D462A6`, Optical White `#FFFFFF`.
- BUILD & LINT: `npx tsc --noEmit`, `npm run lint`, `npm run build` must all pass with 0 errors.
- TYPOGRAPHY: All labels, badges, and body copy >= 12px/14px.
- REVERSIBILITY & MODULARITY: `HeroSection` must support `variant?: 'split' | 'fullwidth'` defaulting to `'split'`.
- ACCESSIBILITY: Full 341-product catalog accessible at `/prodotti` with search, category/brand filters, and pagination.

## Current Parent
- Conversation ID: 7cfc832a-7e16-4b7c-bcd9-d4b8fe5ad7c7
- Updated: 2026-09-11T08:35:05Z

## Task Summary
- **What to build**:
  1. `components/HeroSection.tsx`: refactored with `variant?: 'split' | 'fullwidth'`, split beauty portrait + floating product card, updated copy/CTAs (`#bestseller` and `/prenota` with -10%), fullwidth reversible fallback, typography >= 12px.
  2. `components/CategoryStoryCircles.tsx`: 6 luxury gradient story circles (Viso, Occhi, Labbra, Skincare & Dermo, Accessori, Atelier Servizi with -10% badge).
  3. `components/BestsellerCarousel.tsx`: anchored with `id="bestseller"`, header with chevron controls, smooth horizontal track, embedding ProductCard.
  4. `components/AtelierBanner.tsx`: experiential luxury banner for Federica's atelier in Napoli, -10% online discount highlight (20% deposit), CTAs to `/prenota` and `/servizi`.
  5. `components/CuratedProductGrid.tsx`: limited to 12 items, category filter pills, CTA to `/prodotti`.
  6. `app/prodotti/page.tsx`: full catalog for all 341 products with search, category/brand filters, sorting, pagination.
  7. `app/page.tsx`: composed dynamic homepage.
  8. Verification: typecheck, lint, and build.

## Key Decisions Made
- `HeroSection` implements clean conditional layout rendering based on `variant === 'fullwidth'`, maintaining responsive behavior and high visual polish in both modes.
- `BestsellerCarousel` uses programmatic horizontal scrolling with ref and native smooth touch swipe/snap.
- `CuratedProductGrid` preserves client-side filtering over the 12 curated products while providing a clear callout and direct button to `/prodotti`.
- `app/prodotti/page.tsx` uses Suspense wrapping for client searchParams handling, full pagination (24 items per page with page navigation buttons), brand & category filters, and price/alphabetical sorting.

## Change Tracker
- **Files to modify**:
  - `components/HeroSection.tsx`
  - `components/BoutiqueSection.tsx`
  - `app/page.tsx`
- **Files to create**:
  - `components/CategoryStoryCircles.tsx`
  - `components/BestsellerCarousel.tsx`
  - `components/AtelierBanner.tsx`
  - `components/CuratedProductGrid.tsx`
  - `app/prodotti/page.tsx`
- **Build status**: Initial check passed (tsc: 0 errors, lint: 0 errors).

## Quality Status
- **Build/test result**:
  - `npx tsx --test tests/m2-editorial-restyling.test.ts`: 9 / 9 passed (100%)
  - `npx tsc --noEmit`: 0 errors
  - `npm run lint`: 0 errors, 0 warnings
  - `npm run build`: 350 / 350 pages compiled successfully in 3.7s
- **Lint status**: 0 errors, 0 warnings
- **Tests added/modified**: `tests/m2-editorial-restyling.test.ts` (9 comprehensive assertions covering HeroSection variants, CategoryStoryCircles, BestsellerCarousel, AtelierBanner, CuratedProductGrid, CatalogClient, route generation)

## Artifact Index
- `components/HeroSection.tsx` — Modular Hero component supporting 'split' (default) and 'fullwidth' reversible fallback.
- `components/CategoryStoryCircles.tsx` — 6 luxury gradient story circles with -10% Atelier booking badge.
- `components/BestsellerCarousel.tsx` — Horizontal scrollable bestseller track anchored at #bestseller with chevron controls.
- `components/AtelierBanner.tsx` — Luxury experiential Atelier card with -10% online booking promotion.
- `components/CuratedProductGrid.tsx` — 12-item curated showcase with category filter pills and CTA to full catalog.
- `components/CatalogClient.tsx` — Interactive full catalog client with search, category & brand filtering, sorting, pagination.
- `app/prodotti/page.tsx` — SEO-optimized full catalog route for all 341 products.
- `app/page.tsx` — Composed high-end dynamic homepage.
- `tests/m2-editorial-restyling.test.ts` — E2E test suite for Milestone 2.
- `handoff.md` — Complete handoff report.

## Loaded Skills
- **Source**: `C:\Users\mario\.gemini\config\skills\scelta_makeup\SKILL.md`
- **Local copy**: `.agents/worker_m2/skills/scelta_makeup.md`
- **Core methodology**: Scelta Makeup luxury boutique design system, 341 catalog products, standalone database isolation, RT ePOS integration, WhatsApp anti-ban pacing.
