const fs = require('fs');

// Tutti i prodotti del listino ufficiale Diego dalla Palma Professional (Gennaio 2026)
const PDF_ITEMS = [
  // METODO
  { line: 'METODO', name: 'NERO blend relax', format: '100 ml', price: 50.00 },
  { line: 'METODO', name: 'BIANCO blend vitality', format: '100 ml', price: 50.00 },

  // CELL-DETOXIUM
  { line: 'CELL-DETOXIUM', name: 'Struccante micellare bifasico', format: '300 ml', price: 32.00 },
  { line: 'CELL-DETOXIUM', name: 'Fluido protezione giornaliera SPF50', format: '50 ml', price: 54.00 },
  { line: 'CELL-DETOXIUM', name: 'Latte detergente', format: '250 ml', price: 32.00 },
  { line: 'CELL-DETOXIUM', name: 'Tonico', format: '250 ml', price: 32.00 },
  { line: 'CELL-DETOXIUM', name: 'Mousse', format: '150 ml', price: 32.00 },
  { line: 'CELL-DETOXIUM', name: 'Booster serum', format: '50 ml', price: 67.00 },
  { line: 'CELL-DETOXIUM', name: 'Burro struccante', format: '125 ml', price: 49.50 },
  { line: 'CELL-DETOXIUM', name: 'Gommage detossinante', format: '75 ml', price: 29.00 },
  { line: 'CELL-DETOXIUM', name: 'Maschera viso texturizzante', format: '75 ml', price: 37.00 },

  // HA HERO
  { line: 'HA HERO', name: 'Contorno occhi all’acido ialuronico e cocktail di vitamine', format: '15 ml', price: 46.00 },
  { line: 'HA HERO', name: 'Hyalu-crema gel sorgente di luce', format: '50 ml', price: 61.00 },
  { line: 'HA HERO', name: 'Hyalu crema ricca ultra-nutriente', format: '50 ml', price: 67.00 },
  { line: 'HA HERO', name: 'Trattamento labbra riparatore con acido ialuronico e ceramidi', format: '20 ml', price: 32.00 },
  { line: 'HA HERO', name: 'Siero fondamentale idratazione profonda', format: '30 ml', price: 62.00 },

  // ICON TIME
  { line: 'ICON TIME', name: 'Pro-collagen Super Mask', format: '8 pz', price: 120.00 },
  { line: 'ICON TIME', name: 'Collagen booster - emulsione viso rassodante', format: '50 ml', price: 105.00 },
  { line: 'ICON TIME', name: 'SILVER Crema anti età rivitalizzante', format: '50 ml', price: 85.00 },
  { line: 'ICON TIME', name: 'GOLD Crema anti età ridensificante', format: '50 ml', price: 90.00 },
  { line: 'ICON TIME', name: 'PLATINUM Crema anti età rinnovatrice', format: '50 ml', price: 95.00 },
  { line: 'ICON TIME', name: 'Gold elixir - siero anti età ridensificante', format: '30 ml', price: 90.00 },
  { line: 'ICON TIME', name: 'Crema contorno occhi correttiva', format: '15 ml', price: 57.00 },

  // SMART PURE
  { line: 'SMART PURE', name: 'SOS trattamento rapido anti imperfezioni', format: '20 ml', price: 40.00 },
  { line: 'SMART PURE', name: 'Pore stick maschera esfoliante', format: '35 g', price: 28.00 },
  { line: 'SMART PURE', name: 'Crema gel sebo normalizzante', format: '50 ml', price: 36.00 },
  { line: 'SMART PURE', name: 'Crema opacizzante', format: '50 ml', price: 65.00 },
  { line: 'SMART PURE', name: 'OXY ACTIVE gel detergente', format: '150 ml', price: 32.00 },
  { line: 'SMART PURE', name: 'PORE CONTROL concentrato', format: '30 ml', price: 55.00 },

  // SCULPTOREA
  { line: 'SCULPTOREA', name: 'Thalasso scrub drenante', format: '500 g', price: 57.00 },
  { line: 'SCULPTOREA', name: 'HYDRA-PEEL scrub rigenerante', format: '250 ml', price: 42.00 },
  { line: 'SCULPTOREA', name: 'Crema superidratante', format: '250 ml', price: 42.00 },
  { line: 'SCULPTOREA', name: 'Burro corpo antietà', format: '200 ml', price: 68.00 },
  { line: 'SCULPTOREA', name: 'Crema corpo effetto lifting', format: '250 ml', price: 58.00 },
  { line: 'SCULPTOREA', name: 'ICE SHOT criogel gambe leggere', format: '150 ml', price: 40.00 },
  { line: 'SCULPTOREA', name: 'Concentrato Spray Detossinante', format: '100 ml', price: 42.00 },
  { line: 'SCULPTOREA', name: 'Crema anticellulite termoattiva', format: '250 ml', price: 58.00 },

  // SOLARI
  { line: 'SOLARI', name: 'Latte spray delicato SPF50', format: '150 ml', price: 39.00 },
  { line: 'SOLARI', name: 'Crema protettiva idratante viso SPF30', format: '50 ml', price: 35.00 },
  { line: 'SOLARI', name: 'Stick solare protezione invisibile SPF50+', format: '8 g', price: 29.00 },
  { line: 'SOLARI', name: 'Crema protettiva illuminante antimacchia viso SPF50', format: '50 ml', price: 39.00 },
  { line: 'SOLARI', name: 'Crema protettiva abbronzante antietà viso SPF50', format: '50 ml', price: 39.00 },
  { line: 'SOLARI', name: 'Crema-gel protettiva abbronzante corpo SPF20', format: '150 ml', price: 38.00 },
  { line: 'SOLARI', name: 'Crema-gel idratante protettiva corpo SPF30', format: '150 ml', price: 39.00 },
  { line: 'SOLARI', name: 'Crema-gel idratante protettiva corpo SPF50', format: '150 ml', price: 40.00 },
  { line: 'SOLARI', name: 'Olio sublimatore di abbronzatura', format: '200 ml', price: 32.00 },
  { line: 'SOLARI', name: 'Burro mousse doposole vellutante', format: '250 ml', price: 40.00 },
  { line: 'SOLARI', name: 'Acqua super abbronzante', format: '300 ml', price: 35.00 },
  { line: 'SOLARI', name: 'Gel preparatore e potenziatore di abbronzatura', format: '150 ml', price: 35.00 },
  { line: 'SOLARI', name: 'Balsamo protettivo labbra SPF30', format: '10 ml', price: 26.00 },
  { line: 'SOLARI', name: 'Crema idratante protettiva SPF 50+', format: '150 ml', price: 40.00 },
  { line: 'SOLARI', name: 'Crema doposole idratante', format: '250 ml', price: 38.00 },

  // SOLARI HAIRCARE
  { line: 'SOLARI HAIRCARE', name: 'Sun mask - maschera dopo sole riparatrice', format: '150 ml', price: 19.90 },
  { line: 'SOLARI HAIRCARE', name: 'Sun oil - olio capelli protettivo', format: '90 ml', price: 23.90 },

  // RVB LAB (page 3)
  { line: 'RVB LAB', name: 'Meso Fill foundation - plump&fill', format: '30 ml', price: 42.50 },
  { line: 'RVB LAB', name: 'Base trucco levigante', format: '30 ml', price: 26.50 },
  { line: 'RVB LAB', name: 'Struccante bifasico', format: '125 ml', price: 24.50 },
  { line: 'RVB LAB', name: 'Delineatore occhi water resistant', format: '1 ml', price: 20.50 }
];

const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
const research = JSON.parse(fs.readFileSync('scripts/ddp_products_to_research.json', 'utf8'));

console.log('Total research products:', research.length);

// Let us inspect matches between our 86 products and the PDF items
const matchedCertain = [];
const cabinaItems = [];
const unmatched = [];

for (const r of research) {
  const catItem = catalog.find(p => p.variants?.some(v => v.sku?.toUpperCase() === r.sku.toUpperCase()) || p.id === r.id);
  const currentPriceInGestionale = catItem ? catItem.price : r.currentPrice;
  const inv = (r.invoiceDesc || '').toLowerCase();
  const sku = r.sku.toUpperCase();

  // Check if it is Cabina (ending in 5 in PF...)
  if (sku.startsWith('PF') && sku.endsWith('5')) {
    cabinaItems.push({
      sku: r.sku,
      ean: r.ean,
      invoiceDesc: r.invoiceDesc,
      gestionalePrice: currentPriceInGestionale,
      wholesaleCost: r.wholesaleCost
    });
    continue;
  }

  // Exact matching against PDF items
  let found = null;

  // DHC Solari Hair
  if (sku === 'DHC120160') {
    found = PDF_ITEMS.find(p => p.name.includes('Sun mask'));
  } else if (sku === 'DHC120161') {
    found = PDF_ITEMS.find(p => p.name.includes('Sun oil'));
  } else if (sku === 'MF101193') {
    found = PDF_ITEMS.find(p => p.name.includes('Meso Fill foundation'));
  } else if (sku === 'MF151002') {
    found = PDF_ITEMS.find(p => p.name.includes('Base trucco levigante'));
  } else if (sku === 'MF152001A') {
    found = PDF_ITEMS.find(p => p.name.includes('Struccante bifasico') && p.line === 'RVB LAB');
  } else {
    // Search by matching keywords in invoiceDesc
    found = PDF_ITEMS.find(p => {
      const pWords = p.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchCount = pWords.filter(w => inv.includes(w)).length;
      return matchCount >= 2 && inv.includes(p.line.toLowerCase().split(/[\s-]+/)[0]);
    });
  }

  if (found) {
    matchedCertain.push({
      sku: r.sku,
      ean: r.ean,
      invoiceDesc: r.invoiceDesc,
      pdfLine: found.line,
      pdfName: found.name,
      pdfFormat: found.format,
      pdfPrice: found.price,
      gestionalePrice: currentPriceInGestionale,
      wholesaleCost: r.wholesaleCost
    });
  } else {
    unmatched.push({
      sku: r.sku,
      ean: r.ean,
      invoiceDesc: r.invoiceDesc,
      gestionalePrice: currentPriceInGestionale,
      wholesaleCost: r.wholesaleCost
    });
  }
}

console.log('Matched Certain 100%:', matchedCertain.length);
console.log('Cabina Formats (not in retail listino):', cabinaItems.length);
console.log('Unmatched:', unmatched.length);

fs.writeFileSync('scratch/pdf_matched_results.json', JSON.stringify({ matchedCertain, cabinaItems, unmatched }, null, 2));
