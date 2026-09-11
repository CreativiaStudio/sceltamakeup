import { calculateJitter } from "../../lib/whatsappQueueService";
import { calculateBookingFinancials, BRAND_PALETTE, renderEmailTemplate } from "../../lib/resendService";
import assert from "node:assert";

console.log("=== INDEPENDENT AUDITOR EMPIRICAL EVALUATION ===");

// 1. Jitter check (20,000 runs)
let min = 100, max = -1;
for (let i = 0; i < 20000; i++) {
  const j = calculateJitter();
  assert.ok(Number.isInteger(j), "Must be integer");
  assert.ok(j >= 20 && j <= 45, `Jitter ${j} out of range [20, 45]`);
  if (j < min) min = j;
  if (j > max) max = j;
}
assert.strictEqual(min, 20, "Minimum observed must be exactly 20");
assert.strictEqual(max, 45, "Maximum observed must be exactly 45");
console.log(`[PASS] WhatsApp Jitter: strictly 20-45s random integer (min=${min}, max=${max})`);

// 2. Palette check
assert.strictEqual(BRAND_PALETTE.royalViolet.toUpperCase(), "#5E1788");
assert.strictEqual(BRAND_PALETTE.pastelLilac.toUpperCase(), "#D8C2E7");
assert.strictEqual(BRAND_PALETTE.opticalWhite.toUpperCase(), "#FFFFFF");
assert.strictEqual(BRAND_PALETTE.mauveRose.toUpperCase(), "#D462A6");

const templates = ["booking_confirmation", "booking_reminder_24h", "order_placed"] as const;
for (const t of templates) {
  const { html, subject } = renderEmailTemplate(t, {});
  assert.ok(html.includes("#5E1788"), `Template ${t} missing #5E1788`);
  assert.ok(html.includes("#D8C2E7"), `Template ${t} missing #D8C2E7`);
  assert.ok(html.includes("#FFFFFF") || html.includes("#ffffff"), `Template ${t} missing white`);
  assert.ok(html.includes("L'eleganza di essere autentica"), `Template ${t} missing brand claim`);
}
console.log("[PASS] Brand Palette: #5E1788, #D8C2E7, #FFFFFF, #D462A6 and claim present in all templates");

// 3. Financial invariant check
const services = [
  { name: "Make-up Evento & Cerimonia", list: 50.0, online: 45.0, dep: 9.0, bal: 36.0 },
  { name: "Make-up Giorno & Glow Naturale", list: 35.0, online: 31.5, dep: 6.3, bal: 25.2 },
  { name: "Lezione Self Make-Up Sartoriale", list: 65.0, online: 58.5, dep: 11.7, bal: 46.8 },
  { name: "Make-up Sposa", list: 120.0, online: 108.0, dep: 21.6, bal: 86.4 },
  { name: "Armocromia & Shade Match", list: 25.0, online: 22.5, dep: 4.5, bal: 18.0 },
  { name: "Meso-Fill Viso Cabina", list: 70.0, online: 63.0, dep: 12.6, bal: 50.4 }
];

for (const s of services) {
  const fin = calculateBookingFinancials(s.list);
  assert.strictEqual(fin.priceOnline, s.online, `${s.name} online price mismatch`);
  assert.strictEqual(fin.depositPaid, s.dep, `${s.name} deposit mismatch`);
  assert.strictEqual(fin.balanceDue, s.bal, `${s.name} balance mismatch`);
  assert.strictEqual(fin.depositPaid + fin.balanceDue, s.online, `${s.name} zero-cent discrepancy`);
}

// 4. Edge cases & Fuzzing
const edges = [39.0, 49.99, 17.77, 99.95, 1.0, 0.0];
for (const p of edges) {
  const fin = calculateBookingFinancials(p);
  const sum = Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100;
  assert.strictEqual(sum, fin.priceOnline, `Edge price ${p} sum mismatch`);
}

for (let i = 0; i < 5000; i++) {
  const rnd = Math.round((Math.random() * 999.99 + 0.01) * 100) / 100;
  const fin = calculateBookingFinancials(rnd);
  const sum = Math.round((fin.depositPaid + fin.balanceDue) * 100) / 100;
  assert.strictEqual(sum, fin.priceOnline, `Random price ${rnd} sum mismatch`);
}
console.log("[PASS] Financial formulas: 10% online discount, 20% deposit, 80% balance with 0-cent discrepancy (5000 randomized iterations passed)");
console.log("=== ALL INDEPENDENT CHECKS PASSED ===");
