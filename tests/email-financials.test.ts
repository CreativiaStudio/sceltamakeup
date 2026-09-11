import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  calculateBookingFinancials,
  renderBookingConfirmationEmail,
  renderBookingReminderEmail,
  renderOrderPlacedEmail,
  renderEmailTemplate,
  sendResendEmail,
  sendBookingConfirmationEmail,
  sendBookingReminderEmail,
  sendOrderPlacedEmail,
  getDispatchedEmailsLog,
  clearDispatchedEmailsLog,
  BRAND_PALETTE,
} from "../lib/resendService";
import { Appointment } from "../types/booking";
import { Order } from "../types/order";

describe("Luxury Resend Transactional Email & Financial Invariants Suite", () => {
  beforeEach(() => {
    clearDispatchedEmailsLog();
  });

  // =========================================================================
  // TIER 1: HTML GENERATION TEST FOR ALL 3 TEMPLATES
  // =========================================================================
  describe("Tier 1: HTML Generation Test for All 3 Luxury Templates", () => {
    it("should generate valid responsive HTML for Template 1: Booking Confirmation", () => {
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

      // Subject line validation
      assert.ok(subject.includes("Conferma Prenotazione"));
      assert.ok(subject.includes("Make-up Evento & Cerimonia"));
      assert.ok(subject.includes("Scelta Makeup Boutique"));

      // HTML Document structure validation
      assert.ok(html.includes("<!DOCTYPE html>"), "Must declare HTML5 doctype");
      assert.ok(html.includes("<html"), "Must contain opening html tag");
      assert.ok(html.includes("</html>"), "Must contain closing html tag");
      assert.ok(html.includes("<body"), "Must contain body element");
      assert.ok(html.includes("role=\"presentation\""), "Must contain responsive email presentation tables");
      assert.ok(html.includes("max-width: 600px;"), "Must constrain container to 600px max-width");

      // Dynamic contents validation
      assert.ok(html.includes("Chiara Rossi"), "Customer name must be rendered");
      assert.ok(html.includes("SC-CONF-1234"), "Booking code must be rendered");
      assert.ok(html.includes("2026-09-25"), "Booking date must be rendered");
      assert.ok(html.includes("14:30"), "Booking time must be rendered");
      assert.ok(html.includes("Federica Cesiano"), "Operator name must be rendered");
      assert.ok(html.includes("60 min"), "Duration must be rendered");

      // Financial breakdown row validation
      assert.ok(html.includes("€50.00"), "List price €50.00 must be rendered");
      assert.ok(html.includes("-€5.00"), "Online discount -€5.00 must be rendered");
      assert.ok(html.includes("€9.00"), "Deposit €9.00 must be rendered");
      assert.ok(html.includes("€36.00"), "Balance due €36.00 must be rendered");
    });

    it("should generate valid responsive HTML for Template 2: Booking 24h Reminder", () => {
      const { subject, html } = renderBookingReminderEmail({
        customerName: "Elena Bianchi",
        serviceName: "Make-up Sposa (Consulenza & Prova)",
        bookingCode: "SC-REMIND-5678",
        bookingDate: "Domani 12 Ottobre",
        bookingTime: "10:00",
        balanceDue: 86.4,
        durationMinutes: 90,
      });

      // Subject line validation
      assert.ok(subject.includes("Promemoria"));
      assert.ok(subject.includes("10:00"));

      // Document structure validation
      assert.ok(html.includes("<!DOCTYPE html>"));
      assert.ok(html.includes("max-width: 600px;"));

      // Content validation
      assert.ok(html.includes("Elena Bianchi"));
      assert.ok(html.includes("Make-up Sposa (Consulenza & Prova)"));
      assert.ok(html.includes("Domani 12 Ottobre"));
      assert.ok(html.includes("10:00"));
      assert.ok(html.includes("€86.40"), "Balance due in boutique must be shown");

      // Vademecum & Guidance check
      assert.ok(html.includes("Vademecum"), "Must feature beauty vademecum");
      assert.ok(html.includes("Pelle Detersa") || html.includes("viso ben deterso"), "Must advise clean and hydrated skin");
      assert.ok(html.includes("Puntualità") || html.includes("puntualità"), "Must advise punctuality for solo-worker protection");
      assert.ok(html.includes("24 ore prima"), "Must state 24h free cancellation policy");

      // Direction button check
      assert.ok(html.includes("Indicazioni Stradali") || html.includes("Mappa"), "Must feature map navigation button");
      assert.ok(html.includes("maps.google.com"));
    });

    it("should generate valid responsive HTML for Template 3: Order Placed (Courier vs Boutique)", () => {
      // 1. Courier Delivery variant
      const sampleCourierOrder: Order = {
        id: "ord-test-courier",
        orderNumber: "SC-ORD-2026-7777",
        customer: {
          nome: "Giulia",
          cognome: "Moretti",
          email: "giulia.moretti@example.com",
          telefono: "+39 349 111 2222",
          indirizzo: "Via Partenope 10",
          citta: "Napoli",
          cap: "80121",
        },
        items: [
          {
            id: "it-1",
            productId: "prod-ddp-rossetto",
            slug: "rossetto-iconico",
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

      const courierEmail = renderOrderPlacedEmail(sampleCourierOrder);
      assert.ok(courierEmail.subject.includes("Conferma Ordine #SC-ORD-2026-7777"));
      assert.ok(courierEmail.html.includes("Spedizione Corriere Espresso") || courierEmail.html.includes("Corriere Espresso"));
      assert.ok(courierEmail.html.includes("Via Partenope 10"));
      assert.ok(courierEmail.html.includes("80121"));
      assert.ok(courierEmail.html.includes("Rossetto Iconico Diego dalla Palma"));
      assert.ok(courierEmail.html.includes("01 Rosso Rubino"));
      assert.ok(courierEmail.html.includes("€49.00"));
      assert.ok(courierEmail.html.includes("€4.90"));
      assert.ok(courierEmail.html.includes("€53.90"));
      assert.ok(courierEmail.html.includes("campioncini") && courierEmail.html.includes("omaggio"));

      // 2. Boutique Pickup variant
      const sampleBoutiqueOrder: Order = {
        ...sampleCourierOrder,
        id: "ord-test-boutique",
        orderNumber: "SC-ORD-2026-8888",
        deliveryMethod: "boutique",
        shippingCost: 0.0,
        total: 49.0,
      };

      const boutiqueEmail = renderOrderPlacedEmail(sampleBoutiqueOrder);
      assert.ok(boutiqueEmail.subject.includes("Conferma Ordine #SC-ORD-2026-8888"));
      assert.ok(boutiqueEmail.html.includes("Ritiro Gratuito in Boutique"));
      assert.ok(boutiqueEmail.html.includes("Via dei Pellegrini 28/29, 80132 Napoli"));
      assert.ok(boutiqueEmail.html.includes("09:30 - 13:30"));
      assert.ok(boutiqueEmail.html.includes("Gratuita"));
      assert.ok(boutiqueEmail.html.includes("€49.00"));
    });

    it("should render correctly via universal renderEmailTemplate dispatcher", () => {
      const rendered = renderEmailTemplate("booking_confirmation", {
        customerName: "Valentina Gallo",
        priceList: 65.0,
      });

      assert.ok(rendered.subject.includes("Conferma Prenotazione"));
      assert.ok(rendered.html.includes("Valentina Gallo"));
      assert.ok(rendered.html.includes("€65.00"));
    });
  });

  // =========================================================================
  // TIER 2: VISUAL IDENTITY & BRAND STYLING VERIFICATION
  // =========================================================================
  describe("Tier 2: Visual Identity Palette & Official Claim Verification", () => {
    it("should verify official Scelta Makeup brand palette HEX codes in all 3 templates", () => {
      const templates = [
        renderBookingConfirmationEmail({
          customerName: "Brand Test",
          serviceName: "Make-up Evento & Cerimonia",
          bookingCode: "SC-BRAND-1",
          bookingDate: "2026-09-08",
          bookingTime: "15:00",
          operatorName: "Federica Cesiano",
          durationMinutes: 60,
          financials: calculateBookingFinancials(50.0),
        }),
        renderBookingReminderEmail({
          customerName: "Brand Test",
          serviceName: "Make-up Evento & Cerimonia",
          bookingCode: "SC-BRAND-2",
          bookingDate: "Domani",
          bookingTime: "15:00",
          balanceDue: 36.0,
          durationMinutes: 60,
        }),
        renderOrderPlacedEmail({
          id: "ord-brand",
          orderNumber: "SC-BRAND-3",
          customer: {
            nome: "Brand",
            cognome: "Test",
            email: "brand@example.com",
            telefono: "+39 349 000 0000",
            indirizzo: "Via Roma 1",
            citta: "Napoli",
            cap: "80100",
          },
          items: [
            {
              id: "b1",
              productId: "prod-1",
              slug: "prod-1",
              name: "Gloss Volumizzante Cipria Make Up",
              brand: "Cipria Make Up",
              price: 18.0,
              quantity: 1,
              image: "/products/cipria-gloss.png",
            },
          ],
          subtotal: 18.0,
          shippingCost: 4.9,
          total: 22.9,
          deliveryMethod: "shipping",
          paymentMethod: "card",
          paymentStatus: "paid",
          status: "processing",
          sampleIncluded: true,
          createdAt: new Date().toISOString(),
        }),
      ];

      const requiredColors = [
        { name: "Royal Violet", hex: BRAND_PALETTE.royalViolet }, // #5E1788
        { name: "Vivid Orchid", hex: BRAND_PALETTE.vividOrchid }, // #7A3293
        { name: "Pastel Lilac", hex: BRAND_PALETTE.pastelLilac }, // #D8C2E7
        { name: "Mauve Rose", hex: BRAND_PALETTE.mauveRose }, // #D462A6
        { name: "Optical White", hex: BRAND_PALETTE.opticalWhite }, // #FFFFFF
      ];

      templates.forEach((tpl, idx) => {
        requiredColors.forEach((color) => {
          assert.ok(
            tpl.html.includes(color.hex),
            `Template ${idx + 1} must include brand color ${color.name} (${color.hex})`
          );
        });
      });
    });

    it("should render official claim 'L'eleganza di essere autentica' in all templates", () => {
      const confirmation = renderBookingConfirmationEmail({
        customerName: "Claim Test",
        serviceName: "Make-up",
        bookingCode: "SC-CLAIM-1",
        bookingDate: "Oggi",
        bookingTime: "12:00",
        operatorName: "Federica Cesiano",
        durationMinutes: 60,
        financials: calculateBookingFinancials(50.0),
      });

      const reminder = renderBookingReminderEmail({
        customerName: "Claim Test",
        serviceName: "Make-up",
        bookingCode: "SC-CLAIM-2",
        bookingDate: "Domani",
        bookingTime: "12:00",
        balanceDue: 36.0,
        durationMinutes: 60,
      });

      assert.ok(
        confirmation.html.includes("L'eleganza di essere autentica"),
        "Booking Confirmation must feature official claim"
      );
      assert.ok(
        reminder.html.includes("L'eleganza di essere autentica"),
        "Booking Reminder must feature official claim"
      );
    });

    it("should render brand logo monogram 'S' and legal boutique footer", () => {
      const email = renderBookingConfirmationEmail({
        customerName: "Footer Test",
        serviceName: "Make-up",
        bookingCode: "SC-FOOT-1",
        bookingDate: "Oggi",
        bookingTime: "12:00",
        operatorName: "Federica Cesiano",
        durationMinutes: 60,
        financials: calculateBookingFinancials(50.0),
      });

      assert.ok(email.html.includes(">S<"), "Must render stylized 'S' brand monogram in header");
      assert.ok(email.html.includes("SCELTA"), "Must include SCELTA brand header");
      assert.ok(email.html.includes("MAKEUP"), "Must include MAKEUP brand header");
      assert.ok(email.html.includes("Federica Cesiano"), "Footer must include owner name");
      assert.ok(email.html.includes("09914431219"), "Footer must include official P.IVA");
      assert.ok(email.html.includes("info@sceltamakeup.it"), "Footer must include store contact email");
    });
  });

  // =========================================================================
  // TIER 3: RIGOROUS FINANCIAL INVARIANT CHECK (ZERO CENT DISCREPANCY)
  // =========================================================================
  describe("Tier 3: Rigorous Financial Invariant Check Across Catalog & Edge Cases", () => {
    it("should verify exact mathematical invariants across all 6 official catalog services", () => {
      const catalogServices = [
        {
          name: "Make-up Evento & Cerimonia",
          priceList: 50.0,
          expectedDiscount: 5.0,
          expectedOnline: 45.0,
          expectedDeposit: 9.0,
          expectedBalance: 36.0,
        },
        {
          name: "Make-up Giorno & Glow Naturale",
          priceList: 35.0,
          expectedDiscount: 3.5,
          expectedOnline: 31.5,
          expectedDeposit: 6.3,
          expectedBalance: 25.2,
        },
        {
          name: "Lezione Self Make-Up Sartoriale",
          priceList: 65.0,
          expectedDiscount: 6.5,
          expectedOnline: 58.5,
          expectedDeposit: 11.7,
          expectedBalance: 46.8,
        },
        {
          name: "Make-up Sposa (Consulenza & Prova)",
          priceList: 120.0,
          expectedDiscount: 12.0,
          expectedOnline: 108.0,
          expectedDeposit: 21.6,
          expectedBalance: 86.4,
        },
        {
          name: "Armocromia & Shade Match",
          priceList: 25.0,
          expectedDiscount: 2.5,
          expectedOnline: 22.5,
          expectedDeposit: 4.5,
          expectedBalance: 18.0,
        },
        {
          name: "Meso-Fill Viso Cabina (Beauty)",
          priceList: 70.0,
          expectedDiscount: 7.0,
          expectedOnline: 63.0,
          expectedDeposit: 12.6,
          expectedBalance: 50.4,
        },
      ];

      for (const service of catalogServices) {
        const fin = calculateBookingFinancials(service.priceList);

        // Value assertions
        assert.strictEqual(fin.priceList, service.priceList);
        assert.strictEqual(fin.discountOnline, service.expectedDiscount);
        assert.strictEqual(fin.priceOnline, service.expectedOnline);
        assert.strictEqual(fin.depositPaid, service.expectedDeposit);
        assert.strictEqual(fin.balanceDue, service.expectedBalance);

        // FUNDAMENTAL INVARIANT: Deposit + Balance == Online Price
        const sumOfParts = Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100;
        assert.strictEqual(
          sumOfParts,
          fin.priceOnline,
          `Financial invariant violated for ${service.name}: Deposit (${fin.depositPaid}) + Balance (${fin.balanceDue}) !== Online (${fin.priceOnline})`
        );

        // Secondary Invariant: Online + Discount == List Price
        const sumWithDiscount = Math.round((fin.priceOnline + fin.discountOnline) * 100) / 100;
        assert.strictEqual(
          sumWithDiscount,
          fin.priceList,
          `Discount invariant violated for ${service.name}`
        );
      }
    });

    it("should guarantee ZERO cent discrepancy across complex fractional edge prices", () => {
      const edgePrices = [
        { list: 39.0, expectedOnline: 35.1, expectedDeposit: 7.02, expectedBalance: 28.08 },
        { list: 49.99, expectedOnline: 44.99, expectedDeposit: 9.0, expectedBalance: 35.99 },
        { list: 17.77, expectedOnline: 15.99, expectedDeposit: 3.2, expectedBalance: 12.79 },
        { list: 99.95, expectedOnline: 89.95, expectedDeposit: 17.99, expectedBalance: 71.96 },
        { list: 1.0, expectedOnline: 0.9, expectedDeposit: 0.18, expectedBalance: 0.72 },
        { list: 0.0, expectedOnline: 0.0, expectedDeposit: 0.0, expectedBalance: 0.0 },
      ];

      for (const edge of edgePrices) {
        const fin = calculateBookingFinancials(edge.list);

        assert.strictEqual(fin.priceOnline, edge.expectedOnline);
        assert.strictEqual(fin.depositPaid, edge.expectedDeposit);
        assert.strictEqual(fin.balanceDue, edge.expectedBalance);

        // Strict zero discrepancy
        const diff = Math.abs(Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100 - fin.priceOnline);
        assert.strictEqual(diff, 0, `Discrepancy detected on edge price €${edge.list}`);
      }
    });

    it("should satisfy mathematical invariance over 1,000 randomized pricing sweeps", () => {
      for (let i = 0; i < 1000; i++) {
        // Random price between €0.01 and €1000.00 with arbitrary cents
        const randomListPrice = Math.round((Math.random() * 999.99 + 0.01) * 100) / 100;
        const fin = calculateBookingFinancials(randomListPrice);

        // 1. Invariant: Deposit + Balance == Online Price (down to exact float representation)
        const depositPlusBalance = Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100;
        assert.strictEqual(
          depositPlusBalance,
          fin.priceOnline,
          `Failed deposit + balance invariant on €${randomListPrice}`
        );

        // 2. Invariant: Online Price + Discount == List Price
        const onlinePlusDiscount = Math.round((fin.priceOnline + fin.discountOnline) * 100) / 100;
        assert.strictEqual(
          onlinePlusDiscount,
          fin.priceList,
          `Failed online + discount invariant on €${randomListPrice}`
        );

        // 3. Positivity constraint
        assert.ok(fin.discountOnline >= 0);
        assert.ok(fin.priceOnline >= 0);
        assert.ok(fin.depositPaid >= 0);
        assert.ok(fin.balanceDue >= 0);
      }
    });
  });

  // =========================================================================
  // TIER 4: CALENDAR GENERATION & RESEND SIMULATION ENGINE
  // =========================================================================
  describe("Tier 4: Calendar Links Verification & Resend Dispatch Simulation", () => {
    it("should generate valid Google Calendar URL with correct query parameters", () => {
      const email = renderBookingConfirmationEmail({
        customerName: "Calendar Test",
        serviceName: "Make-up Sposa (Consulenza & Prova)",
        bookingCode: "SC-CAL-01",
        bookingDate: "2026-10-15",
        bookingTime: "11:00",
        operatorName: "Federica Cesiano",
        durationMinutes: 90,
        financials: calculateBookingFinancials(120.0),
      });

      // Extract Google Calendar URL from rendered HTML
      const match = email.html.match(/href="(https:\/\/calendar\.google\.com\/calendar\/render\?[^"]+)"/);
      assert.ok(match, "Google Calendar URL must be present in HTML");

      const gcalUrl = match[1].replace(/&amp;/g, "&");
      const url = new URL(gcalUrl);

      assert.strictEqual(url.searchParams.get("action"), "TEMPLATE");
      assert.ok(url.searchParams.get("text")?.includes("Make-up Sposa"));
      assert.ok(url.searchParams.get("location")?.includes("Via dei Pellegrini 28/29"));

      // Verify UTC dates string format: YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ
      const datesParam = url.searchParams.get("dates");
      assert.ok(datesParam, "Dates parameter must exist");
      const dateRegex = /^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/;
      assert.ok(
        dateRegex.test(datesParam!),
        `Dates '${datesParam}' does not match standard UTC calendar format`
      );
    });

    it("should generate valid Apple Calendar (.ics) RFC 5545 Data URI", () => {
      const email = renderBookingConfirmationEmail({
        customerName: "Apple Calendar Test",
        serviceName: "Lezione Self Make-Up Sartoriale",
        bookingCode: "SC-ICS-01",
        bookingDate: "2026-11-05",
        bookingTime: "15:30",
        operatorName: "Federica Cesiano",
        durationMinutes: 60,
        financials: calculateBookingFinancials(65.0),
      });

      // Extract .ics data URI
      const match = email.html.match(/href="(data:text\/calendar;charset=utf-8,[^"]+)"/);
      assert.ok(match, "Apple Calendar .ics data URI must be present in HTML");

      const icsUri = match[1];
      const encodedPayload = icsUri.replace("data:text/calendar;charset=utf-8,", "");
      const icsContent = decodeURIComponent(encodedPayload);

      // Verify mandatory iCalendar specifications
      assert.ok(icsContent.includes("BEGIN:VCALENDAR"));
      assert.ok(icsContent.includes("VERSION:2.0"));
      assert.ok(icsContent.includes("PRODID:-//Scelta Makeup//Boutique Appointments//IT"));
      assert.ok(icsContent.includes("BEGIN:VEVENT"));
      assert.ok(icsContent.includes("SUMMARY:"));
      assert.ok(icsContent.includes("Lezione Self Make-Up Sartoriale"));
      assert.ok(icsContent.includes("LOCATION:Via dei Pellegrini 28/29"));
      assert.ok(icsContent.includes("STATUS:CONFIRMED"));
      assert.ok(icsContent.includes("DTSTART:"));
      assert.ok(icsContent.includes("DTEND:"));
      assert.ok(icsContent.includes("END:VEVENT"));
      assert.ok(icsContent.includes("END:VCALENDAR"));
    });

    it("should execute realistic offline simulation dispatch without crashing when RESEND_API_KEY is not set", async () => {
      const sampleAppointment: Appointment = {
        id: "apt-sim-test",
        bookingCode: "SC-SIM-2026",
        serviceId: "srv-cerimonia",
        serviceName: "Make-up Evento & Cerimonia",
        channel: "makeup",
        operatorId: "op-federica",
        operatorName: "Federica Cesiano",
        date: "2026-09-18",
        time: "13:30",
        durationMinutes: 60,
        customer: {
          name: "Simona",
          surname: "Caputo",
          phone: "+39 348 777 8888",
          email: "simona.caputo@example.com",
        },
        pricing: calculateBookingFinancials(50.0),
        status: "confirmed",
        paymentMethodDeposit: "stripe_card",
        createdAt: new Date().toISOString(),
      };

      // 1. Booking Confirmation Email Simulation
      const confirmResult = await sendBookingConfirmationEmail(sampleAppointment);
      assert.strictEqual(confirmResult.success, true);
      assert.strictEqual(confirmResult.simulated, true);
      assert.ok(confirmResult.id?.startsWith("sim-resend-"));
      assert.strictEqual(confirmResult.recipientEmail, "simona.caputo@example.com");

      // 2. Booking Reminder Email Simulation
      const reminderResult = await sendBookingReminderEmail(sampleAppointment);
      assert.strictEqual(reminderResult.success, true);
      assert.strictEqual(reminderResult.simulated, true);

      // 3. Direct sendResendEmail invocation simulation
      const directResult = await sendResendEmail({
        to: "federica.direct@example.com",
        recipientName: "Direct Test",
        templateType: "manual_test",
        subject: "Direct Test Subject",
        html: "<p>Direct Test Content</p>",
      });
      assert.strictEqual(directResult.success, true);
      assert.strictEqual(directResult.simulated, true);

      // Verify memory/storage persistence of dispatched emails
      const logs = getDispatchedEmailsLog();
      assert.strictEqual(logs.length, 3);
      assert.strictEqual(logs[0].templateType, "manual_test");
      assert.strictEqual(logs[1].templateType, "booking_reminder_24h");
      assert.strictEqual(logs[2].templateType, "booking_confirmation");

      // Test clear log
      clearDispatchedEmailsLog();
      assert.strictEqual(getDispatchedEmailsLog().length, 0);
    });

    it("should simulate order placed email dispatch cleanly", async () => {
      const sampleOrder: Order = {
        id: "ord-sim-test",
        orderNumber: "SC-ORD-9999",
        customer: {
          nome: "Beatrice",
          cognome: "Valli",
          email: "beatrice.valli@example.com",
          telefono: "+39 340 123 4567",
          indirizzo: "Via Toledo 200",
          citta: "Napoli",
          cap: "80132",
        },
        items: [
          {
            id: "i1",
            productId: "p1",
            slug: "s1",
            name: "Mascara Extra Volume RVB LAB",
            brand: "RVB LAB",
            price: 22.0,
            quantity: 1,
            image: "/products/rvb-mascara.png",
          },
        ],
        subtotal: 22.0,
        shippingCost: 4.9,
        total: 26.9,
        deliveryMethod: "shipping",
        paymentMethod: "card",
        paymentStatus: "paid",
        status: "processing",
        sampleIncluded: true,
        createdAt: new Date().toISOString(),
      };

      const orderResult = await sendOrderPlacedEmail(sampleOrder);
      assert.strictEqual(orderResult.success, true);
      assert.strictEqual(orderResult.simulated, true);
      assert.ok(orderResult.subject.includes("SC-ORD-9999"));
    });
  });
});
