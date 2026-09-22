const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CATALOG = path.join(ROOT, "data", "catalog.json");
const PRODUCTS_DIR = path.join(ROOT, "public", "products");
const INVOICE = path.join(ROOT, "scripts", "invoice_retail_cipria.json");
const REPORT = path.join(ROOT, "scratch", "cipriamakeup_audit_report.json");

const VALID_CATEGORIES = ["Viso", "Occhi", "Labbra", "Skincare & Dermo", "Beauty & Accessori"];
const SCOPE_BRANDS = ["Cipria Make Up", "Eveline Cosmetics", "Pierre René", "RVB LAB", "Miyo"];
const MIN_IMAGE_BYTES = 2048;
const PRICE_MIN = 1;
const PRICE_MAX = 500;
const MARGIN_WARN = 1.5;

const FALLBACK_IMAGES = {
  "cipria-67238b": "/products/eveline-cosmetics-eveline-cosmetics-biohyaluron-3xretinol-crema-riparatrice-40.png",
};

function inScope(p) {
  return String(p.id).startsWith("cipria-") || SCOPE_BRANDS.includes(p.brand);
}

function sniffImage(buf) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47 && buf[7] === 0x0a) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 6 && buf.toString("latin1", 0, 6).toUpperCase() === "GIF87A") return "gif";
  if (buf.length >= 6 && buf.toString("latin1", 0, 6).toUpperCase() === "GIF89A") return "gif";
  return null;
}

function isHtmlPayload(buf) {
  const head = buf.toString("latin1", 0, Math.min(buf.length, 512)).trimStart().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.startsWith("<?xml") || head.startsWith("<head") || head.startsWith("<body");
}

function imageRefs(p) {
  const refs = [];
  if (p.image) refs.push({ where: "image", rel: p.image });
  (p.images || []).forEach((r, i) => refs.push({ where: `images[${i}]`, rel: r }));
  (p.shades || []).forEach((s, i) => { if (s.image) refs.push({ where: `shades[${i}].image`, rel: s.image }); });
  (p.variants || []).forEach((v, i) => { if (v.image) refs.push({ where: `variants[${i}].image`, rel: v.image }); });
  return refs;
}

function checkImageRef(rel) {
  if (!rel || typeof rel !== "string") return { ok: false, reason: "empty-ref" };
  const fp = path.join(ROOT, "public", rel.replace(/^\/+/, ""));
  if (!fs.existsSync(fp)) return { ok: false, reason: "missing-file", path: fp };
  const st = fs.statSync(fp);
  if (!st.isFile()) return { ok: false, reason: "not-a-file", path: fp };
  if (st.size <= MIN_IMAGE_BYTES) return { ok: false, reason: `too-small(${st.size}B)`, path: fp };
  const fd = fs.openSync(fp, "r");
  const buf = Buffer.alloc(Math.min(st.size, 512));
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  if (isHtmlPayload(buf)) return { ok: false, reason: "html-error-page", path: fp };
  const kind = sniffImage(buf);
  if (!kind) return { ok: false, reason: "bad-signature", path: fp };
  return { ok: true, kind, size: st.size };
}

function detectPriceIssues(p) {
  const out = [];
  const price = p.price;
  if (typeof price !== "number" || !isFinite(price)) out.push({ id: p.id, field: "price", issue: "not-a-number", value: price });
  else {
    if (price <= 0) out.push({ id: p.id, field: "price", issue: "zero-or-negative", value: price });
    if (price < PRICE_MIN || price > PRICE_MAX) out.push({ id: p.id, field: "price", issue: "out-of-plausible-range", value: price });
  }
  [...(p.variants || []), ...(p.shades || [])].forEach((v) => {
    const label = v.sku || v.code || v.id;
    if (v.price == null) out.push({ id: p.id, field: "variant.price", issue: "missing", variant: label });
    else if (typeof v.price !== "number" || !isFinite(v.price) || v.price <= 0) out.push({ id: p.id, field: "variant.price", issue: "zero-or-invalid", variant: label, value: v.price });
    else if (typeof price === "number" && Math.abs(v.price - price) > 1e-9) out.push({ id: p.id, field: "variant.price", issue: "desync-from-parent", variant: label, value: v.price, parent: price });
  });
  if (p.originalPrice != null) {
    if (p.originalPrice === 0) out.push({ id: p.id, field: "originalPrice", issue: "zero-strike-price", value: 0 });
    else if (typeof p.originalPrice === "number" && p.originalPrice > 0 && typeof price === "number" && p.originalPrice < price) out.push({ id: p.id, field: "originalPrice", issue: "strike-below-price", value: p.originalPrice, parent: price });
  }
  if (!(typeof p.originalWholesalePrice === "number" && p.originalWholesalePrice > 0)) out.push({ id: p.id, field: "originalWholesalePrice", issue: "missing-or-invalid", value: p.originalWholesalePrice });
  else if (typeof price === "number" && price <= p.originalWholesalePrice) out.push({ id: p.id, field: "price", issue: "price-at-or-below-wholesale", value: price, wholesale: p.originalWholesalePrice });
  return out;
}

function detectCardIssues(p, slugSeen, idSeen) {
  const out = [];
  if (!VALID_CATEGORIES.includes(p.category)) out.push({ id: p.id, field: "category", issue: "invalid-category", value: p.category });
  if (!p.slug || !String(p.slug).trim()) out.push({ id: p.id, field: "slug", issue: "missing-slug" });
  else if (slugSeen.has(p.slug)) out.push({ id: p.id, field: "slug", issue: "duplicate-slug", value: p.slug });
  if (!p.id || idSeen.has(p.id)) out.push({ id: p.id, field: "id", issue: "duplicate-id", value: p.id });
  ["name", "description", "shortDescription", "howToUse", "inci", "formulaBenefits"].forEach((f) => {
    if (!p[f] || !String(p[f]).trim()) out.push({ id: p.id, field: f, issue: "empty-text" });
  });
  if (!Array.isArray(p.features) || p.features.length === 0) out.push({ id: p.id, field: "features", issue: "empty-features" });
  if (!Array.isArray(p.variants) || p.variants.length === 0) out.push({ id: p.id, field: "variants", issue: "no-variants" });
  if (!Array.isArray(p.shades) || p.shades.length === 0) out.push({ id: p.id, field: "shades", issue: "no-shades" });
  (p.variants || []).forEach((v) => {
    if (!v.sku || !String(v.sku).trim()) out.push({ id: p.id, field: "variant.sku", issue: "missing-sku", variant: v.id });
    if (!v.ean || !String(v.ean).trim()) out.push({ id: p.id, field: "variant.ean", issue: "missing-ean", variant: v.id });
  });
  const vsum = (p.variants || []).reduce((a, v) => a + (v.stock || 0), 0);
  if (p.inStock && (p.stock || 0) <= 0) out.push({ id: p.id, field: "stock", issue: "inStock-with-zero-stock", value: p.stock });
  if (!p.inStock && (p.stock || 0) > 0) out.push({ id: p.id, field: "stock", issue: "outOfStock-with-positive-stock", value: p.stock });
  if ((p.variants || []).length && vsum !== (p.stock || 0)) out.push({ id: p.id, field: "stock", issue: "stock-vs-variants-sum", value: p.stock, variantsSum: vsum });
  (p.variants || []).forEach((v) => {
    if (v.inStock && (v.stock || 0) <= 0) out.push({ id: p.id, field: "variant.stock", issue: "inStock-with-zero-stock", variant: v.sku });
    if (!v.inStock && (v.stock || 0) > 0) out.push({ id: p.id, field: "variant.stock", issue: "outOfStock-with-positive-stock", variant: v.sku });
  });
  return out;
}

function runDetection(scope) {
  const slugSeen = new Set();
  const idSeen = new Set();
  const priceIssues = [];
  const cardIssues = [];
  const imageIssues = [];
  let totalRefs = 0;
  const productsWithBadImage = new Set();
  const productsWithBadPrice = new Set();
  const productsWithBadCard = new Set();

  scope.forEach((p) => {
    detectPriceIssues(p).forEach((i) => { priceIssues.push(i); productsWithBadPrice.add(p.id); });
    detectCardIssues(p, slugSeen, idSeen).forEach((i) => { cardIssues.push(i); productsWithBadCard.add(p.id); });
    slugSeen.add(p.slug);
    idSeen.add(p.id);
    imageRefs(p).forEach(({ where, rel }) => {
      totalRefs++;
      const r = checkImageRef(rel);
      if (!r.ok) { imageIssues.push({ id: p.id, where, rel, reason: r.reason }); productsWithBadImage.add(p.id); }
    });
  });

  return { priceIssues, cardIssues, imageIssues, totalRefs, productsWithBadImage, productsWithBadPrice, productsWithBadCard };
}

function applyFixes(scope) {
  const fixes = [];
  scope.forEach((p) => {
    const fallback = FALLBACK_IMAGES[p.id];
    if (fallback) {
      const target = path.join(ROOT, "public", fallback.replace(/^\/+/, ""));
      if (fs.existsSync(target)) {
        const refs = imageRefs(p);
        const broken = refs.some(({ rel }) => !checkImageRef(rel).ok);
        if (broken) {
          p.image = fallback;
          p.images = [fallback];
          (p.shades || []).forEach((s) => { s.image = fallback; });
          (p.variants || []).forEach((v) => { v.image = fallback; });
          fixes.push({ id: p.id, type: "image-reassigned", from: refs.map((r) => r.rel), to: fallback });
        }
      }
    }
    const syncList = [];
    (p.shades || []).forEach((s, i) => syncList.push({ v: s, where: `shades[${i}]`, label: s.code || s.id }));
    (p.variants || []).forEach((v, i) => syncList.push({ v, where: `variants[${i}]`, label: v.sku || v.id }));
    syncList.forEach(({ v, where, label }) => {
      if (v.price == null || typeof v.price !== "number" || !isFinite(v.price) || v.price <= 0 || Math.abs(v.price - p.price) > 1e-9) {
        fixes.push({ id: p.id, type: "variant-price-synced", where, variant: label, from: v.price, to: p.price });
        v.price = p.price;
      }
    });
    if (p.originalPrice === 0) {
      fixes.push({ id: p.id, type: "originalPrice-normalized", from: 0, to: p.price });
      p.originalPrice = p.price;
    }
  });
  return fixes;
}

function priceStructure(scope) {
  const byBrand = {};
  scope.forEach((p) => {
    const b = byBrand[p.brand] || (byBrand[p.brand] = { count: 0, min: Infinity, max: -Infinity, sum: 0, margins: [], discounts: [] });
    b.count++;
    b.min = Math.min(b.min, p.price);
    b.max = Math.max(b.max, p.price);
    b.sum += p.price;
    if (p.originalWholesalePrice > 0) b.margins.push(p.price / p.originalWholesalePrice);
    if (p.originalPrice > p.price) b.discounts.push(1 - p.price / p.originalPrice);
  });
  const stat = (a) => {
    if (!a.length) return null;
    const s = a.slice().sort((x, y) => x - y);
    const mid = Math.floor(s.length / 2);
    return { min: +s[0].toFixed(2), max: +s[s.length - 1].toFixed(2), median: +s[mid].toFixed(2), avg: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2) };
  };
  const out = {};
  Object.keys(byBrand).forEach((k) => {
    const b = byBrand[k];
    out[k] = { count: b.count, priceMin: b.min, priceMax: b.max, priceAvg: +(b.sum / b.count).toFixed(2), margin: stat(b.margins), discountDepth: stat(b.discounts) };
  });
  return out;
}

function invoiceCrossCheck(scope) {
  let matched = 0;
  const mismatches = [];
  if (!fs.existsSync(INVOICE)) return { matched, mismatches, note: "invoice file not found" };
  const inv = JSON.parse(fs.readFileSync(INVOICE, "utf8"));
  const byEan = {};
  inv.forEach((i) => { byEan[String(i.ean)] = i; });
  scope.forEach((p) => (p.variants || []).forEach((v) => {
    const line = byEan[String(v.ean)];
    if (!line) return;
    matched++;
    const w = v.originalWholesalePrice != null ? v.originalWholesalePrice : p.originalWholesalePrice;
    if (Math.abs(w - line.unitPrice) > 0.011) mismatches.push({ id: p.id, ean: v.ean, catalogWholesale: w, invoiceUnitPrice: line.unitPrice });
  }));
  return { matched, mismatches };
}

function marginWarnings(scope) {
  return scope
    .filter((p) => p.originalWholesalePrice > 0 && p.price / p.originalWholesalePrice < MARGIN_WARN)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, wholesale: p.originalWholesalePrice, margin: +(p.price / p.originalWholesalePrice).toFixed(2) }));
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const scope = catalog.filter(inScope);

  const pre = runDetection(scope);
  const fixes = applyFixes(scope);
  if (fixes.length) fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  const post = runDetection(scope);

  const pct = (ok, total) => (total === 0 ? 100 : +((ok / total) * 100).toFixed(2));
  const priceIntegrity = pct(scope.length - post.productsWithBadPrice.size, scope.length);
  const imageIntegrity = pct(post.totalRefs - post.imageIssues.length, post.totalRefs);
  const cardIntegrity = pct(scope.length - post.productsWithBadCard.size, scope.length);

  const byBrand = {};
  scope.forEach((p) => { byBrand[p.brand] = (byBrand[p.brand] || 0) + 1; });

  let prior = null;
  if (fs.existsSync(REPORT)) {
    try { prior = JSON.parse(fs.readFileSync(REPORT, "utf8")); } catch (e) { prior = null; }
  }
  const keyOf = (o) => JSON.stringify(o);
  const union = (a, b) => {
    const seen = new Set(a.map(keyOf));
    const out = a.slice();
    b.forEach((o) => { if (!seen.has(keyOf(o))) { seen.add(keyOf(o)); out.push(o); } });
    return out;
  };
  const detectedNow = [
    ...pre.imageIssues.map((i) => ({ kind: "image", ...i })),
    ...pre.priceIssues.map((i) => ({ kind: "price", ...i })),
    ...pre.cardIssues.map((i) => ({ kind: "card", ...i })),
  ];
  const detected = union(prior && Array.isArray(prior.anomalies && prior.anomalies.detected) ? prior.anomalies.detected : [], detectedNow);
  const resolved = union(prior && Array.isArray(prior.anomalies && prior.anomalies.resolved) ? prior.anomalies.resolved : [], fixes);

  const report = {
    generatedAt: new Date().toISOString(),
    catalogFile: "data/catalog.json",
    scope: {
      description: "Prodotti importati da Cipria Makeup (cipriamakeup.it)",
      totalProducts: scope.length,
      byBrand,
    },
    integrity: {
      priceIntegrityPct: priceIntegrity,
      imageIntegrityPct: imageIntegrity,
      cardIntegrityPct: cardIntegrity,
      imageRefsChecked: post.totalRefs,
      productsWithPriceIssues: post.productsWithBadPrice.size,
      productsWithImageIssues: post.productsWithBadImage.size,
      productsWithCardIssues: post.productsWithBadCard.size,
    },
    checks: {
      prices: {
        rules: ["price>0 e finito", "price in range plausibile", "variant/shade price sincronizzato col genitore", "originalPrice>=price o assente", "wholesale>0 e price>wholesale"],
        issuesBeforeFix: pre.priceIssues,
        issuesAfterFix: post.priceIssues,
      },
      images: {
        rules: [`file esiste in public/products`, `size>${MIN_IMAGE_BYTES}B`, "firma binaria png/jpeg/webp", "non e' una pagina HTML di errore"],
        issuesBeforeFix: pre.imageIssues,
        issuesAfterFix: post.imageIssues,
      },
      cards: {
        rules: ["categoria valida", "slug univoco e non vuoto", "id univoco", "testi obbligatori non vuoti", "variants/shades presenti", "sku/ean presenti", "stock coerente con inStock e somma varianti"],
        issuesBeforeFix: pre.cardIssues,
        issuesAfterFix: post.cardIssues,
      },
    },
    anomalies: {
      detected,
      resolved,
      remaining: [
        ...post.imageIssues.map((i) => ({ kind: "image", ...i })),
        ...post.priceIssues.map((i) => ({ kind: "price", ...i })),
        ...post.cardIssues.map((i) => ({ kind: "card", ...i })),
      ],
    },
    warnings: {
      lowMargin: marginWarnings(scope),
    },
    samplePriceStructure: {
      perBrand: priceStructure(scope),
      invoiceCrossCheck: invoiceCrossCheck(scope),
    },
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log("=== AUDIT CIPRIA MAKEUP ===");
  console.log("Prodotti nel perimetro:", scope.length, JSON.stringify(byBrand));
  console.log("Integrita' prezzi  :", priceIntegrity + "%", "(prodotti con problemi:", post.productsWithBadPrice.size + ")");
  console.log("Integrita' immagini:", imageIntegrity + "%", "(ref:", post.totalRefs + ", problemi:", post.imageIssues.length + ")");
  console.log("Integrita' schede  :", cardIntegrity + "%", "(prodotti con problemi:", post.productsWithBadCard.size + ")");
  console.log("Anomalie rilevate (pre-fix):", report.anomalies.detected.length);
  console.log("Fix applicati:", fixes.length, JSON.stringify(fixes));
  console.log("Anomalie residue:", report.anomalies.remaining.length);
  console.log("Warning margine basso:", report.warnings.lowMargin.length);
  console.log("Cross-check fattura: EAN match", report.samplePriceStructure.invoiceCrossCheck.matched, "mismatch", report.samplePriceStructure.invoiceCrossCheck.mismatches.length);
  console.log("Report salvato in:", REPORT);
}

main();
