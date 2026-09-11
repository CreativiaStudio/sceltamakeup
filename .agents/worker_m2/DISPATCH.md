# Dispatch for Worker M2: Split Editorial Hero & Dynamic Homepage Restyling

## Objective
Implement Milestone 2: Transform the homepage from a 341-product infinite scroll into a dynamic, luxury editorial experience with modular components and create the dedicated `/prodotti` catalog page.

### 1. `components/HeroSection.tsx`
- Refactor to accept props:
  ```ts
  export interface HeroSectionProps {
    variant?: 'split' | 'fullwidth';
  }
  ```
  Defaulting to `'split'`.
- In `'split'` variant (per benchmark & user specifications):
  - Visual column: Beauty portrait + floating product card with satin/glass finish (`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl`) and swatch.
  - Content column:
    - Overline badge: `"ALTA COSMESI & ATELIER DI BELLEZZA • NAPOLI"`
    - Title: `"L'Arte del Viso Perfetto. Senza Filtri, Senza Maschere."` (high contrast, serif title).
    - Payoff: `"La purezza formulativa Diego dalla Palma e la maestria professionale Cipria Makeup selezionate per esaltare la tua bellezza naturale a Napoli."`
    - Floating boutique badge: `"Boutique Ufficiale • Via dei Pellegrini 28/29, Napoli"`
    - Dual CTAs:
      - Primary CTA: `"Esplora i Bestseller"` (scroll smoothly to `#bestseller`).
      - Secondary CTA: `"Prenota Make-Up in Atelier"` with `"-10% Online"` badge (links to `/prenota`).
    - Trust bar: 4 luxury items with >= 12px typography.
- In `'fullwidth'` variant: support clean, centered wide layout with dark violet gradient overlay and dual CTAs as a reversible fallback.

### 2. Create `components/CategoryStoryCircles.tsx`
- Horizontal scrollable row of 6 category story circles with luxury gradient borders (`from-[#5E1788] via-[#D462A6] to-[#D8C2E7]`):
  1. Viso (`/prodotti?categoria=Viso`)
  2. Occhi (`/prodotti?categoria=Occhi`)
  3. Labbra (`/prodotti?categoria=Labbra`)
  4. Skincare & Dermo (`/prodotti?categoria=Skincare+%26+Dermo`)
  5. Accessori (`/prodotti?categoria=Beauty+%26+Accessori`)
  6. Atelier Servizi (`/prenota`) with distinctive `-10%` badge linking to booking wizard.
- Labels >= 12px/14px.

### 3. Create `components/BestsellerCarousel.tsx`
- Container anchored with `id="bestseller"`.
- Header: Section badge `"Icone di Bellezza & Tendenze"`, Title `"I Bestseller della Maison"`, Chevron left/right buttons with smooth horizontal scrolling.
- Horizontal track: `flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4`.
- Card width: `w-[280px] sm:w-[320px] shrink-0 snap-start`.
- Embeds `ProductCard` directly (preserving shade swatches and quick add to cart).

### 4. Create `components/AtelierBanner.tsx`
- Luxury deep card (`bg-gradient-to-br from-[#1F1B24] via-[#2D163B] to-[#1F1B24] border border-[#D8C2E7]/30 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden`).
- Badge: `"Atelier di Bellezza & Cabina Trucco • Napoli"`
- Heading: `"L'Arte del Make-Up Sartoriale"`
- Description highlighting Federica's personalized makeup sessions in Via dei Pellegrini 28/29 Napoli.
- Special highlight: `"-10% di Sconto Immediato su tutte le prenotazioni online (Acconto 20%, saldo in boutique)"`.
- Primary CTA: `"Prenota la Tua Seduta (-10%)"` -> `/prenota`
- Secondary CTA: `"Scopri i Trattamenti"` -> `/servizi`

### 5. Create `components/CuratedProductGrid.tsx`
- Capped at 12 items (`products.slice(0, 12)`).
- Category filter pills to filter within the 12 curated items.
- Bottom action block:
  - Text: `"Mostrando una selezione curata di creazioni esclusive"`
  - Primary button: `"Sfoglia Tutti i 341 Prodotti nel Catalogo Completo"` -> `/prodotti`.

### 6. Create `app/prodotti/page.tsx`
- Full catalog page rendering all 341 products with search input, category filters, brand filters, sorting, and pagination/load more.
- Ensures all 341 products remain 100% accessible via SEO-friendly route.

### 7. Update `app/page.tsx`
- Compose the new dynamic homepage:
  - `<HeroSection variant="split" />`
  - `<CategoryStoryCircles />`
  - `<BestsellerCarousel products={bestsellerProducts} />`
  - `<AtelierBanner />`
  - `<CuratedProductGrid initialProducts={products} />`
  - `<BoutiqueSection />`

### 8. Verification
- `npx tsc --noEmit` -> 0 errors.
- `npm run lint` -> 0 errors.
- `npm run build` -> compiles cleanly (including `/prodotti`).
- Write complete handoff report in `c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/worker_m2/handoff.md`.

## 2026-09-11T08:35:05Z
You are Worker M2 (Implementation Worker for Split Editorial Hero & Dynamic Homepage Restyling).
Your working directory is: c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/worker_m2
Your project root is: c:/Users/mario/Progetti Antigravity/Scelta Makeup

MANDATORY: Read the authoritative specifications in:
c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/ORIGINAL_REQUEST.md
and read your dispatch instructions in:
c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/worker_m2/DISPATCH.md
Also read the detailed Explorer M0-2 findings in:
c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/explorer_m0_2/handoff.md

