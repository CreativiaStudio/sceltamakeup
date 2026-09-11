# Scelta Makeup — FASE 3 Architecture Survey Report
**Services, Database & Anti-Ban Communication Engine**
*Author:* Teamwork Preview Explorer (`explorer_services_survey`)  
*Date:* 2026-09-07  
*Status:* Complete (Read-Only Survey)  
*Project Root:* `c:\Users\mario\Progetti Antigravity\Scelta Makeup`

---

## Executive Summary

This survey report provides the architectural blueprint for **FASE 3** of the **Scelta Makeup** platform. FASE 3 introduces three mission-critical components:
1. **Standalone Supabase Database Schema (`supabase_schema.sql`)**: A complete, 1-click ready PostgreSQL schema at the project root covering products, variants, inventory, appointments, orders, blocked slots, notification logs, and fine-grained Row Level Security (RLS) policies.
2. **Luxury Transactional Email System (`lib/resendService.ts`)**: A zero-external-dependency, responsive HTML template engine matching Scelta Makeup's brand guidelines (Royal Violet `#5E1788`, Pastel Lilac `#D8C2E7`, Mauve Rose `#D462A6`), with transparent financial breakdown (List Price, -10% Online, 20% Deposit, 80% Store Balance) and a realistic local preview/demo mode.
3. **WhatsApp Anti-Ban Queue Worker & Evolution API (`lib/whatsappQueue.ts`, `lib/evolutionApi.ts`)**: An asynchronous 1-to-1 queuing engine that strictly enforces human pacing with random jitter between **20 and 45 seconds**, dynamic text variation (varying greetings, closings, checksums, and pre-treatment tips to prevent Meta spam detection), an Evolution API client, a realistic mock QR session, and an administrative monitoring dashboard integrated into `/admin/appuntamenti`.

The existing repository is fully healthy:
- Next.js 16.2.4 (Turbopack, App Router)
- React 19.2.4
- Tailwind CSS v4
- Zustand 5.0.14
- Baseline checks: `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors, 0 warnings), `npm run build` (345 static pages successfully compiled).

---

## Part 1: Database & Supabase Setup Investigation

### 1.1 Current Repository State
- **Existing SQL / Migrations**: No `.sql` files or migration folders currently exist in the repository.
- **Supabase Dependencies**: `@supabase/supabase-js` is not yet installed in `package.json`.
- **Existing Data Sources**:
  - `data/catalog.json`: 338+ products from RVB LAB, Diego Dalla Palma, and Cipria Make Up.
  - `data/services.ts`: 6 defined services (5 Makeup active, 1 Beauty planned) and 2 operators (`op-federica-cesiano`, `op-beauty-cabina`).
  - `lib/bookingService.ts`: In-memory and `localStorage` mock store (`scelta_makeup_appointments_v1`, `scelta_makeup_blocked_slots_v1`).
  - `types/booking.ts` & `types/product.ts`: Existing TypeScript interfaces representing the domain models.

### 1.2 Target Requirements: `supabase_schema.sql` at Project Root
The file `c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql` must be completely standalone, idempotent, and executable with 1-click in the Supabase SQL Editor.

#### Required Table Schemas:
1. **`products`**:
   - `id` (TEXT PRIMARY KEY / UUID) — Product unique identifier (e.g. slug-based or UUID).
   - `slug` (TEXT UNIQUE NOT NULL) — SEO URL slug.
   - `name` (TEXT NOT NULL) — Product name.
   - `brand` (TEXT NOT NULL) — 'RVB LAB', 'Diego dalla Palma', 'Cipria Make Up', etc.
   - `category` (TEXT NOT NULL) — 'Viso', 'Occhi', 'Labbra', 'Skincare & Dermo', 'Beauty & Accessori'.
   - `price` (NUMERIC(10,2) NOT NULL) — Retail price.
   - `original_price` (NUMERIC(10,2)) — List/crossed-out price.
   - `original_wholesale_price` (NUMERIC(10,2) NOT NULL DEFAULT 0) — Cost of goods sold.
   - `rating` (NUMERIC(3,2) DEFAULT 5.0).
   - `review_count` (INTEGER DEFAULT 0).
   - `badge` (TEXT) — 'Bestseller', 'Novità', etc.
   - `badges` (TEXT[] DEFAULT '{}').
   - `description` (TEXT NOT NULL DEFAULT '').
   - `short_description` (TEXT NOT NULL DEFAULT '').
   - `formula_benefits` (TEXT DEFAULT '').
   - `how_to_use` (TEXT DEFAULT '').
   - `inci` (TEXT DEFAULT '').
   - `features` (TEXT[] DEFAULT '{}').
   - `images` (TEXT[] DEFAULT '{}').
   - `is_featured` (BOOLEAN DEFAULT false).
   - `tags` (TEXT[] DEFAULT '{}').
   - `texture` (TEXT), `coverage` (TEXT), `finish` (TEXT).
   - `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).

2. **`variants`**:
   - `id` (TEXT PRIMARY KEY) — Variant unique code (e.g. `rvb-xxx-01`).
   - `product_id` (TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE).
   - `name` (TEXT NOT NULL) — Variant/shade name.
   - `sku` (TEXT UNIQUE NOT NULL) — Official vendor SKU.
   - `ean` (TEXT NOT NULL DEFAULT '') — 13-digit barcode.
   - `color_hex` (TEXT) — Hex swatch.
   - `image` (TEXT NOT NULL DEFAULT '').
   - `in_stock` (BOOLEAN DEFAULT true).
   - `price` (NUMERIC(10,2)).
   - `original_wholesale_price` (NUMERIC(10,2)).
   - `created_at` (TIMESTAMPTZ DEFAULT now()), `updated_at` (TIMESTAMPTZ DEFAULT now()).

3. **`inventory`**:
   - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid()).
   - `variant_id` (TEXT UNIQUE NOT NULL REFERENCES variants(id) ON DELETE CASCADE).
   - `product_id` (TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE).
   - `quantity_on_hand` (INTEGER NOT NULL DEFAULT 0).
   - `safety_stock` (INTEGER NOT NULL DEFAULT 2).
   - `location` (TEXT DEFAULT 'Boutique Napoli - Via dei Pellegrini 28/29').
   - `updated_at` (TIMESTAMPTZ DEFAULT now()).

4. **`appointments`**:
   - `id` (TEXT PRIMARY KEY DEFAULT ('app-' || gen_random_uuid())).
   - `booking_code` (TEXT UNIQUE NOT NULL) — e.g. `SC-260907-XXXX`.
   - `service_id` (TEXT NOT NULL).
   - `service_name` (TEXT NOT NULL).
   - `channel` (TEXT NOT NULL DEFAULT 'makeup') — 'makeup' | 'beauty'.
   - `operator_id` (TEXT NOT NULL DEFAULT 'op-federica-cesiano').
   - `operator_name` (TEXT NOT NULL DEFAULT 'Federica Cesiano').
   - `duration_minutes` (INTEGER NOT NULL DEFAULT 60).
   - `appointment_date` (DATE NOT NULL).
   - `appointment_time` (TEXT NOT NULL) — e.g. '13:30', '20:00'.
   - `customer_name` (TEXT NOT NULL).
   - `customer_surname` (TEXT NOT NULL).
   - `customer_phone` (TEXT NOT NULL).
   - `customer_email` (TEXT NOT NULL).
   - `customer_notes` (TEXT).
   - `price_list` (NUMERIC(10,2) NOT NULL).
   - `discount_online` (NUMERIC(10,2) NOT NULL DEFAULT 0).
   - `price_online` (NUMERIC(10,2) NOT NULL).
   - `deposit_paid` (NUMERIC(10,2) NOT NULL).
   - `balance_due` (NUMERIC(10,2) NOT NULL).
   - `status` (TEXT NOT NULL DEFAULT 'confirmed') — 'confirmed', 'completed_paid', 'cancelled', 'no_show'.
   - `payment_method_deposit` (TEXT NOT NULL DEFAULT 'stripe_card').
   - `payment_method_balance` (TEXT) — 'mypos_card', 'cash'.
   - `cassa_receipt_printed` (BOOLEAN DEFAULT false).
   - `cassa_receipt_number` (TEXT).
   - `created_at` (TIMESTAMPTZ DEFAULT now()).
   - `completed_at` (TIMESTAMPTZ).
   - `reminder_sent` (BOOLEAN DEFAULT false).
   - `reminder_sent_at` (TIMESTAMPTZ).

5. **`orders`**:
   - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid()).
   - `order_number` (TEXT UNIQUE NOT NULL) — e.g. `SC-ORD-2026-0001`.
   - `customer_name` (TEXT NOT NULL).
   - `customer_surname` (TEXT NOT NULL).
   - `customer_email` (TEXT NOT NULL).
   - `customer_phone` (TEXT NOT NULL).
   - `delivery_method` (TEXT NOT NULL DEFAULT 'shipping') — 'shipping' | 'boutique'.
   - `shipping_address` (JSONB).
   - `items` (JSONB NOT NULL).
   - `subtotal` (NUMERIC(10,2) NOT NULL).
   - `shipping_cost` (NUMERIC(10,2) NOT NULL DEFAULT 0).
   - `total` (NUMERIC(10,2) NOT NULL).
   - `payment_method` (TEXT NOT NULL) — 'card', 'klarna', 'boutique'.
   - `payment_status` (TEXT NOT NULL DEFAULT 'paid').
   - `status` (TEXT NOT NULL DEFAULT 'processing') — 'pending', 'paid', 'processing', 'shipped', 'ready_for_pickup', 'completed', 'cancelled'.
   - `tracking_number` (TEXT).
   - `created_at` (TIMESTAMPTZ DEFAULT now()).
   - `updated_at` (TIMESTAMPTZ DEFAULT now()).

6. **`blocked_slots`**:
   - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid()).
   - `slot_date` (DATE NOT NULL).
   - `slot_time` (TEXT NOT NULL).
   - `reason` (TEXT DEFAULT 'Riservato in boutique').
   - `created_at` (TIMESTAMPTZ DEFAULT now()).
   - `CONSTRAINT uq_date_time UNIQUE (slot_date, slot_time)`.

7. **`notification_logs`**:
   - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid()).
   - `channel` (TEXT NOT NULL) — 'whatsapp' | 'email'.
   - `recipient` (TEXT NOT NULL) — Phone number or email.
   - `recipient_name` (TEXT).
   - `template_type` (TEXT NOT NULL) — 'booking_confirmation', 'booking_reminder_24h', 'order_placed', 'manual_test'.
   - `payload` (JSONB).
   - `scheduled_for` (TIMESTAMPTZ NOT NULL DEFAULT now()).
   - `sent_at` (TIMESTAMPTZ).
   - `status` (TEXT NOT NULL DEFAULT 'pending') — 'pending', 'queued', 'sending', 'sent', 'failed'.
   - `jitter_seconds` (INTEGER).
   - `attempts` (INTEGER DEFAULT 0).
   - `error_message` (TEXT).
   - `message_preview` (TEXT).
   - `created_at` (TIMESTAMPTZ DEFAULT now()).

#### Indexes:
- `idx_appointments_date_time ON appointments(appointment_date, appointment_time)`
- `idx_appointments_booking_code ON appointments(booking_code)`
- `idx_orders_order_number ON orders(order_number)`
- `idx_blocked_slots_date ON blocked_slots(slot_date)`
- `idx_notification_logs_status_scheduled ON notification_logs(status, scheduled_for)`
- `idx_variants_product_id ON variants(product_id)`
- `idx_variants_sku ON variants(sku)`
- `idx_products_slug ON products(slug)`

#### Triggers:
- `set_updated_at()` PL/pgSQL function triggered before update on `products`, `variants`, `inventory`, `appointments`, and `orders`.

#### Row Level Security (RLS) Matrix:
| Table | Anon Policy | Authenticated / Service Role Policy |
| :--- | :--- | :--- |
| `products` | `SELECT` (Public catalog browsing) | Full CRUD |
| `variants` | `SELECT` (Public variant browsing) | Full CRUD |
| `inventory` | No access (Admin/store only) | Full CRUD |
| `appointments` | `INSERT` (Client booking wizard) | Full CRUD |
| `orders` | `INSERT` (Client checkout) | Full CRUD |
| `blocked_slots` | `SELECT` (Slot availability check) | Full CRUD |
| `notification_logs` | No access | Full CRUD (Queue worker & admin) |

---

## Part 2: Notification & Communication Services Investigation

### 2.1 Luxury Email Service via Resend (`lib/resendService.ts`)

#### Architectural Strategy:
- Zero external package dependency: Instead of enforcing `import { Resend } from 'resend'`, use standard web-standard `fetch('https://api.resend.com/emails', { ... })`. This ensures zero npm conflicts, instant loading, and maximum portability.
- **Dual-Mode Operation**:
  - **Live Cloud Mode**: If `process.env.RESEND_API_KEY` is provided, sends the email directly through Resend's API.
  - **Local Demo/Simulation Mode**: If `RESEND_API_KEY` is not defined (or equals `'demo'`/`'mock'`), the service generates the exact HTML, logs the dispatch with branded console formatting, stores the email in an in-memory/localStorage preview log, and returns `{ success: true, id: 'demo-resend-' + Date.now(), previewHtml, simulated: true }`.

#### Official Design System Compliance:
- **Royal Violet (`#5E1788`)**: Primary brand color, headers, primary buttons, accents.
- **Pastel Lilac (`#D8C2E7`)**: Delicate borders, background cards, separators.
- **Mauve Rose (`#D462A6`)**: Callouts, tag accents, icons.
- **Charcoal Deep (`#1F1B24`)**: High-contrast, elegant typography.
- **Soft Lilac Wash (`#FAF7FC`)**: Background envelope container.
- **Optical White (`#FFFFFF`)**: Content container and product cards.
- **Claim**: *"L'eleganza di essere autentica"*.

#### The 3 Required Email Templates:
1. **`Booking Confirmation` Template**:
   - Customer name and personalized greeting.
   - Service name and date/time.
   - Professional: Federica Cesiano.
   - Boutique address: *Via dei Pellegrini 28/29, Napoli*.
   - **Transparent Financial Breakdown**:
     - *Prezzo di listino in boutique*: `€50.00`
     - *Sconto esclusivo prenotazione online (-10%)*: `-€5.00`
     - *Tariffa concordata online*: `€45.00`
     - *Acconto di conferma versato online (20%)*: `€9.00` (Stripe/Card)
     - *Saldo dovuto in boutique a fine seduta (80%)*: `€36.00` (myPOS / Contanti)
   - **Calendar Action Buttons**:
     - Google Calendar 1-click link (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`)
     - Apple Calendar (.ics format data URI)
   - Cancellation Terms: Free cancellation or reschedule up to 24 hours prior.

2. **`Booking 24h Reminder` Template**:
   - Alert: Seduta programmata per domani.
   - Appointment date, time, and service.
   - Balance due reminder (`€36.00` in boutique).
   - **Pre-Treatment Vademecum**:
     - *Pelle pulita e detersa*: Si consiglia di presentarsi senza residui di trucco e con pelle ben idratata.
     - *Puntualità*: Ti chiediamo di arrivare con 5 minuti di anticipo per godere appieno dell'esperienza su misura.
     - *Cancellazione*: Link e contatto rapido se impossibilitati a partecipare.
   - Google Maps direct directions link to Via dei Pellegrini 28/29, Napoli.

3. **`Order Placed` (E-Commerce Confirmation) Template**:
   - Order number and order date.
   - Itemized product list: thumbnail image, product name, shade/variant, quantity, unit price, total price.
   - Shipping / Delivery details:
     - *Corriere Espresso 24/48h* (con tracking) oppure *Ritiro Gratuito in Boutique*.
   - Complimentary samples highlight: *2 Campioncini di profumeria e makeup in omaggio*.
   - Financial totals: Subtotal, Shipping (`€0.00` or `€4.90`), Total including VAT.

---

### 2.2 WhatsApp Anti-Ban Engine & Evolution API

#### The Meta Anti-Ban Challenge & Solution:
Meta aggressively flags and bans WhatsApp accounts that perform bulk blasts, send identical text hashes to multiple users, or dispatch at inhuman speeds.

To guarantee zero-risk operation on Federica Cesiano's official store phone:
1. **Categorical Broadcast Ban**: The system has no mass broadcast feature. Only 1-to-1 transactional triggers are permitted.
2. **Human Pacing (20–45s Jitter)**:
   ```ts
   // Strict random jitter between 20 and 45 seconds
   const jitterSeconds = Math.floor(Math.random() * (45 - 20 + 1)) + 20;
   ```
   Between any sent message and the next message in the queue, a random sleep of 20 to 45 seconds is mandatory.
3. **Dynamic Text Mutation Engine**:
   No two messages share identical text or checksums. The engine varies:
   - Greeting rotation: `["Gentile {nome},", "Cara {nome},", "Buongiorno {nome},", "Ciao {nome},"]`
   - Sign-off rotation: `["Un caro saluto, Federica - Scelta Makeup", "Ti aspetto con gioia, Federica Cesiano", "A presto da Federica - Boutique Napoli", "Con affetto, Scelta Makeup"]`
   - Specific unique parameters: Unique booking code / order ID, explicit appointment date, exact hour.
   - Tailored advice snippet:
     - Ceremony: *"💡 Consiglio per la seduta: indossa una camicia aperta sul davanti o con zip per non rovinare il make-up al cambio d'abito."*
     - Natural Glow: *"💡 Consiglio per la seduta: una buona idratazione la sera prima aiuterà a ottenere una base ancora più radiosa e levigata."*
     - Armocromia: *"💡 Consiglio per la seduta: ti consigliamo di presentarti a viso struccato per una perfetta lettura del sottotono con i drappi."*

#### Evolution API Client Architecture (`lib/evolutionApi.ts`):
- Connects to Evolution API (v1/v2):
  - `GET /instance/connectionState/:instance`
  - `GET /instance/connect/:instance` (retrieves QR code for store phone pairing)
  - `POST /message/sendText/:instance`
- **Zero-Config Mock / Demo Session**:
  - When `EVOLUTION_API_URL` or `EVOLUTION_API_KEY` are not set in `.env.local`:
  - Returns a realistic simulated QR code (SVG / base64 data URI).
  - Simulates connection states (`open`, `close`, `connecting`).
  - Records dispatched text messages into the queue logs with realistic dispatch status.

#### WhatsApp Queue Worker Architecture (`lib/whatsappQueue.ts`):
- Asynchronous worker maintaining:
  - `queue`: Array of pending messages.
  - `activeItem`: The message currently undergoing the human pacing countdown.
  - `countdownSeconds`: Real-time remaining seconds before next dispatch.
  - `history`: Completed / sent messages with measured jitter.
  - `isProcessing`: Lock preventing concurrent worker execution.
- Exposes listeners/callbacks and polling state for UI reactivity.

---

### 2.3 API Routes & Server Actions

To decouple the client UI from the worker and service logic, the following API routes are required:
1. **`/api/notifications/whatsapp`**:
   - `GET`: Returns `{ queue, activeItem, countdownSeconds, history, sessionStatus, stats }`.
   - `POST`: Allows enqueuing messages, triggering queue execution, or toggling mock session states.
2. **`/api/notifications/resend`**:
   - `GET`: Returns template preview list and dispatched email log.
   - `POST`: Generates HTML preview or dispatches email (cloud or simulated).
3. **`/api/notifications/test-dispatch`**:
   - `POST`: One-click trigger for testing:
     - Enqueue a test WhatsApp message with random jitter (20–45s).
     - Dispatch a test Resend email with visual confirmation.

---

### 2.4 Admin Gestionale Integration (`app/admin/appuntamenti/page.tsx`)

A third tab **"Canali Notifiche & Coda"** must be added alongside:
- Tab 1: 📅 *Appuntamenti del Giorno*
- Tab 2: 🛡️ *Gestione Slot & Protezione Orari*
- Tab 3: 📡 **Canali Notifiche & Coda**

#### Tab 3 Layout & Modules:
1. **WhatsApp Session Status Card**:
   - Visual status pill (`🟢 Connesso` / `🟡 QR Code da Scannerizzare` / `🔴 Disconnesso`).
   - Store Phone number displayed: `+39 348 381 6516` (Federica Cesiano - Scelta Makeup).
   - QR Code display card with button to regenerate or toggle simulated connection.
2. **Send Queue Real-Time Monitor**:
   - Active countdown badge: e.g. `⏳ Prossimo invio tra 32s (Pacing anti-ban attivo)`.
   - Visual progress bar syncing with the countdown.
   - Table of messages in queue:
     - Recipient (Name & Phone)
     - Type (Conferma Booking, Promemoria 24h, Ordine)
     - Dynamic text preview
     - Scheduled dispatch timestamp
     - Status (`In coda`, `Pacing in corso`, `Inviato`, `Errore`)
3. **Resend Email Live Previews**:
   - Template selector pills: *Conferma Booking*, *Promemoria 24h*, *Ordine E-commerce*.
   - Live interactive email preview showing the rendered HTML.
   - Demonstration of the financial breakdown calculation.
4. **Test Dispatch Controls**:
   - *"Invia Test WhatsApp (Pacing 20-45s)"*: Adds a test message into the queue to verify jitter.
   - *"Invia Test Email Resend"*: Tests email dispatch and opens the preview modal.

---

## Part 3: Acceptance Criteria & Test Verification Plan

| Criterion | Target Metric | Verification Method |
| :--- | :--- | :--- |
| **WhatsApp Pacing Test** | Measured delay strictly between 20s and 45s | Run sequential queue dispatch test; verify `t2 - t1 >= 20000ms && t2 - t1 <= 45000ms`. |
| **Email Design System** | Compliant with official palette | Inspect generated HTML for `#5E1788`, `#D8C2E7`, `#FFFFFF`, `#D462A6`, `#1F1B24`. |
| **Financial Accuracy** | List: €50.00, Online (-10%): €45.00, Deposit (20%): €9.00, Balance (80%): €36.00 | Verify calculation logic in booking confirmation template. |
| **TypeScript Integrity** | 0 errors | `npx tsc --noEmit` |
| **ESLint Integrity** | 0 errors, 0 warnings | `npm run lint` |
| **Build Integrity** | Clean build on all static and dynamic routes | `npm run build` |

---

## Part 4: Implementation Roadmap for Builder Agent

1. **Step 1: SQL Schema Creation**
   - Write `supabase_schema.sql` at project root with all 7 tables, enums, triggers, indexes, and RLS policies.
2. **Step 2: Resend Service & Luxury Templates**
   - Create `lib/resendService.ts` with the 3 responsive HTML templates and fallback simulation mode.
3. **Step 3: WhatsApp Engine & Evolution API**
   - Create `lib/evolutionApi.ts` (Evolution API client with mock QR session).
   - Create `lib/whatsappQueue.ts` (asynchronous queue worker with 20–45s random jitter and dynamic text mutation).
4. **Step 4: API Routes**
   - Implement `/api/notifications/whatsapp/route.ts`.
   - Implement `/api/notifications/resend/route.ts`.
   - Implement `/api/notifications/test-dispatch/route.ts`.
5. **Step 5: Admin Gestionale Tab Integration**
   - Enhance `app/admin/appuntamenti/page.tsx` with the new tab and monitor components.
6. **Step 6: Automated Test & Build Validation**
   - Implement an automated queue test verifying the 20-45s delay jitter.
   - Run `npx tsc --noEmit`, `npm run lint`, and `npm run build` to guarantee complete integrity.
