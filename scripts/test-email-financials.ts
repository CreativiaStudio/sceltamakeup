import assert from "node:assert";
import {
  calculateBookingFinancials,
  renderBookingConfirmationEmail,
  renderBookingReminderEmail,
  renderOrderPlacedEmail,
  renderEmailTemplate,
  sendBookingConfirmationEmail,
  getDispatchedEmailsLog,
  clearDispatchedEmailsLog,
} from "../lib/resendService";
import { Appointment } from "../types/booking";
import { Order } from "../types/order";

console.log("\n========================================================");
console.log("🌸 SCELTA MAKEUP — E2E TEST: RESEND EMAILS & FINANCIALS");
console.log("========================================================\n");

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          passedTests++;
          console.log(`  ✓ ${name}`);
        })
        .catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    ${err instanceof Error ? err.message : String(err)}`);
          throw err;
        });
    } else {
      passedTests++;
      console.log(`  ✓ ${name}`);
    }
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function runAll() {
  clearDispatchedEmailsLog();

  console.log("--- TIER 1: HTML GENERATION TEST FOR ALL 3 TEMPLATES ---");

  test("T1.1: Template 1 - Booking Confirmation HTML generation & financial rows", () => {
    const financials = calculateBookingFinancials(50.0);
    const { subject, html } = renderBookingConfirmationEmail({
      customerName: "Chiara Rossi",
      serviceName: "Make-up Evento & Cerimonia",
      bookingCode: "SC-CONF-1234",
      bookingDate: "2026-09-25",
      bookingTime: "14:30",
      operatorName: "Federica Cesiano",
      durationMinutes: 60,
      financials,
    });

    assert.ok(subject.includes("Conferma Prenotazione"));
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("max-width: 600px;"));
    assert.ok(html.includes("Chiara Rossi"));
    assert.ok(html.includes("€50.00"));
    assert.ok(html.includes("-€5.00"));
    assert.ok(html.includes("€9.00"));
    assert.ok(html.includes("€36.00"));
  });

  test("T1.2: Template 2 - Booking 24h Reminder HTML with vademecum & disdetta", () => {
    const { subject, html } = renderBookingReminderEmail({
      customerName: "Elena Bianchi",
      serviceName: "Make-up Sposa",
      bookingCode: "SC-REMIND-5678",
      bookingDate: "Domani 12 Ottobre",
      bookingTime: "10:00",
      balanceDue: 86.4,
      durationMinutes: 90,
    });

    assert.ok(subject.includes("Promemoria"));
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("Elena Bianchi"));
    assert.ok(html.includes("Vademecum"));
    assert.ok(html.includes("Pelle Detersa") || html.includes("viso ben deterso"));
    assert.ok(html.includes("24 ore prima"));
    assert.ok(html.includes("maps.google.com"));
  });

  test("T1.3: Template 3 - Order Placed HTML for Courier & Boutique Pickup", () => {
    const courierOrder: Order = {
      id: "ord-1",
      orderNumber: "SC-ORD-0001",
      customer: {
        nome: "Giulia",
        cognome: "Moretti",
        email: "giulia@example.com",
        telefono: "+39 349 111 2222",
        indirizzo: "Via Partenope 10",
        citta: "Napoli",
        cap: "80121",
      },
      items: [
        {
          id: "it-1",
          productId: "p1",
          slug: "s1",
          name: "Rossetto Iconico Diego dalla Palma",
          brand: "Diego dalla Palma",
          price: 24.5,
          quantity: 2,
          shade: { id: "01", name: "01 Rosso Rubino" },
          image: "/products/diego-dalla-palma-rossetto-iconico.png",
        },
      ],
      subtotal: 49.0,
      shippingCost: 4.9,
      total: 53.9,
      deliveryMethod: "shipping",
      paymentMethod: "card",
      paymentStatus: "paid",
      status: "processing",
      sampleIncluded: true,
      createdAt: "2026-09-07T10:00:00Z",
    };

    const courier = renderOrderPlacedEmail(courierOrder);
    assert.ok(courier.html.includes("Corriere Espresso"));
    assert.ok(courier.html.includes("Via Partenope 10"));
    assert.ok(courier.html.includes("€53.90"));

    const boutique = renderOrderPlacedEmail({
      ...courierOrder,
      id: "ord-2",
      orderNumber: "SC-ORD-0002",
      deliveryMethod: "boutique",
      shippingCost: 0,
      total: 49.0,
    });
    assert.ok(boutique.html.includes("Ritiro Gratuito in Boutique"));
    assert.ok(boutique.html.includes("Via dei Pellegrini 28/29"));
    assert.ok(boutique.html.includes("Gratuita"));
  });

  test("T1.4: Universal renderEmailTemplate dispatcher handles all notification types", () => {
    const res = renderEmailTemplate("booking_confirmation", {
      customerName: "Test Dispatch",
      priceList: 70.0,
    });
    assert.ok(res.subject.includes("Conferma Prenotazione"));
    assert.ok(res.html.includes("Test Dispatch"));
    assert.ok(res.html.includes("€70.00"));
  });

  console.log("\n--- TIER 2: VISUAL IDENTITY & BRAND STYLING ---");

  test("T2.1: Brand palette official HEX codes (#5E1788, #D8C2E7, #FFFFFF, #D462A6, #7A3293)", () => {
    const confirmation = renderBookingConfirmationEmail({
      customerName: "Brand Test",
      serviceName: "Make-up Evento & Cerimonia",
      bookingCode: "SC-B1",
      bookingDate: "Oggi",
      bookingTime: "13:30",
      operatorName: "Federica Cesiano",
      financials: calculateBookingFinancials(50.0),
    });

    assert.ok(confirmation.html.includes("#5E1788"), "Must contain Royal Violet #5E1788");
    assert.ok(confirmation.html.includes("#D8C2E7"), "Must contain Pastel Lilac #D8C2E7");
    assert.ok(confirmation.html.includes("#FFFFFF"), "Must contain Optical White #FFFFFF");
    assert.ok(confirmation.html.includes("#D462A6"), "Must contain Mauve Rose #D462A6");
    assert.ok(confirmation.html.includes("#7A3293"), "Must contain Vivid Orchid #7A3293");
  });

  test("T2.2: Official brand claim 'L'eleganza di essere autentica' rendered in templates", () => {
    const email = renderBookingConfirmationEmail({
      customerName: "Claim Test",
      serviceName: "Make-up",
      bookingCode: "SC-C1",
      bookingDate: "Oggi",
      bookingTime: "13:30",
      operatorName: "Federica Cesiano",
      financials: calculateBookingFinancials(50.0),
    });
    assert.ok(email.html.includes("L'eleganza di essere autentica"));
  });

  test("T2.3: Vector logo monogram 'S', SCELTA MAKEUP header, and official legal footer", () => {
    const email = renderBookingConfirmationEmail({
      customerName: "Legal Test",
      serviceName: "Make-up",
      bookingCode: "SC-L1",
      bookingDate: "Oggi",
      bookingTime: "13:30",
      operatorName: "Federica Cesiano",
      financials: calculateBookingFinancials(50.0),
    });
    assert.ok(email.html.includes(">S<"));
    assert.ok(email.html.includes("SCELTA"));
    assert.ok(email.html.includes("Federica Cesiano"));
    assert.ok(email.html.includes("09914431219"));
    assert.ok(email.html.includes("Via dei Pellegrini 28/29"));
  });

  console.log("\n--- TIER 3: RIGOROUS FINANCIAL INVARIANT VERIFICATION ---");

  test("T3.1: Financial invariance on all 6 official catalog services (Zero cent delta)", () => {
    const catalog = [
      { name: "Make-up Evento & Cerimonia", price: 50.0, disc: 5.0, onl: 45.0, dep: 9.0, bal: 36.0 },
      { name: "Make-up Giorno & Glow Naturale", price: 35.0, disc: 3.5, onl: 31.5, dep: 6.3, bal: 25.2 },
      { name: "Lezione Self Make-Up Sartoriale", price: 65.0, disc: 6.5, onl: 58.5, dep: 11.7, bal: 46.8 },
      { name: "Make-up Sposa", price: 120.0, disc: 12.0, onl: 108.0, dep: 21.6, bal: 86.4 },
      { name: "Armocromia & Shade Match", price: 25.0, disc: 2.5, onl: 22.5, dep: 4.5, bal: 18.0 },
      { name: "Meso-Fill Viso Cabina", price: 70.0, disc: 7.0, onl: 63.0, dep: 12.6, bal: 50.4 },
    ];

    for (const c of catalog) {
      const f = calculateBookingFinancials(c.price);
      assert.strictEqual(f.priceList, c.price);
      assert.strictEqual(f.discountOnline, c.disc);
      assert.strictEqual(f.priceOnline, c.onl);
      assert.strictEqual(f.depositPaid, c.dep);
      assert.strictEqual(f.balanceDue, c.bal);

      // Deposit + Balance === PriceOnline down to zero cent
      const total = Math.round((f.depositPaid + f.balanceDue) * 100) / 100;
      assert.strictEqual(total, f.priceOnline);
    }
  });

  test("T3.2: Exact mathematical invariance on complex edge prices (€39.00, €49.99, €17.77, etc.)", () => {
    const edges = [
      { list: 39.0, onl: 35.1, dep: 7.02, bal: 28.08 },
      { list: 49.99, onl: 44.99, dep: 9.0, bal: 35.99 },
      { list: 17.77, onl: 15.99, dep: 3.2, bal: 12.79 },
      { list: 99.95, onl: 89.95, dep: 17.99, bal: 71.96 },
      { list: 0.0, onl: 0.0, dep: 0.0, bal: 0.0 },
    ];

    for (const e of edges) {
      const f = calculateBookingFinancials(e.list);
      assert.strictEqual(f.priceOnline, e.onl);
      assert.strictEqual(f.depositPaid, e.dep);
      assert.strictEqual(f.balanceDue, e.bal);
      assert.strictEqual(Math.round((f.depositPaid + f.balanceDue) * 100) / 100, f.priceOnline);
    }
  });

  test("T3.3: Randomized pricing fuzzing over 1,000 distinct price points", () => {
    for (let i = 0; i < 1000; i++) {
      const p = Math.round((Math.random() * 500 + 0.01) * 100) / 100;
      const f = calculateBookingFinancials(p);
      const sum = Math.round((f.depositPaid + f.balanceDue) * 100) / 100;
      assert.strictEqual(sum, f.priceOnline, `Discrepancy at price €${p}`);
      assert.strictEqual(Math.round((f.priceOnline + f.discountOnline) * 100) / 100, f.priceList);
    }
  });

  console.log("\n--- TIER 4: CALENDAR LINKS & RESEND SIMULATION ENGINE ---");

  test("T4.1: Google Calendar URL parameter verification", () => {
    const email = renderBookingConfirmationEmail({
      customerName: "Cal",
      serviceName: "Make-up Sposa",
      bookingCode: "SC-G1",
      bookingDate: "2026-10-15",
      bookingTime: "11:00",
      operatorName: "Federica Cesiano",
      durationMinutes: 90,
      financials: calculateBookingFinancials(120.0),
    });

    const match = email.html.match(/href="(https:\/\/calendar\.google\.com\/calendar\/render\?[^"]+)"/);
    assert.ok(match);
    const url = new URL(match[1].replace(/&amp;/g, "&"));
    assert.strictEqual(url.searchParams.get("action"), "TEMPLATE");
    assert.ok(url.searchParams.get("text")?.includes("Make-up Sposa"));
    assert.ok(url.searchParams.get("location")?.includes("Via dei Pellegrini 28/29"));
    assert.ok(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/.test(url.searchParams.get("dates")!));
  });

  test("T4.2: Apple Calendar (.ics) RFC 5545 format verification", () => {
    const email = renderBookingConfirmationEmail({
      customerName: "Apple",
      serviceName: "Lezione Self Make-Up Sartoriale",
      bookingCode: "SC-A1",
      bookingDate: "2026-11-05",
      bookingTime: "15:30",
      operatorName: "Federica Cesiano",
      durationMinutes: 60,
      financials: calculateBookingFinancials(65.0),
    });

    const match = email.html.match(/href="(data:text\/calendar;charset=utf-8,[^"]+)"/);
    assert.ok(match);
    const content = decodeURIComponent(match[1].replace("data:text/calendar;charset=utf-8,", ""));
    assert.ok(content.includes("BEGIN:VCALENDAR"));
    assert.ok(content.includes("VERSION:2.0"));
    assert.ok(content.includes("PRODID:-//Scelta Makeup//Boutique Appointments//IT"));
    assert.ok(content.includes("BEGIN:VEVENT"));
    assert.ok(content.includes("Lezione Self Make-Up Sartoriale"));
    assert.ok(content.includes("LOCATION:Via dei Pellegrini 28/29"));
    assert.ok(content.includes("END:VEVENT"));
    assert.ok(content.includes("END:VCALENDAR"));
  });

  await test("T4.3: Resend dispatch offline simulation mode (Zero-downtime fallback)", async () => {
    const apt: Appointment = {
      id: "apt-1",
      bookingCode: "SC-SIM-1",
      serviceId: "srv-1",
      serviceName: "Make-up Evento & Cerimonia",
      channel: "makeup",
      operatorId: "op-1",
      operatorName: "Federica Cesiano",
      date: "2026-09-18",
      time: "13:30",
      durationMinutes: 60,
      customer: {
        name: "Simona",
        surname: "Caputo",
        phone: "+39 348 777 8888",
        email: "simona@example.com",
      },
      pricing: calculateBookingFinancials(50.0),
      status: "confirmed",
      paymentMethodDeposit: "stripe_card",
      createdAt: new Date().toISOString(),
    };

    const res = await sendBookingConfirmationEmail(apt);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.simulated, true);
    assert.ok(res.id?.startsWith("sim-resend-"));

    const logs = getDispatchedEmailsLog();
    assert.strictEqual(logs.length, 1);
    clearDispatchedEmailsLog();
    assert.strictEqual(getDispatchedEmailsLog().length, 0);
  });

  console.log("\n========================================================");
  console.log(`✅ EMAIL & FINANCIAL TESTS: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log("========================================================\n");

  process.exit(0);
}

runAll().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
