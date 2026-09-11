const fs = require('fs');
const path = require('path');

const BASE_DIR = 'c:/Users/mario/Progetti Antigravity/Scelta Makeup';
const catalog = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data/catalog.json')));
const ddpRetail = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'scripts/invoice_retail_ddp.json')));
const cipriaRetail = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'scripts/invoice_retail_cipria.json')));

// Build lookup maps
const ddpMap = new Map();
for (const item of ddpRetail) {
  ddpMap.set(item.code.toUpperCase().trim(), item);
  if (item.ean) ddpMap.set(item.ean.trim(), item);
}

const cipriaMap = new Map();
for (const item of cipriaRetail) {
  cipriaMap.set(item.ean.trim(), item);
}

console.log(`Catalog products: ${catalog.length}`);
let totalVariants = 0;
let matchedVariants = 0;
let unmatchedVariants = 0;

for (const prod of catalog) {
  if (!prod.variants) continue;
  for (const v of prod.variants) {
    totalVariants++;
    const sku = (v.sku || '').toUpperCase().trim();
    const ean = (v.ean || '').trim();
    const ddpMatch = ddpMap.get(sku) || (ean ? ddpMap.get(ean) : null);
    const cipriaMatch = ean ? cipriaMap.get(ean) : null;
    if (ddpMatch || cipriaMatch) {
      matchedVariants++;
    } else {
      unmatchedVariants++;
    }
  }
}

console.log(`Total variants in catalog: ${totalVariants}`);
console.log(`Matched with invoices: ${matchedVariants}`);
console.log(`Unmatched variants: ${unmatchedVariants}`);
