# Handoff Report: Brand Identity, Logo, Header, Footer, Typography & Design System
**Agent**: Explorer M0-1  
**Date**: 2026-09-11  
**Target Milestone**: M0 Exploration -> M1/M2/M3 Implementation  
**Status**: Complete  

---

## 1. Observation

### 1.1 Brand Logo Assets & Circular Clipping Mask
- **Logo File Assets**:
  - `public/brand/logo.png` (132,183 bytes)
  - `public/brand/logo.jpeg` (132,183 bytes)
  - `Logo/scelta makeup logo.jpeg` (132,183 bytes)
  - Direct binary header analysis: Magic bytes `ffd8ffe0` (standard JPEG), resolution **1600 x 908 px** (aspect ratio ~1.76:1 horizontal rectangle).
  - The image contains the complete official lockup: stylized female face profile illustration on the left, "Scelta MAKE UP" in serif/sans typography in the center, and the tagline "L'eleganza di essere autentica" beneath.
- **Circular Mask Implementation in `components/BrandLogo.tsx`**:
  - Lines 32–48:
    ```tsx
    <div
      className={`relative overflow-hidden rounded-full border border-purple-200/50 shadow-xs transition-all duration-300 group-hover:scale-105 ${
        compact
          ? "h-8 w-8 sm:h-9 sm:w-9"
          : "h-10 w-10 sm:h-12 sm:w-12"
      }`}
    >
      <Image
        src="/brand/logo.png"
        alt="Scelta Makeup Logo"
        fill
        sizes="(max-width: 640px) 36px, 48px"
        className="object-cover"
        onError={() => setImageError(true)}
        priority
      />
    </div>
    ```
  - Exact mechanism causing the defect:
    1. `rounded-full` (`border-radius: 9999px`) forces a circular clipping mask.
    2. Square dimensions (`h-10 w-10 sm:h-12 sm:w-12`) squash the 1600x908 rectangular image.
    3. `object-cover` zooms into the center of the image, slicing off the illustration and text.
    4. Duplicated HTML text at lines 62–84 manually renders `SCELTA MAKEUP` and `L'eleganza di essere autentica`, duplicating what is already embedded inside the official logo image.
    5. Line 77 applies `text-[9px] sm:text-[10px]`, violating the >= 12px requirement.

### 1.2 Header Navigation & Logo Rendering
- **File**: `components/Header.tsx`
  - Line 189: `<BrandLogo variant="header" compact={isScrolled} />`
  - Line 160–170: Sticky header changes from `h-20` (80px) down to `h-14` (56px) when `isScrolled` is active.
  - Small text sizes detected:
    - Line 225: `text-[11px]` on "Prenota (-10%)" button in scrolled mode.
    - Line 238: `text-[11px]` on "Boutique Napoli" link in scrolled mode.
    - Line 258: `text-[11px]` on "Carrello" label.
    - Line 262: `text-[11px]` on Cart badge quantity bubble.
    - Line 279: `text-[11px]` on "Macro-Categorie" header in mobile navigation drawer.

### 1.3 Footer Component, Logo, Newsletter & Credits
- **File**: `components/Footer.tsx`
  - **Credit line** (Lines 238–244):
    ```tsx
    <div className="flex items-center gap-1.5 text-neutral-400">
      <span>Sviluppato con eleganza da</span>
      <span className="text-white font-medium tracking-wider hover:text-[#D8C2E7] transition-colors">
        Creativia Studio
      </span>
    </div>
    ```
    *Requirement*: Rimuovere categoricamente ogni dicitura "sviluppato con eleganza da"; deve riportare esattamente "Sviluppato da Creativia Studio".
  - **Footer Logo rendering** (Line 89):
    `<BrandLogo variant="footer" />`
    Because the footer background is dark charcoal (`#1F1B24`), and the logo file is a JPEG with a solid white background, `BrandLogo` currently displays a harsh white circle cutting off the logo.
  - **Footer Background Styling** (Line 39):
    Current: `className="bg-[#1F1B24] text-white pt-16 pb-12 border-t border-neutral-800"`
    Lacks the rich deep violet radial glow / gradient (`#17141A` with royal purple radial reflection) and satin borders specified in R6.
  - **Newsletter "Scelta Privilège Club"** (Lines 43–82):
    Input field (Line 71) is a flat dark input (`bg-neutral-900 border-neutral-700`) without luxury glow effect or refined satin border.
  - **Column Structure** (Lines 85–225):
    12-column grid layout: Col 1 (`lg:col-span-4`), Col 2 (`lg:col-span-4`), Col 3 (`lg:col-span-2`), Col 4 (`lg:col-span-2`).
  - **Small text**:
    Line 233: `text-[11px]` on "Cassa & Appuntamenti Store" link.

### 1.4 Global Typography & Tailwind CSS v4 Configuration
- **File**: `app/globals.css` (Lines 15–34):
  ```css
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-royal-violet: var(--royal-violet);
    --color-vivid-orchid: var(--vivid-orchid);
    --color-pastel-lilac: var(--pastel-lilac);
    --color-optical-white: var(--optical-white);
    --color-mauve-rose: var(--mauve-rose);
    --color-charcoal-deep: var(--charcoal-deep);
    --color-satin-metallic: var(--satin-metallic);
    --font-sans: var(--font-cormorant), var(--font-geist-sans), Georgia, serif;
  }

  body {
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
  ```
- **File**: `app/layout.tsx` (Lines 10–21):
  ```tsx
  const cormorant = Cormorant_Garamond({
    variable: "--font-cormorant",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    style: ["normal", "italic"],
  });

  const inter = Inter({
    variable: "--font-geist-sans",
    subsets: ["latin"],
  });
  ```
- **Defects in Typography Configuration**:
  1. `--font-sans` is mapped to `var(--font-cormorant)` (Serif!) as the primary font. Consequently, `body` and all generic HTML elements inherit a serif font instead of a clean, geometric sans-serif (`Inter`).
  2. `--font-serif` is NOT defined in `@theme inline` at all. As a result, elements marked with Tailwind's `font-serif` fallback to the browser's default serif stack (`ui-serif, Georgia, Cambria, "Times New Roman"`), NOT `Cormorant Garamond`.

### 1.5 Scan of Small Font Sizes (< 12px) & Contrast Issues
Across the codebase, a total of **229 instances** of `text-[...px]` with values < 12px were identified:
- **Key Storefront Offenses**:
  - `components/BrandLogo.tsx`: Line 77 (`text-[9px] sm:text-[10px]`)
  - `components/Header.tsx`: Lines 225, 238, 258, 262, 279 (`text-[11px]`)
  - `components/Footer.tsx`: Line 233 (`text-[11px]`)
  - `components/ProductCard.tsx`:
    - Line 83: `text-[10px]` on Product Badge
    - Line 91: `text-[10px]` on Brand Tag
    - Line 132: `text-[10px]` on Category
    - Line 137: `text-[10px]` on Stock Status
    - Line 164: `text-[11px]` on Shade Name
    - Line 167: `text-[10px]` on Shade Count
    - Line 197: `text-[10px]` on `+{count}` Shades
  - `components/ProductDetailClient.tsx`:
    - Line 222: `text-[9px]` on "Texture" badge
    - Line 308: `text-[10px]` on Shade Code
    - Line 321: `text-[11px]` on "Vedi Texture" button
    - Line 369: `text-[11px]` on Price/100ml
    - Line 415: `text-[11px]` on Stock Status
    - Line 458, 464: `text-[10px]` on Shade notes
    - Line 538: `text-[11px]` on Delivery/Sample guarantees
    - Line 627: `text-[11px]` on **INCI Completo (Lista Ingredienti)**
  - `components/HeroSection.tsx`:
    - Line 93: `text-[10px]` on "In Evidenza"
    - Line 99: `text-[11px]` on card description
    - Line 105: `text-[11px]` on "Dettagli" button
    - Line 119: `text-[10px]` on "Atelier Fisico"
    - Line 125: `text-[10px]` on "Napoli Centro"
    - Lines 145, 159, 173, 187: `text-[11px]` on Trust Bar descriptions
  - `components/MegaMenu.tsx`:
    - Lines 197, 230, 248, 280: `text-[11px]` on descriptions and section labels
    - Line 303: `text-[10px]` on Featured Badge
  - `components/CartDrawer.tsx`:
    - Lines 78, 112, 164, 195, 249, 275 (`text-[10px]` & `text-[11px]`)
  - `components/booking/BookingWizard.tsx`:
    - Line 275: `text-[11px]` on Acconto note
    - Line 343: `text-[11px]` on Calendar Day Name
    - Line 350: `text-[9px]` on "Oggi" pill
    - Line 393: `text-[10px]` on Time Slot label
    - Line 578: `text-[11px]` on Deposit explanation
    - Line 617: `text-[10px]` on Stripe SSL badge
  - `components/BoutiqueSection.tsx`:
    - Line 40: `text-[11px]` on consultation description
    - Line 116: `text-[10px]` on "Demo" badge
  - `components/WhatsAppDemoModal.tsx`:
    - Lines 94, 111, 121, 128 (`text-[10px]`), Lines 148, 160, 190 (`text-[11px]`)
  - `app/servizi/page.tsx`:
    - Lines 49, 118, 142 (`text-[11px]`), Line 180 (`text-[10px]`)
- **Contrast Deficiencies**:
  - `text-neutral-400` (`#A3A3A3`) used extensively on light backgrounds (`#FFFFFF`, `#FAF7FC`, `#FDFCFE`) gives a contrast ratio of ~2.5:1, failing WCAG AA (4.5:1 threshold).
  - Light pastel lilac (`#D8C2E7`) is used in a few places as text on light background (e.g. `app/servizi/page.tsx:55`).

---

## 2. Logic Chain

1. **Logo Masking & Proportions**:
   - *Observation 1.1* demonstrates that `public/brand/logo.png` is a 1600x908 px rectangular image.
   - *Observation 1.1* demonstrates that `BrandLogo.tsx:33` uses `rounded-full overflow-hidden` and `object-cover` within a square container (`h-10 w-10` / `h-12 w-12`).
   - *Deduction*: Placing a 1600x908 image in a 1:1 circular container with `object-cover` truncates ~50% of the image (the left and right thirds).
   - *Deduction*: Because the original logo already includes the text "Scelta MAKE UP" and the payoff, rendering additional HTML `<span>` elements next to it creates unwanted visual clutter or duplicate text.
   - *Remediation*:
     - Replace the circular wrapper with an auto-width container preserving natural aspect ratio: `relative h-10 sm:h-12 w-auto aspect-[1600/908]`.
     - Set `Image` with `className="object-contain"` and natural sizing.
     - In the Header: Show the logo cleanly with `h-10 sm:h-12` without circular cropping.
     - In the Footer: Wrap the rectangular logo inside a luxury shaped badge/plate (`bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/20 shadow-md inline-block`) so that on the dark footer background, every detail of the brand illustration and typography is 100% visible and sharp.

2. **Footer Credits & Elegance**:
   - *Observation 1.3* confirms that `Footer.tsx:239-242` states:
     `<span>Sviluppato con eleganza da</span> <span ...>Creativia Studio</span>`.
   - *Deduction*: This directly violates Acceptance Criterion AC-146 ("Il footer riporta esattamente la dicitura 'Sviluppato da Creativia Studio'").
   - *Remediation*: Change the bottom bar text to:
     `<span className="text-xs text-neutral-400">Sviluppato da <strong className="text-white font-medium">Creativia Studio</strong></span>`.

3. **Footer Visual Styling**:
   - *Observation 1.3* shows the footer uses a flat `#1F1B24` background with standard `border-neutral-800`.
   - *Remediation*:
     - Apply luxury deep gradient: `bg-gradient-to-b from-[#1F1B24] via-[#17141A] to-[#120F16] border-t border-[#D8C2E7]/20` with an optional subtle radial purple highlight at the top.
     - Elevate the Newsletter input with curved pill shape and focus glow: `focus:ring-2 focus:ring-[#D462A6]/40 focus:border-[#D462A6] shadow-[0_0_20px_rgba(212,98,166,0.15)]`.
     - Ensure the 4 columns have clear headings in uppercase tracking and high contrast.

4. **Typography System Inversion**:
   - *Observation 1.4* reveals that `--font-sans` in `@theme inline` references `var(--font-cormorant)` first, while `--font-serif` is missing.
   - *Deduction*: Next.js App Router loads Cormorant Garamond as `--font-cormorant` and Inter as `--font-geist-sans`. The current `@theme inline` configuration causes the body and general text to render in serif, while headings explicitly requesting `font-serif` fallback to system Georgia.
   - *Remediation*:
     - In `app/globals.css`, configure:
       ```css
       @theme inline {
         ...
         --font-sans: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         --font-serif: var(--font-cormorant), Georgia, Cambria, "Times New Roman", serif;
       }
       ```
     - Set `body { font-family: var(--font-sans); }`.
     - Headings using `font-serif` will now correctly use Cormorant Garamond.
     - Technical copy, INCI, badges, buttons, and body paragraphs will correctly use clean Inter sans-serif.

5. **Eliminating Font Sizes < 12px & Fixing Contrast**:
   - *Observation 1.5* catalogues all instances under 12px (`text-[9px]`, `text-[10px]`, `text-[11px]`).
   - *Deduction*: Requirement R4 and Acceptance Criteria mandate a strict floor of 12px (`text-xs`).
   - *Remediation*:
     - All `text-[10px]` and `text-[11px]` badges, labels, and notes should be normalized to `text-xs` (12px).
     - Where compact spacing is required, use `text-xs uppercase tracking-wider font-semibold` with refined padding (`px-2.5 py-0.5`).
     - In `ProductDetailClient.tsx:627`, change INCI font from `text-[11px]` to `text-xs font-mono leading-relaxed text-neutral-700 bg-[#FAF7FC]`.
     - Replace washed-out `text-neutral-400` on white backgrounds with `text-neutral-600` or `text-neutral-700` to satisfy WCAG AA contrast.

---

## 3. Caveats

- **Admin Section Isolation**: The admin dashboard (`/admin/*`) contains small font sizes (e.g. table headers at 10px/11px). While our scan noted them, the primary customer presentation focus is the public storefront (`/`, `/prodotti/*`, `/prenota`, `/servizi`, `/checkout`).
- **Logo File Format**: `public/brand/logo.png` is structurally a JPEG (RGB without alpha channel). Because it has a white background, it looks seamless on white/light surfaces, but on dark backgrounds (like the footer) it requires a styled container badge (e.g. white luxury plate) rather than being placed raw without a background container.

---

## 4. Conclusion

The investigation has established the exact structural causes and remediation paths for:
1. **The Circular Mask Bug**: Located in `components/BrandLogo.tsx:32-48`. The 1600x908 rectangular logo must be rendered in natural proportions (`aspect-[1600/908] h-10 sm:h-12 w-auto object-contain`).
2. **Footer Credits & Redesign**: Located in `components/Footer.tsx:238-243`. The obsolete phrase `"Sviluppato con eleganza da Creativia Studio"` must be replaced with `"Sviluppato da Creativia Studio"`. The footer background, newsletter input glow, and logo presentation must be upgraded to luxury standards.
3. **Typography Inversion**: Located in `app/globals.css:25`. `--font-sans` and `--font-serif` must be corrected so that Inter is the base sans-serif and Cormorant Garamond is the dedicated luxury serif for headings.
4. **Legibility Floor**: All storefront text smaller than 12px (`text-[9px]`, `text-[10px]`, `text-[11px]`) across Header, Footer, Hero, ProductCard, ProductDetail, MegaMenu, Cart, and BookingWizard have been cataloged with exact line numbers ready for replacement with `text-xs` (12px).

---

## 5. Verification Method

To verify these findings independently:

1. **Verify Logo Dimensions and File Headers**:
   ```powershell
   node -e "const fs = require('fs'); const buf = fs.readFileSync('public/brand/logo.png'); console.log('Magic:', buf.slice(0, 4).toString('hex'));"
   ```
   *Expected*: `ffd8ffe0` (JPEG).

2. **Verify Circular Mask Location**:
   Inspect `components/BrandLogo.tsx` lines 32–48 using `view_file` to confirm `rounded-full` and `h-10 w-10 sm:h-12 sm:w-12`.

3. **Verify Footer Credits**:
   ```powershell
   Select-String -Path "components/Footer.tsx" -Pattern "Sviluppato con eleganza"
   ```
   *Expected*: Line 239 match.

4. **Verify Typography Inversion**:
   Inspect `app/globals.css` lines 15–30 to confirm `--font-sans` contains `var(--font-cormorant)` and `--font-serif` is absent.

5. **Verify Project Compilation & Quality Standards**:
   ```powershell
   npx tsc --noEmit
   npm run lint
   ```
   *Expected*: 0 errors, 0 warnings.
