const fs = require('fs');
const path = require('path');

const BASE_DIR = 'c:/Users/mario/Progetti Antigravity/Scelta Makeup';
const ddp = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'scripts/raw_ddp_items.json')));
const cipria = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'scripts/raw_cipria_items.json')));

// Filter out testers, cabin professional formats, merchandising
function isRetailDdp(item) {
  const c = item.code.toUpperCase();
  const d = item.desc.toUpperCase();
  if (c.startsWith('PT') || c.startsWith('MT') || c.startsWith('MTC')) return false;
  if (/\b(TST|TESTER)\b/.test(c) || /\b(TST|TESTER)\b/.test(d)) return false;
  if (/\bPROF\b/.test(c) || /\bPROF\b/.test(d)) return false;
  if (c.startsWith('PA') || c.startsWith('PM') || c.startsWith('PSS') || c.startsWith('MP') || c.startsWith('MSS')) return false;
  return true;
}

function isRetailCipria(item) {
  const d = item.desc.toUpperCase();
  if (d.startsWith('PT') || d.startsWith('MT')) return false;
  if (/\b(TST|TESTER)\b/.test(d)) return false;
  if (/\bPROF\b/.test(d)) return false;
  if (d.startsWith('PA') || d.startsWith('PM') || d.startsWith('PSS')) return false;
  return true;
}

const retailDdp = ddp.filter(isRetailDdp);
const nonRetailDdp = ddp.filter(i => !isRetailDdp(i));

const retailCipria = cipria.filter(isRetailCipria);
const nonRetailCipria = cipria.filter(i => !isRetailCipria(i));

console.log(`DDP Total: ${ddp.length} rows (${ddp.reduce((s, i) => s + i.qty, 0)} pcs)`);
console.log(`DDP Retail: ${retailDdp.length} rows (${retailDdp.reduce((s, i) => s + i.qty, 0)} pcs)`);
console.log(`DDP Non-retail (testers/cabin/expo): ${nonRetailDdp.length} rows (${nonRetailDdp.reduce((s, i) => s + i.qty, 0)} pcs)`);

console.log(`\nCipria Total: ${cipria.length} rows (${cipria.reduce((s, i) => s + i.qty, 0)} pcs)`);
console.log(`Cipria Retail: ${retailCipria.length} rows (${retailCipria.reduce((s, i) => s + i.qty, 0)} pcs)`);
console.log(`Cipria Non-retail (testers/campionari): ${nonRetailCipria.length} rows (${nonRetailCipria.reduce((s, i) => s + i.qty, 0)} pcs)`);

// Aggregate quantities by EAN / Code
const ddpByCode = new Map();
for (const item of retailDdp) {
  const key = item.code.toUpperCase().trim();
  const existing = ddpByCode.get(key) || { code: key, ean: item.ean, desc: item.desc, qty: 0 };
  existing.qty += item.qty;
  ddpByCode.set(key, existing);
}

const cipriaByEan = new Map();
for (const item of retailCipria) {
  const key = item.ean.trim();
  const existing = cipriaByEan.get(key) || { ean: key, desc: item.desc, qty: 0, unitPrice: item.unitPrice };
  existing.qty += item.qty;
  cipriaByEan.set(key, existing);
}

console.log(`\nUnique Retail DDP Codes: ${ddpByCode.size}`);
console.log(`Unique Retail Cipria EANs: ${cipriaByEan.size}`);

// Save aggregated retail invoice mapping
fs.writeFileSync(path.join(BASE_DIR, 'scripts/invoice_retail_ddp.json'), JSON.stringify(Array.from(ddpByCode.values()), null, 2));
fs.writeFileSync(path.join(BASE_DIR, 'scripts/invoice_retail_cipria.json'), JSON.stringify(Array.from(cipriaByEan.values()), null, 2));
