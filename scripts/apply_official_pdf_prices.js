const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.json');

const OFFICIAL_PRICES = {
  // --- METODO ---
  'PF07001': 50.00,
  'PF07011': 50.00,

  // --- CELL-DETOXIUM ---
  'PF01451': 32.00,
  'PF01541': 54.00,
  'PF01551': 32.00,
  'PF01561': 32.00,
  'PF01571': 32.00,
  'PF01581': 67.00,
  'PF01591': 49.50,
  'PF01601': 29.00,
  'PF01611': 37.00,

  // --- HA HERO ---
  'PF01411': 46.00,
  'PF01421': 61.00,
  'PF01431': 67.00,
  'PF01441': 32.00,
  'PF01181': 62.00,

  // --- ICON TIME ---
  'PF01631': 120.00,
  'PF01661': 105.00,
  'PF01671': 85.00,
  'PF01681': 90.00,
  'PF01691': 95.00,
  'PF00931': 90.00,
  'PF01061': 57.00,

  // --- SMART PURE ---
  'PF08111': 40.00,
  'PF08121': 28.00,
  'PF08141': 36.00,
  'PF08151': 65.00,
  'PF08101': 32.00,
  'PF08131': 55.00,

  // --- SCULPTOREA ---
  'PF58091': 57.00,
  'PF58101': 42.00,
  'PF58111': 42.00,
  'PF58121': 68.00,
  'PF58131': 58.00,
  'PF58141': 40.00,
  'PF58151': 42.00,
  'PF58161': 58.00,

  // --- SOLARI ---
  'PF77551': 39.00,
  'PF77531': 35.00,
  'PF77201': 29.00,
  'PF77211': 39.00,
  'PF77221': 39.00,
  'PF77541': 38.00,
  'PF77231': 39.00,
  'PF77241': 40.00,
  'PF77121': 32.00,
  'PF77521': 40.00,
  'PF77101': 35.00,
  'PF77001': 35.00,
  'PF77561': 26.00,
  'PF77571': 40.00,
  'PF77581': 38.00,

  // --- SOLARI HAIRCARE ---
  'DHC120160': 19.90,
  'DHC120161': 23.90,

  // --- RVB LAB ---
  'MF101193': 42.50,
  'MF151002': 26.50,
  'MF152001A': 24.50
};

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let updatedCount = 0;
const logUpdates = [];

catalog.forEach(product => {
  // Find sku in variants or id
  const variant = product.variants && product.variants[0];
  const sku = variant && variant.sku ? variant.sku.toUpperCase() : null;

  if (sku && OFFICIAL_PRICES[sku] !== undefined) {
    const oldPrice = product.price;
    const newPrice = OFFICIAL_PRICES[sku];

    product.price = newPrice;

    if (Array.isArray(product.variants)) {
      product.variants.forEach(v => {
        v.price = newPrice;
      });
    }

    if (Array.isArray(product.shades)) {
      product.shades.forEach(s => {
        s.price = newPrice;
      });
    }

    updatedCount++;
    logUpdates.push({
      sku,
      name: product.name,
      oldPrice,
      newPrice
    });
  }
});

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

console.log(`Aggiornati con successo ${updatedCount} prodotti con i prezzi ufficiali da listino PDF!`);
console.log('Sample aggiornamenti:');
logUpdates.slice(0, 10).forEach(u => {
  console.log(`- ${u.sku}: ${u.oldPrice}€ -> ${u.newPrice}€ (${u.name})`);
});
