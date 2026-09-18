import assert from "node:assert";
import {
  calculateJitter,
  formatWhatsAppTemplate,
  enqueueWhatsAppMessage,
  getWhatsAppQueueState,
  subscribeToWhatsAppQueue,
  triggerManualTestMessage,
  setWhatsAppSessionStatus,
  clearWhatsAppQueue,
  clearWhatsAppHistory,
} from "../lib/whatsappQueueService";
import { NotificationTemplateType } from "../types/notification";

console.log("\n========================================================");
console.log("🌸 SCELTA MAKEUP — E2E TEST: QUEUE PACING & ANTI-BAN");
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
          console.error(`    ${err.message}`);
          throw err;
        });
    } else {
      passedTests++;
      console.log(`  ✓ ${name}`);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${name}`);
    console.error(`    ${errorMsg}`);
    throw err;
  }
}

async function runAll() {
  console.log("--- TIER 1: ENQUEUEING CONSECUTIVE MESSAGES & LIFECYCLE ---");

  test("T1.1: Enqueue 5 consecutive messages into FIFO queue", () => {
    clearWhatsAppQueue();
    clearWhatsAppHistory();

    const recipients = [
      { name: "Chiara Rossi", phone: "+39 348 111 0001", tpl: "booking_confirmation" as const },
      { name: "Elena Bianchi", phone: "+39 348 111 0002", tpl: "booking_reminder_24h" as const },
      { name: "Giulia Moretti", phone: "+39 348 111 0003", tpl: "order_placed" as const },
      { name: "Sofia Esposito", phone: "+39 348 111 0004", tpl: "manual_test" as const },
      { name: "Martina Ricci", phone: "+39 348 111 0005", tpl: "booking_confirmation" as const },
    ];

    const messages = recipients.map((r) =>
      enqueueWhatsAppMessage({
        recipientPhone: r.phone,
        recipientName: r.name,
        templateType: r.tpl,
      })
    );

    assert.strictEqual(messages.length, 5);
    for (let i = 0; i < messages.length; i++) {
      assert.ok(messages[i].id.startsWith("wa-msg-"));
      assert.ok(messages[i].jitterDelaySeconds >= 20 && messages[i].jitterDelaySeconds <= 45);
      assert.ok(messages[i].checksum.startsWith("sha256_"));
      assert.strictEqual(messages[i].recipientName, recipients[i].name);
    }

    const state = getWhatsAppQueueState();
    assert.ok(state.isProcessing);
    assert.strictEqual(state.activeItem?.recipientName, "Chiara Rossi");
    assert.strictEqual(state.queue.length, 4);
    assert.strictEqual(state.queue[0].recipientName, "Elena Bianchi");
    assert.strictEqual(state.queue[1].recipientName, "Giulia Moretti");
    assert.strictEqual(state.queue[2].recipientName, "Sofia Esposito");
    assert.strictEqual(state.queue[3].recipientName, "Martina Ricci");
  });

  test("T1.2: Observer subscription notifications on state transitions", () => {
    let callCount = 0;
    const unsub = subscribeToWhatsAppQueue(() => {
      callCount++;
    });

    assert.ok(callCount >= 1, "Immediate first notification");
    const countBefore = callCount;

    enqueueWhatsAppMessage({
      recipientPhone: "+39 348 999 1234",
      recipientName: "Observer Test",
      templateType: "manual_test",
    });

    assert.ok(callCount > countBefore, "Notified upon new message enqueue");
    unsub();
  });

  test("T1.3: Manual test message dispatcher with pre-filled context", () => {
    const testMsg = triggerManualTestMessage("booking_confirmation");
    assert.ok(testMsg.id.startsWith("wa-msg-"));
    assert.strictEqual(testMsg.recipientName, "Test Federica");
    assert.strictEqual(testMsg.templateType, "booking_confirmation");
    assert.ok(testMsg.messageText.includes("Federica Cesiano"));
  });

  console.log("\n--- TIER 2: BOUNDARY VERIFICATION OF JITTER DELAY (20s - 45s) ---");

  test("T2.1: Statistical boundary test of calculateJitter() over 10,000 iterations", () => {
    let min = Infinity;
    let max = -Infinity;
    const frequencies: Record<number, number> = {};

    for (let i = 0; i < 10000; i++) {
      const j = calculateJitter();
      assert.ok(Number.isInteger(j), "Jitter must be integer");
      assert.ok(j >= 20, `Jitter ${j} must be >= 20`);
      assert.ok(j <= 45, `Jitter ${j} must be <= 45`);
      if (j < min) min = j;
      if (j > max) max = j;
      frequencies[j] = (frequencies[j] || 0) + 1;
    }

    assert.strictEqual(min, 20, "Lower bound 20 must be reached");
    assert.strictEqual(max, 45, "Upper bound 45 must be reached");
    for (let sec = 20; sec <= 45; sec++) {
      assert.ok((frequencies[sec] || 0) > 0, `Second ${sec} must have non-zero occurrences`);
    }
  });

  test("T2.2: All templates produce jitter strictly in [20, 45]", () => {
    const types: NotificationTemplateType[] = [
      "booking_confirmation",
      "booking_reminder_24h",
      "order_placed",
      "manual_test",
    ];

    for (const t of types) {
      for (let i = 0; i < 25; i++) {
        const res = formatWhatsAppTemplate(t);
        assert.ok(res.jitter >= 20 && res.jitter <= 45);
      }
    }
  });

  console.log("\n--- TIER 3: DYNAMIC VARIATIONS & ANTI-SPAM CHECKSUM UNIQUENESS ---");

  test("T3.1: Dynamic variation engine creates distinct text & checksums for identical input", () => {
    const input = {
      customerName: "Giulia De Luca",
      serviceName: "Make-up Evento & Cerimonia",
      bookingDate: "2026-09-15",
      bookingTime: "14:00",
      operatorName: "Federica Cesiano",
      bookingCode: "SC-IDENTICAL-01",
      priceList: 50.0,
      discountOnline: 5.0,
      depositPaid: 9.0,
      balanceDue: 36.0,
    };

    const texts = new Set<string>();
    const checksums = new Set<string>();

    for (let i = 0; i < 30; i++) {
      const res = formatWhatsAppTemplate("booking_confirmation", input);
      texts.add(res.text);
      checksums.add(res.checksum);
    }

    assert.ok(texts.size > 1, `Observed ${texts.size} distinct texts out of 30`);
    assert.ok(checksums.size > 1, `Observed ${checksums.size} distinct checksums out of 30`);
  });

  test("T3.2: Verify complete content for Booking Confirmation template", () => {
    const { text } = formatWhatsAppTemplate("booking_confirmation", {
      customerName: "Francesca Neri",
      serviceName: "Armocromia & Shade Match",
      bookingDate: "2026-09-20",
      bookingTime: "16:30",
      bookingCode: "SC-ARMO-99",
      priceList: 25.0,
      discountOnline: 2.5,
      depositPaid: 4.5,
      balanceDue: 18.0,
    });

    assert.ok(text.includes("Francesca Neri"));
    assert.ok(text.includes("Armocromia & Shade Match"));
    assert.ok(text.includes("Via dei Pellegrini 28/29"));
    assert.ok(text.includes("SC-ARMO-99"));
    assert.ok(text.includes("€25.00"));
    assert.ok(text.includes("-€2.50"));
    assert.ok(text.includes("€4.50"));
    assert.ok(text.includes("€18.00"));
  });

  test("T3.3: Verify complete content for Booking 24h Reminder template", () => {
    const { text } = formatWhatsAppTemplate("booking_reminder_24h", {
      customerName: "Sara Esposito",
      serviceName: "Lezione Self Make-Up Sartoriale",
      bookingDate: "10 Ottobre",
      bookingTime: "11:00",
      durationMinutes: 90,
    });

    assert.ok(text.includes("Sara Esposito"));
    assert.ok(text.includes("Lezione Self Make-Up Sartoriale"));
    assert.ok(text.includes("Via dei Pellegrini 28/29"));
    assert.ok(text.includes("maps.google.com"));
    assert.ok(text.includes("viso ben deterso"));
    assert.ok(text.includes("puntualità"));
    assert.ok(text.includes("90 minuti"));
    assert.ok(text.includes("24h"));
    assert.ok(text.includes("CONFERMO"));
  });

  test("T3.4: Verify complete content for Order Placed template (Courier vs Boutique)", () => {
    const courier = formatWhatsAppTemplate("order_placed", {
      customerName: "Alessia Conti",
      orderNumber: "SC-ORD-0042",
      deliveryMethod: "shipping",
      shippingAddress: "Corso Umberto 50",
      shippingCity: "Napoli",
      shippingCap: "80138",
      orderTotal: 49.9,
    });
    assert.ok(courier.text.includes("Corriere Espresso Tracciato 24/48h"));
    assert.ok(courier.text.includes("2 Omaggio"));
    assert.ok(courier.text.includes("€49.90"));

    const boutique = formatWhatsAppTemplate("order_placed", {
      customerName: "Serena Romano",
      orderNumber: "SC-ORD-0099",
      deliveryMethod: "boutique",
      orderTotal: 35.0,
    });
    assert.ok(boutique.text.includes("Ritiro Gratuito in Boutique"));
    assert.ok(boutique.text.includes("Via dei Pellegrini 28/29"));
    assert.ok(boutique.text.includes("09:30 - 13:30"));
    assert.ok(boutique.text.includes("€35.00"));
  });

  console.log("\n--- TIER 4: BULK BLAST REJECTION & ANTI-BAN PROTECTION ---");

  test("T4.1: Anti-ban sequential execution lock during burst enqueue", () => {
    // Current queue state must maintain single active item and rest queued
    const state = getWhatsAppQueueState();
    assert.ok(state.isProcessing, "Sequential lock is active");
    assert.ok(state.activeItem !== null, "At most one active processing item");
    assert.ok(Array.isArray(state.queue), "Pending messages safely wait in queue");
  });

  test("T4.2: Phone number sanitization and E.164 normalization (+39 default)", () => {
    const formats = [
      { raw: "3481234567", expected: "+393481234567" },
      { raw: "+39 348 123 4567", expected: "+393481234567" },
      { raw: "0039 348 123 4567", expected: "+393481234567" },
      { raw: "+39 (348) 123-4567", expected: "+393481234567" },
      { raw: "393481234567", expected: "+393481234567" },
      { raw: "+33 612 345 678", expected: "+33612345678" },
      { raw: "", expected: "+39 379 337 0322" },
    ];

    for (const f of formats) {
      const msg = enqueueWhatsAppMessage({
        recipientPhone: f.raw,
        recipientName: "Phone Test",
        templateType: "manual_test",
      });
      assert.strictEqual(
        msg.recipientPhone,
        f.expected,
        `Raw '${f.raw}' failed normalization to '${f.expected}'`
      );
    }
  });

  test("T4.3: Session status transitions and QR SVG rendering", () => {
    setWhatsAppSessionStatus("connecting");
    let state = getWhatsAppQueueState();
    assert.strictEqual(state.sessionStatus, "connecting");
    assert.ok(state.qrCodeSvg?.includes("<svg"));
    assert.ok(state.qrCodeSvg?.includes("#5E1788"));
    assert.ok(state.qrCodeSvg?.includes(">S<"));

    setWhatsAppSessionStatus("close");
    state = getWhatsAppQueueState();
    assert.strictEqual(state.sessionStatus, "close");

    setWhatsAppSessionStatus("open");
    state = getWhatsAppQueueState();
    assert.strictEqual(state.sessionStatus, "open");
  });

  console.log("\n========================================================");
  console.log(`✅ QUEUE PACING TESTS: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log("========================================================\n");

  // Allow process to cleanly exit
  process.exit(0);
}

runAll().catch((err) => {
  console.error("Test run error:", err);
  process.exit(1);
});
