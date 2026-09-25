#!/usr/bin/env node
/**
 * ============================================================================
 * Scelta Makeup — AUDIT FORENSE VARIANTI RAGGRUPPATE / SCHEDE ANOMALE
 * ============================================================================
 *
 * Scopo (richiesta di Mario):
 *   Individuare tutti i prodotti a catalogo in cui le "varianti" non sono vere
 *   sfumature cosmetiche (CATEGORIA A) ma ARTICOLI FISICI ETEROGENEI raggruppati
 *   sotto un'unica scheda (CATEGORIA B). Questi ultimi vanno "portati fuori"
 *   come schede autonome, altrimenti Federica al banco cassa (ricerca per nome)
 *   non li trova, e sull'e-commerce la miniatura mostra una foto packshot invece
 *   del colore della tonalità.
 *
 * Criteri di classificazione:
 *   CATEGORIA A — VERE SFUMATURE/NUANCE (legittime):
 *     stesso cosmetico (stessa formula/pack/formato/prezzo) in colori diversi.
 *   CATEGORIA B — ARTICOLI ETEROGENEI (da sdoppiare):
 *     varianti che differiscono per funzione, formula, formato (ml/g), linea,
 *     prezzo o che sono oggetti fisici diversi (matita vs eyeliner, siero vs
 *     crema, maschera vs box, ecc.).
 *
 * Output:
 *   - scratch/grouped_variants_audit_report.json  (report strutturato)
 *   - tabella riepilogativa a console
 *
 * Uso:  node scripts/audit_grouped_variants.js
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const REPORT_PATH = path.join(ROOT, "scratch", "grouped_variants_audit_report.json");

/* --------------------------------------------------------------------------
 * 1. COSTANTI / EURISTICHE
 * ------------------------------------------------------------------------ */

// Packshot generici di brand usati come fallback: se una scheda li usa al posto
// dell'immagine della tonalità, la miniatura NON mostra il colore reale.
const GENERIC_PACKSHOTS = new Set([
  "/products/eveline-cosmetics-packshot.jpg",
  "/products/pierre-rene-packshot.jpg",
  "/products/cipria-milano-packshot.jpg",
  "/products/miyo-packshot.jpg",
]);

// Hex chiaramente placeholder (non rappresentano una tonalità reale).
const PLACEHOLDER_HEX = new Set(["#---", "#FAF7FC", "#FFFFFF", "#CCCCCC"]);

// Famiglie funzionali: parole chiave -> macro-tipo di prodotto.
const FAMILY_RULES = [
  ["eyeliner", /\b(eyeliner|eye\s?liner|delineatore|precise slim|precision)\b/i],
  ["matita_occhi", /\b(matita|pencil|kajal)\b/i],
  ["sopracciglia", /\b(sopracciglia|eyebrow|brow|brow\s?poet|fissatore)\b/i],
  ["mascara", /\bmascara\b/i],
  ["ombretto", /\b(ombretto|eyeshadow|eye\s?shadow|palette|pigment|pigmenti)\b/i],
  ["rossetto", /\b(rossetto|lipstick|royal\s?mat|satin\s?pure|mat\s?&|velvet\s?lipstick)\b/i],
  ["lip_gloss", /\b(gloss|lucidalabbra|lip\s?oil|lip\s?matic|pudding|plumping|cover\s?gloss)\b/i],
  ["matita_labbra", /\b(matita\s?labbra|lip\s?liner|lip\s?contour|lip\s?shaper|scriber|gel\s?lip)\b/i],
  ["blush", /\b(blush|fard|rouge\s?powder)\b/i],
  ["cipria_polvere", /\b(cipria|powder|polvere|loose\s?powder|compact\s?powder|traslucent)\b/i],
  ["fondotinta", /\b(fondotinta|foundation|bb\s?cream|bb\s?cream|make\s?up\s?base|base\s?trucco|base\s?trucco)\b/i],
  ["correttore", /\b(correttore|concealer|camouflage|contour\s?concealer)\b/i],
  ["contouring", /\b(contour|terra\s?abbronzante|bronzer|feel\s?the\s?bronze)\b/i],
  ["smalto", /\b(smalto|nail\s?polish|nail)\b/i],
  ["siero", /\b(siero|serum|essence|essenza|booster|ampoule|ampolla|meso|needle|oil\b)/i],
  ["crema", /\b(crema\s?(viso|idratante|rimodellante|trattante|nutrente|antietà|antieta|giorno|notte)|face\s?cream|d'?aury|remodelift|perfect\s?bright)\b/i],
  ["maschera", /\b(maschera|mask|monodose|monouso|sheet)\b/i],
  ["tonico", /\b(tonico|toner|clean\s?shot)\b/i],
  ["detergente", /\b(detergente|cleanser|struccante|latte|milk|removing\s?gel|mousse|gel\s?deter)\b/i],
  ["corpo_slim", /\b(slim\s?extreme|cellulite|smagliature|stretch|rimodellante|thermo|night\s?therapy|body\s?shot|bust|drenante)\b/i],
  ["balsamo", /\b(balsamo|balm|burro|butter)\b/i],
];

// Attivi forti: se le varianti hanno attivi diversi, sono formule diverse.
const ACTIVE_RULES = [
  ["collagen", /\b(collag\w*)\b/i],
  ["hyaluron", /\b(hyaluron\w*|ialuron\w*|ha\s?hero)\b/i],
  ["retinol", /\b(retinol)\b/i],
  ["niacinamide", /\b(niacinamid\w*|nacinam\w*|niacyanamid\w*)\b/i],
  ["peptidi", /\b(peptid\w*)\b/i],
  ["ceramidi", /\b(ceramid\w*)\b/i],
  ["vitamina_c", /\b(vit\s?c\b|vitamin\s?c\b)\b/i],
  ["snail", /\b(snail|lumaca|bava)\b/i],
  ["glutathione", /\b(glutathione)\b/i],
  ["acido_ialuronico", /\b(acido\s?ialuronico)\b/i],
];

// Formati / consistenze: se differiscono, sono prodotti diversi.
const FORMAT_RULES = [
  ["latte", /\b(latte|milk)\b/i],
  ["gel", /\b(gel)\b/i],
  ["crema", /\b(crema|cream)\b/i],
  ["siero", /\b(siero|serum)\b/i],
  ["schiuma", /\b(schiuma|foam|mousse)\b/i],
  ["olio", /\b(olio|oil)\b/i],
  ["balsamo", /\b(balsamo|balm)\b/i],
  ["stick", /\b(stick)\b/i],
  ["maschera", /\b(maschera|mask)\b/i],
];

const BRAND_TOKENS = [
  "Diego dalla Palma",
  "RVB LAB",
  "Pierre René",
  "Eveline Cosmetics",
  "Cipria Make Up",
  "Cipria Milano",
  "Holika Holika",
  "Miyo Cosmetics",
  "Miyo",
];

// Alias di brand considerati equivalenti (stessa realtà commerciale).
const BRAND_EQUIV = {
  "Miyo": ["Miyo Cosmetics", "Miyo Make Up"],
  "Miyo Cosmetics": ["Miyo", "Miyo Make Up"],
  "Cipria Make Up": ["Cipria Milano", "Cipria"],
  "Cipria Milano": ["Cipria Make Up", "Cipria"],
};
function sameBrandFamily(a, b) {
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al.includes(bl) || bl.includes(al)) return true;
  const eq = BRAND_EQUIV[a] || [];
  return eq.some((x) => x.toLowerCase() === bl);
}

const SIZE_RE = /(\d+(?:[.,]\d+)?)\s*(ml|m l|g|gr|grammi|pz)\b/gi;

// Un'immagine packshot è considerata "riutilizzata/placeholder" se compare su
// >= 3 schede prodotto diverse (indice di non-specificità per la tonalità).
const IMAGE_REUSE_THRESHOLD = 3;
let IMAGE_USAGE = new Map(); // image -> Set(productId)
function imageReuseCount(image) {
  const set = IMAGE_USAGE.get(image);
  return set ? set.size : 0;
}
function isReusedImage(image) {
  return imageReuseCount(image) >= IMAGE_REUSE_THRESHOLD;
}

const IMG_STOPWORDS = new Set([
  "eveline", "cosmetics", "pierre", "rene", "cipria", "milano", "miyo", "make",
  "makeup", "products", "webp", "jpg", "jpeg", "png", "packshot", "professional",
  "professionale", "vegan", "cosmetic", "new", "default", "title", "thumb",
]);
function nameTokens(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !IMG_STOPWORDS.has(t));
}
// L'immagine è coerente col nome se condivide almeno un token significativo.
function imageRelevant(image, texts) {
  if (!image) return false;
  const imgTokens = new Set(nameTokens(image.replace(/^.*\//, "").replace(/\.[a-z0-9]+$/i, "")));
  const nameTokenSet = new Set();
  for (const t of texts) for (const tok of nameTokens(t)) nameTokenSet.add(tok);
  for (const t of imgTokens) if (nameTokenSet.has(t)) return true;
  return false;
}

/* --------------------------------------------------------------------------
 * 2. REGISTRO CATEGORIA B — VERIFICATO A MANO (perché semanticamente
 *    indistinguibile dalle sfumature con sole euristiche).
 *
 *    Ogni voce: id scheda raggruppata -> motivo + proposta di sdoppiamento.
 *    `groups[].eans` elenca gli EAN che compongono ciascuna nuova scheda.
 * ------------------------------------------------------------------------ */
const HETEROGENEOUS = {
  "prod-eveline-cosmetics-eye-pencils": {
    confidence: "ALTA",
    reason:
      "Raggruppa un eyeliner con timbro 2-in-1, un eyeliner liquido preciso e una matita sopracciglia waterproof: tre articoli con funzioni e prezzi diversi (6,50/6,90/8,90 €).",
    groups: [
      { eans: ["5903416067665"], cardName: "Eveline Cosmetics Eyeliner & Stamp 2in1 Star", category: "Occhi" },
      { eans: ["5901964041380"], cardName: "Eveline Cosmetics Eyeliner Precision Black", category: "Occhi" },
      { eans: ["5903416017448"], cardName: "Eveline Cosmetics Matita Sopracciglia Waterproof Soft Brown", category: "Occhi" },
    ],
  },
  "prod-pierre-ren-eye-pencils": {
    confidence: "ALTA",
    reason:
      "Accorpa la linea Royal Pencil (2 tonalità nero/marrone, 11,90 €) e un Long Lasting Eyeliner 03 (7,50 €): linee e prezzi differenti.",
    groups: [
      { eans: ["3700467842508", "3700467852125"], cardName: "Pierre René Royal Pencil Occhi", category: "Occhi" },
      { eans: ["3700467839805"], cardName: "Pierre René Long Lasting Eyeliner 03", category: "Occhi" },
    ],
  },
  "prod-pierre-ren-lip-liners": {
    confidence: "ALTA",
    reason:
      "Sei Lipmatic Waterproof Liner (10,50 €) raggruppati con Glory Lipmatic Love (14,90 €): linea e prezzo diversi.",
    groups: [
      { eans: ["3700467814550", "3700467820889", "3700467825372", "3700467842393", "3700467852262", "3700467852279"], cardName: "Pierre René Lipmatic Waterproof Liner", category: "Labbra" },
      { eans: ["3700467850060"], cardName: "Pierre René Glory Lipmatic Love", category: "Labbra" },
    ],
  },
  "prod-eveline-cosmetics-slim-extreme-body": {
    confidence: "ALTA",
    reason:
      "Contiene 4 prodotti Slim Extreme con funzioni diverse: siero smagliature 150 ml, siero notte 250 ml, siero rimodellante 250 ml e termo-attivatore 250 ml.",
    groups: [
      { eans: ["5903416026983"], cardName: "Eveline Cosmetics Slim Extreme 4D Strech Marks 150 ml", category: "Skincare & Dermo" },
      { eans: ["5901761916034"], cardName: "Eveline Cosmetics Slim Extreme Night Therapy Serum 250 ml", category: "Skincare & Dermo" },
      { eans: ["5901761939682"], cardName: "Eveline Cosmetics Slim Extreme 4D Slimming Serum 250 ml", category: "Skincare & Dermo" },
      { eans: ["5907609316387"], cardName: "Eveline Cosmetics Slim Extreme Thermo Activator 250 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5901964013721": {
    confidence: "ALTA",
    reason:
      "Tre prodotti corpo diversi sotto il cappello 'Slim Extreme': crema anticellulite 250 ml, crema busto 200 ml e siero superconcentrato 250 ml.",
    groups: [
      { eans: ["5901964013721"], cardName: "Eveline Cosmetics Slim Extreme 3D Crema Anticellulite 250 ml", category: "Skincare & Dermo" },
      { eans: ["5901761913972"], cardName: "Eveline Cosmetics Slim Extreme Intense Bust Volumizzante 200 ml", category: "Skincare & Dermo" },
      { eans: ["5901761967708"], cardName: "Eveline Cosmetics Slim Extreme Superconcentrato Serum 250 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416070535": {
    confidence: "ALTA",
    reason:
      "Cinque creme viso AMPOULE CREAM con attivi/formule differenti (collagene, acido ialuronico, niacinamide, retinolo, peptidi): stessa confezione ma trattamenti diversi.",
    groups: [
      { eans: ["5903416070535"], cardName: "Eveline Cosmetics Ampoule Cream Collagen Lifting 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416070511"], cardName: "Eveline Cosmetics Ampoule Cream Hyaluron Moisturizing 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416070481"], cardName: "Eveline Cosmetics Ampoule Cream Niacinamide Imperfezioni 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416070504"], cardName: "Eveline Cosmetics Ampoule Cream Retinol Skin Night 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416070498"], cardName: "Eveline Cosmetics Ampoule Cream Peptides Wrinkle 50 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416047452": {
    confidence: "ALTA",
    reason:
      "Quattro maschere monouso Face Therapy con attivi differenti (collagene, ceramidi, niacinamide, retinolo): trattamenti d'urto distinti.",
    groups: [
      { eans: ["5903416047452"], cardName: "Eveline Cosmetics Face Therapy Maschera Collagen 8 ml", category: "Skincare & Dermo" },
      { eans: ["5903416058533"], cardName: "Eveline Cosmetics Face Therapy Maschera Ceramidi 8 ml", category: "Skincare & Dermo" },
      { eans: ["5903416058540"], cardName: "Eveline Cosmetics Face Therapy Maschera Niacinamide 8 ml", category: "Skincare & Dermo" },
      { eans: ["5903416047469"], cardName: "Eveline Cosmetics Face Therapy Maschera Retinol 8 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-71219": {
    confidence: "ALTA",
    reason:
      "La scheda 'Wonder Show Illuminante Stick' include in realtà 2 illuminanti (Starlight/Golden Hour) e 2 bronzer (1BE Natural/2BE Happy): prodotti con funzione opposta.",
    groups: [
      { eans: ["5903416074229", "5903416074236"], cardName: "Eveline Cosmetics Wonder Show Illuminante Stick", category: "Viso" },
      { eans: ["5903416074243", "5903416074250"], cardName: "Eveline Cosmetics Wonder Show Bronzer Stick", category: "Viso" },
    ],
  },
  "cipria-5903416090816": {
    confidence: "ALTA",
    reason:
      "Sotto 'Pink Snail' convivono un siero illuminante 30 ml e una crema nutrente giorno/notte 50 ml: due prodotti distinti.",
    groups: [
      { eans: ["5903416090816"], cardName: "Eveline Cosmetics Pink Snail Siero Illuminante 30 ml", category: "Skincare & Dermo" },
      { eans: ["5903416090793"], cardName: "Eveline Cosmetics Pink Snail Crema Nutrente Giorno/Notte 50 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416084563": {
    confidence: "ALTA",
    reason:
      "Raggruppa un latte detergente ai ceramidi 150 ml e un gel struccante 150 ml: due detergenti con consistenza diversa.",
    groups: [
      { eans: ["5903416084563"], cardName: "Eveline Cosmetics 6 Ceramidi Latte Detergente 150 ml", category: "Skincare & Dermo" },
      { eans: ["5903416047421"], cardName: "Eveline Cosmetics 6 Ceramidi Gel Struccante 150 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416066897": {
    confidence: "ALTA",
    reason:
      "Due tonici Clean Shot diversi per formula e formato: idratante 150 ml e rigenerante 200 ml.",
    groups: [
      { eans: ["5903416066897"], cardName: "Eveline Cosmetics Clean Shot Tonico Idratante 150 ml", category: "Skincare & Dermo" },
      { eans: ["5903416066880"], cardName: "Eveline Cosmetics Clean Shot Tonico Rigenerante 200 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-3700467823842": {
    confidence: "ALTA",
    reason:
      "Due basi trucco Pierre René differenti: Make Up Base Illuminating Light Rose e Make Up Base Smoothing Transparent.",
    groups: [
      { eans: ["3700467823842"], cardName: "Pierre René Make Up Base Illuminating Light Rose", category: "Viso" },
      { eans: ["3700467805701"], cardName: "Pierre René Make Up Base Smoothing Transparent", category: "Viso" },
    ],
  },
  "cipria-5903416066675": {
    confidence: "MEDIA",
    reason:
      "Body Shot raggruppa due balsami-siero corpo con formule diverse: Hyaluronic e Regenerating.",
    groups: [
      { eans: ["5903416066675"], cardName: "Eveline Cosmetics Body Shot Balsamo-Siero Hyaluronic 200 ml", category: "Skincare & Dermo" },
      { eans: ["5903416066682"], cardName: "Eveline Cosmetics Body Shot Balsamo-Siero Regenerating 200 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416081647": {
    confidence: "MEDIA",
    reason:
      "Korean Rituals raggruppa due creme con attivi diversi: Ceramides+ e Hyaluron+.",
    groups: [
      { eans: ["5903416081647"], cardName: "Eveline Cosmetics Korean Rituals Crema Ceramides+ 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416081654"], cardName: "Eveline Cosmetics Korean Rituals Crema Hyaluron+ 50 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416084396": {
    confidence: "MEDIA",
    reason:
      "Super Needles raggruppa due meso-booster con attivi diversi: Collagen e Hyaluron.",
    groups: [
      { eans: ["5903416084396"], cardName: "Eveline Cosmetics Super Needles Meso-Booster Collagen 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416084402"], cardName: "Eveline Cosmetics Super Needles Meso-Booster Hyaluron 50 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-5903416077008": {
    confidence: "MEDIA",
    reason:
      "Perfect Bright raggruppa due referenze con SPF/formato diversi: '20 50ML' e '50 30ML'.",
    groups: [
      { eans: ["5903416077008"], cardName: "Eveline Cosmetics Perfect Bright Crema SPF20 50 ml", category: "Skincare & Dermo" },
      { eans: ["5903416077053"], cardName: "Eveline Cosmetics Perfect Bright Crema SPF50 30 ml", category: "Skincare & Dermo" },
    ],
  },
  "cipria-3700467850787": {
    confidence: "MEDIA",
    reason:
      "Medic Laboratorium raggruppa due sieri essenza con funzioni diverse: Anti-Aging e Hydration, entrambi 30 ml.",
    groups: [
      { eans: ["3700467850787"], cardName: "Pierre René Medic Laboratorium Siero Essenza Anti-Aging 30 ml", category: "Skincare & Dermo" },
      { eans: ["3700467850770"], cardName: "Pierre René Medic Laboratorium Siero Essenza Hydration 30 ml", category: "Skincare & Dermo" },
    ],
  },
};

/* --------------------------------------------------------------------------
 * 3. ANOMALIE (varianti anomale non necessariamente da sdoppiare, ma che
 *    generano ambiguità per Federica). Verificate a mano.
 * ------------------------------------------------------------------------ */
const ORPHAN_SHADES = [
  { single: "prod-single-3700467842447", singleName: "Brow Pomade 03 Dark Brown", parent: "cipria-66057", note: "La tonalità 03 vive su una scheda singola mentre 01 e 02 sono raggruppate." },
  { single: "prod-single-3700467819715", singleName: "Skin Balance Cover 23 Nude", parent: "cipria-66113", note: "Tonalità 23 isolata: 19/20/21/ONZE sono raggruppate." },
  { single: "prod-single-3700467852668", singleName: "Skin Elixir Foundation 03 Vanilla Nude", parent: "cipria-71394", note: "Tonalità 03 isolata: 01/02/04/05 raggruppate." },
  { single: "prod-single-3700467850343", singleName: "Lumi Touch Foundation Art 03", parent: "cipria-69979", note: "Tonalità 03 isolata: N01/02/04 raggruppate." },
  { single: "prod-single-3700467840009", singleName: "Contour Concealer 05", parent: "cipria-66178", note: "Tonalità 05 isolata: 01/02/04/09 raggruppate." },
  { single: "prod-single-8024523472085", singleName: "Fondotinta No Trace 302", parent: "cipria-360", note: "Tonalità 302 isolata: 301/303/304/305 raggruppate." },
  { single: "prod-single-8024523472184", singleName: "Wet & Dry 591", parent: "cipria-64233", note: "Tonalità 591 isolata: 15/32/39 raggruppate." },
  { single: "prod-single-5903416065746", singleName: "Wonder Match Rossetto Liquido 3", parent: "cipria-5903416065722", note: "Tonalità 3 isolata: 1/2/5/6/8/10 raggruppate." },
  { single: "prod-single-5903416065753", singleName: "Wonder Match Rossetto Liquido 4", parent: "cipria-5903416065722", note: "Tonalità 4 isolata: 1/2/5/6/8/10 raggruppate." },
  { single: "prod-single-5903416078807", singleName: "Wonder Match Rossetto Liquido 4A", parent: "cipria-5903416065722", note: "Tonalità 4A isolata: 1/2/5/6/8/10 raggruppate." },
  { single: "prod-single-5903416078821", singleName: "Wonder Match Rossetto Liquido 11A", parent: "cipria-5903416065722", note: "Tonalità 11A isolata: 1/2/5/6/8/10 raggruppate." },
  { single: "prod-single-5901761941692", singleName: "Lipstick Satin Variété 05", parent: "cipria-64569", note: "Tonalità 05 isolata: 01/02/03/04/06 raggruppate." },
  { single: "prod-eveline-cosmetics-sheet-masks", singleName: "Maschera Face Therapy Vit C 8 ml", parent: "cipria-5903416047452", note: "La VIT C è la 5ª maschera Face Therapy ma vive su una scheda dal nome ombrello generico, mentre le altre 4 sono raggruppate." },
];

const FRAGMENTED_FAMILIES = [
  { a: "cipria-70639", b: "prod-pierre-ren-satin-pure-lipstick", line: "Pierre René Satin Pure Rossetto", note: "Stessa linea su 2 schede con EAN diversi (8 + 2 tonalità)." },
  { a: "cipria-69880", b: "prod-pierre-ren-royal-mat-lipstick", line: "Pierre René Royal Mat Rossetto", note: "Stessa linea su 2 schede con EAN diversi (8 + 3 tonalità)." },
  { a: "cipria-5184", b: "prod-miyo-outstanding-lip-gloss", line: "Miyo Lip Gloss Outstanding", note: "Stessa linea su 2 schede con EAN diversi (4 + 3 tonalità)." },
  { a: "cipria-66199", b: "prod-pierre-ren-nail-polish", line: "Pierre René Nail Polish", note: "Stessa linea su 2 schede con EAN diversi (8 + 7 tonalità)." },
  { a: "cipria-64154", b: "prod-cipria-make-up-tinta-labbra-sublime", line: "Cipria Make Up Tinta Labbra Sublime", note: "Stessa linea su 2 schede con EAN diversi (5 + 5 tonalità)." },
  { a: "cipria-65956", b: "prod-pierre-ren-eye-pencils", line: "Pierre René Long Lasting Eyeliner", note: "Long Lasting Eyeliner 03 presente anche nella scheda raggruppata matite occhi." },
  { a: "prod-single-3700467852712", b: "prod-single-3700467852729", line: "Miyo Flow Master Pen", note: "Stessa penna in 2 tonalità spezzata su 2 schede singole (01 Tobacco, 02 Sweet Plum)." },
];

/* --------------------------------------------------------------------------
 * 4. UTILITÀ
 * ------------------------------------------------------------------------ */

function imageExists(webPath) {
  if (!webPath || typeof webPath !== "string") return false;
  const clean = webPath.split("?")[0].replace(/^\/+/, "");
  return fs.existsSync(path.join(PUBLIC_DIR, clean));
}

function matchesRules(text, rules) {
  const out = new Set();
  for (const [name, re] of rules) if (re.test(text)) out.add(name);
  return [...out];
}

function extractSizes(text) {
  const out = new Set();
  let m;
  const re = new RegExp(SIZE_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    out.add(`${parseFloat(m[1].replace(",", "."))}${m[2].replace(/\s/g, "").toLowerCase()}`);
  }
  return [...out];
}

function analyzeProduct(p) {
  const variants = p.variants || [];
  const prices = variants.map((v) => v.price).filter((x) => typeof x === "number");
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;
  const distinctPrices = [...new Set(prices)];

  const allText = variants.map((v) => `${v.name} ${v.sku} ${v.ean}`).join(" | ");
  const families = matchesRules(allText, FAMILY_RULES);
  const actives = matchesRules(allText, ACTIVE_RULES);
  const formats = matchesRules(allText, FORMAT_RULES);
  const sizes = extractSizes(allText);

  const hexes = variants.map((v) => v.colorHex);
  const hexPresent = hexes.filter((h) => h && !PLACEHOLDER_HEX.has(h));
  const hexCoverage = variants.length ? hexPresent.length / variants.length : 0;
  const distinctHex = [...new Set(hexes.filter(Boolean))];

  const images = variants.map((v) => v.image).filter(Boolean);
  const genericCount = images.filter((i) => GENERIC_PACKSHOTS.has(i)).length;
  const missingCount = images.filter((i) => !imageExists(i)).length;
  const dedicatedImages = images.filter((i) => !GENERIC_PACKSHOTS.has(i) && imageExists(i));
  const imageTexts = [p.name, ...variants.map((v) => v.name)];
  const reusedImageCount = images.filter((i) => imageExists(i) && isReusedImage(i)).length;
  const suspectImageCount = images.filter(
    (i) => imageExists(i) && !GENERIC_PACKSHOTS.has(i) && !imageRelevant(i, imageTexts)
  ).length;
  const specificImages = images.filter(
    (i) => !GENERIC_PACKSHOTS.has(i) && imageExists(i) && !isReusedImage(i) && imageRelevant(i, imageTexts)
  );

  const priceSpread = priceMin !== null && priceMax !== null ? +(priceMax - priceMin).toFixed(2) : 0;

  // Euristiche CATEGORIA B
  const signals = {
    priceSpread,
    families,
    actives,
    formats,
    sizes,
    distinctPrices,
    hexCoverage: +hexCoverage.toFixed(2),
    distinctHex,
    usesGenericPackshot: genericCount > 0,
    genericImageCount: genericCount,
    missingImageCount: missingCount,
    dedicatedImageCount: dedicatedImages.length,
    reusedImageCount,
    suspectImageCount,
    specificImageCount: specificImages.length,
  };

  const heuristicB =
    signals.priceSpread > 0 ||
    actives.length >= 2 ||
    sizes.length >= 2 ||
    (families.length >= 2 && formats.length >= 2);

  return { variants, signals, heuristicB };
}

function buildSplit(p, analysis, blueprint) {
  const variantByEan = new Map((p.variants || []).map((v) => [String(v.ean), v]));
  const assigned = new Set();
  const groups = blueprint.groups.map((g) => {
    const vs = g.eans.map((ean) => {
      assigned.add(String(ean));
      return variantByEan.get(String(ean));
    });
    const ok = vs.every(Boolean);
    return {
      cardName: g.cardName,
      category: g.category,
      variants: vs.filter(Boolean).map((v) => ({
        name: v.name,
        ean: v.ean,
        sku: v.sku,
        price: v.price,
        stock: v.stock ?? 0,
        colorHex: v.colorHex,
        image: v.image,
        imageExists: imageExists(v.image),
      })),
      shades: vs.length,
      allVariantsFound: ok,
    };
  });
  const unassigned = (p.variants || []).filter((v) => !assigned.has(String(v.ean)));
  return {
    sourceVariantCount: (p.variants || []).length,
    resultingCards: groups.length,
    netNewCards: groups.length - 1,
    groups,
    unassignedVariants: unassigned.map((v) => ({ name: v.name, ean: v.ean })),
    // Immagine packshot disponibile e specifica per ciascuna nuova scheda?
    imageStrategy: groups.map((g) => {
      const texts = [g.cardName, ...g.variants.map((v) => v.name)];
      const specific = g.variants.find(
        (v) => v.imageExists && !GENERIC_PACKSHOTS.has(v.image) && !isReusedImage(v.image) && imageRelevant(v.image, texts)
      );
      const anyExisting = g.variants.find((v) => v.imageExists && !GENERIC_PACKSHOTS.has(v.image));
      return {
        cardName: g.cardName,
        usableImage: specific ? specific.image : null,
        fallbackImage: anyExisting ? anyExisting.image : null,
        needsPackshot: !specific,
        reason: specific
          ? "immagine specifica coerente disponibile"
          : anyExisting
          ? "immagine presente ma generica/riutilizzata/non coerente col nome"
          : "nessuna immagine packshot valida",
      };
    }),
  };
}

/* --------------------------------------------------------------------------
 * 5. MAIN
 * ------------------------------------------------------------------------ */

function main() {
  if (!fs.existsSync(CATALOG_PATH)) throw new Error(`Catalogo non trovato: ${CATALOG_PATH}`);
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  if (!Array.isArray(catalog)) throw new Error("catalog.json non è un array.");

  // Indice riutilizzo immagini (packshot condivisi = non specifici per tonalità)
  IMAGE_USAGE = new Map();
  for (const p of catalog) {
    const imgs = new Set([p.image || "", ...(p.images || []), ...((p.variants || []).map((v) => v.image || ""))]);
    for (const img of imgs) {
      if (!img) continue;
      if (!IMAGE_USAGE.has(img)) IMAGE_USAGE.set(img, new Set());
      IMAGE_USAGE.get(img).add(p.id);
    }
  }

  const relevant = catalog.filter(
    (p) => (p.variants || []).length > 1 || String(p.id).startsWith("prod-")
  );

  const categoryA = [];
  const categoryB = [];
  const candidates = [];

  for (const p of relevant) {
    const analysis = analyzeProduct(p);
    const variantCount = (p.variants || []).length;
    const isSingle = variantCount <= 1;
    const blueprint = HETEROGENEOUS[p.id];

    const base = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      variantCount,
      priceRange:
        analysis.signals.distinctPrices.length > 1
          ? `€${Math.min(...analysis.signals.distinctPrices)}–€${Math.max(...analysis.signals.distinctPrices)}`
          : `€${p.price}`,
      signals: analysis.signals,
    };

    if (blueprint) {
      categoryB.push({
        ...base,
        classification: "B",
        confidence: blueprint.confidence,
        reason: blueprint.reason,
        detectedBy: "confermato",
        variants: (p.variants || []).map((v) => ({
          name: v.name,
          ean: v.ean,
          sku: v.sku,
          price: v.price,
          stock: v.stock ?? 0,
          colorHex: v.colorHex,
          image: v.image,
          imageExists: imageExists(v.image),
        })),
        proposedSplit: buildSplit(p, analysis, blueprint),
      });
    } else if (!isSingle && analysis.heuristicB) {
      candidates.push({
        ...base,
        classification: "B?",
        confidence: "DA VERIFICARE",
        reason:
          "Segnali euristici di eterogeneità (prezzo / attivi diversi / formati-taglie multiple). Non confermato a mano: valutare sdoppiamento.",
        detectedBy: "euristico",
      });
    } else {
      categoryA.push({
        ...base,
        classification: "A",
        reason: isSingle
          ? "Scheda singola già autonoma (1 variante)."
          : "Varianti con stesso prezzo/formula: vere sfumature/nuance cosmetiche.",
        detectedBy: "euristico",
        dataQuality: {
          hexCoverage: analysis.signals.hexCoverage,
          missingHex: analysis.signals.hexCoverage < 1,
          usesGenericPackshot: analysis.signals.usesGenericPackshot,
          reusedImageCount: analysis.signals.reusedImageCount,
          suspectImageCount: analysis.signals.suspectImageCount,
          specificImageCount: analysis.signals.specificImageCount,
          missingImages: analysis.signals.missingImageCount > 0,
          note:
            analysis.signals.hexCoverage < 1
              ? "Alcune varianti non hanno colorHex: sull'e-commerce la miniatura non mostra la tonalità."
              : analysis.signals.usesGenericPackshot ||
                analysis.signals.reusedImageCount > 0 ||
                analysis.signals.suspectImageCount > 0
              ? "La miniatura usa packshot generico/riutilizzato o non coerente col nome: non mostra la tonalità."
              : null,
        },
      });
    }
  }

  // Anomalie automatiche
  categoryB.sort((a, b) => a.name.localeCompare(b.name, "it"));
  candidates.sort((a, b) => a.name.localeCompare(b.name, "it"));
  const brandMismatches = [];
  for (const p of catalog) {
    for (const b of BRAND_TOKENS) {
      if (sameBrandFamily(p.brand, b)) continue;
      if (p.name.toLowerCase().includes(b.toLowerCase())) {
        brandMismatches.push({ id: p.id, brand: p.brand, name: p.name, conflictingBrand: b });
        break;
      }
    }
  }

  const missingImages = [];
  for (const p of catalog) {
    const refs = new Set([p.image || "", ...(p.images || []), ...((p.variants || []).map((v) => v.image || ""))]);
    const missing = [...refs].filter((i) => i && !imageExists(i));
    if (missing.length) {
      missingImages.push({
        id: p.id,
        name: p.name,
        brand: p.brand,
        missingImages: missing,
        isGenericPackshotMissing: missing.some((m) => GENERIC_PACKSHOTS.has(m)),
      });
    }
  }

  const anomalies = {
    orphanShades: ORPHAN_SHADES.map((o) => {
      const parent = catalog.find((p) => p.id === o.parent);
      return { ...o, parentFound: !!parent, parentName: parent ? parent.name : null };
    }),
    fragmentedFamilies: FRAGMENTED_FAMILIES.map((f) => ({
      ...f,
      aFound: catalog.some((p) => p.id === f.a),
      bFound: catalog.some((p) => p.id === f.b),
    })),
    brandNameMismatches: brandMismatches,
    missingImages,
  };

  // Conteggi
  const bNewCards = categoryB.reduce((acc, b) => acc + b.proposedSplit.resultingCards, 0);
  const bOldCards = categoryB.length;
  const bNet = bNewCards - bOldCards;

  const report = {
    generatedAt: new Date().toISOString(),
    catalogPath: path.relative(ROOT, CATALOG_PATH).replace(/\\/g, "/"),
    totals: {
      catalogProducts: catalog.length,
      totalVariants: catalog.reduce((a, p) => a + (p.variants || []).length, 0),
      analyzedProducts: relevant.length,
      categoryA: categoryA.length,
      categoryBConfirmed: categoryB.length,
      categoryBCandidates: candidates.length,
      categoryBVariants: categoryB.reduce((a, b) => a + b.variantCount, 0),
      categoryBNewCards: bNewCards,
      categoryBNetNewCards: bNet,
    },
    categoryA,
    categoryB,
    categoryBCandidates: candidates,
    anomalies,
  };

  if (!fs.existsSync(path.dirname(REPORT_PATH))) fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  printReport(report);
  console.log(`\nReport JSON scritto in: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, "/")}`);
}

/* --------------------------------------------------------------------------
 * 6. STAMPA TABELLARE
 * ------------------------------------------------------------------------ */

function printReport(r) {
  const line = "─".repeat(120);
  console.log("\n" + line);
  console.log("AUDIT FORENSE VARIANTI RAGGRUPPATE — Scelta Makeup");
  console.log(line);
  console.log(`Prodotti a catalogo: ${r.totals.catalogProducts} | Varianti totali: ${r.totals.totalVariants}`);
  console.log(`Schede analizzate (varianti>1 o id 'prod-'): ${r.totals.analyzedProducts}`);
  console.log(`  • CATEGORIA A (sfumature legittime): ${r.totals.categoryA}`);
  console.log(`  • CATEGORIA B (eterogenee, confermate): ${r.totals.categoryBConfirmed}`);
  console.log(`  • CATEGORIA B? (candidati da verificare): ${r.totals.categoryBCandidates}`);
  console.log(
    `Impatto sdoppiamento B: ${r.totals.categoryBVariants} varianti -> ${r.totals.categoryBNewCards} schede autonome (+${r.totals.categoryBNetNewCards} schede nette).`
  );

  console.log("\n" + line);
  console.log("CATEGORIA B — SCHEDE DA PORTARE FUORI (confermate)");
  console.log(line);
  const header = ["ID scheda", "Scheda attuale", "Var.", "Prezzi", "Nuove schede", "Packshot"];
  const widths = [34, 46, 5, 14, 13, 22];
  console.log(fmtRow(header, widths));
  console.log("─".repeat(widths.reduce((a, b) => a + b, 0) + widths.length));
  for (const b of r.categoryB) {
    const needPackshot = b.proposedSplit.imageStrategy.filter((i) => i.needsPackshot).length;
    const imageNote = needPackshot === 0 ? "OK" : `${needPackshot}/${b.proposedSplit.resultingCards} da reperire`;
    console.log(
      fmtRow(
        [b.id, trunc(b.name, widths[1]), String(b.variantCount), b.priceRange, String(b.proposedSplit.resultingCards), imageNote],
        widths
      )
    );
    for (const g of b.proposedSplit.groups) {
      console.log(`   ↳ ${trunc(g.cardName, 70)}  [${g.shades} tonalità]  €${g.variants[0] ? g.variants[0].price.toFixed(2) : "?"}`);
    }
    if (b.proposedSplit.unassignedVariants.length) {
      console.log(`   ⚠ varianti non assegnate: ${b.proposedSplit.unassignedVariants.map((u) => u.name).join(", ")}`);
    }
  }

  console.log("\n" + line);
  console.log("CATEGORIA B? — CANDIDATI EURISTICI DA VERIFICARE");
  console.log(line);
  if (!r.categoryBCandidates.length) {
    console.log("(nessun candidato euristico non confermato)");
  } else {
    for (const c of r.categoryBCandidates) {
      console.log(`• ${c.id} | ${c.name}`);
      console.log(
        `    var=${c.variantCount} prezzi=${c.priceRange} famiglie=[${c.signals.families.join(", ")}] attivi=[${c.signals.actives.join(
          ", "
        )}] taglie=[${c.signals.sizes.join(", ")}] hex=${Math.round(c.signals.hexCoverage * 100)}%`
      );
    }
  }

  console.log("\n" + line);
  console.log("ANOMALIE (varianti anomale / ambiguità per il banco)");
  console.log(line);
  console.log(`• Tonalità orfane (scheda singola ma appartengono a una famiglia raggruppata): ${r.anomalies.orphanShades.length}`);
  for (const o of r.anomalies.orphanShades) {
    console.log(`    - ${o.singleName} (${o.single}) -> famiglia ${o.parent}${o.parentFound ? " " + trunc(o.parentName, 40) : " (NON TROVATA)"}`);
  }
  console.log(`• Famiglie frammentate su più schede: ${r.anomalies.fragmentedFamilies.length}`);
  for (const f of r.anomalies.fragmentedFamilies) {
    console.log(`    - ${f.line}: ${f.a} + ${f.b}`);
  }
  console.log(`• Disallineamenti brand/nome: ${r.anomalies.brandNameMismatches.length}`);
  for (const m of r.anomalies.brandNameMismatches) {
    console.log(`    - ${m.id}: brand="${m.brand}" ma nome cita "${m.conflictingBrand}"`);
  }
  console.log(`• Prodotti con immagini mancanti: ${r.anomalies.missingImages.length}`);
  const genericMissing = r.anomalies.missingImages.filter((m) => m.isGenericPackshotMissing);
  console.log(
    `    - di cui con packshot generico NON presente su disco: ${genericMissing.length} (queste schede mostrano immagine rotta)`
  );
  console.log(line);
}

function trunc(s, n) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n);
}

function fmtRow(cells, widths) {
  return cells.map((c, i) => trunc(c, widths[i])).join(" ");
}

main();
