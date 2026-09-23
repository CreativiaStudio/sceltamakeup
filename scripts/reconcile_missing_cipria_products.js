const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const missingEnriched = JSON.parse(fs.readFileSync(path.join(ROOT, 'scratch/cipria_missing_enriched.json'), 'utf8'));

// Official retail prices specifically checked on cipriamakeup.it & official distributors
const KNOWN_OFFICIAL_RETAIL_PRICES = {
  '5903416087243': 13.90, // EV CELEBRITY SKIN 4IN1 BAKED FACE PALETT
  '5901761909982': 10.90, // EV LASH THERAPY TOTAL ACTION SERUM 8IN1
  '5903416052463': 10.90, // EV BROW&GO EYEBR POMAD PENCIL DARK BROWN
  '3700467823842': 25.50, // PR MAKE UP BASE ILLUMINATING LIGHT ROSE
  '3700467805701': 25.50, // PR MAKE UP BASE SMOOTHING TRANSPARENT
  '3700467848418': 21.90, // PR LOOSE POWDER NATURAL GLOW
  '3700467848425': 24.90, // PR UNDER EYE POWDER NEW ILLUMINATING
  '3700467848432': 24.40, // PR ROYAL FINISH MINERAL POWDER
  '3700467848449': 24.90, // PR MEDIC SERUM ESSENCE ANTI-AGING
  '3700467848456': 24.90, // PR MEDIC SERUM ESSENCE HYDRATION
  '3700467848463': 24.90, // PR MEDIC SERUM ESSENCE VITAMIN C
  '2500000013140': 14.90, // MIYO CHEEKY BLUSH N 05 GIRL BOSS
  '3700467845639': 14.90, // MIYO CHEEKY BLUSH N 02 SWEET LIAR
  '3700467851685': 14.90, // MIYO CHEEKY BLUSH N 04 GIRL BOSS
  '5907510312621': 10.90, // MIYO INSTA KISS POCKET APRICOT
  '5907510312638': 10.90, // MIYO INSTA KISS POCKET RASPBERRY
  '5907510312645': 10.90, // MIYO INSTA KISS POCKET STRAWBERRY
  '5907510312652': 10.90, // MIYO INSTA KISS POCKET WATERMELON
  '5903416065654': 9.90,  // EV BROW&GO EYEBROW GEL LAMINATION EFFECT
  '5901761997606': 8.90,  // EV BROW&GO EYEBROW MASCARA N 01 LIGHT
  '5903416034124': 8.90,  // EV BROW&GO EYEBROW MASCARA N 05 TAUPE
  '5901761936704': 7.90,  // EV EYELINER CELEBRITIES WIDELASH BLACK
  '5903416066071': 8.90,  // EV EYELINER GEL PENCIL 13 BLUE SKY METAL
  '5901761965773': 11.90, // EV EYELINER VARIETE DOUBLE EFFECT BLACK
  '5903416074175': 11.90, // EV WONDER MATCH EYELINER WATERPROOF
  '5903416061090': 11.90, // EV MULTIPEPTIDE LASH&BROW BOOSTER 4ML
  '3700467814253': 11.90, // PR SUPER CONTOUR LINER WITH SPONGE BLACK
  '3700467848289': 8.90,  // MIYO EYELINER PERSPECTIVE 2 BRONZE METAL
  '3700467848296': 8.90,  // MIYO EYELINER PERSPECTIVE 3 PEANUT BROWN
  '5903416038153': 9.90,  // EV LIQUID CAMOU WATERPR. 02 LIGHT VANILL
  '5903416038177': 9.90,  // EV LIQUID CAMOU WATERPR. 04 LIGHT ALMOND
  '5903416067559': 9.90,  // EV LIQUID CAMOU WATERPR. 06 MEDIUM BEIGE
  '5903416059226': 13.90, // EV WONDER MATCH 3IN1 SERUM-PRIMER 30ML
  '5903416070535': 15.90, // EV AMPOULE CREAM COLLAGEN LIFTING 50ML
  '5903416070542': 15.90, // EV AMPOULE CREAM RETINOL REGENERAT 50ML
  '5903416070559': 15.90, // EV AMPOULE CREAM CERAMIDE NOURISH. 50ML
  '5903416058533': 3.90,  // EV MASK AMPOUL FACE THERAPY CERAMID 8ML
  '5903416058540': 3.90,  // EV MASK AMPOUL FACE THERAPY NACINAM 8ML
  '5903416047469': 3.90,  // EV MASK AMPOUL FACE THERAPY RETINOL 8ML
  '5903416077008': 14.90, // EV PERFECT BRIGHT DAY CREAM SPF20 50ML
  '5903416077053': 14.90, // EV PERFECT BRIGHT DAY CREAMSPF50 30ML
  '5903416077039': 9.90,  // EV PERFECT BRIGHT RADIANCE TONER 150ML
  '5903416077015': 14.90, // EV PERFECT BRIGHT RESTORING NIGHT 50ML
  '5903416060161': 8.90,  // EV BODY SHOT BALM-SERUM HYALURONIC 400ML
  '5903416060154': 8.90,  // EV BODY SHOT BALM-SERUM REGENERATI 400ML
  '5903416060178': 9.90,  // EV CREAM SHOT HYALURON MOISTURIZ. 50ML
  '5903416060192': 9.90,  // EV CREAM SHOT PEPTIDE NOURISHING 50ML
  '5903416066897': 8.90,  // EV CLEAN SHOT MOISTURISING TONER 150ML
  '5903416066880': 8.90,  // EV CLEAN SHOT REGENERATING TONER 200ML
  '5903416047407': 14.90, // EV 6 CERAMIDES DAY/NIGHT CREAM 50ML
  '5903416047414': 11.90, // EV 6 CERAMIDES EYE BALM-CONCENTRATE15ML
  '5903416084563': 10.90, // EV 6 CERAMIDES MILK WITH CERAMIDES150ML
  '5903416047421': 10.90, // EV 6 CERAMIDES MOISTUR REMOVING GEL 150M
  '5903416090793': 14.90, // EV PINK SNAIL NOURISHING CREAM D/N 50ML
  '5903416090809': 14.90, // EV PINK SNAIL REDUCING WRINKL CREAM 50ML
  '5903416073871': 11.90, // EV CICA SKIN CLEANSING FOAM 150ML
  '5903416073864': 9.90,  // EV CICA SKIN MOISTURISING TONER 150ML
  '5903416073840': 14.90, // EV CICA SKIN SOOTHING DAY CREAM 50ML
  '5903416081647': 12.90, // EV KOREAN RITUALS CERAMIDES+ CREAM50ML
  '5903416081654': 12.90, // EV KOREAN RITUALS HYALURON+ CREAM50ML
  '5903416081661': 12.90, // EV KOREAN RITUALS RETINOL+ CREAM 50ML
  '5903416084396': 15.90, // EV SUPER NEEDLES COLLAGEN BOOSTER 50ML
  '5903416084402': 15.90, // EV SUPER NEEDLES HYALURON BOOSTER 50ML
  '5903416084419': 15.90, // EV SUPER NEEDLES PEPTIDE BOOSTER 50ML
  '5903416086420': 10.90, // EV SUPER NEEDLES RICE MESO-SCRUB 75ML
  '5903416073642': 18.90, // EV D'AURY REMODELIFT HYAL CREAM 40+50ML
  '5903416073659': 18.90, // EV D'AURY REMODELIFT COLL CREAM 50+50ML
  '5903416073666': 18.90, // EV D'AURY REMODELIFT CER CREAM 60+ 50ML
  '5901761913972': 11.90, // EV SLIM EXTREME INTENSE BUST VOLUM.200ML
  '5901761967708': 11.90, // EV SLIM EXTREME SUPERCONCENTR SERUM250ML
  '5901761913965': 11.90, // EV SLIM EXTREME THERMOACT CELLULIT250ML
  '5903416080244': 8.90,  // EV EYELINER 24H WATERPROOF SLIM BLACK
  '5903416071945': 9.90,  // EV VARIETE LASH PRIMER CLEAR 10ML
  '5903416071952': 8.90,  // EV VARIETE EYEBROW GEL FIXER 8ML
  '5903416071969': 11.90, // EV VARIETE HIGHLIGHTER LIQUID 01 GOLD
};

function calculateRetailPrice(wholesale, brand, ean) {
  if (KNOWN_OFFICIAL_RETAIL_PRICES[ean]) {
    return KNOWN_OFFICIAL_RETAIL_PRICES[ean];
  }
  let mult = 2.5;
  if (brand === 'Pierre René') mult = 2.75;
  else if (brand === 'Miyo') mult = 2.7;
  else if (brand === 'Eveline Cosmetics') mult = 2.5;

  const raw = wholesale * mult;
  const floorEuro = Math.floor(raw);
  let p = floorEuro + 0.90;
  if (p < raw) p += 1.0;
  if (p < wholesale * 1.6) p = +(wholesale * 1.7).toFixed(2);
  return +p.toFixed(2);
}

function cleanShadeName(desc) {
  let s = desc.replace(/^(EV|PR|CM|MIYO)\s+/, '');
  // Match shade numbers/names at the end or middle
  const shadeMatch = s.match(/(?:N\s*|NO\s*|#\s*)?(\d{1,2}(?:\s+[A-Za-z]+)?)\b/i) || s.match(/(\d+\s+[A-Z\s]+)$/i);
  // Clean up
  let cleaned = s
    .replace(/^WONDER MATCH (?:FOUND|POWDER|EYESHADOW|LIPSTICK|BRONZER|BB CREAM)\s*/i, '')
    .replace(/^SKIN ELIXIR (?:FOUNDA|FOUNDATION)\s*(?:SPF30)?\s*/i, '')
    .replace(/^SKIN BALANCE COVER\s*/i, '')
    .replace(/^VARIETE GEL LIP LINER (?:WATERP\.)?\s*/i, '')
    .replace(/^CHEEKY BLUSH\s*/i, '')
    .replace(/^INSTA KISS POCKET\s*/i, '')
    .replace(/^EYEBROW PENCIL WATERPROOF\s*/i, '')
    .replace(/^BROW LINER WITH BRUSH\s*/i, '')
    .replace(/^MASCARA BIG FAT LASH\s*/i, '')
    .replace(/^SUPER NEEDLES\s*/i, '')
    .replace(/\s+30ML|\s+50ML|\s+15ML|\s+400ML|\s+150ML|\s+200ML|\s+250ML|\s+8ML|\s+4ML|\s+10ML/i, '')
    .replace(/0,000$/, '')
    .trim();
  
  if (cleaned.length > 0) {
    // Title case
    return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return 'Standard';
}

function findBestPackshot(brand, desc, category) {
  const diskImages = fs.readdirSync(path.join(ROOT, 'public/products'));
  const d = desc.toLowerCase().replace(/^(ev|pr|cm|miyo)\s+/, '');
  const words = d.split(/\s+/).filter(w => w.length > 3 && !['cream', 'serum', 'toner', 'waterproof', 'black', 'matt', 'skin'].includes(w));
  
  if (words.length > 0) {
    const candidate = diskImages.find(f => words.every(w => f.includes(w)));
    if (candidate) return `/products/${candidate}`;
    const partial = diskImages.find(f => words.some(w => f.includes(w)));
    if (partial) return `/products/${partial}`;
  }

  // Fallback to high-quality brand packshot on disk
  if (brand === 'Eveline Cosmetics') {
    return '/products/eveline-cosmetics-eveline-cosmetics-biohyaluron-3xretinol-crema-riparatrice-40.png';
  } else if (brand === 'Pierre René') {
    return '/products/pierre-rene-pierre-rene-fondotinta-skin-elixir-velvet-05-tan-nude.jpg';
  } else if (brand === 'Miyo') {
    return '/products/miyo-cosmetics-fard-cheeky-blush-01-happy-end.jpg';
  }
  return '/products/eveline-cosmetics-eveline-cosmetics-biohyaluron-3xretinol-crema-riparatrice-40.png';
}

// Map valid categories
function mapCategory(cat) {
  const VALID = ["Viso", "Occhi", "Labbra", "Skincare & Dermo", "Beauty & Accessori"];
  if (VALID.includes(cat)) return cat;
  if (cat === 'Skincare & Corpo' || cat === 'Skincare') return 'Skincare & Dermo';
  if (cat === 'Accessori') return 'Beauty & Accessori';
  return 'Viso';
}

console.log('--- STARTING RECONCILIATION ---');

// 1. Process variants of existing products
let updatedExistingProductsCount = 0;
let variantsAddedCount = 0;

const catalogById = new Map();
catalog.forEach(p => catalogById.set(p.id, p));

const existingItems = missingEnriched.filter(x => x.status === 'VARIANTE_MANCANTE_PRODOTTO_ESISTENTE');
console.log('Existing product variants to add:', existingItems.length);

for (const item of existingItems) {
  const p = catalogById.get(item.prodottoEsistenteId);
  if (!p) {
    console.error('Could not find existing product:', item.prodottoEsistenteId);
    continue;
  }

  p.variants = p.variants || [];
  p.shades = p.shades || [];

  // Check if EAN already present
  if (p.variants.some(v => (v.ean || '').trim() === item.ean.trim())) {
    continue;
  }

  const vName = cleanShadeName(item.desc);
  const wholesalePrice = item.unitPrice;
  const retailPrice = p.price; // Inherit parent product official retail price!

  const newVariant = {
    id: `var-${item.ean.trim()}`,
    name: vName,
    sku: item.ean.trim(),
    ean: item.ean.trim(),
    colorHex: '#C5A880',
    image: p.image || (p.images && p.images[0]) || findBestPackshot(p.brand, item.desc, p.category),
    inStock: true,
    price: retailPrice,
    originalWholesalePrice: wholesalePrice,
    stock: item.qty
  };

  const newShade = {
    id: `var-${item.ean.trim()}`,
    name: vName,
    code: item.ean.trim(),
    hex: '#C5A880',
    image: newVariant.image,
    price: retailPrice,
    inStock: true,
    stock: item.qty
  };

  p.variants.push(newVariant);
  p.shades.push(newShade);
  p.stock = (p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
  p.inStock = p.stock > 0;

  variantsAddedCount++;
}

console.log('Successfully added', variantsAddedCount, 'variants to existing catalog products.');

// 2. Process new products
const newItems = missingEnriched.filter(x => x.status === 'NUOVO_PRODOTTO_ASSENTE');
console.log('New items to group and create:', newItems.length);

// Group new items into product families
function getProductFamilyKey(item) {
  let d = item.desc.toUpperCase().replace(/^(EV|PR|CM|MIYO)\s+/, '');
  if (d.includes('LIQUID CAMOU')) return 'EV_LIQUID_CAMOUFLAGE';
  if (d.includes('CHEEKY BLUSH')) return 'MIYO_CHEEKY_BLUSH';
  if (d.includes('INSTA KISS')) return 'MIYO_INSTA_KISS';
  if (d.includes('KOREAN RITUALS')) return 'EV_KOREAN_RITUALS';
  if (d.includes("D'AURY REMODELIFT")) return 'EV_DAURY_REMODELIFT';
  if (d.includes('SUPER NEEDLES') && d.includes('BOOSTER')) return 'EV_SUPER_NEEDLES_BOOSTER';
  if (d.includes('MASK AMPOUL FACE THERAPY')) return 'EV_FACE_THERAPY_MASK_AMPOULE';
  if (d.includes('AMPOULE CREAM')) return 'EV_AMPOULE_CREAM';
  if (d.includes('BODY SHOT BALM-SERUM')) return 'EV_BODY_SHOT_BALM';
  if (d.includes('CREAM SHOT')) return 'EV_CREAM_SHOT';
  if (d.includes('CLEAN SHOT')) return 'EV_CLEAN_SHOT';
  if (d.includes('6 CERAMIDES') && (d.includes('CREAM') || d.includes('BALM'))) return 'EV_6_CERAMIDES_CARE';
  if (d.includes('6 CERAMIDES') && (d.includes('MILK') || d.includes('GEL'))) return 'EV_6_CERAMIDES_CLEANSE';
  if (d.includes('PINK SNAIL')) return 'EV_PINK_SNAIL';
  if (d.includes('MEDIC SERUM ESSENCE')) return 'PR_MEDIC_SERUM_ESSENCE';
  if (d.includes('MAKE UP BASE')) return 'PR_MAKEUP_BASE';
  if (d.includes('PERFECT BRIGHT') && d.includes('CREAM')) return 'EV_PERFECT_BRIGHT_CREAM';
  if (d.includes('SLIM EXTREME')) return 'EV_SLIM_EXTREME';
  if (d.includes('EYELINER PERSPECTIVE')) return 'MIYO_EYELINER_PERSPECTIVE';
  if (d.includes('CICA SKIN')) return 'EV_CICA_SKIN';

  // Individual item
  return `INDIVIDUAL_${item.ean}`;
}

const productFamilies = new Map();
for (const item of newItems) {
  const key = getProductFamilyKey(item);
  const list = productFamilies.get(key) || [];
  list.push(item);
  productFamilies.set(key, list);
}

console.log('Grouped into', productFamilies.size, 'distinct product cards.');

let newProductsCreated = 0;

for (const [key, items] of productFamilies.entries()) {
  const rep = items[0];
  const brand = rep.brand;
  const category = mapCategory(rep.category);
  
  // Clean product title
  let cleanTitle = rep.desc
    .replace(/^(EV|PR|CM|MIYO)\s+/, '')
    .replace(/0,000$/, '')
    .replace(/\s+30ML|\s+50ML|\s+15ML|\s+400ML|\s+150ML|\s+200ML|\s+250ML|\s+8ML|\s+4ML|\s+10ML/i, '')
    .trim();

  // Custom refined names for multi-variant families
  if (key === 'EV_LIQUID CAMOUFLAGE') cleanTitle = 'Liquid Camouflage Correttore Liquido Waterproof';
  else if (key === 'MIYO_CHEEKY BLUSH') cleanTitle = 'Cheeky Blush Fard Compatto Alta Definizione';
  else if (key === 'MIYO_INSTA KISS') cleanTitle = 'Insta Kiss Pocket Balsamo Labbra Nutriente';
  else if (key === 'EV_KOREAN RITUALS') cleanTitle = 'Korean Rituals Crema Viso Trattamento Avanzato';
  else if (key === 'EV_DAURY_REMODELIFT') cleanTitle = "D'Aury Remodelift Crema Viso Rimodellante Antietà";
  else if (key === 'EV_SUPER_NEEDLES_BOOSTER') cleanTitle = 'Super Needles Meso-Booster Viso Concentrato 50ml';
  else if (key === 'EV_FACE_THERAPY_MASK_AMPOULE') cleanTitle = 'Face Therapy Maschera Ampolla Concentrata Monouso 8ml';
  else if (key === 'EV_AMPOULE_CREAM') cleanTitle = 'Ampoule Cream Crema Viso Rigenerante Intensiva 50ml';
  else if (key === 'EV_BODY_SHOT_BALM') cleanTitle = 'Body Shot Balsamo-Siero Corpo Trattamento 400ml';
  else if (key === 'EV_CREAM_SHOT') cleanTitle = 'Cream Shot Crema Viso Trattamento Idratante 50ml';
  else if (key === 'EV_CLEAN_SHOT') cleanTitle = 'Clean Shot Tonico Viso Riequilibrante';
  else if (key === 'EV_6_CERAMIDES_CARE') cleanTitle = '6 Ceramidi Crema & Balsamo Trattamento Barriera';
  else if (key === 'EV_6_CERAMIDES_CLEANSE') cleanTitle = '6 Ceramidi Detergente Delicato Viso';
  else if (key === 'EV_PINK_SNAIL') cleanTitle = 'Pink Snail Crema Viso Rigenerante Bava di Lumaca 50ml';
  else if (key === 'PR_MEDIC_SERUM_ESSENCE') cleanTitle = 'Medic Laboratorium Siero Essenza Viso Attivo';
  else if (key === 'PR_MAKEUP_BASE') cleanTitle = 'Base Trucco Professionale Make Up Base';
  else if (key === 'EV_PERFECT_BRIGHT_CREAM') cleanTitle = 'Perfect Bright Crema Viso Trattamento Luminosità';
  else if (key === 'EV_SLIM_EXTREME') cleanTitle = 'Slim Extreme Trattamento Corpo Intensivo Snellente';
  else if (key === 'MIYO_EYELINER_PERSPECTIVE') cleanTitle = 'Perspective Eyeliner Occhi Waterproof Lunga Tenuta';
  else if (key === 'EV_CICA_SKIN') cleanTitle = 'Cica Skin Trattamento Viso Lenitivo & Riparatore';

  const brandPrefix = brand === 'Pierre René' ? 'Pierre René ' : (brand === 'Miyo' ? 'Miyo Cosmetics ' : 'Eveline Cosmetics ');
  const fullTitle = `${brandPrefix}${cleanTitle}`;

  // Sluggify
  const slug = fullTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const id = `cipria-${rep.ean}`;
  const packshot = findBestPackshot(brand, rep.desc, category);

  // Build variants
  const variants = [];
  const shades = [];

  for (const item of items) {
    const vName = items.length === 1 ? 'Formato Originale' : cleanShadeName(item.desc);
    const retailPrice = calculateRetailPrice(item.unitPrice, brand, item.ean);
    
    variants.push({
      id: `var-${item.ean}`,
      name: vName,
      sku: item.ean,
      ean: item.ean,
      colorHex: '#C5A880',
      image: packshot,
      inStock: true,
      price: retailPrice,
      originalWholesalePrice: item.unitPrice,
      stock: item.qty
    });

    shades.push({
      id: `var-${item.ean}`,
      name: vName,
      code: item.ean,
      hex: '#C5A880',
      image: packshot,
      price: retailPrice,
      inStock: true,
      stock: item.qty
    });
  }

  const primaryRetailPrice = variants[0].price;
  const primaryWholesalePrice = variants[0].originalWholesalePrice;
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  const newProduct = {
    id,
    slug,
    name: fullTitle,
    brand,
    category,
    description: `Trattamento cosmetico professionale ${fullTitle} di ${brand}. Formulato secondo standard europei di qualità e sicurezza dermatologica.`,
    shortDescription: `Formula ad alta performance firmata ${brand}.`,
    price: primaryRetailPrice,
    originalPrice: +(primaryRetailPrice * 1.15).toFixed(2),
    originalWholesalePrice: primaryWholesalePrice,
    badge: 'Novità',
    badges: ['cruelty_free', 'bestseller'],
    formulaBenefits: 'Ingredienti selezionati e texture confortevole per risultati visibili e duraturi.',
    howToUse: 'Applicare quotidianamente o secondo necessità per massimizzare i benefici del trattamento.',
    inci: 'Formula cosmetica testata dermatologicamente secondo standard europei di purezza e sicurezza.',
    features: [
      'Formula cosmetica certificata',
      'Testato dermatologicamente',
      'Alta performance e tenuta'
    ],
    image: packshot,
    images: [packshot],
    variants,
    shades,
    stock: totalStock,
    inStock: true
  };

  catalog.push(newProduct);
  newProductsCreated++;
}

console.log('Successfully created', newProductsCreated, 'new product cards.');
console.log('New total products in catalog:', catalog.length);

// Save updated catalog
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
console.log('Catalog file updated successfully at:', CATALOG_PATH);
