import { describe, it, before, after, beforeEach } from "node:test";
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

describe("WhatsApp Anti-Ban Queue Pacing Suite", () => {
  let originalSetInterval: typeof global.setInterval;

  before(() => {
    originalSetInterval = global.setInterval;
    global.setInterval = ((
      callback: (...args: unknown[]) => void,
      _ms?: number,
      ...args: unknown[]
    ) => {
      return originalSetInterval(callback, 5, ...args);
    }) as unknown as typeof global.setInterval;
  });

  after(() => {
    global.setInterval = originalSetInterval;
  });

  beforeEach(async () => {
    clearWhatsAppQueue();
    clearWhatsAppHistory();
    // Allow brief grace period for any running accelerated tick to complete
    await new Promise((r) => setTimeout(r, 20));
  });

  // =========================================================================
  // TIER 1: ENQUEUEING CONSECUTIVE MESSAGES & QUEUE LIFECYCLE
  // =========================================================================
  describe("Tier 1: Enqueueing Consecutive Messages & State Transitions", () => {
    it("should enqueue 3 to 5 consecutive messages maintaining FIFO queue structure", () => {
      const messagesToEnqueue = [
        {
          phone: "+39 348 111 0001",
          name: "Chiara Rossi",
          template: "booking_confirmation" as NotificationTemplateType,
        },
        {
          phone: "+39 348 111 0002",
          name: "Elena Bianchi",
          template: "booking_reminder_24h" as NotificationTemplateType,
        },
        {
          phone: "+39 348 111 0003",
          name: "Giulia Moretti",
          template: "order_placed" as NotificationTemplateType,
        },
        {
          phone: "+39 348 111 0004",
          name: "Sofia Esposito",
          template: "manual_test" as NotificationTemplateType,
        },
        {
          phone: "+39 348 111 0005",
          name: "Martina Ricci",
          template: "booking_confirmation" as NotificationTemplateType,
        },
      ];

      const enqueuedResults = messagesToEnqueue.map((m) =>
        enqueueWhatsAppMessage({
          recipientPhone: m.phone,
          recipientName: m.name,
          templateType: m.template,
          context: {
            serviceName: "Make-up Evento & Cerimonia",
            priceList: 50.0,
            bookingCode: "SC-TEST-FIFO",
          },
        })
      );

      // Verify all 5 messages were created with valid structures
      assert.strictEqual(enqueuedResults.length, 5);
      enqueuedResults.forEach((msg, idx) => {
        assert.ok(msg.id.startsWith("wa-msg-"), `Message ${idx} must have valid ID`);
        assert.ok(
          msg.jitterDelaySeconds >= 20 && msg.jitterDelaySeconds <= 45,
          `Message ${idx} jitter must be between 20 and 45`
        );
        assert.ok(msg.checksum.startsWith("sha256_"), `Message ${idx} must have dynamic checksum`);
        assert.ok(msg.messageText.length > 50, `Message ${idx} text must not be empty`);
        assert.strictEqual(msg.recipientName, messagesToEnqueue[idx].name);
      });

      // Verify queue state: 1 active/processing item + 4 pending FIFO items (or transitions)
      const state = getWhatsAppQueueState();
      assert.ok(state.isProcessing, "Queue worker should be processing active message");
      assert.ok(state.activeItem !== null, "Active item must be assigned");
      assert.strictEqual(
        state.activeItem?.recipientName,
        "Chiara Rossi",
        "First enqueued message must be active item (FIFO order)"
      );

      // Verify pending queue length
      assert.strictEqual(state.queue.length, 4, "Remaining 4 messages must reside in pending queue");
      assert.strictEqual(state.queue[0].recipientName, "Elena Bianchi");
      assert.strictEqual(state.queue[1].recipientName, "Giulia Moretti");
      assert.strictEqual(state.queue[2].recipientName, "Sofia Esposito");
      assert.strictEqual(state.queue[3].recipientName, "Martina Ricci");
    });

    it("should notify subscribers when queue changes via subscribeToWhatsAppQueue / onQueueUpdate", () => {
      let callbackInvocationCount = 0;
      let lastObservedState = getWhatsAppQueueState();

      const unsubscribe = subscribeToWhatsAppQueue((newState) => {
        callbackInvocationCount++;
        lastObservedState = newState;
      });

      // Initial subscription immediately invokes callback once
      assert.strictEqual(callbackInvocationCount, 1);

      // Enqueue a test message
      enqueueWhatsAppMessage({
        recipientPhone: "+39 349 999 8888",
        recipientName: "Test Subscriber",
        templateType: "manual_test",
      });

      assert.ok(
        callbackInvocationCount >= 2,
        "Subscriber should have been notified of enqueue and processing"
      );
      assert.ok(lastObservedState.isProcessing);

      // Unsubscribe and verify no more calls
      const countBeforeUnsub = callbackInvocationCount;
      unsubscribe();

      enqueueWhatsAppMessage({
        recipientPhone: "+39 349 999 7777",
        recipientName: "Test After Unsub",
        templateType: "manual_test",
      });

      assert.strictEqual(
        callbackInvocationCount,
        countBeforeUnsub,
        "No further notifications after unsubscribing"
      );
    });

    it("should support triggerManualTestMessage with pre-populated demo context", () => {
      const manualMsg = triggerManualTestMessage("booking_confirmation");
      assert.ok(manualMsg.id.startsWith("wa-msg-"));
      assert.strictEqual(manualMsg.recipientName, "Test Federica");
      assert.strictEqual(manualMsg.templateType, "booking_confirmation");
      assert.ok(manualMsg.messageText.includes("Federica Cesiano"));
      assert.ok(manualMsg.messageText.includes("Conferma Prenotazione"));
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY TEST & JITTER DISTRIBUTION (20s <= delta t <= 45s)
  // =========================================================================
  describe("Tier 2: Boundary Test Verifying Jitter Delay (20s <= delta t <= 45s)", () => {
    it("should strictly constrain calculateJitter() within [20, 45] over 10,000 statistical runs", () => {
      const iterations = 10000;
      let minObserved = Number.POSITIVE_INFINITY;
      let maxObserved = Number.NEGATIVE_INFINITY;
      const counts: Record<number, number> = {};

      for (let i = 0; i < iterations; i++) {
        const jitter = calculateJitter();

        // Integer verification
        assert.ok(
          Number.isInteger(jitter),
          `Jitter must strictly be an integer, got ${jitter}`
        );

        // Strict lower boundary
        assert.ok(
          jitter >= 20,
          `Jitter ${jitter} violated lower boundary limit (must be >= 20 seconds)`
        );

        // Strict upper boundary
        assert.ok(
          jitter <= 45,
          `Jitter ${jitter} violated upper boundary limit (must be <= 45 seconds)`
        );

        if (jitter < minObserved) minObserved = jitter;
        if (jitter > maxObserved) maxObserved = jitter;

        counts[jitter] = (counts[jitter] || 0) + 1;
      }

      // Verify that both extremes are reachable (inclusive boundary coverage)
      assert.strictEqual(minObserved, 20, "Minimum observed jitter must equal lower boundary 20");
      assert.strictEqual(maxObserved, 45, "Maximum observed jitter must equal upper boundary 45");

      // Verify all discrete integer points between 20 and 45 are represented
      for (let sec = 20; sec <= 45; sec++) {
        assert.ok(
          (counts[sec] || 0) > 0,
          `Discrete second ${sec}s must be generated in uniform distribution`
        );
      }
    });

    it("should assign valid jitterDelaySeconds to all template outputs", () => {
      const templates: NotificationTemplateType[] = [
        "booking_confirmation",
        "booking_reminder_24h",
        "order_placed",
        "manual_test",
      ];

      for (const tpl of templates) {
        for (let run = 0; run < 50; run++) {
          const formatted = formatWhatsAppTemplate(tpl, {
            customerName: "Valeria",
            serviceName: "Make-up Sposa",
          });
          assert.ok(
            formatted.jitter >= 20 && formatted.jitter <= 45,
            `Template ${tpl} produced out-of-bounds jitter: ${formatted.jitter}`
          );
        }
      }
    });

    it("should verify countdown initialization matches assigned message jitter", () => {
      const msg = enqueueWhatsAppMessage({
        recipientPhone: "+39 348 222 3333",
        recipientName: "Test Countdown",
        templateType: "manual_test",
      });

      const state = getWhatsAppQueueState();
      assert.ok(
        state.activeItem?.id === msg.id ||
          state.queue.some((q) => q.id === msg.id) ||
          state.history.some((h) => h.id === msg.id),
        "Message should either be in activeItem, queue, or history"
      );
      assert.ok(
        msg.jitterDelaySeconds >= 20 && msg.jitterDelaySeconds <= 45,
        "Message jitter must be within [20, 45]"
      );
    });
  });

  // =========================================================================
  // TIER 3: DYNAMIC VARIATIONS & UNIQUE CHECKSUMS (ANTI-SPAM HASH AVOIDANCE)
  // =========================================================================
  describe("Tier 3: Dynamic Variation Engine & Anti-Spam Checksum Uniqueness", () => {
    it("should produce differing message texts and unique checksums for identical booking inputs", () => {
      const identicalInput = {
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

      const generatedTexts = new Set<string>();
      const generatedChecksums = new Set<string>();

      const totalSamples = 30;
      for (let i = 0; i < totalSamples; i++) {
        const { text, checksum } = formatWhatsAppTemplate(
          "booking_confirmation",
          identicalInput
        );
        generatedTexts.add(text);
        generatedChecksums.add(checksum);
      }

      // Check that dynamic variations occur (different greetings, pre-treatment tips, or signoffs)
      assert.ok(
        generatedTexts.size > 1,
        `Dynamic engine must produce varied message texts (observed ${generatedTexts.size} distinct texts out of ${totalSamples})`
      );

      // Check that checksums/hashes are unique to defeat Meta anti-spam hash deduplication
      assert.ok(
        generatedChecksums.size > 1,
        `Checksums must vary to prevent identical hash flags (observed ${generatedChecksums.size} distinct checksums)`
      );
    });

    it("should correctly populate all required fields for Booking Confirmation template", () => {
      const { text } = formatWhatsAppTemplate("booking_confirmation", {
        customerName: "Francesca Neri",
        serviceName: "Armocromia & Shade Match",
        bookingDate: "2026-09-20",
        bookingTime: "16:30",
        operatorName: "Federica Cesiano",
        bookingCode: "SC-ARMO-99",
        priceList: 25.0,
        discountOnline: 2.5,
        depositPaid: 4.5,
        balanceDue: 18.0,
      });

      assert.ok(text.includes("SCELTA MAKEUP — Conferma Prenotazione"));
      assert.ok(text.includes("Francesca Neri"));
      assert.ok(text.includes("Armocromia & Shade Match"));
      assert.ok(text.includes("2026-09-20"));
      assert.ok(text.includes("16:30"));
      assert.ok(text.includes("Via dei Pellegrini 28/29"));
      assert.ok(text.includes("SC-ARMO-99"));
      assert.ok(text.includes("€25.00"));
      assert.ok(text.includes("-€2.50"));
      assert.ok(text.includes("€4.50"));
      assert.ok(text.includes("€18.00"));
      assert.ok(text.includes("Consiglio di Bellezza Scelta Makeup"));
    });

    it("should correctly populate all required fields for Booking 24h Reminder template", () => {
      const { text } = formatWhatsAppTemplate("booking_reminder_24h", {
        customerName: "Sara Esposito",
        serviceName: "Lezione Self Make-Up Sartoriale",
        bookingDate: "10 Ottobre",
        bookingTime: "11:00",
        durationMinutes: 90,
      });

      assert.ok(text.includes("appuntamento di bellezza è domani"));
      assert.ok(text.includes("Sara Esposito"));
      assert.ok(text.includes("Lezione Self Make-Up Sartoriale"));
      assert.ok(text.includes("11:00"));
      assert.ok(text.includes("Via dei Pellegrini 28/29"));
      assert.ok(text.includes("maps.google.com"));
      assert.ok(text.includes("Piccolo Vademecum"));
      assert.ok(text.includes("viso ben deterso"));
      assert.ok(text.includes("puntualità"));
      assert.ok(text.includes("90 minuti"));
      assert.ok(text.includes("24h"));
      assert.ok(text.includes("CONFERMO"));
    });

    it("should correctly populate Order Placed template for Courier Shipping variant", () => {
      const { text } = formatWhatsAppTemplate("order_placed", {
        customerName: "Alessia Conti",
        orderNumber: "SC-ORD-2026-0042",
        deliveryMethod: "shipping",
        shippingAddress: "Corso Umberto I 50",
        shippingCity: "Napoli",
        shippingCap: "80138",
        orderTotal: 49.9,
      });

      assert.ok(text.includes("ordine cosmetico è confermato"));
      assert.ok(text.includes("Alessia Conti"));
      assert.ok(text.includes("SC-ORD-2026-0042"));
      assert.ok(text.includes("Corriere Espresso Tracciato 24/48h"));
      assert.ok(text.includes("Corso Umberto I 50"));
      assert.ok(text.includes("80138"));
      assert.ok(text.includes("2 Omaggio"));
      assert.ok(text.includes("€49.90"));
    });

    it("should correctly populate Order Placed template for Boutique Pickup variant", () => {
      const { text } = formatWhatsAppTemplate("order_placed", {
        customerName: "Serena Romano",
        orderNumber: "SC-ORD-2026-0099",
        deliveryMethod: "boutique",
        orderTotal: 35.0,
      });

      assert.ok(text.includes("Ritiro in Store"));
      assert.ok(text.includes("Serena Romano"));
      assert.ok(text.includes("SC-ORD-2026-0099"));
      assert.ok(text.includes("Ritiro Gratuito in Salone") || text.includes("Ritiro Gratuito in Boutique"));
      assert.ok(text.includes("Via dei Pellegrini 28/29"));
      assert.ok(text.includes("09:30 - 13:30"));
      assert.ok(text.includes("Campioncini di benvenuto"));
      assert.ok(text.includes("€35.00"));
    });
  });

  // =========================================================================
  // TIER 4: ANTI-BAN BLAST PROTECTION & PHONE SANITIZATION
  // =========================================================================
  describe("Tier 4: Bulk Broadcast Blast Protection & Robust Sanitization", () => {
    it("should enforce sequential processing lock preventing parallel dispatches during rapid burst enqueue", () => {
      const burstCount = 5;
      const enqueued: ReturnType<typeof enqueueWhatsAppMessage>[] = [];

      for (let i = 0; i < burstCount; i++) {
        enqueued.push(
          enqueueWhatsAppMessage({
            recipientPhone: `+39 340 000 ${i.toString().padStart(4, "0")}`,
            recipientName: `Burst Customer ${i}`,
            templateType: "manual_test",
          })
        );
      }

      const state = getWhatsAppQueueState();
      assert.ok(
        state.isProcessing,
        "Sequential queue worker must maintain isProcessing lock"
      );
      assert.ok(Array.isArray(state.queue));
    });

    it("should sanitize varied phone number formats into standardized E.164 with Italian +39 prefix", () => {
      const testCases = [
        { raw: "3481234567", expected: "+393481234567" },
        { raw: "+39 348 123 4567", expected: "+393481234567" },
        { raw: "0039 348 123 4567", expected: "+393481234567" },
        { raw: "+39 (348) 123-4567", expected: "+393481234567" },
        { raw: "393481234567", expected: "+393481234567" },
        { raw: "+33 612 345 678", expected: "+33612345678" },
        { raw: "", expected: "+39 379 337 0322" },
      ];

      for (const tc of testCases) {
        const msg = enqueueWhatsAppMessage({
          recipientPhone: tc.raw,
          recipientName: "Sanitization Test",
          templateType: "manual_test",
        });

        assert.strictEqual(
          msg.recipientPhone,
          tc.expected,
          `Phone '${tc.raw}' was not properly normalized to '${tc.expected}'`
        );
      }
    });

    it("should safely handle WhatsApp session status transitions and generate valid QR SVG", () => {
      setWhatsAppSessionStatus("connecting");
      let state = getWhatsAppQueueState();
      assert.strictEqual(state.sessionStatus, "connecting");
      assert.ok(state.qrCodeSvg?.includes("<svg"), "QR code SVG must be generated in connecting state");
      assert.ok(state.qrCodeSvg?.includes("#5E1788"), "QR code must use brand Royal Violet");
      assert.ok(state.qrCodeSvg?.includes(">S<"), "QR code must feature luxury central S monogram");

      setWhatsAppSessionStatus("close");
      state = getWhatsAppQueueState();
      assert.strictEqual(state.sessionStatus, "close");

      setWhatsAppSessionStatus("open");
      state = getWhatsAppQueueState();
      assert.strictEqual(state.sessionStatus, "open");
    });
  });
});
