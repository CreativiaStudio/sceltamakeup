# Project: Scelta Makeup Storefront Luxury Restyling & Dynamic Upgrade

## Architecture
- Framework: Next.js 16.2.4 (Turbopack, React 19, Tailwind CSS v4, TypeScript 5, Zustand)
- Design System: Luxury Aesthetic
  - Fonts: Inter (`--font-geist-sans`) as primary sans-serif for body/technical text, Cormorant Garamond (`--font-cormorant`) as elegant serif for titles/headings
  - Palette: Royal Violet `#5E1788`, Pastel Lilac `#D8C2E7`, Mauve Rose `#D462A6`, Charcoal Deep `#1F1B24`/`#17141A`, Optical White `#FFFFFF`
  - Typography Rules: Strict floor of 12px (`text-xs`), optimal 14px (`text-sm`), WCAG AA contrast against light backgrounds
- Key Component Architecture:
  - `components/BrandLogo.tsx`: [VERIFIED] Unmasked natural aspect ratio (1600x908, ~1.76:1), `object-contain`, no circular clipping, responsive `h-10 sm:h-12`, luxury frosted plate in dark footer
  - `components/Footer.tsx`: [VERIFIED] Deep gradient `#1F1B24` -> `#17141A` -> `#120F16`, luxury Scelta Privilège Club newsletter box with glow, 4 balanced columns, exact credit: `"Sviluppato da Creativia Studio"`
  - `components/HeroSection.tsx`: Modular `variant?: 'split' | 'fullwidth'`, editorial beauty visual + floating satin card + boutique Napoli badge + dual CTA ("Esplora i Bestseller" smooth scroll & "Prenota Make-Up in Atelier (-10%)") + luxury trust bar
  - `components/CategoryStoryCircles.tsx`: 6 macro-categories with luxury gradient rings (Viso, Occhi, Labbra, Skincare & Dermo, Accessori, Atelier Trattamenti)
  - `components/BestsellerCarousel.tsx`: Horizontal scrollable carousel with arrow controls and touch swipe, color swatches, quick add to cart
  - `components/AtelierBanner.tsx`: High-end experiential banner for Federica's Napoli atelier (-10% online booking highlight, CTA to `/prenota`)
  - `components/CuratedProductGrid.tsx`: Curated selection limited to 12 items + category filter pills + primary CTA to `/prodotti`
  - `app/prodotti/page.tsx`: Dedicated full catalog page for all 341 products with search, category/brand filters, and pagination
  - `components/booking/BookingWizard.tsx`: Polished luxury calendar with chevrons, session grouping (Pomeriggio vs Serale), typography elevated >=12px, transparent deposit breakdown

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Logo Elevation Header | Unmask rectangular logo in `BrandLogo.tsx`, `h-10 sm:h-12`, `object-contain`, remove circular clipping | M1 (DONE) | Survey / ORIGINAL_REQUEST |
| 2 | Logo Elevation Footer | Luxury white badge plate for rectangular logo on dark footer background | M1 (DONE) | Survey / ORIGINAL_REQUEST |
| 3 | Typography Overhaul | Fix `--font-sans` / `--font-serif` in `globals.css`, raise all <12px storefront text to >=12px/14px | M1 (DONE) | Survey / ORIGINAL_REQUEST |
| 4 | Footer Redesign | Deep violet gradient, glow newsletter, exact credit "Sviluppato da Creativia Studio" | M1 (DONE) | Survey / ORIGINAL_REQUEST |
| 5 | Split Editorial Hero | Modular `HeroSection.tsx` with split editorial layout, beauty portrait, floating card, dual CTA, trust bar | M2 | Survey / ORIGINAL_REQUEST |
| 6 | Modular Hero Switch | Support switchable/reversible `variant='fullwidth'` fallback | M2 | Survey / ORIGINAL_REQUEST |
| 7 | Category Story Circles | Horizontal story circles for Viso, Occhi, Labbra, Skincare, Accessori, Atelier | M2 | Survey / ORIGINAL_REQUEST |
| 8 | Bestseller Carousel | Horizontal carousel with arrows, touch scroll, swatches, quick add | M2 | Survey / ORIGINAL_REQUEST |
| 9 | Atelier Banner | Experiential Napoli boutique banner with -10% online highlight, CTA to /prenota | M2 | Survey / ORIGINAL_REQUEST |
| 10| Curated Grid (12 Items) | Homepage grid capped at 12 items + category pills + CTA button to full catalog | M2 | Survey / ORIGINAL_REQUEST |
| 11| Full Catalog Route | Create `app/prodotti/page.tsx` so all 341 products remain fully accessible | M2 | Survey / ORIGINAL_REQUEST |
| 12| Booking Wizard Polish | Fix sub-12px text in `BookingWizard.tsx`, add calendar navigation chevrons and session grouping | M3 | Survey / ORIGINAL_REQUEST |
| 13| Full Build Verification | Zero TypeScript errors (`npx tsc --noEmit`) and successful static build (`npm run build`) | M3 | Survey / ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Survey & Codebase Audit | Comprehensive audit of components, routes, assets, build health | none | DONE |
| 1 | Brand Identity, Logo, Typography & Footer | Unmask logo, fix `globals.css` typography, elevate sub-12px fonts, redesign footer | M0 | DONE |
| 2 | Split Editorial Hero & Dynamic Homepage | HeroSection, CategoryStoryCircles, BestsellerCarousel, AtelierBanner, CuratedGrid, `/prodotti/page.tsx` | M1 | IN_PROGRESS |
| 3 | Booking Polish & Full Build Verification | /prenota review, calendar polish, full tsc/build verification | M2 | PLANNED |
