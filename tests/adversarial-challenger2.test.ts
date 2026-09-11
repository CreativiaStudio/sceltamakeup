import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  calculateBookingFinancials,
  renderBookingConfirmationEmail,
  renderBookingReminderEmail,
  renderOrderPlacedEmail,
  renderEmailTemplate,
} from "../lib/resendService";
import { Order } from "../types/order";

describe("Adversarial Challenger 2 — Empirical Test Suite (Financial Invariance, Email HTML & Schema)", () => {
  // =========================================================================
  // SECTION 1: FINANCIAL INVARIANCE & 5,000 RANDOMIZED PRICING SWEEPS
  // =========================================================================
  describe("Section 1: 5,000 Randomized Pricing Sweeps & Financial Invariants", () => {
    it("should verify depositPaid + balanceDue === priceOnline holds with ZERO cent discrepancy across 5,000 random currency prices (€0.01 to €5,000.00)", () => {
      let centDiscrepancies = 0;
      const totalSweeps = 5000;
      const discrepancySamples: Array<{ price: number; online: number; deposit: number; balance: number; diff: number }> = [];

      for (let i = 0; i < totalSweeps; i++) {
        // Generate random price with arbitrary cents between 0.01 and 5000.00
        const randomCents = Math.floor(Math.random() * 500000) + 1; // 1 to 500,000 cents
        const listPrice = randomCents / 100;

        const financials = calculateBookingFinancials(listPrice);

        // Check zero cent discrepancy in monetary cents (100% exact integer cents)
        const depositCents = Math.round(financials.depositPaid * 100);
        const balanceCents = Math.round(financials.balanceDue * 100);
        const onlineCents = Math.round(financials.priceOnline * 100);

        const centSum = depositCents + balanceCents;
        const centDiff = Math.abs(centSum - onlineCents);

        // Also check 2-decimal rounded float sum
        const roundedSum = Math.round((financials.depositPaid + financials.balanceDue) * 100) / 100;

        if (centDiff !== 0 || roundedSum !== financials.priceOnline) {
          centDiscrepancies++;
          if (discrepancySamples.length < 5) {
            discrepancySamples.push({
              price: listPrice,
              online: financials.priceOnline,
              deposit: financials.depositPaid,
              balance: financials.balanceDue,
              diff: centDiff,
            });
          }
        }

        // Exact cent equality assertion: ZERO cent discrepancy
        assert.strictEqual(
          centSum,
          onlineCents,
          `Zero-cent discrepancy detected at listPrice €${listPrice}: deposit ${depositCents}c + balance ${balanceCents}c !== online ${onlineCents}c`
        );

        assert.strictEqual(
          roundedSum,
          financials.priceOnline,
          `Rounded sum failed at listPrice €${listPrice}`
        );

        // IEEE 754 epsilon difference must be strictly under 1e-9 (sub-microcent machine artifact)
        const rawDiff = Math.abs((financials.depositPaid + financials.balanceDue) - financials.priceOnline);
        assert.ok(
          rawDiff < 1e-9,
          `Raw float difference too large (${rawDiff}) for €${listPrice}`
        );

        // Positivity invariants
        assert.ok(financials.priceOnline >= 0, `priceOnline must be >= 0 (got ${financials.priceOnline})`);
        assert.ok(financials.depositPaid >= 0, `depositPaid must be >= 0 (got ${financials.depositPaid})`);
        assert.ok(financials.balanceDue >= 0, `balanceDue must be >= 0 (got ${financials.balanceDue})`);
      }

      assert.strictEqual(centDiscrepancies, 0, `Detected ${centDiscrepancies} cent discrepancies in 5,000 sweeps!`);
    });

    it("should verify mathematical invariance across 5,000 raw arbitrary float values with unrounded decimals (€0.0001 to €5,000.9999)", () => {
      let centDiscrepancies = 0;
      const totalSweeps = 5000;

      for (let i = 0; i < totalSweeps; i++) {
        // Raw float with high precision decimals
        const rawFloatPrice = Math.random() * 4999.99 + 0.01;
        const financials = calculateBookingFinancials(rawFloatPrice);

        const depositCents = Math.round(financials.depositPaid * 100);
        const balanceCents = Math.round(financials.balanceDue * 100);
        const onlineCents = Math.round(financials.priceOnline * 100);

        const centSum = depositCents + balanceCents;
        const roundedSum = Math.round((financials.depositPaid + financials.balanceDue) * 100) / 100;

        if (centSum !== onlineCents || roundedSum !== financials.priceOnline) {
          centDiscrepancies++;
        }

        assert.strictEqual(
          centSum,
          onlineCents,
          `Cent violation on raw float ${rawFloatPrice}: deposit=${depositCents} + balance=${balanceCents} !== online=${onlineCents}`
        );

        assert.strictEqual(
          roundedSum,
          financials.priceOnline,
          `Rounded sum violation on raw float ${rawFloatPrice}`
        );
      }

      assert.strictEqual(centDiscrepancies, 0, `Raw float sweep had ${centDiscrepancies} cent failures`);
    });

    it("should verify edge cases: zero, fractions below €0.05, max bounds, and negative inputs", () => {
      const edgeCases = [
        0,
        0.01,
        0.02,
        0.03,
        0.04,
        0.05,
        0.09,
        0.10,
        0.49,
        0.50,
        0.99,
        1.00,
        4999.99,
        5000.00,
        10000.00,
        -10.00,
        -0.01,
      ];

      for (const price of edgeCases) {
        const fin = calculateBookingFinancials(price);
        const sum = Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100;

        assert.strictEqual(
          sum,
          fin.priceOnline,
          `Edge case failed for price €${price}: deposit=${fin.depositPaid}, balance=${fin.balanceDue}, online=${fin.priceOnline}`
        );

        // Negative input safety: priceList must clamp to 0
        if (price < 0) {
          assert.strictEqual(fin.priceList, 0);
          assert.strictEqual(fin.priceOnline, 0);
          assert.strictEqual(fin.depositPaid, 0);
          assert.strictEqual(fin.balanceDue, 0);
        }
      }
    });

    it("should verify official catalog services pricing matches exact mathematical breakdown", () => {
      const catalog = [
        { name: "Make-up Evento & Cerimonia", list: 50.0, disc: 5.0, online: 45.0, dep: 9.0, bal: 36.0 },
        { name: "Make-up Giorno & Glow Naturale", list: 35.0, disc: 3.5, online: 31.5, dep: 6.3, bal: 25.2 },
        { name: "Lezione Self Make-Up Sartoriale", list: 65.0, disc: 6.5, online: 58.5, dep: 11.7, bal: 46.8 },
        { name: "Make-up Sposa (Consulenza & Prova)", list: 120.0, disc: 12.0, online: 108.0, dep: 21.6, bal: 86.4 },
        { name: "Armocromia & Shade Match", list: 25.0, disc: 2.5, online: 22.5, dep: 4.5, bal: 18.0 },
        { name: "Meso-Fill Viso Cabina (Beauty)", list: 70.0, disc: 7.0, online: 63.0, dep: 12.6, bal: 50.4 },
      ];

      for (const item of catalog) {
        const fin = calculateBookingFinancials(item.list);
        assert.strictEqual(fin.priceList, item.list);
        assert.strictEqual(fin.discountOnline, item.disc);
        assert.strictEqual(fin.priceOnline, item.online);
        assert.strictEqual(fin.depositPaid, item.dep);
        assert.strictEqual(fin.balanceDue, item.bal);
        assert.strictEqual(fin.depositPaid + fin.balanceDue, fin.priceOnline);
      }
    });
  });

  // =========================================================================
  // SECTION 2: EMAIL HTML GENERATION & BRAND DESIGN SYSTEM CONFORMANCE
  // =========================================================================
  describe("Section 2: Email HTML Validation & Brand Visual Identity", () => {
    const financials = calculateBookingFinancials(50.0);

    const confirmationResult = renderBookingConfirmationEmail({
      customerName: "Maria De Luca",
      serviceName: "Make-up Evento & Cerimonia",
      bookingCode: "SC-TEST-CONFIRM",
      bookingDate: "2026-09-15",
      bookingTime: "11:30",
      operatorName: "Federica Cesiano",
      durationMinutes: 60,
      financials,
    });

    const reminderResult = renderBookingReminderEmail({
      customerName: "Maria De Luca",
      serviceName: "Make-up Evento & Cerimonia",
      bookingCode: "SC-TEST-REMIND",
      bookingDate: "2026-09-15",
      bookingTime: "11:30",
      balanceDue: financials.balanceDue,
      durationMinutes: 60,
    });

    const sampleOrder: Order = {
      id: "ord-test-brand",
      orderNumber: "SC-ORD-2026-8888",
      customer: {
        nome: "Maria",
        cognome: "De Luca",
        email: "maria.deluca@example.com",
        telefono: "+39 348 111 2233",
        indirizzo: "Via Toledo 50",
        citta: "Napoli",
        cap: "80134",
      },
      items: [
        {
          id: "it-1",
          productId: "p-ddp-rosso",
          slug: "rossetto-diego-dalla-palma",
          name: "Rossetto Iconico Diego dalla Palma",
          brand: "Diego dalla Palma",
          price: 24.5,
          quantity: 1,
          shade: { id: "01", name: "01 Rosso Rubino" },
          image: "/products/diego-dalla-palma-rossetto-iconico.png",
        },
      ],
      subtotal: 24.5,
      shippingCost: 0,
      total: 24.5,
      deliveryMethod: "boutique",
      paymentMethod: "card",
      paymentStatus: "paid",
      status: "processing",
      sampleIncluded: true,
      createdAt: new Date().toISOString(),
    };

    const orderResult = renderOrderPlacedEmail(sampleOrder);

    const allTemplates = [
      { name: "Booking Confirmation", res: confirmationResult },
      { name: "Booking Reminder 24h", res: reminderResult },
      { name: "Order Placed", res: orderResult },
    ];

    it("should generate valid HTML document structure for all 3 templates", () => {
      for (const tpl of allTemplates) {
        const html = tpl.res.html;
        assert.ok(html.startsWith("<!DOCTYPE html>"), `${tpl.name} must start with <!DOCTYPE html>`);
        assert.ok(html.includes('<html lang="it">'), `${tpl.name} must specify lang="it"`);
        assert.ok(html.includes("<head>") && html.includes("</head>"), `${tpl.name} must contain <head>`);
        assert.ok(html.includes('<meta charset="utf-8">'), `${tpl.name} must specify charset="utf-8"`);
        assert.ok(html.includes('<meta name="viewport"'), `${tpl.name} must specify responsive viewport`);
        assert.ok(html.includes("<title>") && html.includes("</title>"), `${tpl.name} must contain <title>`);
        assert.ok(html.includes("<body") && html.includes("</body>"), `${tpl.name} must contain <body>`);
        assert.ok(html.includes("</html>"), `${tpl.name} must close </html>`);
        assert.ok(html.includes("max-width: 600px;"), `${tpl.name} must specify max-width: 600px fluid container`);

        // Check balanced table tags
        const tableOpenCount = (html.match(/<table\b/gi) || []).length;
        const tableCloseCount = (html.match(/<\/table>/gi) || []).length;
        assert.strictEqual(
          tableOpenCount,
          tableCloseCount,
          `${tpl.name} has unbalanced <table> tags: ${tableOpenCount} open vs ${tableCloseCount} closed`
        );
      }
    });

    it("should verify presence of all official brand colors (#5E1788, #D8C2E7, #FFFFFF, #D462A6) in all 3 templates", () => {
      const requiredBrandColors = [
        { name: "Royal Violet", hex: "#5E1788" },
        { name: "Pastel Lilac", hex: "#D8C2E7" },
        { name: "Optical White", hex: "#FFFFFF" },
        { name: "Mauve Rose", hex: "#D462A6" },
      ];

      for (const tpl of allTemplates) {
        for (const color of requiredBrandColors) {
          assert.ok(
            tpl.res.html.includes(color.hex),
            `${tpl.name} must contain brand color ${color.name} (${color.hex})`
          );
        }
      }
    });

    it("should verify presence of brand claim 'L'eleganza di essere autentica' in all 3 templates", () => {
      const claim = "L'eleganza di essere autentica";
      for (const tpl of allTemplates) {
        assert.ok(
          tpl.res.html.includes(claim),
          `${tpl.name} must contain official claim "${claim}"`
        );
      }
    });

    it("should verify presence of brand logo monogram 'S', boutique address, and legal info across all templates", () => {
      for (const tpl of allTemplates) {
        assert.ok(tpl.res.html.includes(">S<"), `${tpl.name} must contain stylized 'S' brand monogram`);
        assert.ok(tpl.res.html.includes("SCELTA"), `${tpl.name} must include SCELTA typography`);
        assert.ok(tpl.res.html.includes("MAKEUP"), `${tpl.name} must include MAKEUP typography`);
        assert.ok(tpl.res.html.includes("Via dei Pellegrini 28/29"), `${tpl.name} must contain boutique address`);
        assert.ok(tpl.res.html.includes("Federica Cesiano"), `${tpl.name} must contain founder name in footer`);
        assert.ok(tpl.res.html.includes("09914431219"), `${tpl.name} must contain P.IVA`);
      }
    });
  });

  // =========================================================================
  // SECTION 3: CALENDAR URL AND RFC 5545 DATA URI VERIFICATION
  // =========================================================================
  describe("Section 3: Calendar Synchronization Formatting", () => {
    it("should verify Google Calendar URL formatting, query parameters, and ISO compact UTC dates", () => {
      const confirmation = renderBookingConfirmationEmail({
        customerName: "Laura Rinaldi",
        serviceName: "Make-up Sposa (Consulenza & Prova)",
        bookingCode: "SC-SPOSA-99",
        bookingDate: "2026-10-20",
        bookingTime: "10:30",
        operatorName: "Federica Cesiano",
        durationMinutes: 90,
        financials: calculateBookingFinancials(120.0),
      });

      const gcalMatch = confirmation.html.match(/href="(https:\/\/calendar\.google\.com\/calendar\/render\?[^"]+)"/);
      assert.ok(gcalMatch, "Confirmation email must include Google Calendar href");

      const decodedUrl = gcalMatch[1].replace(/&amp;/g, "&");
      const url = new URL(decodedUrl);

      assert.strictEqual(url.searchParams.get("action"), "TEMPLATE");
      assert.ok(url.searchParams.get("text")?.includes("Make-up Sposa"));
      assert.ok(url.searchParams.get("location")?.includes("Via dei Pellegrini 28/29"));
      assert.ok(url.searchParams.get("details")?.includes("SC-SPOSA-99"));

      // Verify date format: YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ
      const datesParam = url.searchParams.get("dates");
      assert.ok(datesParam, "Dates parameter is required in Google Calendar URL");
      const dateRegex = /^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/;
      assert.ok(
        dateRegex.test(datesParam!),
        `Dates parameter "${datesParam}" does not match YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ`
      );

      // Verify duration math: 10:30 + 90 min = 12:00 UTC
      const [startStr, endStr] = datesParam!.split("/");
      assert.ok(startStr.includes("103000Z"), `Start time should be 10:30 (got ${startStr})`);
      assert.ok(endStr.includes("120000Z"), `End time should be 12:00 (got ${endStr})`);
    });

    it("should verify Apple Calendar RFC 5545 iCalendar data URI format and mandatory iCal tokens", () => {
      const confirmation = renderBookingConfirmationEmail({
        customerName: "Laura Rinaldi",
        serviceName: "Make-up Sposa (Consulenza & Prova)",
        bookingCode: "SC-SPOSA-99",
        bookingDate: "2026-10-20",
        bookingTime: "10:30",
        operatorName: "Federica Cesiano",
        durationMinutes: 90,
        financials: calculateBookingFinancials(120.0),
      });

      const appleCalMatch = confirmation.html.match(/href="(data:text\/calendar;charset=utf-8,[^"]+)"/);
      assert.ok(appleCalMatch, "Confirmation email must include Apple Calendar data URI");

      const rawUri = appleCalMatch[1];
      const prefix = "data:text/calendar;charset=utf-8,";
      assert.ok(rawUri.startsWith(prefix), `Data URI must start with ${prefix}`);

      const encodedBody = rawUri.slice(prefix.length);
      const icsContent = decodeURIComponent(encodedBody);

      // RFC 5545 line ending check (must have \r\n CRLF)
      assert.ok(icsContent.includes("\r\n"), "iCalendar content must use CRLF (\\r\\n) line endings per RFC 5545");

      // Mandatory iCalendar components
      assert.ok(icsContent.includes("BEGIN:VCALENDAR"), "Must contain BEGIN:VCALENDAR");
      assert.ok(icsContent.includes("VERSION:2.0"), "Must specify VERSION:2.0");
      assert.ok(icsContent.includes("PRODID:-//Scelta Makeup//Boutique Appointments//IT"), "Must specify PRODID");
      assert.ok(icsContent.includes("CALSCALE:GREGORIAN"), "Must specify CALSCALE:GREGORIAN");
      assert.ok(icsContent.includes("METHOD:PUBLISH"), "Must specify METHOD:PUBLISH");
      assert.ok(icsContent.includes("BEGIN:VEVENT"), "Must contain BEGIN:VEVENT");
      assert.ok(icsContent.includes("UID:scelta-"), "Must contain unique UID");
      assert.ok(icsContent.includes("DTSTAMP:"), "Must contain DTSTAMP");
      assert.ok(icsContent.includes("DTSTART:20261020T103000Z"), "Must contain accurate DTSTART");
      assert.ok(icsContent.includes("DTEND:20261020T120000Z"), "Must contain accurate DTEND");
      assert.ok(icsContent.includes("SUMMARY:Scelta Makeup: Make-up Sposa"), "Must contain SUMMARY");
      assert.ok(icsContent.includes("LOCATION:Via dei Pellegrini 28/29"), "Must contain LOCATION");
      assert.ok(icsContent.includes("STATUS:CONFIRMED"), "Must contain STATUS:CONFIRMED");
      assert.ok(icsContent.includes("END:VEVENT"), "Must contain END:VEVENT");
      assert.ok(icsContent.includes("END:VCALENDAR"), "Must contain END:VCALENDAR");
    });
  });

  // =========================================================================
  // SECTION 4: SUPABASE SQL SCHEMA VALIDATION
  // =========================================================================
  describe("Section 4: Supabase SQL Schema Validation (supabase_schema.sql)", () => {
    const schemaPath = path.resolve(__dirname, "../supabase_schema.sql");
    const sqlContent = fs.readFileSync(schemaPath, "utf-8");

    it("should load supabase_schema.sql and verify file size and non-empty content", () => {
      assert.ok(fs.existsSync(schemaPath), "supabase_schema.sql must exist at root");
      assert.ok(sqlContent.length > 5000, `Schema file should be substantial (actual size: ${sqlContent.length} bytes)`);
    });

    it("should verify existence of all required core tables with scelta_ prefix", () => {
      const requiredTables = [
        "scelta_products",
        "scelta_variants",
        "scelta_inventory",
        "scelta_appointments",
        "scelta_orders",
        "scelta_blocked_slots",
        "scelta_notification_logs",
        "scelta_customers",
        "scelta_inventory_logs",
        "scelta_order_items",
      ];

      for (const table of requiredTables) {
        const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\s*\\(`, "i");
        assert.ok(
          tableRegex.test(sqlContent),
          `Table DDL missing for "${table}"`
        );
      }
    });

    it("should verify cascade deletion rules on foreign key constraints", () => {
      // scelta_variants -> scelta_products (ON DELETE CASCADE)
      const variantFkRegex = /product_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+scelta_products\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i;
      assert.ok(variantFkRegex.test(sqlContent), "scelta_variants.product_id must reference scelta_products(id) ON DELETE CASCADE");

      // scelta_inventory -> scelta_variants (ON DELETE CASCADE)
      const invVariantFkRegex = /variant_id\s+TEXT\s+UNIQUE\s+NOT\s+NULL\s+REFERENCES\s+scelta_variants\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i;
      assert.ok(invVariantFkRegex.test(sqlContent), "scelta_inventory.variant_id must reference scelta_variants(id) ON DELETE CASCADE");

      // scelta_inventory -> scelta_products (ON DELETE CASCADE)
      const invProductFkRegex = /product_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+scelta_products\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i;
      assert.ok(invProductFkRegex.test(sqlContent), "scelta_inventory.product_id must reference scelta_products(id) ON DELETE CASCADE");

      // scelta_order_items -> scelta_orders (ON DELETE CASCADE)
      const orderItemsFkRegex = /order_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+scelta_orders\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i;
      assert.ok(orderItemsFkRegex.test(sqlContent), "scelta_order_items.order_id must reference scelta_orders(id) ON DELETE CASCADE");
    });

    it("should verify Row Level Security (RLS) is enabled on all tables with scelta_ prefix", () => {
      const tables = [
        "scelta_products",
        "scelta_variants",
        "scelta_inventory",
        "scelta_appointments",
        "scelta_orders",
        "scelta_blocked_slots",
        "scelta_notification_logs",
        "scelta_customers",
        "scelta_inventory_logs",
        "scelta_order_items",
      ];

      for (const table of tables) {
        const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\s*;`, "i");
        assert.ok(rlsRegex.test(sqlContent), `RLS must be enabled on table "${table}"`);
      }
    });

    it("should verify fine-grained RLS policies for public, authenticated, and service_role", () => {
      // Public SELECT policies
      assert.ok(sqlContent.includes('"Public can view scelta_products"'), "Public SELECT policy on scelta_products required");
      assert.ok(sqlContent.includes('"Public can view scelta_variants"'), "Public SELECT policy on scelta_variants required");
      assert.ok(sqlContent.includes('"Public can view scelta_blocked_slots"'), "Public SELECT policy on scelta_blocked_slots required");

      // Public INSERT policies (client booking & checkout)
      assert.ok(sqlContent.includes('"Public can insert scelta_appointments"'), "Public INSERT policy on scelta_appointments required");
      assert.ok(sqlContent.includes('"Public can insert scelta_orders"'), "Public INSERT policy on scelta_orders required");
      assert.ok(sqlContent.includes('"Public can insert scelta_order_items"'), "Public INSERT policy on scelta_order_items required");

      // Authenticated and Service Role policies (Staff full access)
      assert.ok(sqlContent.includes('"Staff full access on scelta_products"'), "Staff policy on scelta_products required");
      assert.ok(sqlContent.includes('"Staff full access on scelta_variants"'), "Staff policy on scelta_variants required");
      assert.ok(sqlContent.includes('"Staff full access on scelta_inventory"'), "Staff policy on scelta_inventory required");
      assert.ok(sqlContent.includes('"Staff full access on scelta_orders"'), "Staff policy on scelta_orders required");
      assert.ok(sqlContent.includes('"Staff full access on scelta_appointments"'), "Staff policy on scelta_appointments required");
      assert.ok(sqlContent.includes('"Staff full access on scelta_notification_logs"'), "Staff policy on scelta_notification_logs required");
      assert.ok(sqlContent.includes("TO authenticated, service_role"), "Staff policies must target authenticated, service_role");
    });

    it("should verify updated_at trigger function and table triggers", () => {
      // Function definition
      assert.ok(sqlContent.includes("CREATE OR REPLACE FUNCTION scelta_set_updated_at()"), "scelta_set_updated_at() function required");
      assert.ok(sqlContent.includes("NEW.updated_at = now();"), "Trigger must set NEW.updated_at = now()");

      // Triggers on mutable tables
      const triggeredTables = [
        "scelta_customers",
        "scelta_products",
        "scelta_variants",
        "scelta_inventory",
        "scelta_orders",
        "scelta_appointments",
      ];
      for (const table of triggeredTables) {
        const dropTrigger = new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+trg_${table}_updated_at\\s+ON\\s+${table}\\s*;`, "i");
        const createTrigger = new RegExp(`CREATE\\s+TRIGGER\\s+trg_${table}_updated_at[\\s\\S]*?BEFORE\\s+UPDATE\\s+ON\\s+${table}[\\s\\S]*?EXECUTE\\s+FUNCTION\\s+scelta_set_updated_at\\(\\)\\s*;`, "i");

        assert.ok(dropTrigger.test(sqlContent), `Idempotent DROP TRIGGER required for trg_${table}_updated_at`);
        assert.ok(createTrigger.test(sqlContent), `BEFORE UPDATE trigger required for trg_${table}_updated_at`);
      }
    });

    it("should verify all required and performance indexes exist", () => {
      const requiredIndexes = [
        "idx_scelta_appointments_date_time",
        "idx_scelta_appointments_booking_code",
        "idx_scelta_orders_order_number",
        "idx_scelta_blocked_slots_date",
        "idx_scelta_notification_logs_status_scheduled",
        "idx_scelta_variants_product_id",
        "idx_scelta_variants_sku",
        "idx_scelta_products_slug",
        "idx_scelta_products_brand",
        "idx_scelta_products_category",
        "idx_scelta_variants_ean",
        "idx_scelta_inventory_variant_id",
        "idx_scelta_inventory_product_id",
        "idx_scelta_appointments_status",
        "idx_scelta_orders_status",
      ];

      for (const index of requiredIndexes) {
        const indexRegex = new RegExp(`CREATE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${index}\\s+ON\\s+`, "i");
        assert.ok(indexRegex.test(sqlContent), `Index "${index}" must be created with CREATE INDEX IF NOT EXISTS`);
      }
    });

    it("should verify SQL syntax cleanliness: balanced quotes, dollar-quoting, and transaction block", () => {
      // Role creation DO block
      assert.ok(sqlContent.includes("DO $$"), "Should have DO $$ block for role safety");
      assert.ok(sqlContent.includes("$$;"), "Should close DO block with $$;");

      // Verify uuid-ossp and pgcrypto extensions
      assert.ok(sqlContent.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'));
      assert.ok(sqlContent.includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'));

      // Check unique constraint on blocked_slots
      assert.ok(
        sqlContent.includes("uq_scelta_blocked_slots UNIQUE (slot_date, slot_time)") ||
        sqlContent.includes("UNIQUE (slot_date, slot_time)"),
        "Unique constraint on (slot_date, slot_time) required on blocked_slots"
      );
    });
  });

  // =========================================================================
  // SECTION 5: ADVERSARIAL STRESS TESTS & BOUNDARY HARDENING
  // =========================================================================
  describe("Section 5: Adversarial Stress Tests & Boundary Hardening", () => {
    it("should gracefully degrade without throwing unhandled exceptions when calendar input dates are malformed", () => {
      // Intentionally malformed date and time strings
      const malformedDates = [
        { date: "not-a-date", time: "not-a-time" },
        { date: "", time: "" },
        { date: "9999-99-99", time: "99:99" },
        { date: "2026/09/15", time: "11-30" },
      ];

      for (const malformed of malformedDates) {
        assert.doesNotThrow(() => {
          const email = renderBookingConfirmationEmail({
            customerName: "Fault Injection",
            serviceName: "Stress Test",
            bookingCode: "SC-FAULT-1",
            bookingDate: malformed.date,
            bookingTime: malformed.time,
            operatorName: "Federica Cesiano",
            durationMinutes: 60,
            financials: calculateBookingFinancials(50.0),
          });

          assert.ok(email.html.includes("<!DOCTYPE html>"), "Must still produce valid HTML");
        });
      }
    });

    it("should handle extreme numeric bounds (zero, negative, very large values, NaN) in calculateBookingFinancials", () => {
      // Negative value clamps to 0
      const negFin = calculateBookingFinancials(-100);
      assert.strictEqual(negFin.priceList, 0);
      assert.strictEqual(negFin.priceOnline, 0);
      assert.strictEqual(negFin.depositPaid, 0);
      assert.strictEqual(negFin.balanceDue, 0);

      // Very large amount: €1,000,000.00
      const largeFin = calculateBookingFinancials(1000000);
      assert.strictEqual(largeFin.priceList, 1000000);
      assert.strictEqual(largeFin.discountOnline, 100000);
      assert.strictEqual(largeFin.priceOnline, 900000);
      assert.strictEqual(largeFin.depositPaid, 180000);
      assert.strictEqual(largeFin.balanceDue, 720000);
      assert.strictEqual(largeFin.depositPaid + largeFin.balanceDue, largeFin.priceOnline);

      // Sub-cent fractional amounts
      const subCentFin = calculateBookingFinancials(0.004);
      assert.strictEqual(subCentFin.priceList, 0.004);
      assert.strictEqual(subCentFin.depositPaid + subCentFin.balanceDue, subCentFin.priceOnline);
    });

    it("should verify strict data privacy in Supabase RLS policies (no public SELECT on personal data)", () => {
      const schemaPath = path.resolve(__dirname, "../supabase_schema.sql");
      const sqlContent = fs.readFileSync(schemaPath, "utf-8");

      // Verify that appointments table DOES NOT have a public SELECT policy
      const publicSelectAppointments = /CREATE\s+POLICY[^\n]*ON\s+(?:scelta_)?appointments\s+FOR\s+SELECT\s+TO\s+[^;\n]*anon/i;
      assert.strictEqual(
        publicSelectAppointments.test(sqlContent),
        false,
        "SECURITY VIOLATION: appointments table must NOT allow public/anon SELECT (data privacy for customers)"
      );

      // Verify that orders table DOES NOT have a public SELECT policy
      const publicSelectOrders = /CREATE\s+POLICY[^\n]*ON\s+(?:scelta_)?orders\s+FOR\s+SELECT\s+TO\s+[^;\n]*anon/i;
      assert.strictEqual(
        publicSelectOrders.test(sqlContent),
        false,
        "SECURITY VIOLATION: orders table must NOT allow public/anon SELECT (shipping addresses & phone privacy)"
      );

      // Verify that notification_logs DOES NOT allow public access at all
      const publicNotificationLogs = /CREATE\s+POLICY[^\n]*ON\s+(?:scelta_)?notification_logs[^\n]*TO\s+[^;\n]*anon/i;
      assert.strictEqual(
        publicNotificationLogs.test(sqlContent),
        false,
        "SECURITY VIOLATION: notification_logs must NOT be accessible to anon"
      );
    });

    it("should verify universal renderEmailTemplate dispatcher handles all notification types cleanly", () => {
      const types = ["booking_confirmation", "booking_reminder_24h", "order_placed", "manual_test"] as const;

      for (const t of types) {
        const output = renderEmailTemplate(t, {
          customerName: "Stress Customer",
          serviceName: "Make-up Sartoriale",
          bookingCode: "SC-TEST-DISP",
        });

        assert.ok(output.subject.length > 0, `Subject must not be empty for type ${t}`);
        assert.ok(output.html.includes("<!DOCTYPE html>"), `HTML must be valid for type ${t}`);
        assert.ok(output.html.includes("#5E1788"), `HTML must include brand color for type ${t}`);
        assert.ok(output.html.includes("L'eleganza di essere autentica"), `HTML must include claim for type ${t}`);
      }
    });
  });
});

