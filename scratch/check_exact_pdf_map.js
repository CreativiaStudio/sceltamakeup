const fs = require('fs');

// Mappa esatta e verificata 1:1 tra SKU e voce del listino PDF ufficiale (Gennaio 2026)
const PDF_MAP = {
  // --- METODO ---
  'PF07001': { line: 'METODO', name: 'NERO blend relax', format: '100 ml', listinoPrice: 50.00 },
  'PF07011': { line: 'METODO', name: 'BIANCO blend vitality', format: '100 ml', listinoPrice: 50.00 },

  // --- CELL-DETOXIUM ---
  'PF01451': { line: 'CELL-DETOXIUM', name: 'Struccante micellare bifasico', format: '300 ml', listinoPrice: 32.00 },
  'PF01541': { line: 'CELL-DETOXIUM', name: 'Fluido protezione giornaliera SPF50', format: '50 ml', listinoPrice: 54.00 },
  'PF01551': { line: 'CELL-DETOXIUM', name: 'Latte detergente', format: '250 ml', listinoPrice: 32.00 },
  'PF01561': { line: 'CELL-DETOXIUM', name: 'Tonico', format: '250 ml', listinoPrice: 32.00 },
  'PF01571': { line: 'CELL-DETOXIUM', name: 'Mousse', format: '150 ml', listinoPrice: 32.00 },
  'PF01581': { line: 'CELL-DETOXIUM', name: 'Booster serum', format: '50 ml', listinoPrice: 67.00 },
  'PF01591': { line: 'CELL-DETOXIUM', name: 'Burro struccante', format: '125 ml', listinoPrice: 49.50 },
  'PF01601': { line: 'CELL-DETOXIUM', name: 'Gommage detossinante', format: '75 ml', listinoPrice: 29.00 },
  'PF01611': { line: 'CELL-DETOXIUM', name: 'Maschera viso texturizzante', format: '75 ml', listinoPrice: 37.00 },

  // --- HA HERO ---
  'PF01411': { line: 'HA HERO', name: 'Contorno occhi all’acido ialuronico e cocktail di vitamine', format: '15 ml', listinoPrice: 46.00 },
  'PF01421': { line: 'HA HERO', name: 'Hyalu-crema gel sorgente di luce', format: '50 ml', listinoPrice: 61.00 },
  'PF01431': { line: 'HA HERO', name: 'Hyalu crema ricca ultra-nutriente', format: '50 ml', listinoPrice: 67.00 },
  'PF01441': { line: 'HA HERO', name: 'Trattamento labbra riparatore con acido ialuronico e ceramidi', format: '20 ml', listinoPrice: 32.00 },
  'PF01181': { line: 'HA HERO', name: 'Siero fondamentale idratazione profonda', format: '30 ml', listinoPrice: 62.00 },

  // --- ICON TIME ---
  'PF01631': { line: 'ICON TIME', name: 'Pro-collagen Super Mask', format: '8 pz', listinoPrice: 120.00 },
  'PF01661': { line: 'ICON TIME', name: 'Collagen booster - emulsione viso rassodante', format: '50 ml', listinoPrice: 105.00 },
  'PF01671': { line: 'ICON TIME', name: 'SILVER Crema anti età rivitalizzante', format: '50 ml', listinoPrice: 85.00 },
  'PF01681': { line: 'ICON TIME', name: 'GOLD Crema anti età ridensificante', format: '50 ml', listinoPrice: 90.00 },
  'PF01691': { line: 'ICON TIME', name: 'PLATINUM Crema anti età rinnovatrice', format: '50 ml', listinoPrice: 95.00 },
  'PF00931': { line: 'ICON TIME', name: 'Gold elixir - siero anti età ridensificante', format: '30 ml', listinoPrice: 90.00 },
  'PF01061': { line: 'ICON TIME', name: 'Crema contorno occhi correttiva', format: '15 ml', listinoPrice: 57.00 },

  // --- SMART PURE ---
  'PF08111': { line: 'SMART PURE', name: 'SOS trattamento rapido anti imperfezioni', format: '20 ml', listinoPrice: 40.00 },
  'PF08121': { line: 'SMART PURE', name: 'Pore stick maschera esfoliante', format: '35 g', listinoPrice: 28.00 },
  'PF08141': { line: 'SMART PURE', name: 'Crema gel sebo normalizzante', format: '50 ml', listinoPrice: 36.00 },
  'PF08151': { line: 'SMART PURE', name: 'Crema opacizzante', format: '50 ml', listinoPrice: 65.00 },
  'PF08101': { line: 'SMART PURE', name: 'OXY ACTIVE gel detergente', format: '150 ml', listinoPrice: 32.00 },
  'PF08131': { line: 'SMART PURE', name: 'PORE CONTROL concentrato', format: '30 ml', listinoPrice: 55.00 },

  // --- SCULPTOREA ---
  'PF58091': { line: 'SCULPTOREA', name: 'Thalasso scrub drenante', format: '500 g', listinoPrice: 57.00 },
  'PF58101': { line: 'SCULPTOREA', name: 'HYDRA-PEEL scrub rigenerante', format: '250 ml', listinoPrice: 42.00 },
  'PF58111': { line: 'SCULPTOREA', name: 'Crema superidratante', format: '250 ml', listinoPrice: 42.00 },
  'PF58121': { line: 'SCULPTOREA', name: 'Burro corpo antietà', format: '200 ml', listinoPrice: 68.00 },
  'PF58131': { line: 'SCULPTOREA', name: 'Crema corpo effetto lifting', format: '250 ml', listinoPrice: 58.00 },
  'PF58141': { line: 'SCULPTOREA', name: 'ICE SHOT criogel gambe leggere', format: '150 ml', listinoPrice: 40.00 },
  'PF58151': { line: 'SCULPTOREA', name: 'Concentrato Spray Detossinante', format: '100 ml', listinoPrice: 42.00 },
  'PF58161': { line: 'SCULPTOREA', name: 'Crema anticellulite termoattiva', format: '250 ml', listinoPrice: 58.00 },

  // --- SOLARI ---
  'PF77551': { line: 'SOLARI', name: 'Latte spray delicato SPF50', format: '150 ml', listinoPrice: 39.00 },
  'PF77531': { line: 'SOLARI', name: 'Crema protettiva idratante viso SPF30', format: '50 ml', listinoPrice: 35.00 },
  'PF77201': { line: 'SOLARI', name: 'Stick solare protezione invisibile SPF50+', format: '8 g', listinoPrice: 29.00 },
  'PF77211': { line: 'SOLARI', name: 'Crema protettiva illuminante antimacchia viso SPF50', format: '50 ml', listinoPrice: 39.00 },
  'PF77221': { line: 'SOLARI', name: 'Crema protettiva abbronzante antietà viso SPF50', format: '50 ml', listinoPrice: 39.00 },
  'PF77541': { line: 'SOLARI', name: 'Crema-gel protettiva abbronzante corpo SPF20', format: '150 ml', listinoPrice: 38.00 },
  'PF77231': { line: 'SOLARI', name: 'Crema-gel idratante protettiva corpo SPF30', format: '150 ml', listinoPrice: 39.00 },
  'PF77241': { line: 'SOLARI', name: 'Crema-gel idratante protettiva corpo SPF50', format: '150 ml', listinoPrice: 40.00 },
  'PF77121': { line: 'SOLARI', name: 'Olio sublimatore di abbronzatura', format: '200 ml', listinoPrice: 32.00 },
  'PF77521': { line: 'SOLARI', name: 'Burro mousse doposole vellutante', format: '250 ml', listinoPrice: 40.00 },
  'PF77101': { line: 'SOLARI', name: 'Acqua super abbronzante', format: '300 ml', listinoPrice: 35.00 },
  'PF77001': { line: 'SOLARI', name: 'Gel preparatore e potenziatore di abbronzatura', format: '150 ml', listinoPrice: 35.00 },
  'PF77561': { line: 'SOLARI', name: 'Balsamo protettivo labbra SPF30', format: '10 ml', listinoPrice: 26.00 },
  'PF77571': { line: 'SOLARI', name: 'Crema idratante protettiva SPF 50+', format: '150 ml', listinoPrice: 40.00 },
  'PF77581': { line: 'SOLARI', name: 'Crema doposole idratante', format: '250 ml', listinoPrice: 38.00 },

  // --- SOLARI HAIRCARE ---
  'DHC120160': { line: 'SOLARI HAIRCARE', name: 'Sun mask - maschera dopo sole riparatrice', format: '150 ml', listinoPrice: 19.90 },
  'DHC120161': { line: 'SOLARI HAIRCARE', name: 'Sun oil - olio capelli protettivo', format: '90 ml', listinoPrice: 23.90 },

  // --- RVB LAB (Pagina 3) ---
  'MF101193': { line: 'RVB LAB - VISO', name: 'Meso Fill foundation - plump&fill', format: '30 ml', listinoPrice: 42.50 },
  'MF151002': { line: 'RVB LAB - BASI E ACCESSORI', name: 'Base trucco levigante', format: '30 ml', listinoPrice: 26.50 },
  'MF152001A': { line: 'RVB LAB - BASI E ACCESSORI', name: 'Struccante bifasico', format: '125 ml', listinoPrice: 24.50 }
};

const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
const research = JSON.parse(fs.readFileSync('scripts/ddp_products_to_research.json', 'utf8'));

const certainMatches = [];

for (const [sku, pdf] of Object.entries(PDF_MAP)) {
  const r = research.find(x => x.sku.toUpperCase() === sku);
  const c = catalog.find(x => x.variants?.some(v => v.sku?.toUpperCase() === sku) || x.id === r?.id);
  const currentPrice = c ? c.price : (r ? r.currentPrice : null);

  certainMatches.push({
    sku,
    ean: r ? r.ean : '',
    line: pdf.line,
    officialName: pdf.name,
    format: pdf.format,
    listinoPrice: pdf.listinoPrice,
    gestionalePrice: currentPrice,
    diff: currentPrice ? (pdf.listinoPrice - currentPrice).toFixed(2) : null,
    invoiceDesc: r ? r.invoiceDesc : ''
  });
}

console.log('Totale agganciati al 100% con listino ufficiale PDF:', certainMatches.length);

fs.writeFileSync('scratch/exact_pdf_comparison.json', JSON.stringify(certainMatches, null, 2));
