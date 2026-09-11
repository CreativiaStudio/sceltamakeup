# Project: Scelta Makeup FASE 3

## Architecture
- **Tech Stack**: Next.js 16.2.4 (App Router, Turbopack), React 19.2.4, Tailwind CSS v4, Lucide React, Zustand 5.0.14, TypeScript 5.
- **Data Flow**:
  - Standalone PostgreSQL/Supabase schema (`supabase_schema.sql`) for production cloud migration.
  - Client and store service layer (`lib/bookingService.ts`, `lib/orderService.ts`, `lib/whatsappQueueService.ts`, `lib/resendService.ts`) with robust dual-mode: live cloud connectors ready for `.env.local` keys, and full zero-downtime local simulation/demo mode for offline boutique testing.
  - Real-time queue worker executing strict human pacing (20–45s random jitter delay between consecutive messages) and dynamic checksum mutation to prevent Meta spam flags.
  - Luxury transactional email engine producing mobile-responsive HTML emails conforming to Scelta Makeup's visual identity (#5E1788 Royal Violet, #D8C2E7 Pastel Lilac, #FFFFFF Optical White, #D462A6 Mauve Rose, claim "L'eleganza di essere autentica").
  - Admin management interface in `/admin/appuntamenti` with a dedicated "Canali Notifiche & Coda" tab containing WhatsApp session QR monitor, real-time message queue with countdown, single test dispatcher, and Resend email previewer.

## Code Layout
- `c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql`: Standalone Supabase SQL DDL (products, variants, inventory, appointments, orders, blocked_slots, notification_logs, RLS, triggers, indexes).
- `types/order.ts`: TypeScript definitions for e-commerce orders, items, status, delivery and payment methods.
- `types/notification.ts`: TypeScript definitions for WhatsApp/Email channels, templates, queue status, logs, and Evolution API session state.
- `lib/orderService.ts`: Order management service with local persistence and Supabase readiness.
- `lib/resendService.ts`: Luxury responsive HTML transactional email generator and Resend dispatcher with local simulation/preview mode.
- `lib/whatsappQueueService.ts`: Anti-ban queue worker with strict 20–45s random jitter, dynamic message variation engine, and Evolution API client with mock QR session.
- `components/admin/NotificationQueueTab.tsx`: Dedicated admin tab component for `/admin/appuntamenti`.
- `app/admin/appuntamenti/page.tsx`: Admin appointment page updated to integrate the 3rd tab.
- `app/checkout/page.tsx`: Checkout form updated to persist placed orders and trigger notifications.
- `components/booking/BookingWizard.tsx`: Updated to trigger booking confirmation notifications.
- `tests/` or `e2e/`: Automated test suite for queue jitter measurement, financial calculation verification, and email rendering.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Supabase SQL DDL | Complete standalone SQL schema in `supabase_schema.sql` (7 tables, RLS, triggers, indexes) | M1 | ORIGINAL_REQUEST:40 |
| 2 | Products & Variants Schema | DDL for products, product variants, inventory with cascade rules | M1 | survey_services:41 |
| 3 | Appointments & Blocked Slots Schema | DDL for appointments with transparent financial columns and blocked_slots | M1 | survey_services:88 |
| 4 | Orders Schema | DDL for orders with JSONB items, shipping address, delivery method | M1 | survey_services:119 |
| 5 | Notification Logs Schema | DDL for notification_logs tracking channels, status, jitter, payloads | M1 | survey_services:147 |
| 6 | Row Level Security (RLS) Policies | Fine-grained RLS for public read, client insert, service-role admin | M1 | survey_services:176 |
| 7 | Order Types & Service | `types/order.ts` and `lib/orderService.ts` for order persistence | M2 | survey_codebase:275 |
| 8 | Notification Types | `types/notification.ts` for queue, message, and session models | M2 | survey_codebase:344 |
| 9 | WhatsApp Queue Worker | Async queue worker enforcing sequential execution and status lifecycle | M2 | ORIGINAL_REQUEST:15 |
| 10 | Human Pacing 20–45s Jitter | Strict random delay between 20 and 45 seconds between consecutive sends | M2 | ORIGINAL_REQUEST:17 |
| 11 | Anti-Spam Checksum Variation | Dynamic variation (greetings, sign-offs, booking IDs, pre-treatment tips) | M2 | ORIGINAL_REQUEST:18 |
| 12 | WA Template 1: Booking Confirmation | 1-to-1 message with 20% deposit, 80% store balance, boutique address, tip | M2 | ORIGINAL_REQUEST:20 |
| 13 | WA Template 2: 24h Reminder | Friendly reminder with vademecum, free cancellation <24h, map link | M2 | ORIGINAL_REQUEST:21 |
| 14 | WA Template 3: Order Placed | Confirmation with items, shades, courier vs. boutique pickup, 2 samples | M2 | ORIGINAL_REQUEST:22 |
| 15 | Evolution API Client & QR Mock | Session status management, QR code generator with realistic mock fallback | M2 | ORIGINAL_REQUEST:36 |
| 16 | Luxury Resend Email Service | `lib/resendService.ts` with web fetch and local preview/demo mode | M3 | ORIGINAL_REQUEST:32 |
| 17 | Brand Visual Identity Styling | Header with logo, claim "L'eleganza di essere autentica", palette #5E1788, #D8C2E7, #FFFFFF, #D462A6 | M3 | ORIGINAL_REQUEST:26 |
| 18 | Email Template 1: Booking Confirmation | Responsive HTML with transparent financial breakdown (-10%, 20%, 80%) & Calendar buttons | M3 | ORIGINAL_REQUEST:29 |
| 19 | Email Template 2: 24h Reminder | Responsive HTML with vademecum, disdetta link, Google Maps directions | M3 | ORIGINAL_REQUEST:30 |
| 20 | Email Template 3: Order Placed | Responsive HTML with product cards, shipping/pickup details, free samples callout | M3 | ORIGINAL_REQUEST:31 |
| 21 | Mathematical Financial Engine | Accurate monetary calculations (-10% online, 20% deposit, 80% balance due, zero-cent discrepancy) | M3 | ORIGINAL_REQUEST:46 |
| 22 | Admin Tab "Canali Notifiche & Coda" | 3rd tab in `/admin/appuntamenti` with tab switcher and luxury styling | M4 | ORIGINAL_REQUEST:35 |
| 23 | WA Session Status & QR Card | Real-time session state, connected phone display, QR display/pairing | M4 | ORIGINAL_REQUEST:36 |
| 24 | Real-Time Send Queue Monitor | Live queue table with countdown timer (20-45s), progress bar, status badges | M4 | ORIGINAL_REQUEST:37 |
| 25 | Single Test Dispatcher Button | Admin button to enqueue test WhatsApp message & test email dispatch | M4 | ORIGINAL_REQUEST:38 |
| 26 | Resend Email Previewer Cockpit | Interactive template preview modal/tab with desktop & mobile toggle | M4 | ORIGINAL_REQUEST:7 |
| 27 | Integration with Booking & Checkout | Hooking confirmation triggers into `BookingWizard` and `checkout/page.tsx` | M4 | survey_codebase:230 |
| 28 | E2E Automated Queue Pacing Test | Automated script measuring consecutive send timestamps ($\Delta t \in [20, 45]$s) | M5 | ORIGINAL_REQUEST:44 |
| 29 | E2E Email HTML & Calculation Test | Automated verification of generated HTML palette and exact math formulas | M5 | ORIGINAL_REQUEST:45 |
| 30 | Production Typecheck & Lint Gate | `npx tsc --noEmit` (0 errors) and `npm run lint` (0 errors, 0 warnings) | M5 | ORIGINAL_REQUEST:47 |
| 31 | Production Build Gate | `npm run build` succeeds cleanly across all routes | M5 | ORIGINAL_REQUEST:49 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Supabase SQL Schema | Standalone `supabase_schema.sql` with 7 tables, RLS, indexes, triggers | none | DONE (`supabase_schema.sql`) |
| M2 | WhatsApp Anti-Ban Queue Engine | Types (`order.ts`, `notification.ts`), `orderService.ts`, `whatsappQueueService.ts` with 20-45s jitter, dynamic variation, Evolution API mock/client | M1 | DONE (`types/`, `lib/orderService.ts`, `lib/whatsappQueueService.ts`) |
| M3 | Luxury Resend Email Module | `lib/resendService.ts` with 3 luxury responsive HTML templates, exact financial math, calendar links, demo/preview mode | M2 | DONE (`lib/resendService.ts`) |
| M4 | Admin Queue Dashboard & App Hooks | `NotificationQueueTab.tsx` in `/admin/appuntamenti`, integration with `BookingWizard` and `checkout` | M2, M3 | DONE (`components/admin/NotificationQueueTab.tsx`, `page.tsx`, `BookingWizard.tsx`, `checkout/page.tsx`) |
| M5 | E2E Verification & Adversarial Gate | Automated test execution (jitter verification, email verification, tsc, lint, build), adversarial coverage hardening | M1, M2, M3, M4 | DONE (28/28 E2E tests pass, 22/22 adversarial pass, 0 errors tsc/lint/build, Gate: PASS) |

## Interface Contracts
### `lib/orderService.ts` ↔ `types/order.ts`
- `createOrder(data: CreateOrderInput): Order`
- `getAllOrders(): Order[]`
- `getOrderById(id: string): Order | undefined`

### `lib/whatsappQueueService.ts` ↔ `types/notification.ts`
- `enqueueWhatsAppMessage(payload: EnqueueWhatsAppInput): QueuedMessage`
- `getWhatsAppQueueState(): WhatsAppQueueState` (activeItem, countdown, queue, history, session)
- `onQueueUpdate(callback: (state: WhatsAppQueueState) => void): () => void`
- `triggerManualTestMessage(type: NotificationTemplateType): QueuedMessage`

### `lib/resendService.ts` ↔ `types/notification.ts`
- `sendBookingConfirmationEmail(appointment: Appointment): Promise<EmailDispatchResult>`
- `sendBookingReminderEmail(appointment: Appointment): Promise<EmailDispatchResult>`
- `sendOrderPlacedEmail(order: Order): Promise<EmailDispatchResult>`
- `renderEmailTemplate(type: EmailTemplateType, context: any): { subject: string; html: string }`
- `calculateBookingFinancials(priceList: number): BookingFinancials`
  - Returns: `{ priceList, discountOnline, priceOnline, depositPaid, balanceDue }`
  - Guarantee: `depositPaid + balanceDue === priceOnline`
