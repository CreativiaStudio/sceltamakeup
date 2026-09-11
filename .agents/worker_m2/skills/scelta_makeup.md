# Scelta Makeup — Skill Snapshot

Attiva questa skill per tutte le task, sviluppo e-commerce, catalogo prodotti, brand identity, design system e strategie riguardanti il cliente Scelta Makeup (Federica Cesiano).

## Brand Identity & Design System
- Royal Violet: `#5E1788`
- Vivid Orchid: `#7A3293`
- Pastel Lilac: `#D8C2E7`
- Mauve Rose: `#D462A6`
- Optical White: `#FFFFFF`
- Deep Charcoal: `#1F1B24`

## Catalog & Brands
- Diego dalla Palma (82)
- RVB LAB (53)
- Cipria Make Up (23)
- Eveline Cosmetics (98)
- Pierre René (59)
- Miyo (26)

## Store Categories
- Viso (129)
- Occhi (90)
- Labbra (39)
- Skincare & Dermo (82)
- Beauty & Accessori (1)

## Architecture
- Standalone Supabase DDL: `supabase_schema.sql` (9 tables with `scelta_` prefix)
- Local Offline Storage Engine: `lib/adminStore.ts`
- Admin Cockpit: `/admin` (distraction-free layout, tab synchronization with `?tab=...`)
- Preserved Modules: `/admin/appuntamenti` & `NotificationQueueTab.tsx`
