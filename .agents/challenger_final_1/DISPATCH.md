# Dispatch for Challenger Final-1: Static Requirements & Architecture Verification

Empirically verify across the entire storefront:
1. Grep `components/booking/BookingWizard.tsx`, `components/HeroSection.tsx`, `components/ProductCard.tsx`, `components/BrandLogo.tsx`, `components/Header.tsx`, `components/Footer.tsx` for sub-12px font sizes (`text-[9px]`, `text-[10px]`, `text-[11px]`) -> MUST BE 0.
2. Verify homepage does NOT render 341 products directly: check `CuratedProductGrid.tsx` and `app/page.tsx`.
3. Verify `CategoryStoryCircles.tsx` contains 6 categories and links to `/prenota` with `-10%` badge.
4. Verify `AtelierBanner.tsx` contains `-10%` discount highlight and CTA to `/prenota`.
5. Run test suite: `npx tsx --test tests/m2-editorial-restyling.test.ts`.
6. Record empirical results and verdict in `handoff.md`.
