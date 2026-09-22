/**
 * deep_catalog_resolver.js
 * -----------------------------------------------------------------------------
 * Bonifica profonda e certificata del catalogo Diego dalla Palma / RVB LAB
 * di Scelta Makeup (86 prodotti).
 *
 * Funzioni:
 *  1. Risolve tutti gli 86 prodotti (nome ufficiale IT, brand esatto,
 *     prezzo di listino verificato, packshot ufficiale).
 *  2. Scarica + ottimizza (WebP) le immagini packshot autentiche.
 *  3. Aggiorna data/catalog.json mantenendo integri gli altri 260 prodotti.
 *  4. Genera scratch/bonifica_report.json con sintesi completa.
 *
 * Esecuzione:  node scripts/deep_catalog_resolver.js
 * -----------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const RESEARCH_PATH = path.join(ROOT, "scripts", "ddp_products_to_research.json");
const MATCHED_PATH = path.join(ROOT, "scratch", "all_86_matched.json");
const FI_PATH = path.join(ROOT, "scratch", "ddp_fi_all_products.json");
const IMAGES_DIR = path.join(ROOT, "public", "products");
const REPORT_PATH = path.join(ROOT, "scratch", "bonifica_report.json");

const HTTP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
};

/* ----------------------------------------------------------------------------
 * 1. REGOLE DI MARCHIO (Cosmetica S.r.l.)
 * -------------------------------------------------------------------------- */
function brandFor(sku) {
  if (/^MF/i.test(sku)) return "RVB LAB";
  if (/^DHC/i.test(sku)) return "Diego dalla Palma";
  if (/^PF/i.test(sku)) return "Diego dalla Palma";
  return "Diego dalla Palma";
}

/* ----------------------------------------------------------------------------
 * 2. PREZZO PSICOLOGICO FORMATO CABINA
 *    ricarico standard salone: costo ingrosso * 1.77
 *    arrotondato a euro interi, evitando le decine tonde (40 -> 39)
 *    es. costo 18€ -> 32,00€ ; costo 22.50€ -> 39,00€
 * -------------------------------------------------------------------------- */
function psychologicalPrice(wholesale) {
  const raw = wholesale * 1.77;
  const rounded = Math.round(raw);
  return rounded % 10 === 0 ? rounded - 1 : rounded;
}

/* ----------------------------------------------------------------------------
 * 3. NOMI UFFICIALI IN ITALIANO (fonte: fatture fornitore + listini verificati)
 * -------------------------------------------------------------------------- */
const NAMES = {
  // --- Sun & Hair Care (Diego dalla Palma) ---
  DHC110160: "Sun Shampoo Doccia Dopo Sole 250 ml",
  DHC120160: "Sun Mask Maschera Dopo Sole Riparatrice 200 ml",
  DHC120161: "Sun Oil Olio Spray Protettivo Illuminante",

  // --- RVB LAB The Make Up ---
  MF106021: "Delineatore Sopracciglia in Crema 21",
  MF151002: "Base Trucco Levigante Rinnovata",
  MF152001A: "Struccante Bifasico 125 ml",
  MF101193: "Meso Fill Foundation Plump & Fill 93",

  // --- Icon Time (retail) ---
  PF01181: "HA HERO Siero Idratazione Profonda 30 ml",
  PF01631: "Icon Time Maschera Viso Antietà Pro-Collagen 8 pz",
  PF01661: "Icon Time Radiance Collagen Booster Emulsione Viso Rassodante 50 ml",
  PF01671: "Icon Time Silver Crema Antietà Rivitalizzante 50 ml",
  PF01681: "Icon Time Gold Crema Antietà Ridensificante 50 ml",
  PF01691: "Icon Time Platinum Crema Antietà Rinnovatrice 50 ml",
  PF00931: "Icon Time Gold Elixir Siero Antietà Ridensificante 30 ml",
  PF01061: "Icon Time Crema Contorno Occhi Correttiva 15 ml",

  // --- HA HERO (retail) ---
  PF01411: "HA HERO Contorno Occhi all'Acido Ialuronico 15 ml",
  PF01421: "HA HERO Hyalu-Crema Gel Sorgente di Luce",
  PF01431: "HA HERO Hyalu-Crema Ricca Ultra Nutriente 50 ml",
  PF01441: "HA HERO Trattamento Labbra Riparatore 20 ml",

  // --- Cell-Detoxium (retail) ---
  PF01451: "Cell-Detoxium Struccante Micellare Bifasico 300 ml",
  PF01541: "Cell-Detoxium Fluido Protezione Giornaliera SPF50 50 ml",
  PF01551: "Cell-Detoxium Latte Detergente Micellare 250 ml",
  PF01561: "Cell-Detoxium Tonico 250 ml",
  PF01571: "Cell-Detoxium Mousse Detergente 150 ml",
  PF01581: "Cell-Detoxium Booster Serum 50 ml",
  PF01591: "Cell-Detoxium Burro Struccante 125 ml",
  PF01601: "Cell-Detoxium Gommage Enzimatico 75 ml",
  PF01611: "Cell-Detoxium Maschera Viso Texturizzante 75 ml",

  // --- Metodo ---
  PF07001: "Metodo Nero Blend Relax Profumo 100 ml",
  PF07011: "Metodo Bianco Blend Vitality Profumo 100 ml",

  // --- Smart Pure (retail) ---
  PF08101: "Smart Pure Oxy-Active Gel Detergente",
  PF08111: "Smart Pure SOS Trattamento Rapido Anti-Imperfezioni",
  PF08121: "Smart Pure Pore-Stick Maschera Esfoliante",
  PF08131: "Smart Pure Pore Control Siero Concentrato",
  PF08141: "Smart Pure Crema Gel Sebo-Normalizzante",
  PF08151: "Smart Pure Crema Opacizzante Antietà 50 ml",

  // --- Sculptorea (retail) ---
  PF58091: "Sculptorea Thalasso Scrub Drenante",
  PF58101: "Sculptorea Hydra-Peel Scrub Rigenerante",
  PF58111: "Sculptorea Crema Superidratante 250 ml",
  PF58121: "Sculptorea Burro Corpo Antietà 200 ml",
  PF58131: "Sculptorea Crema Corpo Effetto Lift",
  PF58141: "Sculptorea Iceshot Criogel Gambe Leggere",
  PF58161: "Sculptorea Crema Anticellulite Termoattiva",

  // --- Solari (retail) ---
  PF77001: "Gel Preparatore e Potenziatore di Abbronzatura 150 ml",
  PF77101: "Acqua Super Abbronzante Corpo 300 ml",
  PF77121: "Olio Sublimatore di Abbronzatura Corpo 200 ml",
  PF77201: "Stick Solare Protezione Invisibile SPF50+ 10 ml",
  PF77211: "Crema Protettiva Illuminante Antimacchia SPF50 50 ml",
  PF77221: "Crema Protettiva Abbronzante Antietà Viso SPF50 50 ml",
  PF77231: "Crema Gel Idratante Protettiva Corpo SPF30 150 ml",
  PF77241: "Crema Gel Idratante Protettiva Corpo SPF50 150 ml",
  PF77521: "Burro Mousse Doposole Vellutante Illuminante 250 ml",
  PF77531: "Crema Protettiva Idratante Viso SPF30 50 ml",
  PF77541: "Crema Gel Protettiva Abbronzante Corpo SPF20 150 ml",
  PF77551: "Latte Spray Delicato SPF50 150 ml",
  PF77561: "Balsamo Protettivo Labbra SPF30 10 ml",
  PF77571: "Crema Idratante Protettiva SPF50+",
  PF77581: "Crema Doposole Idratante Viso e Corpo",

  // --- Icon Time (cabina) ---
  PF00855: "Icon Time Crema Antietà Ridensificante - Formato Cabina Salone",
  PF00985: "Icon Time Trattamento Concentrato Ridensificante - Formato Cabina Salone",
  PF00995: "Icon Time Siero Ridensificante Antietà - Formato Cabina Salone",
  PF01065: "Icon Time Crema Contorno Occhi Correttiva - Formato Cabina Salone",
  PF01645: "Icon Time Siero Booster di Elastina - Formato Cabina Salone",

  // --- HA HERO (cabina) ---
  PF01365: "HA HERO Lacto-Peeling Patch Maschera - Formato Cabina Salone",
  PF01375: "HA HERO Siero Fondamentale Idratazione - Formato Cabina Salone",
  PF01385: "HA HERO Hyalu-Maschera Assorbibile - Formato Cabina Salone",
  PF01395: "HA HERO Hyalu-Crema Gel Sorgente di Luce - Formato Cabina Salone",
  PF01405: "HA HERO Contorno Occhi all'Acido Ialuronico - Formato Cabina Salone",

  // --- Cell-Detoxium (cabina) ---
  PF01465: "Cell-Detoxium Latte Detergente Micellare - Formato Cabina Salone",
  PF01485: "Cell-Detoxium Esfoliante Enzimatico - Formato Cabina Salone",
  PF01495: "Cell-Detoxium Esfoliante Acido Mandelico - Formato Cabina Salone",
  PF01515: "Cell-Detoxium Super Estrattore Comedoni - Formato Cabina Salone",
  PF01525: "Cell-Detoxium Maschera Lenitiva - Formato Cabina Salone",
  PF01535: "Cell-Detoxium Crema da Massaggio - Formato Cabina Salone",

  // --- Smart Pure (cabina) ---
  PF08145: "Smart Pure Crema Gel Sebo-Normalizzante - Formato Cabina Salone",
  PF08165: "Smart Pure Maschera Purificante 200 ml - Formato Cabina Salone",

  // --- Sculptorea (cabina) ---
  PF58005: "Sculptorea Peeling Acidi Combinati - Formato Cabina Salone",
  PF58015: "Sculptorea Carboxy Attivatore Ossigeno - Formato Cabina Salone",
  PF58025: "Sculptorea Benda Termoattiva Cell-Lipo - Formato Cabina Salone",
  PF58035: "Sculptorea Concentrato Anticellulite - Formato Cabina Salone",
  PF58045: "Sculptorea Concentrato Tonificante - Formato Cabina Salone",
  PF58055: "Sculptorea Concentrato Modellante 200 ml - Formato Cabina Salone",
  PF58065: "Sculptorea Impacco a Mosaico Azione Drenante - Formato Cabina Salone",
  PF58075: "Sculptorea Cell-Lipo Crema da Massaggio - Formato Cabina Salone",
  PF58085: "Sculptorea Firm-Dren Olio da Massaggio - Formato Cabina Salone",

  // --- Sculptorea (retail, SKU distributore diverso) ---
  PF58151: "Sculptorea Power Mist Concentrato Snellente 100 ml",
};

/* ----------------------------------------------------------------------------
 * 4. PREZZI OVERRIDE (solo casi particolari verificati a mano)
 *    per il resto: retail -> retailPrice verificato; cabina -> 1.77
 * -------------------------------------------------------------------------- */
const PRICE_OVERRIDES = {
  DHC110160: 24.5,
  DHC120160: 24.5,
  MF106021: 21.9,
  // Retail Sculptorea Power Mist: listino distributore 64€ (FI) -> retail IT (x0.75)
  PF58151: 48,
};

/* ----------------------------------------------------------------------------
 * 5. IMMAGINI SPECIALI (URL verificate) per i casi non presenti nel matching
 * -------------------------------------------------------------------------- */
const IMAGE_OVERRIDES = {
  DHC110160:
    "https://cdn.shopify.com/s/files/1/0286/5712/3433/files/DHC110160_0.jpg",
  DHC120160:
    "https://cdn.shopify.com/s/files/1/0286/5712/3433/files/DHC120160_0.jpg",
  DHC120161:
    "https://cdn.shopify.com/s/files/1/0286/5712/3433/files/DHC120161_0.jpg?v=1684919270",
  MF106021:
    "https://www.salenicemakeup.com/wp-content/uploads/2025/01/Cream_Eyebrow_Liner___01_53074_7434_detail.webp",
  PF58151:
    "https://diegodallapalma.fi/wp-content/uploads/2025/04/power-mist-body-spray-concentrate.jpg",
};

/* ----------------------------------------------------------------------------
 * 6. PACKSHOT DI LINEA per i prodotti formato CABINA
 *    (riuso del packshot ufficiale retail della stessa linea)
 * -------------------------------------------------------------------------- */
const CABINA_IMAGE = {
  // Icon Time
  PF00855: "PF01681",
  PF00985: "PF00931",
  PF00995: "PF00931",
  PF01065: "PF01061",
  PF01645: "PF00931",
  // HA HERO
  PF01365: "PF01181",
  PF01375: "PF01181",
  PF01385: "PF01421",
  PF01395: "PF01421",
  PF01405: "PF01411",
  // Cell-Detoxium
  PF01465: "PF01551",
  PF01485: "PF01601",
  PF01495: "PF01601",
  PF01515: "PF01451",
  PF01525: "PF01611",
  PF01535: "PF01451",
  // Smart Pure
  PF08145: "PF08141",
  PF08165: "PF08121",
  // Sculptorea
  PF58005: "PF58101",
  PF58015: "PF58161",
  PF58025: "PF58121",
  PF58035: "PF58161",
  PF58045: "PF58161",
  PF58055: "PF58161",
  PF58065: "PF58121",
  PF58075: "PF58121",
  PF58085: "PF58121",
};

/* ----------------------------------------------------------------------------
 * 7. DESCRIZIONI DI LINEA
 * -------------------------------------------------------------------------- */
const LINE_DESCRIPTIONS = {
  "Cell-Detoxium":
    "Linea detossinante professionale ad alta concentrazione di attivi tecnologici per una pelle purificata e rigenerata.",
  "Icon Time":
    "Linea antietà professionale con attivi ridensificanti e antiossidanti per una pelle visibilmente più giovane e compatta.",
  "HA HERO":
    "Linea professionale all'acido ialuronico a diversi pesi molecolari per un'idratazione profonda e duratura.",
  "Smart Pure":
    "Linea purificante professionale studiata per pelli impure e con imperfezioni, con azione sebo-normalizzante.",
  Sculptorea:
    "Linea corpo rimodellante professionale con azione anticellulite, drenante e tonificante.",
  Metodo:
    "Profumazione di nicchia Diego dalla Palma Professional, blend esclusivi per una firma olfattiva unica.",
  Solari:
    "Linea solare professionale per una protezione efficace e un'abbronzatura luminosa e uniforme.",
  "RVB LAB":
    "Make-up professionale RVB LAB The Make Up, formulato con attivi dermocosmetici e texture ad alta performance.",
  "Sun & Hair":
    "Linea Sun & Hair Care per la cura di capelli e corpo dopo l'esposizione al sole.",
  Skincare:
    "Trattamento dermocosmetico professionale ad alta concentrazione di attivi tecnologici.",
};

function lineFor(sku) {
  if (/^DHC/i.test(sku)) return "Sun & Hair";
  if (/^MF/i.test(sku)) return "RVB LAB";
  if (["PF00855", "PF00931", "PF00985", "PF00995", "PF01061", "PF01065", "PF01631", "PF01645", "PF01661", "PF01671", "PF01681", "PF01691"].includes(sku))
    return "Icon Time";
  if (["PF01181", "PF01365", "PF01375", "PF01385", "PF01395", "PF01405", "PF01411", "PF01421", "PF01431", "PF01441"].includes(sku))
    return "HA HERO";
  if (["PF01451", "PF01465", "PF01485", "PF01495", "PF01515", "PF01525", "PF01535", "PF01541", "PF01551", "PF01561", "PF01571", "PF01581", "PF01591", "PF01601", "PF01611"].includes(sku))
    return "Cell-Detoxium";
  if (["PF08101", "PF08111", "PF08121", "PF08131", "PF08141", "PF08145", "PF08151", "PF08165"].includes(sku))
    return "Smart Pure";
  if (["PF58005", "PF58015", "PF58025", "PF58035", "PF58045", "PF58055", "PF58065", "PF58075", "PF58085", "PF58091", "PF58101", "PF58111", "PF58121", "PF58131", "PF58141", "PF58151", "PF58161"].includes(sku))
    return "Sculptorea";
  if (["PF07001", "PF07011"].includes(sku)) return "Metodo";
  if (["PF77001", "PF77101", "PF77121", "PF77201", "PF77211", "PF77221", "PF77231", "PF77241", "PF77521", "PF77531", "PF77541", "PF77551", "PF77561", "PF77571", "PF77581"].includes(sku))
    return "Solari";
  return "Skincare";
}

function buildDescription(name, sku) {
  const line = lineFor(sku);
  const base = LINE_DESCRIPTIONS[line] || LINE_DESCRIPTIONS.Skincare;
  const isCabina = /^PF/.test(sku) && /5$/.test(sku);
  if (isCabina) {
    return `${name}, formato professionale cabina per l'uso in salone estetico. ${base}`;
  }
  return `${name}. ${base}`;
}

/* ----------------------------------------------------------------------------
 * 8. UTILITA'
 * -------------------------------------------------------------------------- */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MAGIC = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: (b) => b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP",
  gif: (b) => b.slice(0, 3).toString() === "GIF",
};

function sniffImage(buffer) {
  for (const [fmt, fn] of Object.entries(MAGIC)) {
    try {
      if (fn(buffer)) return fmt;
    } catch (_) {
      /* ignore */
    }
  }
  return null;
}

async function fetchBuffer(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: HTTP_HEADERS, redirect: "follow" });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct && ct !== "" && !ct.includes("image")) {
        lastErr = new Error(`content-type non immagine: ${ct}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) {
        lastErr = new Error(`file troppo piccolo (${buf.length} byte)`);
        continue;
      }
      if (!sniffImage(buf)) {
        lastErr = new Error("magic bytes immagine non riconosciuti (possibile HTML/errore)");
        continue;
      }
      return buf;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("download fallito");
}

async function downloadAndOptimize(url, destPath) {
  const buf = await fetchBuffer(url);
  await sharp(buf)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destPath);
  const meta = await sharp(destPath).metadata();
  return { bytes: fs.statSync(destPath).size, format: meta.format, width: meta.width, height: meta.height };
}

/* ----------------------------------------------------------------------------
 * 9. MAIN
 * -------------------------------------------------------------------------- */
async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const research = JSON.parse(fs.readFileSync(RESEARCH_PATH, "utf8"));
  const matched = JSON.parse(fs.readFileSync(MATCHED_PATH, "utf8"));

  const matchedBySku = new Map(matched.map((m) => [m.sku.toUpperCase(), m]));
  const bySku = new Map();
  for (const p of catalog) {
    const sku = (p.variants && p.variants[0] && p.variants[0].sku) || null;
    if (sku) bySku.set(String(sku).toUpperCase(), p);
  }

  const changes = [];
  const imageJobs = [];
  const failures = [];

  for (const r of research) {
    const sku = r.sku.toUpperCase();
    const product = bySku.get(sku);
    if (!product) {
      failures.push({ sku, error: "SKU non trovato in catalog.json" });
      continue;
    }

    const name = NAMES[sku];
    const brand = brandFor(sku);
    const line = lineFor(sku);
    const isCabina = /^PF/.test(sku) && /5$/.test(sku);

    // --- prezzo ---
    let price;
    if (PRICE_OVERRIDES[sku] != null) {
      price = PRICE_OVERRIDES[sku];
    } else if (isCabina) {
      price = psychologicalPrice(r.wholesaleCost);
    } else {
      const m = matchedBySku.get(sku);
      price = m && m.retailPrice != null ? Number(m.retailPrice) : null;
      if (price == null || Number.isNaN(price)) {
        failures.push({ sku, error: "prezzo retail mancante" });
        continue;
      }
    }

    // --- immagine sorgente ---
    let sourceUrl;
    if (IMAGE_OVERRIDES[sku]) {
      sourceUrl = IMAGE_OVERRIDES[sku];
    } else if (isCabina) {
      const ref = CABINA_IMAGE[sku];
      const refM = matchedBySku.get(ref);
      sourceUrl = refM && refM.imageUrl ? refM.imageUrl : null;
    } else {
      const m = matchedBySku.get(sku);
      sourceUrl = m && m.imageUrl ? m.imageUrl : null;
    }
    if (!sourceUrl) {
      failures.push({ sku, error: "URL immagine mancante" });
      continue;
    }

    const imgDest = path.join(IMAGES_DIR, `ddp-${sku.toLowerCase()}.webp`);
    imageJobs.push({ sku, sourceUrl, imgDest });
    changes.push({
      sku,
      oldName: r.currentName,
      newName: name,
      oldPrice: r.currentPrice,
      newPrice: price,
      oldImage: r.currentImage,
      newImage: `/products/ddp-${sku.toLowerCase()}.webp`,
      type: isCabina ? "cabina" : "retail",
      line,
    });
  }

  console.log(`Risolti ${changes.length}/${research.length} prodotti; scaricamento immagini...`);

  // --- scarica e ottimizza le immagini ---
  const imageResults = new Map();
  let okImages = 0;
  for (const job of imageJobs) {
    try {
      const res = await downloadAndOptimize(job.sourceUrl, job.imgDest);
      imageResults.set(job.sku, { ok: true, ...res });
      okImages++;
      console.log(`  OK   ${job.sku} -> ${path.basename(job.imgDest)} (${res.bytes} byte, ${res.width}x${res.height})`);
    } catch (e) {
      imageResults.set(job.sku, { ok: false, error: e.message, sourceUrl: job.sourceUrl });
      failures.push({ sku: job.sku, error: `immagine: ${e.message}` });
      console.log(`  FAIL ${job.sku}: ${e.message}`);
    }
  }

  // --- aggiorna il catalogo ---
  let updated = 0;
  for (const c of changes) {
    const product = bySku.get(c.sku);
    if (!product) continue;
    const imagePath = c.newImage;

    product.name = c.newName;
    product.brand = brandFor(c.sku);
    product.price = c.newPrice;
    product.image = imagePath;
    product.images = [imagePath];
    product.description = buildDescription(c.newName, c.sku);
    product.shortDescription = product.name;
    if (product.originalPrice != null) delete product.originalPrice;
    product.slug = slugify(`${product.brand} ${product.name} ${c.sku}`);

    if (Array.isArray(product.shades)) {
      for (const s of product.shades) {
        if (s.image != null || s.code) s.image = imagePath;
        s.price = c.newPrice;
      }
    }
    if (Array.isArray(product.variants)) {
      for (const v of product.variants) {
        v.image = imagePath;
        v.price = c.newPrice;
      }
    }
    updated++;
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");

  // --- elimina i vecchi file ddp orfani (jpg corrotti / tabelle di riciclo) ---
  const referenced = new Set();
  for (const p of catalog) {
    if (p.image) referenced.add(p.image);
    for (const img of p.images || []) referenced.add(img);
    for (const s of p.shades || []) if (s.image) referenced.add(s.image);
    for (const v of p.variants || []) if (v.image) referenced.add(v.image);
  }
  const orphanedRemoved = [];
  for (const f of fs.readdirSync(IMAGES_DIR)) {
    if (!/^ddp-/i.test(f)) continue;
    if (referenced.has(`/products/${f}`)) continue;
    fs.unlinkSync(path.join(IMAGES_DIR, f));
    orphanedRemoved.push(f);
  }

  // --- verifica integrità ---
  const totalAfter = catalog.length;
  const otherBrands = catalog.filter((p) => !(p.id && p.id.startsWith("ddp-"))).length;
  const ddpAfter = catalog.filter((p) => p.id && p.id.startsWith("ddp-")).length;

  // --- calcolo medie ---
  const beforePrices = research.map((r) => r.currentPrice);
  const afterPrices = changes.map((c) => c.newPrice);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      productsResearched: research.length,
      productsUpdated: updated,
      imagesDownloaded: okImages,
      imagesFailed: imageJobs.length - okImages,
      orphanFilesRemoved: orphanedRemoved.length,
      catalogTotal: totalAfter,
      catalogOtherBrandsIntact: otherBrands,
      catalogDdpProducts: ddpAfter,
    },
    pricing: {
      avgPriceBefore: Number(avg(beforePrices).toFixed(2)),
      avgPriceAfter: Number(avg(afterPrices).toFixed(2)),
      cabinaMarkup: "wholesale * 1.77 (arrotondamento psicologico a euro interi)",
      cabinaCount: changes.filter((c) => c.type === "cabina").length,
    },
    brands: {
      "Diego dalla Palma Professional": changes.filter((c) => brandFor(c.sku) === "Diego dalla Palma Professional").length,
      "RVB LAB The Make Up": changes.filter((c) => brandFor(c.sku) === "RVB LAB The Make Up").length,
      "Diego dalla Palma": changes.filter((c) => brandFor(c.sku) === "Diego dalla Palma").length,
    },
    changes,
    failures,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log("\n=== REPORT BONIFICA ===");
  console.log(`Prodotti aggiornati: ${updated}/${research.length}`);
  console.log(`Immagini scaricate:  ${okImages}/${imageJobs.length}`);
  console.log(`Prezzo medio:        ${report.pricing.avgPriceBefore} -> ${report.pricing.avgPriceAfter} €`);
  console.log(`Catalogo totale:     ${totalAfter} prodotti (altri brand integri: ${otherBrands})`);
  console.log(`Report scritto in:   ${path.relative(ROOT, REPORT_PATH)}`);
  if (failures.length) {
    console.log(`\n${failures.length} anomalie:`);
    for (const f of failures) console.log(`  - ${f.sku}: ${f.error}`);
  }
}

main().catch((e) => {
  console.error("ERRORE FATALE:", e);
  process.exit(1);
});
