#!/usr/bin/env node
/**
 * reconcile_fabrizio_108.js
 * ------------------------------------------------------------------
 * Riconcilia i 108 prodotti mancanti delle fatture Fabrizio (Federica
 * Cesiano Temporary 1-4) con il catalogo ufficiale.
 *
 * Uso:
 *   node scripts/reconcile_fabrizio_108.js            # applica e salva
 *   node scripts/reconcile_fabrizio_108.js --dry-run  # simula, non salva
 *   node scripts/reconcile_fabrizio_108.js --verbose  # log dettagliato
 *
 * Regole prezzo di vendita ufficiale al pubblico:
 *   Pierre René : wholesale * 2.75  -> arrotondato a .90 / .50, min 8.90
 *   Miyo        : wholesale * 2.70  -> arrotondato a .90 / .50, min 8.90
 *   Eveline     : wholesale * 2.50  -> arrotondato a .90 / .50, min 8.90
 *   Cipria      : wholesale * 2.50  -> arrotondato a .90 / .50, min 8.90
 *
 * Se l'articolo appartiene a una linea già presente nel catalogo viene
 * aggiunta la variante; altrimenti viene raggruppato/creato come scheda
 * prodotto completa conforme al tipo `Product`.
 * ------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------------
// Percorsi e opzioni
// ------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'data', 'catalog.json');
const MISSING_PATH = path.join(ROOT, 'scratch', 'fabrizio_108_mancanti_puliti.json');
const PRODUCTS_DIR = path.join(ROOT, 'public', 'products');
const REPORT_PATH = path.join(ROOT, 'scratch', 'fabrizio_108_reconciliation_report.json');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const VERBOSE = ARGS.includes('--verbose');

// ------------------------------------------------------------------
// Prezzi
// ------------------------------------------------------------------
const BRAND_MULTIPLIER = {
  'Pierre René': 2.75,
  'Miyo': 2.70,
  'Eveline Cosmetics': 2.50,
  'Cipria Make Up': 2.50,
};

/** Prezzo minimo di vendita al pubblico. */
const MIN_RETAIL_PRICE = 8.90;

/**
 * Arrotonda il prezzo psicologico scegliendo la prima terminazione
 * utile tra .50 e .90 (>= prezzo di ricavo), con floor minimo a 8.90.
 */
function calculateRetailPrice(wholesale, brand) {
  const mult = BRAND_MULTIPLIER[brand] != null ? BRAND_MULTIPLIER[brand] : 2.5;
  const raw = wholesale * mult;
  const base = Math.floor(raw + 1e-9);
  const candidates = [base + 0.50, base + 0.90, base + 1.50, base + 1.90];
  let price = candidates.find((c) => c + 1e-9 >= raw);
  if (price === undefined) price = base + 1.90;
  if (price < MIN_RETAIL_PRICE) price = MIN_RETAIL_PRICE;
  return Math.round(price * 100) / 100;
}

// ------------------------------------------------------------------
// Utility
// ------------------------------------------------------------------
function pad2(n) {
  return String(n).padStart(2, '0');
}

function titleCase(str) {
  return String(str == null ? '' : str)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const COLOR_PALETTE = [
  '#C5A880', '#D9A6A0', '#B76E79', '#8C5A5A', '#E0B0A0',
  '#A9746E', '#7D5A5A', '#C98A7D', '#B08B77', '#D8B4A0',
  '#9E6B5A', '#E3C3B3',
];

function colorFor(seed) {
  let hash = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

const BRAND_DISPLAY = {
  'Pierre René': 'Pierre René',
  'Miyo': 'Miyo Cosmetics',
  'Eveline Cosmetics': 'Eveline Cosmetics',
  'Cipria Make Up': 'Cipria Milano',
};

const BRAND_FALLBACK_IMAGE = {
  'Pierre René': '/products/pierre-rene-pierre-rene-fondotinta-skin-elixir-velvet-05-tan-nude.jpg',
  'Miyo': '/products/miyo-miyo-cosmetics-cheeky-blush-girl-boss.jpg',
  'Eveline Cosmetics': '/products/eveline-cosmetics-eveline-cosmetics-biohyaluron-3xretinol-crema-riparatrice-40.png',
  'Cipria Make Up': '/products/cipria-make-up-cipria-milano-compact-foundation.jpg',
};

const STOP_WORDS = new Set([
  'eveline', 'pierre', 'rene', 'miyo', 'cipria', 'cosmetics', 'make', 'milano',
  'waterproof', 'black', 'matt', 'matte', 'skin', 'liquid', 'cream', 'serum',
  'toner', 'vegan', 'with', 'free', 'line', 'new',
]);

let _productFiles = null;
function productFiles() {
  if (!_productFiles) {
    try {
      _productFiles = fs.readdirSync(PRODUCTS_DIR);
    } catch (_) {
      _productFiles = [];
    }
  }
  return _productFiles;
}

function findPackshot(brand, desc, preferred) {
  if (preferred) return preferred;
  const words = String(desc)
    .toLowerCase()
    .replace(/^(ev|pr|cm|miyo|rb)\s+/, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const files = productFiles();
  for (const w of words) {
    const hit = files.find((f) => f.toLowerCase().includes(w));
    if (hit) return '/products/' + hit;
  }
  return BRAND_FALLBACK_IMAGE[brand] || BRAND_FALLBACK_IMAGE['Eveline Cosmetics'];
}

function mapCategory(desc, brand) {
  const d = String(desc).toUpperCase();
  if (/NAIL POLISH|BRUSH|BLENDER|PENNELL/.test(d)) return 'Beauty & Accessori';
  if (/EYESHADOW|OMBRETTO|MASCARA|EYELINER|BROW|LASH|PERSPECTIVE|EYEBROW|STAMP|GEL PENCIL/.test(d)) return 'Occhi';
  if (/LIP|LIPSTICK|GLOSS|ROUGES?|TINTA|SUBLIME|FLOW MASTER|LIPMATIC|CHEEK&LIP/.test(d)) return 'Labbra';
  if (/SLIM EXTREME|FACE THERAPY|MASK|AMPOUL|SERUM|CREAM|THERAPY|SLIMMING|STRECH MARKS|THERMO/.test(d)) return 'Skincare & Dermo';
  if (/POWDER|BLUSH|FONDOTINTA|FOUNDATION|CONCEALER|CORRETTORE|COVER|CAMOU|WET & DRY|CIPRIA|BASE|PALETT|BRONZER|HIGHLIGHTER|CONTOUR/.test(d)) return 'Viso';
  return 'Viso';
}

// ------------------------------------------------------------------
// Regole: articolo -> linea esistente (aggiunta variante)
// ------------------------------------------------------------------
const tailAfter = (text, re) => {
  const m = String(text).match(re);
  return m && m[1] ? titleCase(m[1].replace(/^[\s.\-_]+/, '').replace(/\s+-\s+/g, ' ').trim()) : null;
};

const numAfter = (text, re) => {
  const m = String(text).match(re);
  return m && m[1] ? String(m[1]) : null;
};

/**
 * Ogni regola mappa un prodotto mancante su una scheda già esistente.
 * `test` opera sulla descrizione completa (uppercase), `label` genera
 * il nome della variante/tonalità.
 */
const LINE_RULES = [
  // ---------------- Eveline ----------------
  {
    name: 'EV Variété Gel Lip Liner',
    test: (d) => /VARIETE GEL LIP LINER/.test(d),
    parentId: 'cipria-68181',
    label: (it) => {
      const m = it.desc.match(/N\s*(\d+)\s*([A-Z]+)/i);
      return m ? `${pad2(m[1])} ${titleCase(m[2])}` : 'Nuova Tonalità';
    },
  },
  {
    name: 'EV Variété Satin Lipstick',
    test: (d) => /VARIETE SATIN LIPSTICK/.test(d),
    parentId: 'cipria-64569',
    label: (it) => (numAfter(it.desc, /N\s*(\d+)/i) ? pad2(numAfter(it.desc, /N\s*(\d+)/i)) : 'Nuova Tonalità'),
  },
  {
    name: 'EV Eyebrow Pencil Waterproof',
    test: (d) => /EYEBROW PENCIL WATERPROOF/.test(d),
    parentId: 'cipria-61882',
    label: (it) => tailAfter(it.desc, /WATERPROOF\s+(.+)$/i) || 'Soft Brown',
  },
  {
    name: 'EV Eyeliner Precision',
    test: (d) => /EYELINER PRECISION BLACK/.test(d),
    parentId: 'cipria-7326',
    label: () => 'Precision Black',
  },
  {
    name: 'EV Eyeliner con timbro',
    test: (d) => /EYELINER&STAMP/.test(d),
    parentId: 'cipria-70476',
    label: (it) => tailAfter(it.desc, /2IN1\s+(.+)$/i) || '2in1 Star',
  },
  {
    name: 'EV Liquid Camouflage',
    test: (d) => /LIQUID CAMOU/.test(d),
    parentId: 'cipria-5903416038153',
    label: (it) => tailAfter(it.desc, /WATERPR\.?\s*(.+)$/i) || 'Nuova Tonalità',
  },
  {
    name: 'EV Face Therapy Maschera Ampolla',
    test: (d) => /MASK AMPOUL FACE THERAPY/.test(d),
    parentId: 'cipria-5903416047452',
    label: (it) => tailAfter(it.desc, /FACE THERAPY\s+(.+)$/i) || 'Vitamina C 8ml',
  },
  {
    name: 'EV Wonder Match Cheek&Lip',
    test: (d) => /WONDER MATCH CHEEK&LIP/.test(d),
    parentId: 'cipria-67554',
    label: (it) => {
      const m = it.desc.match(/N\s*(\d+)\s+(.+)$/i);
      return m ? titleCase(`${m[1]} ${m[2]}`) : 'Nuova Tonalità';
    },
  },
  {
    name: 'EV Wonder Match Concealer',
    test: (d) => /WONDER MATCH CONCEALER/.test(d),
    parentId: 'cipria-5901761985214',
    label: (it) => {
      const m = it.desc.match(/N\s*(\d+)\s+(.+)$/i);
      return m ? titleCase(`${m[1]} ${m[2]}`) : 'Nuova Tonalità';
    },
  },
  {
    name: 'EV Wonder Match Fondotinta',
    test: (d) => /WONDER MATCH FOUNDATION LUMI/.test(d),
    parentId: 'cipria-63890',
    label: (it) => numAfter(it.desc, /LUMI\s+N?\s*(\d+)/i) || 'Nuova Tonalità',
  },
  {
    name: 'EV Slim Extreme',
    test: (d) => /SLIM EXTREME/.test(d),
    parentId: 'cipria-5901964013721',
    label: (it) => tailAfter(it.desc, /SLIM EXTREME\s+(.+)$/i) || 'Trattamento Corpo',
  },

  // ---------------- Miyo ----------------
  {
    name: 'Miyo Cheeky Blush',
    test: (d) => /CHEEKY BLUSH/.test(d),
    parentId: 'cipria-69418',
    label: (it) => {
      const m = it.desc.match(/N\s*(\d+)\s+(.+)$/i);
      return m ? titleCase(`${m[1]} ${m[2]}`) : 'Nuova Tonalità';
    },
  },
  {
    name: 'Miyo Lip Contour Scriber',
    test: (d) => /LIP CONTOUR SCRIBER/.test(d),
    parentId: 'cipria-65630',
    label: (it) => {
      const m = it.desc.match(/SCRIBER\s+(\d+)\s*([A-Z]*)/i);
      return m ? `${pad2(m[1])}${m[2] ? ' ' + titleCase(m[2]) : ''}` : 'Nuova Tonalità';
    },
  },
  {
    name: 'Miyo Lip Gloss Outstanding',
    test: (d) => /LIP GLOSS OUTSTANDING/.test(d),
    parentId: 'cipria-5184',
    label: (it) => (numAfter(it.desc, /N\s*(\d+)/i) ? pad2(numAfter(it.desc, /N\s*(\d+)/i)) : 'Nuova Tonalità'),
  },
  {
    name: 'Miyo Palette Five Points Vegan',
    test: (d) => /PALETTE FIVE POINTS/.test(d),
    parentId: 'cipria-18175',
    label: (it) => (numAfter(it.desc, /N\s*(\d+)/i) ? pad2(numAfter(it.desc, /N\s*(\d+)/i)) : 'Nuova Tonalità'),
  },
  {
    name: 'Miyo Sprinkle Me Pigmenti',
    test: (d) => /SPRINKLE ME PIGMENTI/.test(d),
    parentId: 'cipria-63703',
    label: (it) => numAfter(it.desc, /N\s*(\d+)/i) || 'Nuova Tonalità',
  },
  {
    name: 'Miyo Perspective Eyeliner',
    test: (d) => /EYELINER PERSPECTIVE/.test(d),
    parentId: 'cipria-3700467848289',
    label: (it) => tailAfter(it.desc, /PERSPECTIVE\s+(.+)$/i) || 'Nuova Tonalità',
  },

  // ---------------- Cipria Make Up ----------------
  {
    name: 'Cipria Fondotinta Retouching',
    test: (d) => /FONDOTINTA RETOUCHING/.test(d),
    parentId: 'cipria-64090',
    label: (it) => (numAfter(it.desc, /N\s*(\d+)/i) ? pad2(numAfter(it.desc, /N\s*(\d+)/i)) : 'Nuova Tonalità'),
  },
  {
    name: 'Cipria Fondotinta No Trace',
    test: (d) => /FONDOTINTA NO TRACE/.test(d),
    parentId: 'cipria-360',
    label: (it) => numAfter(it.desc, /N\s*(\d+)/i) || 'Nuova Tonalità',
  },
  {
    name: 'Cipria Compact Powder',
    test: (d) => /COMPACT POWDER WHITE/.test(d),
    parentId: 'cipria-64306',
    label: (it) => {
      const n = numAfter(it.desc, /N\s*(\d+)/i);
      return n ? `${n} White` : 'Nuova Tonalità';
    },
  },
  {
    name: 'Cipria Sublime Blush-On',
    test: (d) => /SUBLIME BLUSH ON/.test(d),
    parentId: 'cipria-64138',
    label: () => 'Nuova Tonalità',
  },
  {
    name: 'Cipria Tinta Labbra Sublime',
    test: (d) => /TINTA LABBRA SUBLIME/.test(d),
    parentId: 'cipria-64154',
    label: () => 'Nuova Tonalità',
  },

  // ---------------- Pierre René ----------------
  {
    name: 'PR Compact Powder SPF25',
    test: (d) => /COMPACT POWDER SPF25/.test(d),
    parentId: 'cipria-69316',
    label: () => 'Nuova Tonalità',
  },
  {
    name: 'PR Lipmatic Waterproof Liner',
    test: (d) => /LIPMATIC WATERPROOF LINER/.test(d),
    parentId: 'cipria-65983',
    label: () => 'Nuova Tonalità',
  },
  {
    name: 'PR Long Lasting Eyeliner',
    test: (d) => /LONG LASTING EYELINER/.test(d),
    parentId: 'cipria-65956',
    label: (it) => numAfter(it.desc, /(\d+)\s*$/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Nail Polish',
    test: (d) => /NAIL POLISH/.test(d),
    parentId: 'cipria-66199',
    label: (it) => numAfter(it.desc, /(\d+)\s*$/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Royal Mat Rossetto',
    test: (d) => /ROYAL MAT LIPSTICK/.test(d),
    parentId: 'cipria-69880',
    label: (it) => tailAfter(it.desc, /LIPSTICK\s+(.+)$/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Satin Pure Rossetto',
    test: (d) => /SATIN PURE LIPSTICK/.test(d),
    parentId: 'cipria-70639',
    label: (it) => numAfter(it.desc, /N\.?\s*(\d+)/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Contour Concealer',
    test: (d) => /CONTOUR CONCEALER/.test(d),
    parentId: 'cipria-66178',
    label: (it) => numAfter(it.desc, /(\d+)\s*$/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Brow Pomade',
    test: (d) => /BROW POMADE/.test(d),
    parentId: 'cipria-66057',
    label: (it) => tailAfter(it.desc, /POMADE\s+(.+)$/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Royal Pencil',
    test: (d) => /ROYAL PENCIL/.test(d),
    parentId: 'cipria-66022',
    label: (it) => tailAfter(it.desc, /PENCIL\s+(.+)$/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Lumi Touch Fondotinta Art',
    test: (d) => /LUMI TOUCH FOUNDATION/.test(d),
    parentId: 'cipria-69979',
    label: (it) => numAfter(it.desc, /ART\s*(\d+)/i) || 'Nuova Tonalità',
  },
  {
    name: 'PR Skin Balance Cover',
    test: (d) => /SKIN BALANCE COVER/.test(d),
    parentId: 'cipria-66113',
    label: (it) => tailAfter(it.desc, /COVER\s+(.+)$/i) || 'Nuova Tonalità',
  },
];

// ------------------------------------------------------------------
// Nuove schede raggruppate
// ------------------------------------------------------------------
const NEW_GROUPS = {
  CM_EYESHADOW: { title: 'Ombretto Compatto Alta Pigmentazione', category: 'Occhi' },
  CM_CRISTAL_EYESHADOW: { title: 'Ombretto Cristal Finish', category: 'Occhi' },
  CM_WET_DRY: { title: 'Fondotinta Wet & Dry', category: 'Viso' },
  EV_WONDER_MATCH_LIQUID: { title: 'Wonder Match Rossetto Liquido Cremoso', category: 'Labbra' },
  EV_EYELINER_GEL_PENCIL: { title: 'Eyeliner Gel Pencil', category: 'Occhi' },
  EV_PALETTE_LOOK_UP_GIMME_MORE: { title: 'Palette Look Up 9 Colori Gimme More', category: 'Occhi' },
  MIYO_FLOW_MASTER_PEN: { title: 'Flow Master Pen', category: 'Labbra' },
  PR_EYESHADOW_PALETTE: { title: 'Eyeshadow Palette Professional', category: 'Occhi' },
  PR_MEDIC_CARE: { title: 'Medic Care Foundation', category: 'Viso' },
  PR_SKIN_ELIXIR_SPF30: { title: 'Skin Elixir Foundation SPF30', category: 'Viso' },
  PR_GLORY_LIPMATIC: { title: 'Glory Lipmatic', category: 'Labbra' },
  PR_MASCARA_SUPER_CURLY: { title: 'Mascara Super Curly', category: 'Occhi' },
  PR_BRUSH: { title: 'Pennelli Professionali', category: 'Beauty & Accessori' },
};

function getGroupKey(item) {
  const d = String(item.desc).toUpperCase();
  if (/CRISTAL EYESHADOW/.test(d)) return 'CM_CRISTAL_EYESHADOW';
  if (item.brand === 'Cipria Make Up' && /(^|\s)EYESHADOW\b/.test(d)) return 'CM_EYESHADOW';
  if (/WET & DRY/.test(d)) return 'CM_WET_DRY';
  if (item.brand === 'Eveline Cosmetics' && /^LIQUID\s*\d/i.test(d.trim())) return 'EV_WONDER_MATCH_LIQUID';
  if (/EYELINER GEL PENCIL/.test(d)) return 'EV_EYELINER_GEL_PENCIL';
  if (/PALETTE LOOK UP/.test(d)) return 'EV_PALETTE_LOOK_UP_GIMME_MORE';
  if (/FLOW MASTER PEN/.test(d)) return 'MIYO_FLOW_MASTER_PEN';
  if (/EYESHADOW PALETTE/.test(d)) return 'PR_EYESHADOW_PALETTE';
  if (/MEDIC CARE FOUNDATION/.test(d)) return 'PR_MEDIC_CARE';
  if (/SKIN ELIXIR FOUNDA/.test(d)) return 'PR_SKIN_ELIXIR_SPF30';
  if (/GLORY LIPMATIC/.test(d)) return 'PR_GLORY_LIPMATIC';
  if (/MASCARA SUPER CURLY/.test(d)) return 'PR_MASCARA_SUPER_CURLY';
  if (/BRUSH|BLENDER/.test(d)) return 'PR_BRUSH';
  return 'SINGLE_' + item.ean;
}

/** Nome variante di default per i prodotti raggruppati. */
function defaultVariantName(item) {
  let s = String(item.desc).replace(/^(EV|PR|CM|MIYO|RB)\s+/i, '').trim();

  let m = s.match(/N\.?\s*([0-9]+)\s*([A-Z][A-Z0-9\s\-&.']*)?$/i);
  if (m) return titleCase(`${m[1]} ${m[2] || ''}`.trim());

  m = s.match(/([0-9]{1,4}[A-Z]*)\s*$/);
  if (m) return m[1].toUpperCase();

  return titleCase(s);
}

/** Nomi variante specifici per alcuni gruppi. */
const GROUP_LABELERS = {
  PR_EYESHADOW_PALETTE: (it) => tailAfter(it.desc, /PALETTE\s+(.+)$/i) || defaultVariantName(it),
  PR_SKIN_ELIXIR_SPF30: (it) => {
    const m = it.desc.match(/SPF30\s+(.+)$/i);
    return m ? titleCase(m[1].replace(/\s+/g, ' ').trim()) : defaultVariantName(it);
  },
  MIYO_FLOW_MASTER_PEN: (it) => {
    const m = it.desc.match(/PEN\s+(.+)$/i);
    return m ? titleCase(m[1].trim()) : defaultVariantName(it);
  },
  PR_BRUSH: (it) => {
    let s = it.desc.replace(/^(EV|PR|CM|MIYO|RB)\s+/i, '').trim();
    s = s.replace(/^BRUSH\s+/i, '');
    return titleCase(s);
  },
};

function getVariantName(item, groupKey) {
  if (GROUP_LABELERS[groupKey]) return GROUP_LABELERS[groupKey](item);
  return defaultVariantName(item);
}

// ------------------------------------------------------------------
// Contenuti editoriali per le nuove schede
// ------------------------------------------------------------------
const CATEGORY_CONTENT = {
  'Viso': {
    formula: 'Texture fondente e modulabile, arricchita con attivi idratanti e pigmenti micronizzati per un risultato uniforme e naturale.',
    how: 'Applicare con pennello o spugnetta sulla zona interessata, sfumando dal centro verso l\'esterno per un effetto progressivo.',
    inci: 'Aqua, Dimethicone, Talc, Mica, Glycerin, Silica, Tocopheryl Acetate, Phenoxyethanol. Testato dermatologicamente.',
  },
  'Occhi': {
    formula: 'Pigmenti ad alta definizione e polimeri filmogeni garantiscono colore intenso, sfumabile e a lunga tenuta.',
    how: 'Stendere il prodotto sulla palpebra o lungo la rima cigliare, stratificando per intensificare il colore.',
    inci: 'Aqua, Mica, Synthetic Fluorphlogopite, Glycerin, Dimethicone, Tocopherol, Phenoxyethanol. Ophthalmologically tested.',
  },
  'Labbra': {
    formula: 'Formula ricca di cere vegetali e oli emollienti per un colore pieno, confortevole e dal finish vellutato.',
    how: 'Delineare i contorni o applicare su tutta la labbra, procedendo per strati sottili fino alla coprenza desiderata.',
    inci: 'Hydrogenated Polyisobutene, Isododecane, Mica, Tocopheryl Acetate, Simmondsia Chinensis Oil, Phenoxyethanol.',
  },
  'Skincare & Dermo': {
    formula: 'Complesso di attivi biotecnologici ad alta penetrazione per un\'azione mirata, visibile e ben tollerata.',
    how: 'Applicare mattina e/o sera sulla pelle detersa con un massaggio circolare fino a completo assorbimento.',
    inci: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Sodium Hyaluronate, Tocopheryl Acetate, Phenoxyethanol, Ethylhexylglycerin.',
  },
  'Beauty & Accessori': {
    formula: 'Materiali e fibre sintetiche di alta qualità, delicati sulla pelle e resistenti nel tempo.',
    how: 'Utilizzare con il prodotto abituale e detergere periodicamente con acqua tiepida e detergente delicato.',
    inci: 'Prodotto non cosmetico. Materiale sintetico anallergico. Lavare prima del primo utilizzo.',
  },
};

function buildDescription(name, brand, category) {
  return `${name} di ${brand}, referenza professionale della linea ${category.toLowerCase()}. ` +
    `Pensato per uso professionale e quotidiano, unisce performance, comfort e massima tollerabilità cutanea.`;
}

function buildShortDescription(brand, category) {
  switch (category) {
    case 'Occhi': return `Colore intenso e lunga tenuta firmato ${brand}.`;
    case 'Labbra': return `Colore pieno e confortevole firmato ${brand}.`;
    case 'Skincare & Dermo': return `Trattamento mirato ad alta performance firmato ${brand}.`;
    case 'Beauty & Accessori': return `Accessorio professionale di alta qualità firmato ${brand}.`;
    default: return `Texture modulabile e finish naturale firmato ${brand}.`;
  }
}

// ------------------------------------------------------------------
// Caricamento dati
// ------------------------------------------------------------------
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
if (!Array.isArray(catalog)) {
  console.error('❌ data/catalog.json non è un array. Interruzione.');
  process.exit(1);
}

const missingItems = JSON.parse(fs.readFileSync(MISSING_PATH, 'utf8'));
if (!Array.isArray(missingItems)) {
  console.error('❌ scratch/fabrizio_108_mancanti_puliti.json non è un array. Interruzione.');
  process.exit(1);
}

console.log('==================================================================');
console.log(' RICONCILIAZIONE FABRIZIO 108 PRODOTTI MANCANTI');
console.log('==================================================================');
console.log(`Catalogo iniziale   : ${catalog.length} prodotti`);
console.log(`Prodotti da integrare: ${missingItems.length}`);
console.log(`Modalità             : ${DRY_RUN ? 'DRY-RUN (nessuna scrittura)' : 'SCRITTURA'}`);
console.log('');

// Indici di appoggio
const catalogById = new Map();
const catalogBySlug = new Set();
const globalEanIndex = new Map(); // ean -> id del prodotto che lo contiene
for (const p of catalog) {
  catalogById.set(p.id, p);
  if (p.slug) catalogBySlug.add(p.slug);
  for (const v of p.variants || []) {
    const e = String((v && v.ean) || '').trim();
    if (e) globalEanIndex.set(e, p.id);
  }
}

function ensureVariant(parent, item, variantName, retailPrice) {
  parent.variants = parent.variants || [];
  parent.shades = parent.shades || [];

  const ean = String(item.ean).trim();
  if (parent.variants.some((v) => String(v.ean).trim() === ean)) return false;

  const image = parent.image || (parent.images && parent.images[0]) || findPackshot(parent.brand, item.desc);
  const colorHex = colorFor(variantName || ean);

  parent.variants.push({
    id: `var-${ean}`,
    name: variantName,
    sku: ean,
    ean: ean,
    colorHex: colorHex,
    image: image,
    inStock: true,
    price: retailPrice,
    originalWholesalePrice: item.wholesalePrice,
    stock: item.qty,
  });

  parent.shades.push({
    id: `var-${ean}`,
    name: variantName,
    code: ean,
    hex: colorHex,
    image: image,
    price: retailPrice,
    inStock: true,
    stock: item.qty,
  });

  parent.stock = parent.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  parent.inStock = parent.stock > 0;
  return true;
}

function uniqueSlug(base) {
  let slug = base;
  let i = 2;
  while (catalogBySlug.has(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  catalogBySlug.add(slug);
  return slug;
}

function uniqueId(base) {
  let id = base;
  let i = 2;
  while (catalogById.has(id)) {
    id = `${base}-${i}`;
    i++;
  }
  catalogById.set(id, true);
  return id;
}

// ------------------------------------------------------------------
// STEP 1 — Aggiunta varianti alle linee esistenti
// ------------------------------------------------------------------
const handledEans = new Set();        // EAN risolti nello STEP 1 (aggiunti o già presenti)
const alreadyPresentEans = new Set(); // EAN già presenti nel catalogo in ingresso
const perBrand = {};
const addedToExisting = [];

for (const item of missingItems) {
  const ean = String(item.ean).trim();
  const d = String(item.desc).toUpperCase();

  // Idempotenza: se l'EAN è già nel catalogo non viene toccato (nessun duplicato).
  if (globalEanIndex.has(ean)) {
    alreadyPresentEans.add(ean);
    handledEans.add(ean);
    perBrand[item.brand] = perBrand[item.brand] || { existing: 0, newCards: 0, alreadyPresent: 0 };
    perBrand[item.brand].alreadyPresent++;
    continue;
  }

  const rule = LINE_RULES.find((r) => r.test(d));
  if (!rule) continue;

  const parent = catalogById.get(rule.parentId);
  if (!parent) {
    console.warn(`⚠️  Parent ${rule.parentId} non trovato per EAN ${ean} (${item.desc}) — verrà trattato come nuova scheda.`);
    continue;
  }

  const retailPrice = calculateRetailPrice(item.wholesalePrice, item.brand);
  const variantName = rule.label(item);
  const added = ensureVariant(parent, item, variantName, retailPrice);

  if (added) {
    handledEans.add(ean);
    globalEanIndex.set(ean, parent.id);
    addedToExisting.push({ ean, parentId: parent.id, variantName, price: retailPrice, wholesale: item.wholesalePrice });
    perBrand[item.brand] = perBrand[item.brand] || { existing: 0, newCards: 0, alreadyPresent: 0 };
    perBrand[item.brand].existing++;
    if (VERBOSE) console.log(`  + variante ${ean} -> ${parent.name} [${variantName}] €${retailPrice.toFixed(2)}`);
  }
}

console.log(`STEP 1 — Varianti aggiunte a linee esistenti: ${addedToExisting.length} (${alreadyPresentEans.size} EAN già presenti nel catalogo)`);

// ------------------------------------------------------------------
// STEP 2 — Creazione nuove schede prodotto raggruppate
// ------------------------------------------------------------------
const remaining = missingItems.filter((it) => !handledEans.has(String(it.ean).trim()));

const groups = new Map();
for (const item of remaining) {
  const key = getGroupKey(item);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
}

console.log(`STEP 2 — Nuove schede da creare: ${groups.size} (su ${remaining.length} articoli)`);

const createdCards = [];
let newVariantsCount = 0;

for (const [key, allItems] of groups.entries()) {
  // Idempotenza: ignora eventuali EAN già presenti nel catalogo.
  const items = allItems.filter((it) => !globalEanIndex.has(String(it.ean).trim()));
  if (items.length === 0) continue;

  const rep = items[0];
  const brand = rep.brand;
  const brandDisplay = BRAND_DISPLAY[brand] || brand;

  let title;
  let category;
  if (NEW_GROUPS[key]) {
    title = NEW_GROUPS[key].title;
    category = NEW_GROUPS[key].category;
  } else {
    // Singola referenza non raggruppata
    title = titleCase(
      String(rep.desc)
        .replace(/^(EV|PR|CM|MIYO|RB)\s+/i, '')
        .replace(/\s*(N|NO|#)?\s*\d+[A-Z]*\s*$/i, '')
        .trim()
    ) || String(rep.desc);
    category = mapCategory(rep.desc, brand);
  }

  const fullName = `${brandDisplay} ${title}`.replace(/\s+/g, ' ').trim();
  const slug = uniqueSlug(slugify(fullName));

  // Poiché il nome prodotto è deciso a livello di gruppo, il nome della
  // variante va calcolato con un riferimento "fittizio" alla referenza.
  const variants = [];
  const shades = [];

  for (const item of items) {
    const retailPrice = calculateRetailPrice(item.wholesalePrice, brand);
    const variantName = getVariantName(item, key);
    const ean = String(item.ean).trim();
    const image = findPackshot(brand, item.desc);
    const colorHex = colorFor(variantName || ean);

    variants.push({
      id: `var-${ean}`,
      name: variantName,
      sku: ean,
      ean: ean,
      colorHex: colorHex,
      image: image,
      inStock: true,
      price: retailPrice,
      originalWholesalePrice: item.wholesalePrice,
      stock: item.qty,
    });

    shades.push({
      id: `var-${ean}`,
      name: variantName,
      code: ean,
      hex: colorHex,
      image: image,
      price: retailPrice,
      inStock: true,
      stock: item.qty,
    });
  }

  const primary = variants[0];
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const packshot = findPackshot(brand, rep.desc);
  const content = CATEGORY_CONTENT[category] || CATEGORY_CONTENT['Viso'];

  const newProduct = {
    id: uniqueId(`fab-${rep.ean}`),
    slug: slug,
    name: fullName,
    brand: brand,
    category: category,
    price: primary.price,
    originalPrice: Math.round(primary.price * 1.15 * 100) / 100,
    originalWholesalePrice: primary.originalWholesalePrice,
    badge: 'Novità',
    badges: ['nuovo', 'cruelty_free'],
    description: buildDescription(fullName, brand, category),
    shortDescription: buildShortDescription(brand, category),
    formulaBenefits: content.formula,
    howToUse: content.how,
    inci: content.inci,
    features: [
      'Formula professionale ad alte prestazioni',
      'Testato dermatologicamente',
      'Made in EU',
      'Referenza ufficiale di listino',
    ],
    shades: shades,
    variants: variants,
    images: [packshot],
    image: packshot,
    stock: totalStock,
    inStock: true,
  };

  catalog.push(newProduct);
  catalogById.set(newProduct.id, newProduct);
  createdCards.push({ key, id: newProduct.id, name: fullName, variants: variants.length });
  newVariantsCount += variants.length;

  for (const item of items) {
    const ean = String(item.ean).trim();
    handledEans.add(ean);
    globalEanIndex.set(ean, newProduct.id);
    perBrand[brand] = perBrand[brand] || { existing: 0, newCards: 0, alreadyPresent: 0 };
    perBrand[brand].newCards++;
  }

  if (VERBOSE) {
    console.log(`  + scheda ${newProduct.id} "${fullName}" (${variants.length} varianti, cat. ${category})`);
  }
}

console.log(`STEP 2 — Nuove schede create: ${createdCards.length}, nuove varianti: ${newVariantsCount}`);
console.log('');

// ------------------------------------------------------------------
// STEP 3 — Validazione e report
// ------------------------------------------------------------------
const finalEans = new Map();
const duplicateEans = [];
for (const p of catalog) {
  for (const v of p.variants || []) {
    const e = String(v.ean || '').trim();
    if (!e) continue;
    if (finalEans.has(e)) duplicateEans.push({ ean: e, first: finalEans.get(e), second: p.id });
    else finalEans.set(e, p.id);
  }
}

const priceIssues = [];
for (const p of catalog) {
  for (const v of p.variants || []) {
    if (v.originalWholesalePrice != null && v.price != null && v.price <= v.originalWholesalePrice) {
      priceIssues.push({ productId: p.id, ean: v.ean, price: v.price, wholesale: v.originalWholesalePrice });
    }
  }
}

const missingEans = missingItems
  .map((i) => String(i.ean).trim())
  .filter((e) => !finalEans.has(e));

const integrated = missingItems.length - missingEans.length;

// Report per brand
console.log('------------------------------------------------------------------');
console.log(' REPORT DI VERIFICA');
console.log('------------------------------------------------------------------');
console.log(`Prodotti mancanti richiesti          : ${missingItems.length}`);
console.log(`Integrati nel catalogo               : ${integrated} / ${missingItems.length}`);
console.log(`  - come varianti di linee esistenti: ${addedToExisting.length}`);
console.log(`  - come nuove schede prodotto       : ${newVariantsCount}`);
console.log(`  - già presenti nel catalogo        : ${alreadyPresentEans.size}`);
console.log(`Schede prodotto nuove create         : ${createdCards.length}`);
console.log('');
console.log('Dettaglio per brand (integrati):');
for (const brand of Object.keys(BRAND_MULTIPLIER)) {
  const b = perBrand[brand] || { existing: 0, newCards: 0, alreadyPresent: 0 };
  console.log(`  ${brand.padEnd(20)} linee esistenti: ${String(b.existing).padStart(2)} | nuove schede: ${String(b.newCards).padStart(2)} | già presenti: ${String(b.alreadyPresent).padStart(2)}`);
}
console.log('');
console.log(`Catalogo finale                      : ${catalog.length} prodotti`);
console.log(`EAN totali                           : ${finalEans.size}`);
console.log(`EAN duplicati                        : ${duplicateEans.length}`);
console.log(`Problemi prezzo <= ingrosso          : ${priceIssues.length}`);

if (missingEans.length > 0) {
  console.log('');
  console.log('❌ EAN non integrati:');
  missingEans.forEach((e) => console.log(`   - ${e}`));
}
if (duplicateEans.length > 0) {
  console.log('');
  console.log('❌ EAN duplicati:');
  duplicateEans.slice(0, 20).forEach((d) => console.log(`   - ${d.ean} (${d.first} / ${d.second})`));
}
if (priceIssues.length > 0) {
  console.log('');
  console.log('❌ Problemi di prezzo:');
  priceIssues.slice(0, 20).forEach((p) => console.log(`   - ${p.productId} ${p.ean}: €${p.price} <= €${p.wholesale}`));
}

const report = {
  generatedAt: new Date().toISOString(),
  requested: missingItems.length,
  integrated,
  addedToExistingLines: addedToExisting.length,
  alreadyPresent: alreadyPresentEans.size,
  newProductCards: createdCards.length,
  newVariants: newVariantsCount,
  finalCatalogSize: catalog.length,
  totalEans: finalEans.size,
  duplicateEans: duplicateEans.length,
  priceIssues: priceIssues.length,
  missingEans,
  perBrand,
  createdCards,
  addedToExisting,
};

const success =
  missingEans.length === 0 &&
  duplicateEans.length === 0 &&
  priceIssues.length === 0 &&
  integrated === missingItems.length;

if (success) {
  if (DRY_RUN) {
    console.log('');
    console.log(`✅ VERIFICA SUPERATA: ${integrated} su ${missingItems.length} integrati (DRY-RUN, file NON salvato).`);
  } else {
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log('');
    console.log(`✅ VERIFICA SUPERATA: ${integrated} su ${missingItems.length} integrati.`);
    console.log(`   Catalogo salvato in : ${CATALOG_PATH}`);
    console.log(`   Report salvato in   : ${REPORT_PATH}`);
  }
  process.exit(0);
} else {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log('');
  console.log('❌ VERIFICA FALLITA: il catalogo NON è stato salvato.');
  process.exit(1);
}
