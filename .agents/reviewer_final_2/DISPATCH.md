# Dispatch for Reviewer Final-2: Curated Grid, Full Catalog Route, Booking Wizard & Global Readability

Review and verify:
1. `components/CuratedProductGrid.tsx`:
   - Limit capped at 12 items (elimination of 341 infinite scroll on homepage).
   - Category filter pills.
   - Primary CTA to `/prodotti`.
2. `app/prodotti/page.tsx` & `components/CatalogClient.tsx`:
   - Dedicated route housing all 341 products with search, category filters, brand filters, sorting, and pagination.
3. `components/booking/BookingWizard.tsx`:
   - 0 sub-12px font sizes across all steps.
   - Desktop navigation chevrons for 14-day date strip.
   - Time slots grouped into Sessione Pomeriggio and Sessione Serale.
   - Financial calculation transparency (listino, -10% online, 20% deposit, 80% boutique balance).
4. Execute `npx tsc --noEmit` and `npm run lint`.
5. Record verdict (APPROVE or REQUEST_CHANGES) in `handoff.md`.
