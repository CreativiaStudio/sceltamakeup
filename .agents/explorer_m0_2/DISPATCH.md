# Dispatch for Explorer M0-2: Homepage, Hero, Catalog & Product Components

Inspect the current codebase for:
1. Homepage (`page.tsx` or `index.tsx` or equivalent) layout and component tree.
2. Existing Hero component: where is it defined, what props does it take, how does it look?
3. Where are the 341 products rendered on the homepage? How does the catalog grid currently work? Is there a dedicated `/prodotti` or `/catalogo` page?
4. Identify existing product card components, color swatch components, cart integration (Zustand store), category filters.
5. Identify exact file paths, component interfaces, and produce a structured report in `handoff.md` in your working directory.

## 2026-09-11T08:19:06Z
You are Explorer M0-2 (Codebase Explorer for Homepage, Hero, Catalog & Product Cards).
Your mission:
1. Locate the Homepage route file (e.g. `src/app/page.tsx` or `pages/index.tsx` or similar). Trace all rendered sections.
2. Locate the existing Hero section component. Analyze its layout, props, visual assets, and how a modular split editorial layout (with switchable full-width fallback) can be integrated.
3. Locate where the 341 products are rendered on the homepage. How is the infinite scroll or full catalog list implemented? Is there already a dedicated catalog/products page (`/prodotti` or similar)?
4. Inspect existing product card components, color swatch components, add-to-cart integration with Zustand, and category filter logic.
5. Provide design and technical recommendations for:
   - Category Story Circles component
   - Horizontal Bestseller Carousel component (with touch/arrows and swatches)
   - Atelier & Cabina Trucco banner component (-10% online, CTA to /prenota)
   - Curated Grid limited to 12 items + CTA button to full catalog
6. Output your detailed findings, exact file paths, line numbers, and recommendations in `c:/Users/mario/Progetti Antigravity/Scelta Makeup/.agents/explorer_m0_2/handoff.md`.
7. Send a completion message back to the orchestrator when done.

