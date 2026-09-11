## 2026-09-07T10:07:30Z
You are teamwork_preview_worker for Scelta Makeup FASE 3 M2 & M3 (WhatsApp Queue Engine & Luxury Resend Email Module).
Working directory: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m2_m3_engine

Read the authoritative user request at:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md

Read the project scope and architecture at:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\orchestrator_1\PROJECT.md
c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\spec_miner_survey\survey_report.md
c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_services_survey\survey_report.md
c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_codebase_survey\survey_report.md

Exclusive write ownership:
- types/order.ts
- types/notification.ts
- lib/orderService.ts
- lib/whatsappQueueService.ts
- lib/resendService.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement the core engines for WhatsApp anti-ban human pacing and Luxury Resend transactional emails:

1. `types/order.ts`:
   - Interfaces: `OrderItem`, `DeliveryMethod` ('shipping' | 'boutique'), `PaymentMethod` ('card' | 'klarna' | 'boutique'), `OrderStatus`, `OrderCustomer`, `Order`.
2. `types/notification.ts`:
   - Interfaces: `NotificationChannel` ('whatsapp' | 'email'), `NotificationTemplateType` ('booking_confirmation' | 'booking_reminder_24h' | 'order_placed' | 'manual_test'), `NotificationStatus` ('queued' | 'processing' | 'sent' | 'failed'), `QueuedWhatsAppMessage`, `WhatsAppSessionStatus` ('open' | 'connecting' | 'close'), `WhatsAppQueueState`, `EmailDispatchResult`, `BookingFinancials`.
3. `lib/orderService.ts`:
   - Order management with localStorage persistence (`scelta_makeup_orders_v1`) and seed demo orders.
   - Functions: `createOrder`, `getAllOrders`, `getOrderById`, `updateOrderStatus`.
4. `lib/whatsappQueueService.ts`:
   - Anti-ban queue worker:
     - Strictly enforce human pacing jitter between 20 and 45 seconds (`Math.floor(Math.random() * (45 - 20 + 1)) + 20`) between consecutive sends.
     - Sequential processing lock (`isProcessing`).
     - Dynamic variation engine: rotate greetings ("Gentile {nome}", "Cara {nome}", "Buongiorno {nome}", "Ciao {nome}"), sign-offs, unique booking code, and pre-treatment tips (ceremony, glow, armocromia, etc.) so no two messages produce the same hash/checksum.
     - 3 templates with copy from `survey_report.md`:
       1. Booking confirmation: 20% deposit, 80% balance due in boutique, boutique address (Via dei Pellegrini 28/29 Napoli), pre-treatment tip.
       2. 24h Reminder: vademecum (clean skin, punctuality), free cancellation <24h, Google Maps directions link.
       3. Order confirmation: items with shades/quantities, courier 24/48h tracking vs. boutique pickup, 2 luxury samples callout.
     - Evolution API client with zero-config realistic mock QR session (generates valid QR SVG / session state `open` / `close` / `connecting`, realistic simulated send).
     - State listeners for UI reactivity (countdown in seconds, active item, queue, history).
5. `lib/resendService.ts`:
   - Web fetch connector to `https://api.resend.com/emails` (no external resend npm package needed).
   - Palette: Royal Violet `#5E1788`, Vivid Orchid `#7A3293`, Pastel Lilac `#D8C2E7`, Mauve Rose `#D462A6`, Charcoal Deep `#1F1B24`, Optical White `#FFFFFF`.
   - Header with vector logo and claim "L'eleganza di essere autentica".
   - 3 responsive HTML templates:
     1. Booking Confirmation: transparent financial table (List Price, -10% Online, 20% Deposit, 80% Store Balance) + Google Calendar link + Apple Calendar (.ics data URI).
     2. Booking 24h Reminder: vademecum, disdetta link, Google Maps link.
     3. Order Placed: product cards, shades, free samples callout, courier tracking vs. store pickup.
   - Financial calculation function: `calculateBookingFinancials(priceList: number): BookingFinancials` ensuring `depositPaid + balanceDue === priceOnline` to the exact cent.
   - Realistic demo/simulation mode: if `RESEND_API_KEY` is not set or equals 'demo'/'mock', records simulated dispatch and saves HTML for live preview without errors.

Verify your implementation with `npx tsc --noEmit` and `npm run lint`.
Write handoff.md in your working directory and notify the orchestrator via send_message.
