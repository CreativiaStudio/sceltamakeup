import assert from "node:assert";
import {
  getWhatsAppQueueState,
  enqueueWhatsAppMessage,
  calculateJitter,
} from "../lib/whatsappQueueService";
import { createOrder } from "../lib/orderService";
import {
  calculateBookingFinancials,
  renderEmailTemplate,
  BRAND_PALETTE,
} from "../lib/resendService";

console.log("====================================================");
console.log("🌸 SCELTA MAKEUP — M4 INTEGRATION VERIFICATION SUITE");
console.log("====================================================\n");

// 1. WhatsApp Queue & Jitter Bounds
console.log("1. Verifying WhatsApp Jitter Bounds [20, 45]s...");
for (let i = 0; i < 500; i++) {
  const j = calculateJitter();
  assert(j >= 20 && j <= 45, `Jitter out of range: ${j}`);
}
console.log("   ✓ 500 iterations of calculateJitter strictly between 20s and 45s.");

// 2. Queue State & Enqueue
console.log("2. Verifying Queue State & Enqueue Functionality...");
const stateBefore = getWhatsAppQueueState();
assert(stateBefore.sessionStatus === "open", "Initial session status should be open");
assert(stateBefore.connectedNumber === "+39 379 337 0322", "Connected number matches boutique WhatsApp number");

const testMsg = enqueueWhatsAppMessage({
  recipientPhone: "+39 379 337 0322",
  recipientName: "Federica Cesiano",
  templateType: "booking_confirmation",
  context: {
    customerName: "Chiara Rossi",
    serviceName: "Make-up Cerimonia",
    bookingCode: "SC-TEST-001",
    bookingDate: "2026-09-15",
    bookingTime: "13:30",
    priceList: 50.0,
    discountOnline: 5.0,
    priceOnline: 45.0,
    depositPaid: 9.0,
    balanceDue: 36.0,
  },
});

assert(testMsg.id.startsWith("wa-msg-"), "Message ID should have wa-msg- prefix");
assert(testMsg.checksum.startsWith("sha256_"), "Message should include valid anti-spam checksum");
assert(testMsg.jitterDelaySeconds >= 20 && testMsg.jitterDelaySeconds <= 45, "Jitter in range");
console.log(`   ✓ Enqueued WhatsApp message: ${testMsg.id} (Jitter: ${testMsg.jitterDelaySeconds}s, Checksum: ${testMsg.checksum})`);

// 3. Order Service
console.log("3. Verifying Order Service Creation...");
const order = createOrder({
  customer: {
    nome: "Giulia",
    cognome: "Moretti",
    email: "giulia@test.it",
    telefono: "+39 349 111 2233",
    indirizzo: "Via Chiaia 142",
    citta: "Napoli",
    cap: "80121",
  },
  items: [
    {
      id: "item-test-1",
      productId: "ddp-lipstick",
      slug: "ddp-lipstick",
      name: "Rossetto Iconico",
      brand: "Diego dalla Palma",
      price: 24.5,
      quantity: 1,
      image: "/products/lipstick.png",
    },
  ],
  deliveryMethod: "boutique",
  paymentMethod: "boutique",
});

assert(order.orderNumber.startsWith("SC-ORD-"), "Order number should start with SC-ORD-");
assert(order.deliveryMethod === "boutique", "Delivery method boutique preserved");
assert(order.total === 24.5, `Total should be 24.5, got ${order.total}`);
assert(order.shippingCost === 0, "Boutique pickup shipping cost should be 0");
console.log(`   ✓ Created Order: ${order.orderNumber} (Total: €${order.total.toFixed(2)})`);

// 4. Financial Calculations Invariance
console.log("4. Verifying Mathematical Financial Engine...");
const pricesToTest = [50, 35, 65, 120, 25, 70, 39, 49.99, 100];
pricesToTest.forEach((price) => {
  const fin = calculateBookingFinancials(price);
  const sum = Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100;
  assert.strictEqual(sum, fin.priceOnline, `Math invariant failed for price ${price}`);
});
console.log(`   ✓ 100% financial calculation invariance verified across ${pricesToTest.length} catalog and edge prices.`);

// 5. Luxury Email Templates Render
console.log("5. Verifying Luxury Responsive HTML Email Templates...");
const t1 = renderEmailTemplate("booking_confirmation", { priceList: 50 });
assert(t1.html.includes(BRAND_PALETTE.royalViolet), "Template 1 includes brand Royal Violet");
assert(t1.html.includes("36.00") || t1.html.includes("36,00"), "Template 1 includes balance due €36");

const t2 = renderEmailTemplate("booking_reminder_24h", { customerName: "Chiara" });
assert(t2.html.includes("maps.google.com"), "Template 2 includes Google Maps link");

const t3 = renderEmailTemplate("order_placed", { orderNumber: order.orderNumber });
assert(t3.html.includes(order.orderNumber), "Template 3 includes order number");
console.log("   ✓ All 3 email templates rendered successfully with official design system.");

console.log("\n====================================================");
console.log("🎉 ALL M4 INTEGRATION VERIFICATIONS PASSED (100%)");
console.log("====================================================");
process.exit(0);
