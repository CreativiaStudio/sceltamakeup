# Architettura E-commerce (Stack Isabel Pepe) — Scelta Makeup

## Filosofia & Base di Codice
L'e-commerce di Scelta Makeup viene sviluppato clonando l'architettura tecnica e le logiche ad alte prestazioni del progetto **Isabel Pepe**:
- Massima velocità di caricamento, zero overhead, design boutique pulito e orientato alla conversione mobile-first.
- Struttura a componenti modulari riutilizzabili.

---

## Stack Tecnologico
- **Framework:** Next.js (App Router), React 19.
- **Styling & UI:** Tailwind CSS, Lucide Icons, animazioni sottili in CSS/Framer Motion.
- **State Management:** Carrello client-side atomico persistente in localStorage.
- **Database & Auth:** Supabase (gestione tabelle `products`, `product_variants`, `orders`, `categories`).
- **Media Vault & CDN:** Cloudflare R2 per lo storage delle immagini di catalogo in formato WebP compresso ad alta fedeltà.
- **Checkout & Pagamenti:** Stripe Checkout e opzione d'ordine rapido assistito via WhatsApp (collegato ad Evolution API / n8n di Creativia Studio).
- **Integrazioni Tracciamento:** Meta CAPI server-side via n8n, Google Analytics 4 e GTM.

---

## Categorie di Navigazione Negozio
Ricalcando la disposizione reale degli espositori fisici dello store:
1. **Viso:** Fondotinta, Correttori, Ciprie, Terre, Blush, Primer.
2. **Occhi:** Mascara, Eyeliner, Matite Occhi, Ombretti, Palette, Sopracciglia.
3. **Labbra:** Rossetti Matt/Creamy, Tinte Liquide, Matite Labbra, Lip Gloss, Trattamenti Labbra & Scrub.
4. **Skincare & Dermo:** Linee HA Hero, Cell Detoxium, Icon Time, Smart Pure, Solari.
5. **Beauty & Accessori:** Pennelli professionali, Spugnette, Temperini, Beauty Case.
