# Scelta Makeup — FASE 3 Specification Survey Report
**Document Version:** 1.0.0  
**Author:** teamwork_preview_spec_miner  
**Date:** 2026-09-07  
**Project Workspace:** `c:\Users\mario\Progetti Antigravity\Scelta Makeup`  
**Target Architecture:** WhatsApp Anti-Ban Pacing Engine (Evolution API), Luxury Transactional Email System (Resend), In-Store Real-Time Queue Monitor (`/admin/appuntamenti`), and Dedicated Supabase Schema.

---

## 1. Executive Summary & Authoritative Spec Sources

This survey documents the complete, authoritative technical specifications for **FASE 3** of the Scelta Makeup e-commerce and booking ecosystem. The specifications have been extracted from:
1. `ORIGINAL_REQUEST.md` (Project root) — Master requirements for FASE 3.
2. `C:\Users\mario\.gemini\config\skills\scelta_makeup\SKILL.md` (Skill Hub).
3. `references/brand_identita_visual.md` — Official color codes, typography, logo geometry, and boutique visual identity.
4. `references/booking_servizi_e_whatsapp.md` — Dual-channel booking architecture, solo-worker protection, 20-45s human pacing, anti-ban checksum logic, 10% online discount, 20% deposit / 80% store balance.
5. `references/anagrafica_cliente.md` — Official store address, legal info, P.IVA, phone numbers, and PEC.
6. `references/architettura_ecommerce.md` — Isabel Pepe stack clone, delivery options, and store categories.
7. Existing codebase components: `components/BrandLogo.tsx`, `app/globals.css`, `types/booking.ts`, `data/services.ts`, `lib/bookingService.ts`, `app/admin/appuntamenti/page.tsx`, `app/checkout/page.tsx`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Visual Identity | Official Palette (Royal Violet) | Primary brand color `#5E1788` for headings, primary buttons, logo lettering, noble accents. Physical reference: ceiling perimeter of boutique. | HEX `#5E1788` / CSS var `--royal-violet` | Rendered UI elements, buttons, headers | Fallback to `#1F1B24` or `#000000` if missing | `brand_identita_visual.md:12`, `ORIGINAL_REQUEST.md:26` |
| 2 | Visual Identity | Secondary Palette (Pastel Lilac) | Soft background & wall tint `#D8C2E7`. Physical reference: internal boutique wall paint. | HEX `#D8C2E7` / CSS var `--pastel-lilac` | Backgrounds, secondary card borders, soft badges | Fallback to `#FAF7FC` or neutral lilac | `brand_identita_visual.md:14`, `ORIGINAL_REQUEST.md:26` |
| 3 | Visual Identity | High-Contrast White (Optical White) | Stucco & high-contrast container background `#FFFFFF`. Physical reference: lacquered store displays. | HEX `#FFFFFF` / CSS var `--optical-white` | Card bodies, modal containers, navbar surfaces | White surface default | `brand_identita_visual.md:16`, `ORIGINAL_REQUEST.md:26` |
| 4 | Visual Identity | Accent Palette (Mauve Rose) | Dynamic accent `#D462A6` for lip details, flash promotions, beauty tags. Physical reference: lips in logo pictogram. | HEX `#D462A6` / CSS var `--mauve-rose` | Badges, discount indicators, gradient stops | Fallback to `#7A3293` | `brand_identita_visual.md:17`, `ORIGINAL_REQUEST.md:26` |
| 5 | Visual Identity | Auxiliary Tones (Vivid Orchid, Soft Wash, Deep Charcoal, Satin Metallic) | `#7A3293` (orchid hover/pills), `#F6EFFB` (soft lilac wash), `#1F1B24` (charcoal text), `#E2E8F0` (satin metallic borders). | Defined HEX codes | Full contrast typography, borders, subtle card washes | Standard neutral fallbacks | `brand_identita_visual.md:13-20`, `globals.css:4-13` |
| 6 | Visual Identity | Typography & Heading System | Cormorant Garamond / Serif font for luxury titles and branding; Sans-serif (Geist/system) for UI legibility. | Font families, CSS theme tokens | Elegant luxury typographical hierarchy | Fallback to Georgia, serif, sans-serif | `brand_identita_visual.md:23-27`, `globals.css:25-34` |
| 7 | Visual Identity | Official Vector Logo & Claim | Stylized female profile with closed eye, long eyelashes, violet eyelid, mauve lips; cursive "Scelta" lettering with soft shadow; modern sans-serif "MAKE UP" with gradient; Claim: *"L'eleganza di essere autentica"*. | Image asset `/brand/logo.png` or vector SVG | Standard responsive brand header/footer | Stylized "S" monogram badge fallback | `brand_identita_visual.md:24-27`, `BrandLogo.tsx:24-40` |
| 8 | Visual Identity | Luxury Styling & Glassmorphism | Glass headers (`.glass-header`), cards (`.glass-card`), pills (`.glass-pill`), brand gradients (`.bg-brand-royal`, `.bg-brand-orchid`), and soft luxury glow (`.luxury-glow`). | CSS utility classes | Charlotte Tilbury / Rare Beauty aesthetic | Standard flat styling | `globals.css:36-95` |
| 9 | WhatsApp Engine | Ban Prevention Architecture | Strict technical ban on mass broadcasts; only 1-to-1 transactional messages allowed (booking confirmations, 24h reminders, order notifications). | Message intent | Block broadcast endpoints, route single transactional messages only | Rejection with security error if bulk blast requested | `ORIGINAL_REQUEST.md:15-16`, `booking_servizi_e_whatsapp.md:53-58` |
| 10 | WhatsApp Engine | Human Pacing & Jitter Engine | Asynchronous queue delay applying a strict random jitter between **20 and 45 seconds** between consecutive message dispatches to simulate human typing. | Consecutive queued messages | Delayed dispatch timestamps: `prevTimestamp + random(20000, 45000)ms` | Queue worker holds message until jitter duration elapses | `ORIGINAL_REQUEST.md:17`, `AC:44`, `booking_servizi_e_whatsapp.md:62` |
| 11 | WhatsApp Engine | Anti-Spam Checksum Variation | Dynamic personalization guaranteeing no two messages share the same hash/checksum: injecting customer name, booking code, date, time, service, and tailored pre-treatment tips. | Customer data, booking details, tip seed | Unique message body text per recipient | If parameters missing, fall back to safe dynamic fallback tokens | `ORIGINAL_REQUEST.md:18`, `booking_servizi_e_whatsapp.md:64` |
| 12 | WhatsApp Engine | Template 1: Booking Confirmation | 1-to-1 WhatsApp notification with 20% deposit confirmation, 80% store balance, boutique address, booking code, pre-treatment advice, and friendly sign-off. | Booking object (code, service, date, time, deposit, balance) | Formatted WhatsApp message string with emojis and markdown bold | Throws validation error if required fields are missing | `ORIGINAL_REQUEST.md:19-20`, `booking_servizi_e_whatsapp.md:83-88` |
| 13 | WhatsApp Engine | Template 2: Booking 24h Reminder | Friendly WhatsApp reminder sent 24h prior with appointment details, vademecum (clean skin, punctuality), cancellation terms (<24h policy), store directions link, confirmation prompt. | Booking object, boutique address, maps link | Formatted WhatsApp reminder string | Safe fallback if date parsing fails | `ORIGINAL_REQUEST.md:21`, `booking_servizi_e_whatsapp.md:41-42` |
| 14 | WhatsApp Engine | Template 3: E-commerce Order Placed | Transactional WhatsApp message confirming purchase, list of articles with shades/quantities, total paid, delivery method (Courier 24/48h vs. Boutique pickup), 2 luxury samples notice. | Order object (order ID, items, delivery method, total) | Formatted WhatsApp order notification string | Validates items non-empty | `ORIGINAL_REQUEST.md:22`, `architettura_ecommerce.md:16` |
| 15 | WhatsApp Engine | Evolution API Lifecycle & QR Code | Management of instance connection states: `DISCONNECTED`, `CONNECTING` / `QRCODE`, `CONNECTED` / `OPEN`. QR code display for store phone scanning. | Instance status query, API key, base URL | Reactive connection state, QR code image string | Graceful local mock QR code if API credentials empty | `ORIGINAL_REQUEST.md:36`, `booking_servizi_e_whatsapp.md:44-46` |
| 16 | Luxury Email System | Resend API Connector (`resendService.ts`) | Transactional email delivery service configured for `RESEND_API_KEY` with seamless local fallback / preview simulation mode. | Email recipient, subject, HTML payload, API key | Delivery confirmation or simulated dispatch object | When key is missing/invalid, logs dispatch to local mock store without crashing | `ORIGINAL_REQUEST.md:32`, `booking_servizi_e_whatsapp.md:38-42` |
| 17 | Luxury Email System | Email Template 1: Booking Confirmation | Luxury responsive HTML email with Royal Violet header, logo, claim, transparent 4-row financial breakdown, Google & Apple Calendar buttons, store map, cancellation policy. | Booking data, pricing breakdown | Complete responsive HTML string | Inlines CSS for email client compatibility | `ORIGINAL_REQUEST.md:29`, `booking_servizi_e_whatsapp.md:74-88` |
| 18 | Luxury Email System | Email Template 2: Booking 24h Reminder | Elegant HTML reminder with beauty vademecum (clean skin, punctuality), appointment summary, cancellation button with 24h limit, boutique directions. | Booking data, appointment time | Complete responsive HTML string | Inlines CSS | `ORIGINAL_REQUEST.md:30`, `booking_servizi_e_whatsapp.md:100` |
| 19 | Luxury Email System | Email Template 3: Order Placed | Luxury order confirmation HTML with itemized product cards, shade details, subtotal, shipping cost (€0 or €4.90), complimentary samples callout, courier/store pickup instructions. | Order data, delivery method | Complete responsive HTML string | Inlines CSS | `ORIGINAL_REQUEST.md:31`, `architettura_ecommerce.md:22-27` |
| 20 | Luxury Email System | Local Email Preview / Demo Mode | Interactive in-app preview modal/interface allowing real-time visual inspection of all 3 HTML emails with dynamic sample data without sending actual emails. | Template selection, sample context | Rendered HTML iframe / preview panel | Fallback error display if template rendering throws | `ORIGINAL_REQUEST.md:7`, `ORIGINAL_REQUEST.md:32` |
| 21 | Financial Engine | 10% Online Booking Discount | Applies a direct 10% discount on boutique list price for online bookings: `discountOnline = priceList * 0.10`, `priceOnline = priceList * 0.90`. | `priceList: number` | `priceOnline: number`, `discountOnline: number` | Round to 2 decimal places to avoid IEEE-754 precision artifacts | `ORIGINAL_REQUEST.md:29`, `booking_servizi_e_whatsapp.md:75-88` |
| 22 | Financial Engine | 20% Online Deposit Calculation | Calculates the mandatory 20% confirmation fee to reserve slot: `depositPaid = round(priceOnline * 0.20, 2)`. | `priceOnline: number` | `depositPaid: number` | Must match Stripe checkout amount | `ORIGINAL_REQUEST.md:20`, `booking_servizi_e_whatsapp.md:77-88` |
| 23 | Financial Engine | 80% In-Store Balance Due | Calculates remaining balance to be collected by Federica in boutique: `balanceDue = round(priceOnline - depositPaid, 2)`. | `priceOnline: number`, `depositPaid: number` | `balanceDue: number` | Must equal exact difference to ensure zero discrepancy at checkout | `ORIGINAL_REQUEST.md:20`, `booking_servizi_e_whatsapp.md:79-88` |
| 24 | Financial Engine | E-Commerce Order Shipping Rules | Standard express shipping: €4.90. Free shipping if cart subtotal reaches free threshold (or for boutique pickup: always €0.00). | `subtotal: number`, `deliveryMethod: string` | `shippingCost: number`, `total: number` | Non-negative values only | `checkout/page.tsx:48-52`, `useCartStore.ts` |
| 25 | Admin Monitor | Tab "Canali Notifiche & Coda" | Dedicated tab inside `/admin/appuntamenti` alongside daily appointments and slot blocking. | Active tab state | Admin view containing WhatsApp status, Queue monitor, Single test send, and Email preview | Tab switches state cleanly | `ORIGINAL_REQUEST.md:35` |
| 26 | Admin Monitor | Real-Time Message Queue Monitor | Live table showing pending/processing messages, recipient, type, countdown timer to scheduled release, and status badges (`In attesa`, `In invio`, `Consegnato`, `Errore`). | Queue state from state/storage | Live reactive table with ticking countdown | Shows empty state when queue is idle | `ORIGINAL_REQUEST.md:37` |
| 27 | Admin Monitor | Single Test Dispatcher | Admin button to trigger an immediate test send, verifying template formatting, jitter assignment (20-45s), and state progression. | Test payload (template type, sample phone/email) | Queued test message with active countdown | Alerts operator if configuration invalid | `ORIGINAL_REQUEST.md:38` |
| 28 | Database Schema | Supabase Isolated Schema (`supabase_schema.sql`) | Complete single-file SQL schema containing `products`, `product_variants`, `inventory`, `appointments`, `orders`, `blocked_slots`, `notification_logs` with RLS policies and indexes. | SQL DDL specifications | Dedicated `supabase_schema.sql` ready for 1-click execution in Supabase SQL editor | Idempotent script (`CREATE TABLE IF NOT EXISTS`) | `ORIGINAL_REQUEST.md:40-41` |

---

## Edge Cases

| # | Feature | Input / Scenario | Observed / Required Behavior |
|---|---|---|---|
| 1 | Jitter Engine | Back-to-back enqueue of 5 messages in less than 1 second | The first message enters `processing` or waits for initial delay; subsequent 4 messages are scheduled strictly with cumulative random delays: `Msg1: T+jitter1`, `Msg2: T+jitter1+jitter2`, etc., where each `jitter` is strictly $\in [20, 45]$ seconds. Messages NEVER send concurrently. |
| 2 | Jitter Engine | Random jitter boundary conditions (edge of range) | Ensure uniform distribution where jitter is strictly $\ge 20$ seconds and $\le 45$ seconds ($20000\text{ms} \le \Delta t \le 45000\text{ms}$). Never allow values below 20s even if the queue backlog is high. |
| 3 | Evolution API | Store WhatsApp phone disconnected / session expired | Queue worker detects connection status `DISCONNECTED`; pauses execution and preserves messages in `queued` state with warning flag. Does not discard messages. Once reconnected (QR code scanned), worker resumes queue. |
| 4 | Phone Sanitization | Phone entered as `3481234567` (no prefix) or `+39 348 123 4567` with spaces | Input sanitizer must strip spaces, dashes, and parentheses, automatically prepending international prefix `+39` (default for Italy) resulting in normalized format `+393481234567` for Evolution API. |
| 5 | Anti-Spam Variation | Multiple bookings for the same customer or multiple identical services | Dynamic engine injects variable salutations ("Cara [Nome]", "Gentilissima [Nome]", "Ciao [Nome]"), unique timestamp token, personalized pre-treatment tip (e.g. rotation of 5 dermocosmetic tips), and unique booking ID. MD5/SHA256 checksums differ on every send. |
| 6 | Financial Rounding | Service with non-round price: List €39.00 -> 10% discount = €3.90 -> Online €35.10 -> Deposit 20% = €7.02 -> Balance 80% = €28.08 | System must use standard monetary rounding (`Math.round(val * 100) / 100`). `depositPaid + balanceDue` MUST exactly equal `priceOnline` ($7.02 + 28.08 = 35.10$). Never lose or gain a cent due to floating point math. |
| 7 | Resend API | `RESEND_API_KEY` missing from `.env.local` | Service must NOT throw an unhandled exception or crash the Next.js server. Instead, it enters `SIMULATION_MODE`, logs the rendered email payload to `notification_logs`, and provides a direct visual preview in the admin cockpit. |
| 8 | Resend API | Invalid API key or Resend network error (HTTP 401/429/500) | `resendService.ts` catches the error, marks the message status as `failed` in `notification_logs` with the exact error message, and allows manual retry from the Admin Queue tab. |
| 9 | Email Responsiveness | Email opened in narrow mobile screen (<375px) vs Outlook desktop | HTML layout uses responsive fluid tables (max-width 600px, width 100%, inline styles, border-collapse, viewport meta) to guarantee no horizontal scroll or layout breakage in any client. |
| 10 | Calendar Links | Calendar button clicked in Booking Confirmation email | Google Calendar link uses formatted URL (`https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...`). Apple Calendar provides downloadable `.ics` data with UTF-8 encoding and UTC/Europe:Rome timezone definitions. |
| 11 | Cancellation Limit | Customer clicks disdetta / cancellation link with < 24h before appointment | System checks current timestamp against appointment datetime ($t_{app} - t_{now} < 24\text{h}$). Displays polite notice stating that under 24h the 20% deposit cannot be refunded as the time slot was reserved exclusively for the customer. |
| 12 | E-Commerce Pickup | E-commerce order with `Ritiro in Boutique` selected | Email and WhatsApp templates dynamically switch from courier tracking text to boutique pickup instructions: address "Via dei Pellegrini 28/29, Napoli", opening hours "09:30–13:30 / 16:30–20:00", contact phone "348 381 6516", shipping fee €0.00. |
| 13 | E-Commerce Shipping | Order subtotal under threshold (€4.90 shipping) vs over threshold (free shipping) | Shipping fee dynamically computed: if `deliveryMethod === 'shipping'`, adds €4.90 unless subtotal exceeds free shipping minimum. Financial breakdown clearly displays "Spedizione: €4.90" or "Spedizione: Gratuita (Omaggio Scelta Makeup)". |
| 14 | Local Queue Persistence | Browser refreshed while messages are pending in queue | Queue state is backed by persistent storage (`localStorage` in demo mode / Supabase `notification_logs` in cloud mode) so active countdowns and pending messages are restored seamlessly on page reload. |

---

## 2. Detailed Visual Identity Specifications

### 2.1 Palette Cromatiche Ufficiali
Source: `brand_identita_visual.md`, `globals.css`, `ORIGINAL_REQUEST.md`.

```css
/* Scelta Makeup Official Palette */
--royal-violet:    #5E1788; /* Primario: Logo Scelta, bottoni primari, titoli h1, header e veletta perimetrale store */
--vivid-orchid:    #7A3293; /* Secondario: Hover states, pillole categorie, badge e icone, gradiente MAKE UP */
--pastel-lilac:    #D8C2E7; /* Sfondo pareti: Tinta pareti negozio, card secondarie, sfondi hero morbidi */
--soft-lilac-wash: #F6EFFB; /* Neutro chiaro: Sfondo body alternativo per non affaticare la vista */
--optical-white:   #FFFFFF; /* Stacco netto: Sfondo card prodotto, modali, navbar e display laccati */
--mauve-rose:      #D462A6; /* Accento: Labbra logo, promozioni flash, tag beauty speciali */
--charcoal-deep:   #1F1B24; /* Testo primario: Contrasto massimo e leggibilità su sfondi chiari */
--satin-metallic:  #E2E8F0; /* Bordi: Finiture alluminio satinato espositori, linee minimali */
```

### 2.2 Tipografia & Hierarchy
- **Titoli & Luxury Headings:** Cormorant Garamond / Serif graziato moderno (`font-serif`), tracking disteso (`tracking-tight` o `tracking-[0.2em]`), peso `font-bold`.
- **UI & Testi di Lettura:** Sans-serif ad altissima leggibilità (`Geist`, `Segoe UI`, `Roboto`), contrasto elevato con `#1F1B24` (Charcoal Deep).
- **Claim Ufficiale:** *"L'eleganza di essere autentica"* — rigorosamente in corsivo graziato (`italic font-serif` o `font-light italic`).

### 2.3 Regole di Rendering Logo
- **Pittogramma:** Silhouette di profilo femminile stilizzato con occhio chiuso, ciglia allungate, palpebra violetto (`#5E1788`) e labbra rosa mauve (`#D462A6`).
- **Lettering "Scelta":** Font calligrafico corsivo fluido con ombreggiatura soft lilla (`#D8C2E7`).
- **Sottotitolo "MAKE UP":** Carattere geometrico all-caps moderno con gradiente cromatico sfumato da `#5E1788` a `#7A3293`.
- **Asset path locale:** `c:\Users\mario\Progetti Antigravity\Scelta Makeup\Logo\scelta makeup logo.jpeg` (e versione WebP/PNG in `/public/brand/logo.png`).

---

## 3. Motore WhatsApp Anti-Ban & Pacing Umano (Evolution API)

### 3.1 Architettura Anti-Ban & Regole Meta
Meta applica filtri euristici avanzati contro l'attività automatica non umana:
1. **Zero Broadcast Massivi:** È formalmente proibito l'invio simultaneo "a raffica" di messaggi multipli.
2. **Pacing a Velocità Umana:** Ogni invio successivo è distanziato da un intervallo casuale (jitter) rigorosamente compreso tra **20 e 45 secondi** ($20 \le t_{delay} \le 45$).
3. **Limiti Orari:** Tetto massimo prudenziale di 60 messaggi/ora per sessione.
4. **Variazione di Checksum (Anti-Hash):** Due messaggi non devono mai avere lo stesso hash SHA-256. Ogni payload include marcatori variabili unici (timestamp, nome cliente, codice booking, consiglio pre-trattamento estratto da un seed rotativo).

### 3.2 Struttura della Coda Asincrona (Queue Worker)
Stati del messaggio nella coda:
- `queued`: Ricevuto dal trigger (prenotazione o ordine) e registrato con `scheduled_at`.
- `processing`: Attualmente sotto countdown del jitter (delay 20-45s) prima dell'invio effettivo.
- `sent`: Inviato con successo a Evolution API, con timestamp `sent_at` e risposta registrata.
- `failed`: Errore di rete o istanza disconnessa; disponibile pulsante per re-invio manuale.

### 3.3 Gestione Sessione QR Code (Evolution API)
- **Endpoint Evolution API:**
  - `POST /instance/create`: Creazione istanza store.
  - `GET /instance/connect/{instanceName}`: Generazione QR code per il telefono del negozio.
  - `GET /instance/connectionState/{instanceName}`: Polling stato sessione (`connecting`, `open`, `close`).
  - `POST /message/sendText/{instanceName}`: Invio testo formattato 1-a-1.
- **Modalità Simulazione / Demo Locale:**
  - Quando non sono presenti le credenziali cloud in `.env.local`, il componente genera un QR code SVG simulato e un mock session switch ("Connetti Negozio" / "Disconnetti") per consentire il collaudo visivo immediato da parte di Federica.

---

## 4. Specifiche dei Template Messaggi WhatsApp

### 4.1 Template 1: Conferma Prenotazione (Booking Confirmation)
- **Trigger:** Completamento del wizard `/prenota` e incasso acconto 20% su Stripe.
- **Struttura del Testo:**
```text
🌸 *SCELTA MAKEUP — Conferma Prenotazione* 🌸

Gentile *{customerName}*,
abbiamo il piacere di confermarti la riservazione del tuo trattamento:

✨ *Servizio:* {serviceName}
📅 *Data:* {bookingDate}
⏰ *Orario:* {bookingTime}
👩‍🎨 *Professionista:* {operatorName}
📍 *Boutique:* Via dei Pellegrini 28/29, 80132 Napoli
🔖 *Codice Prenotazione:* {bookingCode}

💳 *Riepilogo Tariffa Trasparente:*
• Prezzo di Listino: €{priceList}
• Vantaggio Esclusivo Online (-10%): -€{discountOnline}
• Quota di Conferma Versata (20%): €{depositPaid} (Incassata)
👉 *Saldo Residuo in Boutique (80%): €{balanceDue}*
(Potrai saldare comodamente in negozio con Carta/POS myPOS o Contanti)

🌿 *Consiglio di Bellezza Scelta Makeup:*
{preTreatmentTip}

Per qualsiasi esigenza puoi rispondere a questo messaggio o chiamarci al 348 381 6516.
A presto in Boutique!
*Federica Cesiano — Scelta Makeup*
```

### 4.2 Template 2: Promemoria a 24h (Booking 24h Reminder)
- **Trigger:** Cron job o worker 24 ore prima dell'appuntamento fissato.
- **Struttura del Testo:**
```text
🌸 *SCELTA MAKEUP — Il tuo appuntamento di bellezza è domani* 🌸

Cara *{customerName}*,
ti ricordiamo il tuo trattamento esclusivo fissato per domani:

✨ *{serviceName}*
📅 *Domani:* {bookingDate} alle ore *{bookingTime}*
📍 *Dove siamo:* Scelta Makeup, Via dei Pellegrini 28/29, Napoli
🗺️ *Mappa e Indicazioni:* https://maps.google.com/?q=Via+dei+Pellegrini+28+Napoli

💄 *Piccolo Vademecum per il tuo Servizio:*
• Ti consigliamo di presentarti a viso ben deterso e idratato, preferibilmente privo di make-up.
• Ti invitiamo alla puntualità: la tua professionista è riservata esclusivamente a te per {durationMinutes} minuti.

🌸 *Politica di Flessibilità & Disdetta:*
Come da condizioni di riservazione esclusiva, puoi modificare o cancellare l'appuntamento senza costi entro 24h dall'orario fissato.

Ti chiediamo la gentilezza di confermare la tua presenza rispondendo con un semplice *CONFERMO* a questo messaggio.
Non vediamo l'ora di accoglierti!
*Federica Cesiano — Scelta Makeup*
```

### 4.3 Template 3: Conferma Ordine E-Commerce (Order Placed)
- **Trigger:** Invio carrello checkout `/checkout`.
- **Struttura del Testo (Variante Spedizione Corriere):**
```text
✨ *SCELTA MAKEUP — Il tuo ordine cosmetico è confermato!* ✨

Gentile *{customerName}*,
grazie per aver scelto Scelta Makeup! Abbiamo registrato il tuo ordine *#{orderNumber}*.

🛍️ *Articoli Selezionati:*
{itemsListFormatted}

📦 *Riepilogo Spedizione:*
• Modalità: Corriere Espresso Tracciato 24/48h
• Spedizione a: {shippingAddress}, {shippingCity} ({shippingCap})
• Campioncini Alta Gamma: 2 Omaggio inclusi nel pacchetto ✨
💰 *Totale Ordine:* €{orderTotal}

Riceverai a breve una notifica con il codice di tracciamento non appena il corriere prenderà in carico la tua scatola profumata.

Per assistenza ordini: 348 381 6516.
*Scelta Makeup — L'eleganza di essere autentica*
```

- **Struttura del Testo (Variante Ritiro in Boutique):**
```text
✨ *SCELTA MAKEUP — Ordine Confermato per Ritiro in Store* ✨

Gentile *{customerName}*,
il tuo ordine *#{orderNumber}* è in preparazione!

🛍️ *Articoli:*
{itemsListFormatted}

📍 *Ritiro Gratuito in Boutique:*
• Sede: Via dei Pellegrini 28/29, Napoli
• Orari di apertura: Lun - Sab 09:30 - 13:30 / 16:30 - 20:00
• Campioncini di benvenuto: Inclusi nel tuo pacchetto ✨
💰 *Totale Pagato:* €{orderTotal}

Ti avviseremo con un messaggio non appena il tuo pacchetto sarà pronto al banco.
*Scelta Makeup — L'eleganza di essere autentica*
```

---

## 5. Modulo Email Transazionali di Lusso con Resend

### 5.1 Requisiti Tecnici `lib/resendService.ts`
- Client Resend: configurato con `process.env.RESEND_API_KEY`.
- Mittente ufficiale: `Scelta Makeup <prenotazioni@sceltamakeup.it>` (con fallback a `onboarding@resend.dev` per testing API).
- Gestione Errori & Local Fallback: se `RESEND_API_KEY` non è valorizzata, il servizio genera un payload valido, registra il log con stato `simulated_success`, e salva l'HTML renderizzato per l'anteprima istantanea nel browser.

### 5.2 Specifiche Tecniche Layout HTML Responsive
- **Width:** Container centrato `600px`, `100% fluid` per smartphone.
- **Colori Inlined:**
  - Header: Background Gradiente `#5E1788` -> `#7A3293`.
  - Body: Background `#FAF7FC` con card centrale `#FFFFFF`.
  - Bordi: `#D8C2E7` al 50% opacity.
  - Testi: `#1F1B24` per titoli e body, `#5E1788` per highlight, `#7A3293` per etichette secondarie.
  - Pulsanti Call-To-Action: Sfondo `#5E1788`, testo bianco `#FFFFFF`, raggio `12px`, padding `14px 28px`.
- **Header:** Logo ufficiale con claim *"L'eleganza di essere autentica"* in font graziato corsivo.
- **Footer:** Dati legali completi (Federica Cesiano, Via dei Pellegrini 28/29 Napoli, P.IVA 09914431219, recapiti WhatsApp ed email).

### 5.3 Specifiche Dettagliate dei 3 Template Email

#### Email 1: Conferma Prenotazione (Booking Confirmation)
1. **Oggetto:** `Conferma Prenotazione — {serviceName} | Scelta Makeup Boutique`
2. **Hero Card:** Badge violetto, data, orario, nome della cliente, nome della professionista (*Federica Cesiano*).
3. **Tabella Trasparente Saldo:**
   - Prezzo di Listino Boutique: `€{priceList}`
   - Sconto Prenotazione Online (-10%): `-€{discountOnline}` (in evidenza lilla/violetto)
   - Quota di Conferma Versata (20%): `€{depositPaid}` (evidenziata con check verde)
   - Saldo Residuo da Versare in Negozio (80%): `€{balanceDue}` (testo grande `#5E1788`)
4. **Pulsanti Aggiungi al Calendario:**
   - `Aggiungi a Google Calendar` (link diretto URL)
   - `Aggiungi ad Apple Calendar` (file `.ics` standard)
5. **Box Politica di Riservazione:** Vademecum disdetta gratuita fino a 24h prima.

#### Email 2: Promemoria 24h (Booking 24h Reminder)
1. **Oggetto:** `Promemoria: Il tuo appuntamento di bellezza è domani alle {bookingTime}`
2. **Hero Banner:** Countdown elegante "Mancano solo 24 ore alla tua seduta".
3. **Vademecum Trattamento:**
   - Pelle pulita e detersa.
   - Puntualità garantita per la solo-worker.
   - Indicazioni stradali per Via dei Pellegrini 28/29.
4. **Pulsante Modifica o Disdetta:** Link attivo per avvisare la boutique in caso di impedimento.

#### Email 3: Conferma Ordine E-Commerce (Order Placed)
1. **Oggetto:** `Conferma Ordine #{orderNumber} | Scelta Makeup`
2. **Hero:** Ringraziamento con estetica boutique di lusso.
3. **Tabella Prodotti:** Immagine packshot, nome prodotto, nuance/shade selezionata, quantità, prezzo unitario e subtotale.
4. **Riepilogo Finanziario:** Subtotale, Spedizione (Gratuita o €4.90), Totale IVA inclusa.
5. **Callout Omaggio:** Banner con finitura oro/malva per i 2 campioncini cosmetici di alta gamma in omaggio.
6. **Istruzioni Consegna:** Dettagli tracciamento corriere espresso oppure istruzioni per il ritiro in boutique.

---

## 6. Motore Matematico dei Calcoli Finanziari

### 6.1 Formule del Modulo Booking (Regola Trasparenza)
Tutte le formule matematiche devono essere isolate e testate con precisione al centesimo:

$$\text{discountOnline} = \text{round}(\text{priceList} \times 0.10, 2)$$
$$\text{priceOnline} = \text{priceList} - \text{discountOnline} = \text{round}(\text{priceList} \times 0.90, 2)$$
$$\text{depositPaid} = \text{round}(\text{priceOnline} \times 0.20, 2)$$
$$\text{balanceDue} = \text{round}(\text{priceOnline} - \text{depositPaid}, 2)$$

#### Matrice di Controllo sui Servizi Ufficiali a Catalogo:

| Servizio | Prezzo Listino (`priceList`) | Sconto Online 10% (`discountOnline`) | Tariffa Concordata (`priceOnline`) | Acconto 20% Versato (`depositPaid`) | Saldo 80% in Store (`balanceDue`) | Verifica $Acconto + Saldo$ |
|---|---|---|---|---|---|---|
| Make-up Evento & Cerimonia | €50,00 | €5,00 | €45,00 | €9,00 | €36,00 | €45,00 (100% OK) |
| Make-up Giorno & Glow Naturale | €35,00 | €3,50 | €31,50 | €6,30 | €25,20 | €31,50 (100% OK) |
| Lezione Self Make-Up Sartoriale | €65,00 | €6,50 | €58,50 | €11,70 | €46,80 | €58,50 (100% OK) |
| Make-up Sposa (Consulenza & Prova) | €120,00 | €12,00 | €108,00 | €21,60 | €86,40 | €108,00 (100% OK) |
| Armocromia & Shade Match | €25,00 | €2,50 | €22,50 | €4,50 | €18,00 | €22,50 (100% OK) |
| Meso-Fill Viso Cabina (Beauty) | €70,00 | €7,00 | €63,00 | €12,60 | €50,40 | €63,00 (100% OK) |

### 6.2 Formule E-Commerce
$$\text{subtotal} = \sum_{i} (\text{item}[i].\text{price} \times \text{item}[i].\text{quantity})$$
$$\text{shippingCost} = \begin{cases} 0.00 & \text{se } \text{deliveryMethod} = \text{"boutique"} \lor \text{subtotal} \ge \text{sogliaSpedizioneGratuita} \\ 4.90 & \text{altrimenti} \end{cases}$$
$$\text{totalOrder} = \text{subtotal} + \text{shippingCost}$$

---

## 7. Dashboard Monitor Code & Connessione nel Gestionale (`/admin/appuntamenti`)

### 7.1 Integrazione Tab "Canali Notifiche & Coda"
In `app/admin/appuntamenti/page.tsx`, la barra di navigazione tabs viene estesa da 2 a 3 sezioni:
1. `📅 Appuntamenti del Giorno`
2. `🛡️ Gestione Slot & Protezione Orari`
3. `⚡ Canali Notifiche & Coda WhatsApp/Email` *(Nuovo per FASE 3)*

### 7.2 Componenti Visuali del Monitor:
1. **Stato Connessione WhatsApp:**
   - Badge di stato in tempo reale: 🟢 `Connesso (Store Phone)` / 🟡 `In Connessione (QR Code)` / 🔴 `Disconnesso`.
   - Box scannerizzazione QR Code con pulsante di rigenerazione.
   - Informazioni sessione (numero collegato: `+39 348 381 6516`, ultimo heartbeat).
2. **Monitor Coda di Invio in Tempo Reale:**
   - Tabella messaggi in coda con:
     - Destinatario (Nome e telefono mascherato per privacy).
     - Canale (`WhatsApp` o `Email`).
     - Tipo template (`Conferma Booking`, `Promemoria 24h`, `Ordine E-Commerce`).
     - Delay casuale applicato (`20–45s`).
     - Orario programmato e **countdown attivo in secondi** prima del rilascio.
     - Stato: `In attesa` (badge giallo), `In invio` (badge blu animato), `Consegnato` (badge verde), `Errore` (badge rosso).
3. **Pulsante "Test Invio Singolo":**
   - Modale di test rapido per simulare l'inserimento di un messaggio in coda e osservare dal vivo l'applicazione del ritardo umano di 20-45 secondi.
4. **Cockpit Anteprima Template Email:**
   - Selettore per visualizzare l'anteprima HTML renderizzata dei 3 template con toggle Desktop / Mobile.

---

## 8. Specifiche Schema SQL Supabase (`supabase_schema.sql`)

Il file `c:/Users/mario/Progetti Antigravity/Scelta Makeup/supabase_schema.sql` deve essere autonomo, idempotente e contenere:

1. `products`: ID, slug, title, brand, description, price, compare_at_price, category, images, tags, is_active, created_at.
2. `product_variants`: ID, product_id, sku, barcode (EAN-13), shade_name, shade_color_hex, inventory_quantity, price_override.
3. `inventory_logs`: ID, variant_id, change_qty, reason (pos_sale, web_sale, restock, correction), created_at.
4. `appointments`: ID, booking_code, service_id, service_name, channel, operator_id, duration_minutes, date, time, customer_name, customer_surname, customer_phone, customer_email, customer_notes, price_list, discount_online, price_online, deposit_paid, balance_due, status, payment_method_deposit, payment_method_balance, cassa_receipt_printed, cassa_receipt_number, created_at.
5. `blocked_slots`: ID, date, time, reason, created_by, created_at.
6. `orders`: ID, order_number, customer_name, customer_email, customer_phone, delivery_method, shipping_address, shipping_city, shipping_cap, subtotal, shipping_cost, total, payment_method, status, items_json, created_at.
7. `notification_logs`:
   - `id` (UUID PRIMARY KEY)
   - `channel` (VARCHAR: 'whatsapp' | 'email')
   - `template_type` (VARCHAR: 'booking_confirmation' | 'booking_reminder_24h' | 'order_placed')
   - `recipient` (VARCHAR: phone or email)
   - `status` (VARCHAR: 'queued' | 'processing' | 'sent' | 'failed')
   - `scheduled_at` (TIMESTAMPTZ)
   - `jitter_delay_seconds` (INTEGER: 20-45)
   - `sent_at` (TIMESTAMPTZ)
   - `payload_json` (JSONB)
   - `error_message` (TEXT)
   - `created_at` (TIMESTAMPTZ DEFAULT now())
8. **Row Level Security (RLS):**
   - Abilitazione RLS su tutte le tabelle.
   - Policy di lettura pubblica per prodotti attivi.
   - Policy per service role / authenticated users per gestione appuntamenti, ordini e notifiche.

---

## 9. Acceptance Criteria Verification Matrix

| Acceptance Criterion | Verification Method | Status / Target |
|---|---|---|
| **AC-1: Test automatico di coda (jitter 20–45s)** | Verificare che tra due invii consecutivi l'intervallo misurato sia compreso rigorosamente tra 20 e 45 secondi ($20000\text{ms} \le \Delta t \le 45000\text{ms}$). | Verificabile con test automatizzato unitario e monitoraggio cronologico in `notification_logs`. |
| **AC-2: Template email conformi alla palette Scelta Makeup** | Verificare il rendering HTML dei 3 template con `#5E1788`, `#D8C2E7`, `#FFFFFF`, `#D462A6`, header con claim ufficiale e logo. | Verificabile visivamente tramite il cockpit preview locale e l'ispezione CSS inlined. |
| **AC-3: Calcolo corretto degli importi (-10% online, 20% acconto, 80% saldo)** | Verificare su tutti i servizi che $P_{online} = P_{listino} \times 0.9$, $Acconto = P_{online} \times 0.2$, $Saldo = P_{online} - Acconto$, con tolleranza zero centesimi. | Verificato matematicamente nella sezione 6.1 per tutti i 6 trattamenti a catalogo. |
| **AC-4: `npx tsc --noEmit` = 0 errori** | Esecuzione del type-check TypeScript su tutto il progetto. | Nessun errore di tipizzazione ammesso. |
| **AC-5: `npm run lint` = 0 errori e 0 warning** | Esecuzione linter ESLint conforme a Next.js 16. | Nessun warning o errore. |
| **AC-6: `npm run build` completato con successo** | Build di produzione Next.js di tutte le rotte statiche e dinamiche. | Tutte le pagine devono compilare regolarmente. |

---

## 10. Conclusion & Handoff Readiness

The specification mining for Scelta Makeup FASE 3 is complete, unambiguous, and fully referenced against the project domain files and user requirements. All brand codes, anti-ban pacing rules, message copies, email HTML requirements, and mathematical formulas have been captured in full detail.
