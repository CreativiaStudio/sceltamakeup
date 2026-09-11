## 2026-09-07T10:07:30Z

You are teamwork_preview_worker for Scelta Makeup FASE 3 M1 (Supabase SQL Schema).
Working directory: c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\worker_m1_schema

Read the authoritative user request at:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\ORIGINAL_REQUEST.md

Read the project scope and architecture at:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\orchestrator_1\PROJECT.md
c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_services_survey\survey_report.md

Exclusive write ownership:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql ONLY.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Create the complete, standalone, idempotent PostgreSQL schema file at:
c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql
Ready for 1-click execution in Supabase SQL editor.

Requirements:
1. Tables:
   - `products`: id (text primary key), slug (unique), name, brand, category, price, original_price, original_wholesale_price, rating, review_count, badge, badges (text[]), description, short_description, formula_benefits, how_to_use, inci, features (text[]), images (text[]), is_featured, tags (text[]), texture, coverage, finish, created_at, updated_at.
   - `variants`: id (text primary key), product_id (references products on delete cascade), name, sku (unique), ean, color_hex, image, in_stock, price, original_wholesale_price, created_at, updated_at.
   - `inventory`: id (uuid primary key), variant_id (unique references variants on delete cascade), product_id (references products on delete cascade), quantity_on_hand, safety_stock, location, updated_at.
   - `appointments`: id (text primary key), booking_code (unique), service_id, service_name, channel, operator_id, operator_name, duration_minutes, appointment_date (date), appointment_time (text), customer_name, customer_surname, customer_phone, customer_email, customer_notes, price_list, discount_online, price_online, deposit_paid, balance_due, status, payment_method_deposit, payment_method_balance, cassa_receipt_printed, cassa_receipt_number, created_at, completed_at, reminder_sent, reminder_sent_at.
   - `orders`: id (uuid primary key), order_number (unique), customer_name, customer_surname, customer_email, customer_phone, delivery_method, shipping_address (jsonb), items (jsonb), subtotal, shipping_cost, total, payment_method, payment_status, status, tracking_number, created_at, updated_at.
   - `blocked_slots`: id (uuid primary key), slot_date (date), slot_time (text), reason, created_at, unique constraint on (slot_date, slot_time).
   - `notification_logs`: id (uuid primary key), channel (text: whatsapp, email), recipient (text), recipient_name (text), template_type (text: booking_confirmation, booking_reminder_24h, order_placed, manual_test), payload (jsonb), scheduled_for (timestamptz), sent_at (timestamptz), status (text: pending, queued, processing, sent, failed), jitter_delay_seconds (integer: 20-45), attempts (integer default 0), error_message (text), message_preview (text), created_at (timestamptz default now()).
2. Functions & Triggers:
   - `set_updated_at()` trigger function applied to products, variants, inventory, appointments, orders.
3. Indexes:
   - appointments(appointment_date, appointment_time), appointments(booking_code), orders(order_number), blocked_slots(slot_date), notification_logs(status, scheduled_for), variants(product_id), variants(sku), products(slug).
4. Row Level Security (RLS):
   - ENABLE ROW LEVEL SECURITY on all tables.
   - Public read policies for active products, variants, blocked_slots.
   - Insert policies for appointments and orders.
   - Authenticated / service_role full CRUD policies on all tables.

Write handoff.md in your working directory and notify the orchestrator via send_message.
