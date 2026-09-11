# Architecture & Codebase Survey Report: Scelta Makeup FASE 3

**Agent:** `teamwork_preview_explorer` (explorer_codebase_survey)  
**Parent Orchestrator:** `c3ace6ec-e939-4ff7-a360-6fc84b6af45e`  
**Working Directory:** `c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_codebase_survey`  
**Date:** 2026-09-07  
**Status:** Completed & Verified  

---

## 1. Executive Summary

This survey report provides an exhaustive, read-only architectural investigation of the Scelta Makeup repository (`c:\Users\mario\Progetti Antigravity\Scelta Makeup`) in preparation for **FASE 3**:
1. The **WhatsApp Anti-Ban Pacing Engine** (asynchronous queue with 20–45s human jitter delay, dynamic variation, 1-to-1 transactional messages, QR session simulation).
2. The **Resend Luxury Transactional Email System** (brand-aligned HTML responsive templates, financial formula transparency, Google/Apple calendar integration, local simulation fallback).
3. The **Real-Time Notification & Queue Monitoring Tab** in `/admin/appuntamenti`.
4. The standalone **Supabase SQL Schema** (`supabase_schema.sql`).

### Baseline Repository Health
- **TypeScript:** `npx tsc --noEmit` executed with **0 errors**.
- **ESLint:** `npm run lint` executed with **0 errors and 0 warnings** (ESLint 9 flat config).
- **Next.js Production Build:** `npm run build` compiled **345 static pages** with exit code 0.
- **Source Code Integrity:** Strictly preserved; this survey is 100% read-only.

---

## 2. Project Architecture, Packages & Tooling Analysis

### 2.1 Dependencies & Versions (`package.json`)
```json
{
  "name": "scelta-makeup",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "lucide-react": "^1.12.0",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### 2.2 Key Architectural Characteristics
1. **Next.js 16.2.4 + React 19.2.4 (Turbopack):**
   - Uses the Next.js App Router (`app/` directory).
   - Turbopack is the default bundler (`next build` outputs `▲ Next.js 16.2.4 (Turbopack)`).
   - Server Components by default; interactive client components are marked with `"use client"`.
2. **Tailwind CSS v4:**
   - Modern Tailwind v4 setup using `@tailwindcss/postcss` and `@import "tailwindcss";` in `app/globals.css`.
   - Theme variables are configured via `@theme inline` in CSS, exposing brand palette variables:
     - `--color-royal-violet: #5E1788` (`bg-royal-violet`, `text-royal-violet`, `border-royal-violet`)
     - `--color-vivid-orchid: #7A3293`
     - `--color-pastel-lilac: #D8C2E7`
     - `--color-optical-white: #FFFFFF`
     - `--color-mauve-rose: #D462A6`
     - `--color-charcoal-deep: #1F1B24`
     - `--color-satin-metallic: #E2E8F0`
   - Custom luxury classes: `.bg-brand-royal`, `.bg-brand-orchid`, `.bg-brand-soft`, `.text-brand-gradient`, `.luxury-glow`, `.glass-header`, `.glass-card`.
3. **Icons & UI Primitives:**
   - **`lucide-react` (^1.12.0)** is the sole icon library.
   - **Radix UI is NOT installed** in `package.json`. All modals, tabs, dropdowns, cards, and drawers are custom, lightweight Tailwind components with zero third-party component library overhead.
4. **State Management:**
   - **`zustand` (^5.0.14)** with `persist` middleware storing cart state under localStorage key `"scelta-makeup-cart-storage"`.
5. **Absence of Cloud SDKs:**
   - Neither `@supabase/supabase-js` nor `resend` are currently in `dependencies`.
   - **Architectural Recommendation:** Because the prompt requires full local demo/simulation mode and connectors ready for keys in `.env.local`, services can be implemented with native modern `fetch` (`https://api.resend.com/emails`) and mock storage, or with standard typed clients. Using native `fetch` keeps the build ultra-lightweight and eliminates dependency version collisions with React 19 / Next 16.

### 2.3 TypeScript Configuration (`tsconfig.json`)
- Target: `ES2017`
- Libs: `["dom", "dom.iterable", "esnext"]`
- Module Resolution: `bundler`
- Strict mode: `true`
- Path alias: `"@/*": ["./*"]` (maps cleanly to project root).

---

## 3. Deep Dive: Admin Gestionale (`/admin/appuntamenti`)

### 3.1 Existing File Structure
- **Path:** `app/admin/appuntamenti/page.tsx` (617 lines)
- **Direct Link:** Accessible via footer link (`Cassa & Appuntamenti Store`) or directly at `/admin/appuntamenti`.
- **Component Nature:** Client Component (`"use client"`).

### 3.2 Current Tabs & State Management
In `app/admin/appuntamenti/page.tsx`:
- **Active Tab State (Line 35):**
  ```tsx
  const [activeTab, setActiveTab] = useState<"appuntamenti" | "disponibilita">("appuntamenti");
  ```
- **Existing Tab 1: `appuntamenti` ("📅 Appuntamenti del Giorno")**
  - Displays appointments filtered by `selectedDate` (`new Date().toISOString().split("T")[0]`).
  - 4 KPI summary cards:
    1. *Appuntamenti di Oggi* (Count total, count paid, count pending)
    2. *Acconti Online Incassati* (Stripe 20% total deposits)
    3. *Saldi da Incassare in Store* (Pending 80% balances)
    4. *Saldi già Incassati Oggi* (Completed balances with RT fiscal receipts)
  - Appointment cards showing time, service name, customer name/phone/notes, and pricing breakdown.
  - Action button: `"Incassa Saldo & Scontrino"` which opens the balance clearance modal.
- **Existing Tab 2: `disponibilita` ("🛡️ Gestione Slot & Protezione Orari")**
  - Solo-worker protection interface for Federica Cesiano.
  - Slot grid: `13:30`, `14:15`, `15:00`, `20:00`, `20:45`.
  - 1-click button to toggle blocking/unblocking slots via `toggleSlotBlock(selectedDate, time)` stored in `localStorage` (`scelta_makeup_blocked_slots_v1`).

### 3.3 Existing Modals
1. **In-Store Balance Checkout Modal (Lines 411–517):**
   - Modal state: `activeCheckoutApp: Appointment | null`, `paymentMethod: "mypos_card" | "cash"`, `checkoutSuccessMessage: { receiptNum, xml, balancePaid } | null`.
   - UI: Fixed overlay with `bg-black/60 backdrop-blur-sm`, white rounded-3xl container, close button (`X` icon).
   - Shows tariff online, deposit paid (-20%), and large balance due (80%).
   - Action: `handleExecuteCheckout(app)` generates XML for the Epson FP-81II RT printer, marks appointment status as `"completed_paid"`, and displays green success confirmation.
2. **Manual Fast Booking Modal (Lines 519–610):**
   - Modal state: `isManualBookingOpen: boolean`.
   - Form allowing Federica to quickly book telephone or walk-in clients, immediately blocking the online slot.

### 3.4 Where and How to Integrate Tab 3: "Canali Notifiche & Coda"
- **Step 1 — Expand the Tab State:**
  ```tsx
  const [activeTab, setActiveTab] = useState<"appuntamenti" | "disponibilita" | "notifiche">("appuntamenti");
  ```
- **Step 2 — Add the Tab Button (Line 221):**
  ```tsx
  <button
    onClick={() => setActiveTab("notifiche")}
    className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
      activeTab === "notifiche"
        ? "border-[#5E1788] text-[#5E1788]"
        : "border-transparent text-[#1F1B24]/60 hover:text-[#1F1B24]"
    }`}
  >
    📡 Canali Notifiche & Coda
  </button>
  ```
- **Step 3 — Render the Tab Panel:**
  ```tsx
  {activeTab === "notifiche" && (
    <NotificationQueueDashboard />
  )}
  ```
- **Step 4 — Subsections to Include in the New Tab Panel:**
  1. **WhatsApp Session Status Card:**
     - Status badge: 🟢 `Connesso` / 🔴 `Disconnesso` / 🟡 `In Attesa Scansione QR`.
     - Connected phone display: `+39 348 381 6516` (Boutique Scelta Makeup).
     - QR Code display container for initial pairing simulation or real Evolution API webhook stream.
     - Action buttons: "Riconnetti Sessione", "Test Ping".
  2. **Real-Time Pacing Queue Monitor (Queue Worker):**
     - Table / Card list of outgoing transactional messages.
     - Live countdown badge: `Prossimo invio tra XXs` reflecting the mandatory **20–45s random human jitter delay**.
     - Columns: Destinatario (Nome & Cellulare), Canale (WhatsApp / Email), Tipologia (Conferma Booking, Promemoria 24h, Conferma Ordine), Payload Preview / Hash Univoco, Orario Programmato, Stato (`In Coda`, `In Invio`, `Consegnato`, `Errore`).
  3. **Pulsante Test Invio Singolo:**
     - Instant interactive test panel allowing Federica to enqueue a sample booking confirmation, 24h reminder, or order notification.
     - Directly verifies that:
       - Broadcast massivo is blocked.
       - The 20–45s delay timer starts and counts down before simulated dispatch.
       - Dynamic text mutations are applied so the checksum varies every time.
  4. **Resend Email Template Visualizer & Dispatch Log:**
     - Luxury email preview selector (Booking Confirmation, 24h Reminder, Order Placed).
     - Visual iframe / sanitized HTML render showing the exact email with Royal Violet palette and vector logo.
     - Status of `RESEND_API_KEY`: Shows `Modalità Demo / Simulazione Locale Attiva` if key is missing, or `Pronto per il Cloud` if key is present.

---

## 4. Deep Dive: Booking Flow & Appointment Storage

### 4.1 Booking Flow Architecture
1. **Entry Point:**
   - URL: `/prenota` -> `app/prenota/page.tsx`
   - Wrapper: `app/prenota/BookingWizardClient.tsx` (reads `?servizio=` query param)
   - Component: `components/booking/BookingWizard.tsx` (713 lines)
2. **5-Step Customer Wizard:**
   - **Step 1: Scelta Trattamento:** Loads active makeup services from `data/services.ts`.
   - **Step 2: Scelta Data & Slot:** Generates next 14 calendar days; queries `getAvailableSlots(selectedDate)` which checks both existing appointments and Federica's blocked slots.
   - **Step 3: Dati Cliente:** Captures `name`, `surname`, `phone` (WhatsApp), `email`, and `notes`.
   - **Step 4: Riepilogo Finanziario & Acconto:**
     - Displays transparent pricing: List Price, -10% Online Discount, 20% Deposit Due Now, 80% Balance Due in Boutique.
     - Displays anti-no-show copy and 24h free cancellation policy.
     - Simulates Stripe payment.
   - **Step 5: Schermata di Conferma:**
     - Shows booking code (e.g. `SC-260907-XXXX`), date/time, boutique address (`Via dei Pellegrini 28/29, Napoli`), balance due.
     - Provides direct WhatsApp link button (`wa.me/393483816516`).

### 4.2 Where Bookings are Created & Stored
- **File:** `lib/bookingService.ts`
- **Function:** `createAppointment(data)` (Lines 178–224):
  ```ts
  const newAppointment: Appointment = {
    id: `app-${Date.now()}-${codeSuffix.toLowerCase()}`,
    bookingCode,
    serviceId: service.id,
    serviceName: service.name,
    channel: service.channel,
    operatorId: operator.id,
    operatorName: operator.name,
    durationMinutes: service.durationMinutes,
    date: data.date,
    time: data.time,
    customer: data.customer,
    pricing: {
      priceList: service.priceList,
      discountOnline: service.discountOnline,
      priceOnline: service.priceOnline,
      depositPaid: service.depositAmount,
      balanceDue: service.balanceAmount,
    },
    status: "confirmed",
    paymentMethodDeposit: data.paymentMethodDeposit || "stripe_card",
    createdAt: now.toISOString(),
  };
  ```
- **Storage:** Persisted to `localStorage` under `scelta_makeup_appointments_v1`.
- **Seed Data:** Initial demo appointments (`app-demo-1`, `app-demo-2`) ensure the dashboard is immediately populated and testable.

### 4.3 Notification Connection Points for Bookings
- **Trigger 1: Booking Confirmation (Immediate on Booking)**
  - In `components/booking/BookingWizard.tsx` (`handleConfirmAndPayDeposit`, lines 131–142):
    ```ts
    const appointment = createAppointment({ ... });
    // ---> TRIGGER HOOK HERE:
    // 1. WhatsApp: enqueueNotification({ type: 'booking_confirmation', appointment })
    // 2. Resend: sendBookingConfirmationEmail(appointment)
    ```
- **Trigger 2: Booking 24h Reminder (Scheduled / Simulated)**
  - Scheduled queue worker checks appointments where `appointment.date` is tomorrow and `status === 'confirmed'`.
  - In the admin dashboard, a manual trigger button allows testing this reminder for any existing appointment on demand.

---

## 5. Deep Dive: E-Commerce Checkout Flow & Order Storage

### 5.1 Existing Checkout Flow
- **Path:** `app/checkout/page.tsx` (457 lines)
- **Cart State:** Managed by `store/useCartStore.ts` (`zustand` persist store).
- **Form Data Collected:**
  - `nome`, `cognome`, `email`, `telefono`
  - `indirizzo`, `citta`, `cap` (for shipping)
  - `note`
- **Delivery Selection:**
  - `shipping`: Corriere Espresso 24/48h (€4.90 or Free over €49)
  - `boutique`: Ritiro in Boutique Napoli (Free)
- **Payment Selection:**
  - `card`: Carta di Credito (Stripe)
  - `klarna`: Klarna 3 rate
  - `boutique`: Paga al Ritiro in Boutique (available if delivery is `boutique`)

### 5.2 Critical Finding: Missing Order Persistence
- In `app/checkout/page.tsx` (Lines 54–62):
  ```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      clearCart();
    }, 1500);
  };
  ```
- **Observation:** Currently, placed orders are **not saved anywhere**. There is no `types/order.ts`, no `lib/orderService.ts`, and no order record saved to `localStorage` or a database.
- **Architectural Solution for FASE 3:**
  1. Create `types/order.ts` defining:
     - `OrderItem`: `{ productId, name, brand, price, quantity, shade, image }`
     - `DeliveryMethod`: `'shipping' | 'boutique'`
     - `PaymentMethod`: `'card' | 'klarna' | 'boutique'`
     - `OrderStatus`: `'confirmed' | 'processing' | 'shipped' | 'ready_for_pickup' | 'completed'`
     - `Order`: `{ id, orderNumber, customer, items, subtotal, shippingCost, total, deliveryMethod, paymentMethod, status, createdAt }`
  2. Implement `lib/orderService.ts`:
     - `createOrder(orderData): Order`
     - `getAllOrders(): Order[]`
     - Persists to `localStorage` (`scelta_makeup_orders_v1`) with realistic seed orders, matching the pattern established in `lib/bookingService.ts`.
     - Ready for 1-to-1 mapping to the Supabase `orders` table.
  3. Connect Notification Triggers:
     - In `handleSubmit` of `app/checkout/page.tsx`:
       ```ts
       const order = createOrder({ customer: formData, items, deliveryMethod, paymentMethod, total, ... });
       // ---> TRIGGER HOOK HERE:
       // 1. WhatsApp: enqueueNotification({ type: 'order_placed', order })
       // 2. Resend: sendOrderPlacedEmail(order)
       ```

---

## 6. Mathematical Model & Financial Formulas

The financial calculations across booking and notifications must maintain strict arithmetic invariants:

| Parameter | Formula | Example 1 (Cerimonia) | Example 2 (Giorno) | Example 3 (Sposa) |
| :--- | :--- | :--- | :--- | :--- |
| **Prezzo Listino Store** ($P_{list}$) | Base | €50.00 | €35.00 | €120.00 |
| **Sconto Online 10%** ($S_{10}$) | $P_{list} \times 0.10$ | €5.00 | €3.50 | €12.00 |
| **Tariffa Online Concordata** ($P_{on}$) | $P_{list} - S_{10} = P_{list} \times 0.90$ | €45.00 | €31.50 | €108.00 |
| **Acconto Online 20% (Stripe)** ($A_{20}$) | $P_{on} \times 0.20$ | €9.00 | €6.30 | €21.60 |
| **Saldo Residuo in Store 80%** ($B_{80}$) | $P_{on} - A_{20} = P_{on} \times 0.80$ | €36.00 | €25.20 | €86.40 |

**Invariance Verification:**
- $A_{20} + B_{80} \equiv P_{on}$ (Acconto + Saldo = Totale Online)
- Always rounded using `Math.round(val * 100) / 100` to guarantee zero-cent discrepancy.

---

## 7. Reusable Luxury UI Components Catalog

The existing UI elements in `components/` and `app/` provide a cohesive design pattern:

| Element | Visual Treatment | Tailwind Class Pattern |
| :--- | :--- | :--- |
| **Primary Button** | Royal Violet luxury gradient with subtle shadow | `bg-brand-royal text-white hover:bg-[#7A3293] shadow-md shadow-[#5E1788]/20 rounded-xl px-4 py-2 font-bold text-xs` |
| **Secondary Button** | Bordered white card button | `bg-white text-[#1F1B24] border border-[#D8C2E7]/60 hover:border-[#5E1788] rounded-xl px-4 py-2 text-xs font-bold` |
| **WhatsApp Action** | Official WhatsApp emerald with glow | `bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-md shadow-[#25D366]/20 rounded-xl px-4 py-2 font-bold text-xs` |
| **Status Pill (Success)** | Soft emerald badge | `inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full` |
| **Status Pill (Pending)** | Soft amber badge | `inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full` |
| **Status Pill (Brand)** | Soft violet badge | `inline-flex items-center gap-1 text-[11px] font-bold text-[#5E1788] bg-[#5E1788]/10 px-2.5 py-1 rounded-full` |
| **Container Card** | White card with lilac border and smooth shadow | `bg-white rounded-2xl p-6 border border-[#D8C2E7]/50 shadow-sm` |
| **Modal Overlay** | Dark blurred backdrop | `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4` |
| **Modal Container** | Floating white luxury container | `bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#D8C2E7]/60 shadow-2xl relative` |

---

## 8. Proposed File & Architecture Plan for FASE 3 Implementation

To implement FASE 3 cleanly without modifying unnecessary code or introducing regressions:

```
c:\Users\mario\Progetti Antigravity\Scelta Makeup\
├── types/
│   ├── booking.ts                     (Existing, reference)
│   ├── product.ts                     (Existing, reference)
│   ├── order.ts                       (NEW: Order, OrderItem, OrderStatus types)
│   └── notification.ts                (NEW: WhatsApp/Email message, queue item, session types)
├── lib/
│   ├── bookingService.ts              (Existing, add notification triggers)
│   ├── orderService.ts                (NEW: Order storage & management)
│   ├── resendService.ts               (NEW: Responsive HTML luxury templates & Resend connector)
│   └── whatsappQueueService.ts        (NEW: Anti-ban queue worker, 20-45s jitter, dynamic variation)
├── components/
│   └── admin/
│       └── NotificationQueueTab.tsx   (NEW: Self-contained tab component for /admin/appuntamenti)
├── app/
│   ├── admin/appuntamenti/page.tsx    (Update: Add 3rd tab and render NotificationQueueTab)
│   ├── checkout/page.tsx              (Update: Connect orderService and notification triggers)
│   └── prenota/BookingWizardClient.tsx (Existing)
└── supabase_schema.sql                (NEW: Complete SQL DDL at project root)
```

---

## 9. Conclusion & Read-Only Survey Signoff

The codebase survey is complete and verified. The repository is in an ideal state: clean baseline builds, well-structured components, and obvious non-invasive integration points for FASE 3. The implementer can proceed with high confidence following this survey and the companion reports from `spec_miner_survey` and `explorer_services_survey`.
