# Handoff Report — Explorer M0-2: Homepage, Hero, Catalog & Product Cards

**Date**: 2026-09-11  
**Agent**: Explorer M0-2  
**Target Milestone**: M0 Survey / Architecture Definition for Storefront Restyling & Dynamic Homepage  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Homepage Route File & Rendered Component Tree
- **File**: `app/page.tsx` (Lines 1–30)
- **Code**:
  ```tsx
  import { Suspense } from "react";
  import HeroSection from "@/components/HeroSection";
  import ProductGrid from "@/components/ProductGrid";
  import BoutiqueSection from "@/components/BoutiqueSection";
  import { getAllProducts } from "@/lib/catalog";

  export const revalidate = 3600;

  export default async function HomePage() {
    const products = await getAllProducts();

    return (
      <div className="flex flex-col min-h-screen">
        <HeroSection />
        
        <Suspense
          fallback={
            <div className="py-20 text-center text-neutral-400">
              Caricamento capolavori...
            </div>
          }
        >
          <ProductGrid initialProducts={products} />
        </Suspense>

        <BoutiqueSection />
      </div>
    );
  }
  ```
- **Direct Observations**:
  1. `HomePage` is an asynchronous React Server Component with `revalidate = 3600`.
  2. The page renders exactly three direct child components: `<HeroSection />`, `<ProductGrid initialProducts={products} />` (inside Suspense), and `<BoutiqueSection />`.
  3. `getAllProducts()` fetches all 341 products from `data/catalog.json` and passes the entire array to `ProductGrid`.

---

### 1.2 Hero Section Component
- **File**: `components/HeroSection.tsx` (Lines 1–199)
- **Direct Observations**:
  1. **Component Signature (Line 7)**: `export default function HeroSection()`. It takes **no props** and has no variant switch.
  2. **Layout Grid (Line 15)**: `grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center`. Hardcoded 2-column layout (`lg:col-span-7` text, `lg:col-span-5` visual).
  3. **CTAs (Lines 43–57)**:
     - Button 1: Anchor link to `#catalogo` (`"Scopri la Collezione"`).
     - Button 2: Anchor link to `#boutique` (`"Boutique Experience"`).
     - Does **not** link to `/prenota` or feature the `-10% Online` booking offer.
     - Does **not** have an anchor to `#bestseller`.
  4. **Visual Assets (Lines 76–111)**:
     - Uses external Unsplash image `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85`.
     - Floating bottom card: `"In Evidenza: Geisha Matte & Lifting Glow"` linking to `/prodotti/geisha-matte-liquid-lipstick`.
     - Floating top badge: `"Atelier Fisico: Via dei Pellegrini 28/29 Napoli Centro"` with `Store` icon.
  5. **Trust Bar (Lines 134–194)**:
     - 4 items: Spedizione Gratuita (da €49), Ritiro in Boutique, 100% Autentico & Cruelty-Free, Consulenza & Shade Match.
  6. **Typography & Font Sizes**:
     - Uses sub-12px classes: `text-[10px]` (Line 93, 119, 125) and `text-[11px]` (Line 99, 145, 159, 173, 187). Violates R4 (minimum 12px/14px).

---

### 1.3 341 Products Rendering & Catalog Architecture
- **Files**:
  - `components/ProductGrid.tsx` (Lines 1–189)
  - `app/prodotti/` (Directory structure)
- **Direct Observations**:
  1. **Rendering All 341 Products (Lines 158–163 of `ProductGrid.tsx`)**:
     ```tsx
     {filteredProducts.length > 0 ? (
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
         {filteredProducts.map((product) => (
           <ProductCard key={product.id} product={product} />
         ))}
       </div>
     ) : ( ... )}
     ```
     - There is **no pagination**, **no slice**, and **no infinite scroll**.
     - All 341 products (or the filtered subset) are mounted directly into the DOM simultaneously.
  2. **Absence of Dedicated Catalog Page**:
     - Inspected `app/prodotti`: contains **only** `[slug]/page.tsx` (`app/prodotti/[slug]/page.tsx`).
     - There is **NO `app/prodotti/page.tsx`** and **NO `app/catalogo/page.tsx`**.
     - All navigational links across the entire app (`Header.tsx:87,89`, `Footer.tsx:162,167,172,177,182`, `MegaMenu.tsx:109,114,121,174`, `SearchOverlay.tsx:160`, `HeroSection.tsx:44`, `checkout/page.tsx:196`) point to `/?categoria=...#catalogo` or `/#catalogo`.

---

### 1.4 Product Card, Swatches, Cart Integration, Category Filters
- **Files**:
  - `components/ProductCard.tsx` (Lines 1–238)
  - `store/useCartStore.ts` (Lines 1–142)
  - `lib/catalog.ts` (Lines 1–93)
- **Direct Observations**:
  1. **Product Card Props**: `interface ProductCardProps { product: Product; }`.
  2. **Shade Swatches (Lines 173–202 of `ProductCard.tsx`)**:
     - Maps `product.shades.slice(0, 6)`.
     - Swatch button: `h-5 w-5 rounded-full`, style `backgroundColor: shade.hex`.
     - Clicking a swatch updates `selectedShade`, which immediately swaps `activeImage` (line 28) and `currentPrice` (line 31).
     - Renders `+{product.shades.length - 6}` if more than 6 shades.
  3. **Zustand Cart Integration (Lines 33–58 of `ProductCard.tsx` & `store/useCartStore.ts`)**:
     - `addItem` is called with:
       ```ts
       addItem({
         productId: product.id,
         slug: product.slug,
         name: product.name,
         brand: product.brand,
         price: currentPrice,
         quantity: 1,
         shade: selectedShade ? { id, name, code, hex, image } : undefined,
         image: activeImage,
       });
       ```
     - In `store/useCartStore.ts` (line 55, 67, 80): composite key `${data.productId}-${shadeId}` is created. Calling `addItem` automatically sets `isOpen: true`, opening the `CartDrawer` slide-over.
  4. **Category Filtering**:
     - Defined in `lib/catalog.ts`: `CATEGORIES: CategoryKey[] = ['Tutti', 'Viso', 'Occhi', 'Labbra', 'Skincare & Dermo', 'Beauty & Accessori']`.
     - Catalog breakdown across 341 products:
       - Skincare & Dermo: 82 products
       - Viso: 129 products
       - Occhi: 90 products
       - Labbra: 39 products
       - Beauty & Accessori: 1 product
     - Brands: Diego dalla Palma (82), Eveline Cosmetics (98), Pierre René (59), RVB LAB (53), Miyo (26), Cipria Make Up (23).
     - Bestsellers/Featured flag count: 49 products.
  5. **Typography Issues in `ProductCard.tsx`**:
     - 6 instances of sub-12px font: `text-[10px]` (badge: 84, brand: 92, category: 132, stock: 137, shades count: 167, +N count: 197).
     - 1 instance of `text-[11px]` (shade name: 165).

---

## 2. Logic Chain

1. **Premise (User Request R3)**: The user requires eliminating the 341-product infinite scroll from the homepage and replacing it with a high-end editorial structure:
   - Category Story Circles
   - Horizontal Bestseller Carousel
   - Atelier & Cabina Trucco Banner (-10% online)
   - Curated Grid limited to 12 items + CTA button to full catalog.
2. **Current State (Obs 1.1 & 1.3)**: `app/page.tsx` currently dumps all 341 products directly into `ProductGrid.tsx`. There is no dedicated `/prodotti` page.
3. **Inference 1**: To prevent user disorientation, a dedicated full catalog page (`app/prodotti/page.tsx`) must be introduced so that the full 341 products are still accessible with all filters and pagination.
4. **Inference 2**: The homepage `ProductGrid` should be replaced or refactored into a `CuratedProductGrid` that caps rendering at 12 items (`products.slice(0, 12)`), with category pill filtering and a primary CTA `"Sfoglia Tutti i 341 Prodotti nel Catalogo Completo"` pointing to `/prodotti`.
5. **Premise (User Request R2)**: Hero section needs a modular split editorial layout with a switchable full-width fallback.
6. **Current State (Obs 1.2)**: `HeroSection.tsx` has no props and hardcodes the split layout with outdated CTAs (`#catalogo` and `#boutique`).
7. **Inference 3**: `HeroSection.tsx` must accept `variant?: 'split' | 'fullwidth'` (defaulting to `'split'`).
   - CTAs must be updated to:
     - Primary: `"Esplora i Bestseller"` (scroll to `#bestseller` or `/prodotti`).
     - Secondary: `"Prenota Make-Up in Atelier"` with `"-10% Online"` badge (linking to `/prenota`).
8. **Premise (User Request R4)**: Micro-fonts (< 12px) must be eliminated across the storefront.
9. **Current State (Obs 1.2 & 1.4)**: `HeroSection.tsx` and `ProductCard.tsx` contain multiple `text-[10px]` and `text-[11px]` classes.
10. **Inference 4**: All `text-[10px]` and `text-[11px]` in `ProductCard.tsx` and `HeroSection.tsx` must be refactored to `text-xs` (12px) or `text-sm` (14px) with high-contrast text colors (`#1F1B24`, `#5E1788`).

---

## 3. Caveats

1. **Routing Strategy**: Right now, `Header.tsx`, `Footer.tsx`, and `MegaMenu.tsx` direct users to `/?categoria=...#catalogo`. When `/prodotti` is introduced:
   - For backwards compatibility and smooth UX, `/prodotti?categoria=...` should be supported on `/prodotti`, while the homepage curated grid can either filter in-place or link out.
2. **Image Sources**: Many product images and hero visual assets rely on external URLs (Unsplash) or local invoice packshots. Next.js image domain config in `next.config.ts` must continue to allow `images.unsplash.com`.
3. **No Database Writes**: All catalog products are loaded statically from `data/catalog.json`. No Supabase calls are needed for public catalog browsing, maintaining total database isolation.

---

## 4. Conclusion & Technical Recommendations

### 4.1 Recommended New Homepage Layout (`app/page.tsx`)
```tsx
export default async function HomePage() {
  const products = await getAllProducts();
  const bestsellerProducts = products.filter(
    (p) => p.badge === "Bestseller" || p.badges.includes("bestseller") || p.isFeatured
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Modular Hero Section (Split editorial by default, switchable to fullwidth) */}
      <HeroSection variant="split" />

      {/* 2. Category Story Circles */}
      <CategoryStoryCircles />

      {/* 3. Horizontal Bestseller & Tendenze Carousel */}
      <BestsellerCarousel products={bestsellerProducts} />

      {/* 4. Atelier & Cabina Trucco Experiential Banner (-10% Online) */}
      <AtelierBanner />

      {/* 5. Curated Showcase Grid (Capped at 12 items + CTA to full catalog) */}
      <Suspense fallback={<div className="py-16 text-center text-neutral-400">Caricamento selezione...</div>}>
        <CuratedProductGrid initialProducts={products} limit={12} />
      </Suspense>

      {/* 6. Physical Boutique Section */}
      <BoutiqueSection />
    </div>
  );
}
```

---

### 4.2 Component Blueprint 1: `CategoryStoryCircles.tsx`
- **File to create**: `components/CategoryStoryCircles.tsx`
- **Design Specifications**:
  - Horizontal scrollable container (`flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-6 px-4 max-w-7xl mx-auto`).
  - 6 categories with luxury gradient ring (`p-[2.5px] bg-gradient-to-tr from-[#5E1788] via-[#D462A6] to-[#D8C2E7]`):
    1. **Viso** (`/prodotti?categoria=Viso`) — Fondotinta, ciprie, blush
    2. **Occhi** (`/prodotti?categoria=Occhi`) — Mascara, ombretti, eyeliner
    3. **Labbra** (`/prodotti?categoria=Labbra`) — Rossetti Geisha, lip gloss, matite
    4. **Skincare & Dermo** (`/prodotti?categoria=Skincare+%26+Dermo`) — Trattamenti RVB LAB e Diego dalla Palma
    5. **Accessori** (`/prodotti?categoria=Beauty+%26+Accessori`) — Pennelli e spugnette professionali
    6. **Atelier Trattamenti** (`/prenota`) — Floating `-10%` badge, links directly to booking wizard!
  - Typography: Label `text-xs sm:text-sm font-semibold text-[#1F1B24] tracking-wide mt-2.5`.

---

### 4.3 Component Blueprint 2: `BestsellerCarousel.tsx`
- **File to create**: `components/BestsellerCarousel.tsx`
- **Design Specifications**:
  - Anchored with `id="bestseller"`.
  - Header: Section badge (`"Icone di Bellezza & Tendenze"`), Editorial title (`"I Bestseller della Maison"`), navigation chevron buttons (`ChevronLeft`, `ChevronRight`).
  - Scroll Track: `flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4 pt-2`.
  - Item Width: `w-[270px] sm:w-[300px] shrink-0 snap-start`.
  - Card Content: Embeds `ProductCard` directly, preserving shade swatch switching and quick add to cart.
  - Buttons: Smooth programmatic scroll (`containerRef.current.scrollBy({ left: -320, behavior: 'smooth' })`).

---

### 4.4 Component Blueprint 3: `AtelierBanner.tsx`
- **File to create**: `components/AtelierBanner.tsx`
- **Design Specifications**:
  - Aesthetic: Deep violet luxury card (`bg-gradient-to-br from-[#1F1B24] via-[#2D163B] to-[#1F1B24] border border-[#D8C2E7]/30 text-white rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden relative`).
  - Content:
    - Badge: `"Atelier di Bellezza & Cabina Trucco • Napoli"`
    - Heading: `"L'Arte del Make-Up Sartoriale"`
    - Story: `"Dalla consulenza armocromatica al trucco cerimonia ad alta definizione con Federica Cesiano nella boutique di Via dei Pellegrini 28/29."`
    - Discount Highlight: `"10% di Sconto Immediato su tutte le prenotazioni online (Versa il 20% di acconto, saldi in negozio)."`
    - Dual CTAs:
      - Primary CTA: `"Prenota la Tua Seduta (-10%)"` -> `/prenota`
      - Secondary CTA: `"Scopri il Menù Servizi"` -> `/servizi`
    - Visual: Photographic packshot or boutique interior (`/brand/negozio-fisico.png`).

---

### 4.5 Component Blueprint 4: `CuratedProductGrid.tsx` & Dedicated `/prodotti` Page
- **File to create**: `components/CuratedProductGrid.tsx`
- **Design Specifications**:
  - Replaces the 341-card dump on homepage.
  - Category filter pills (`"Tutti"`, `"Viso"`, `"Occhi"`, `"Labbra"`, `"Skincare & Dermo"`, `"Beauty & Accessori"`).
  - Renders `initialProducts.filter(...).slice(0, 12)` (max 12 cards).
  - Action Block at bottom:
    - Text: `"Mostrando 12 di 341 creazioni disponibili"`
    - Primary Button: `"Sfoglia Tutti i 341 Prodotti nel Catalogo Completo"` -> `/prodotti` (or `/prodotti?categoria=...`).
- **File to create**: `app/prodotti/page.tsx`
  - Houses the full catalog of 341 products with comprehensive brand filters, category filters, sorting (Prezzo, Novità), and pagination/load more.

---

### 4.6 Component Blueprint 5: Hero Section Refactoring (`components/HeroSection.tsx`)
- **Props interface**:
  ```ts
  export interface HeroSectionProps {
    variant?: 'split' | 'fullwidth';
  }
  ```
- **Updates**:
  - If `variant === 'split'` (default): Render the 2-column layout with updated CTAs:
    - CTA 1: `"Esplora i Bestseller"` (scrolls to `#bestseller`).
    - CTA 2: `"Prenota Make-Up in Atelier"` with `"-10% Online"` badge (links to `/prenota`).
  - If `variant === 'fullwidth'`: Render wide cinematic layout with dark/violet gradient overlay, centered editorial typography, floating boutique badge, and dual CTAs.
  - Upgrade typography: Change all `text-[10px]` and `text-[11px]` to `text-xs` (12px) and `text-sm` (14px).

---

### 4.7 Component Blueprint 6: Typography Upgrade in `ProductCard.tsx`
- Refactor all sub-12px styles:
  - Line 84: `text-[10px]` -> `text-xs font-bold`
  - Line 92: `text-[10px]` -> `text-xs font-semibold`
  - Line 132: `text-[10px]` -> `text-xs font-medium`
  - Line 137: `text-[10px]` -> `text-xs font-medium`
  - Line 165: `text-[11px]` -> `text-xs font-medium`
  - Line 167: `text-[10px]` -> `text-xs font-mono`
  - Line 197: `text-[10px]` -> `text-xs text-neutral-500`

---

## 5. Verification Method

### 5.1 Static Verification
1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, zero errors.
2. **ESLint Verification**:
   ```powershell
   npm run lint
   ```
   *Expected result*: Exit code 0, zero warnings, zero errors.

### 5.2 Build Verification
```powershell
npm run build
```
*Expected result*: All routes compile successfully, including `/` and `/prodotti`.

### 5.3 Invalidation Conditions
- Any regression on `/admin`, `/checkout`, `/prenota`, or `/prodotti/[slug]`.
- Failure to limit the homepage curated grid to 12 items.
- Absence of `-10% Online` CTA to `/prenota` in the Hero and Atelier Banner.
- Any leftover `text-[10px]` or unreadable micro-text on product cards or hero section.
