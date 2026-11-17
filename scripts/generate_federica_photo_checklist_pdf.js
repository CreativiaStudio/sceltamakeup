const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceDir = 'C:/Users/mario/Progetti Antigravity/Scelta Makeup';
const artifactDir = 'C:/Users/mario/.gemini/antigravity/brain/c1d01d92-1fe2-42ea-a9e7-7ad7c6c068ef';

/* ------------------------------------------------------------------
   ASSET
------------------------------------------------------------------ */
function toBase64(relPath, mimeType) {
  try {
    const fullPath = path.join(workspaceDir, relPath);
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      return `data:${mimeType};base64,${b64}`;
    }
  } catch (e) {
    console.error('Errore lettura asset:', relPath, e.message);
  }
  return '';
}

const logoLightB64 = toBase64('public/brand/logo-transparent.png', 'image/png');
const logoDarkB64 = toBase64('public/brand/logo-white.png', 'image/png') || logoLightB64;

/* ------------------------------------------------------------------
   DATI
------------------------------------------------------------------ */
const catalogPath = path.join(workspaceDir, 'data', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const BRAND_ORDER = ['Eveline Cosmetics', 'Pierre René', 'Miyo', 'Cipria Make Up'];
const CATEGORY_ORDER = ['Skincare & Dermo', 'Viso', 'Occhi', 'Labbra', 'Beauty & Accessori'];

const PLACEHOLDER_FILES = [
  'eveline-cosmetics-packshot.jpg',
  'pierre-rene-packshot.jpg',
  'cipria-milano-packshot.jpg',
  'miyo-packshot.jpg'
];

/* 42 casi dell'audit "foto demo / prestata".
   Ogni voce identificata da EAN (o slug quando l'EAN non è nell'audit)
   e corredata dalla spiegazione chirurgica della foto sbagliata. */
const FALLBACK_ENTRIES = [
  // --- Cross-brand palesi ---
  { ean: '5907609337559', note: 'Mostra per errore il siero ciglia e sopracciglia RVB LAB 4D Pro' },
  { slug: 'cipria-make-up-cm-cristal-eyeshadow', note: 'Mostra per errore i pigmenti Miyo Sprinkle Me' },
  { ean: '5901761965773', note: 'Mostra per errore l\'eyeliner glitterato Cipria Milano 01' },
  { ean: '5903416074175', note: 'Mostra per errore l\'eyeliner glitterato Cipria Milano 01' },
  { ean: '3700467814253', note: 'Mostra per errore l\'eyeliner glitterato Cipria Milano 01' },
  { ean: '3700467848289', note: 'Mostra per errore l\'eyeliner glitterato Cipria Milano 01' },
  { ean: '3700467851593', note: 'Mostra per errore la cipria Loose Powder Cipria Milano' },
  { ean: '3700467843246', note: 'Mostra per errore la cipria Loose Powder Cipria Milano' },
  { ean: '3700467846032', note: 'Mostra per errore la cipria Loose Powder Cipria Milano' },
  { ean: '3700467842317', note: 'Mostra per errore il correttore colato Cipria Milano' },
  { ean: '3700467842324', note: 'Mostra per errore il correttore colato Cipria Milano' },
  { slug: 'miyo-miyo-mystick-eye-stick', note: 'Mostra per errore l\'illuminante stick Eveline Wonder Show 01' },
  { ean: '3700467821046', note: 'Mostra per errore il mascara Eveline Big Volume Bang' },
  { ean: '5901761910797', note: 'Mostra per errore il Precision Ink Eyeliner Pierre René' },
  { ean: '5907510312621', note: 'Mostra per errore il lip gloss Eveline Cooling Kisses' },

  // --- Ricicli incongrui stesso brand: Eveline ---
  { ean: '5903416073666', note: 'Mostra per errore la foto di Crema 6 Ceramidi Rigenerante 50 ml' },
  { ean: '5903416060178', note: 'Mostra per errore la foto di Crema 6 Ceramidi Rigenerante 50 ml' },
  { ean: '5901761981650', note: 'Mostra per errore la foto di Crema 6 Ceramidi Rigenerante 50 ml' },
  { ean: '5903416026075', note: 'Mostra per errore la foto di Crema 6 Ceramidi Rigenerante 50 ml' },
  { ean: '5903416077893', note: 'Mostra per errore la foto di Crema 6 Ceramidi Rigenerante 50 ml' },
  { ean: '5903416077909', note: 'Mostra per errore la foto di Crema 6 Ceramidi Rigenerante 50 ml' },
  { ean: '5903416047773', note: 'Mostra per errore la foto di BioHyaluron Crema Riparatrice Viso 40+' },
  { ean: '5903416026464', note: 'Mostra per errore la foto di Perfect Bright Crema Mani' },
  { ean: '5903416077039', note: 'Mostra per errore la foto di Perfect Bright Crema Mani' },
  { ean: '5903416084419', note: 'Mostra per errore la foto di Superfruit Tint Tinta Labbra' },
  { ean: '5903416086420', note: 'Mostra per errore la foto di Superfruit Tint Tinta Labbra' },
  { ean: '5901761985214', note: 'Mostra per errore la foto di Fondotinta Wonder Match 45 Honey' },
  { ean: '5901761985221', note: 'Mostra per errore la foto di Fondotinta Wonder Match 45 Honey' },
  { ean: '5903416048435', note: 'Mostra per errore la foto di Fondotinta Wonder Match 45 Honey' },
  { ean: '5903416065722', note: 'Mostra per errore la foto di Fondotinta Wonder Match 45 Honey' },
  { ean: '5901761997606', note: 'Mostra per errore la foto di Glow Booster 4in1 01 Universal Light' },
  { ean: '5903416061090', note: 'Mostra per errore la foto di Glow Booster 4in1 01 Universal Light' },
  { ean: '5903416087243', note: 'Mostra per errore la foto di Glow Booster 4in1 01 Universal Light' },
  { ean: '5903416038153', note: 'Mostra per errore la foto di Glow Booster 4in1 01 Universal Light' },
  { ean: '5901761981643', note: 'Mostra per errore la bustina maschera Hyaluronic 8 ml' },
  { ean: '5903416035312', note: 'Mostra per errore la bustina maschera Hyaluronic 8 ml' },
  { ean: '5903416077923', note: 'Mostra per errore la bustina maschera Peptide 8 ml' },
  { ean: '5903416077930', note: 'Mostra per errore la bustina maschera Peptide 8 ml' },

  // --- Ricicli incongrui stesso brand: Miyo ---
  { ean: '3700467852996', note: 'Mostra per errore la foto di Lip Balm Outstanding Juicy Kiss' },
  { ean: '3700467853009', note: 'Mostra per errore la foto di Lip Balm Outstanding Juicy Kiss' },
  { ean: '3700467853016', note: 'Mostra per errore la foto di Lip Balm Outstanding Juicy Kiss' },
  { ean: '3700467853023', note: 'Mostra per errore la foto di Lip Balm Outstanding Juicy Kiss' }
];

function getEan(product) {
  if (product.ean) return String(product.ean);
  if (Array.isArray(product.variants) && product.variants.length > 0 && product.variants[0].ean) {
    return String(product.variants[0].ean);
  }
  return '';
}

function getImage(product) {
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  return product.image || '';
}

function imageBasename(url) {
  return String(url || '').split('?')[0].split('/').pop();
}

const fallbackByEan = new Map();
const fallbackBySlug = new Map();
FALLBACK_ENTRIES.forEach((entry) => {
  if (entry.ean) fallbackByEan.set(String(entry.ean), entry);
  if (entry.slug) fallbackBySlug.set(entry.slug, entry);
});

const missingFromCatalog = [];
const items = [];

catalog.forEach((product) => {
  if (!BRAND_ORDER.includes(product.brand)) return;

  const ean = getEan(product);
  const image = getImage(product);
  const fallback = fallbackByEan.get(ean) || fallbackBySlug.get(product.slug);

  if (fallback) {
    items.push({
      product,
      ean,
      status: 'fallback',
      note: fallback.note
    });
    return;
  }

  if (PLACEHOLDER_FILES.some((file) => image.endsWith(file))) {
    items.push({
      product,
      ean,
      status: 'placeholder',
      note: `Nessuna foto prodotto: il catalogo mostra il badge logo ${product.brand}`
    });
  }
});

// Controllo di integrità: ogni voce dell'audit deve esistere in catalogo.
FALLBACK_ENTRIES.forEach((entry) => {
  const found = catalog.some((product) => {
    if (entry.ean && getEan(product) === String(entry.ean)) return true;
    if (entry.slug && product.slug === entry.slug) return true;
    return false;
  });
  if (!found) missingFromCatalog.push(entry.ean || entry.slug);
});

const brandRank = (brand) => {
  const index = BRAND_ORDER.indexOf(brand);
  return index === -1 ? 99 : index;
};

const categoryRank = (category) => {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? 99 : index;
};

const sortedItems = items.slice().sort((a, b) => {
  const brandDiff = brandRank(a.product.brand) - brandRank(b.product.brand);
  if (brandDiff !== 0) return brandDiff;

  const catDiff = categoryRank(a.product.category) - categoryRank(b.product.category);
  if (catDiff !== 0) return catDiff;

  return a.product.name.localeCompare(b.product.name, 'it', { sensitivity: 'base' });
});

const byBrand = new Map();
BRAND_ORDER.forEach((brand) => byBrand.set(brand, []));
sortedItems.forEach((item) => {
  byBrand.get(item.product.brand).push(item);
});

const totalPlaceholders = sortedItems.filter((item) => item.status === 'placeholder').length;
const totalFallbacks = sortedItems.filter((item) => item.status === 'fallback').length;

/* ------------------------------------------------------------------
   HELPER HTML
------------------------------------------------------------------ */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `€ ${number.toFixed(2).replace('.', ',')}`;
}

function formatEan(ean) {
  if (!ean) return 'EAN non disponibile';
  return ean;
}

/* ------------------------------------------------------------------
   TEMPLATE
------------------------------------------------------------------ */
const coverStats = [
  { value: String(sortedItems.length), label: 'Referenze da sistemare' },
  { value: String(totalPlaceholders), label: 'Senza foto (badge logo)' },
  { value: String(totalFallbacks), label: 'Foto da sostituire' },
  { value: String(BRAND_ORDER.length), label: 'Brand coinvolti' }
];

const statCardsHtml = coverStats.map((stat) => `
        <div class="cover-stat">
          <div class="cover-stat-value">${esc(stat.value)}</div>
          <div class="cover-stat-label">${esc(stat.label)}</div>
        </div>`).join('');

const brandIndexHtml = BRAND_ORDER.map((brand, index) => {
  const count = (byBrand.get(brand) || []).length;
  return `
        <div class="brand-index-item">
          <div class="brand-index-num">Brand ${String(index + 1).padStart(2, '0')}</div>
          <strong>${esc(brand)}</strong>
          <span>${count} referenze</span>
        </div>`;
}).join('');

const brandSectionsHtml = BRAND_ORDER.map((brand, brandIndex) => {  const brandItems = byBrand.get(brand) || [];
  const rowsHtml = brandItems.map((item) => {
    const product = item.product;
    const isFallback = item.status === 'fallback';
    const badgeClass = isFallback ? 'badge-amber' : 'badge-red';
    const badgeLabel = isFallback ? 'FOTO DA SOSTITUIRE' : 'SENZA FOTO';
    const eanLabel = formatEan(item.ean);
    const eanClass = item.ean ? 'ean' : 'ean ean-missing';

    return `
        <tr>
          <td class="c-check"><span class="check-box" aria-hidden="true"></span></td>
          <td class="c-ean"><span class="${eanClass}">${esc(eanLabel)}</span></td>
          <td class="c-prod">
            <span class="product-name">${esc(product.name)}</span>
            <span class="product-meta">${esc(product.category)} <span class="dot">•</span> Prezzo consigliato <span class="price">${esc(formatPrice(product.price))}</span></span>
          </td>
          <td class="c-status">
            <span class="badge ${badgeClass}">${esc(badgeLabel)}</span>
            <span class="status-note">${esc(item.note)}</span>
          </td>
        </tr>`;
  }).join('');

  return `
    <section class="brand-section${brandIndex === 0 ? ' brand-section-first' : ''}">
      <div class="brand-head">
        <div>
          <div class="brand-eyebrow">Brand ${String(brandIndex + 1).padStart(2, '0')}</div>
          <h2 class="brand-title">${esc(brand)}</h2>
        </div>
        <div class="brand-count">
          <strong>${brandItems.length}</strong>
          <span>referenze</span>
        </div>
      </div>

      <table class="check-table">
        <colgroup>
          <col class="col-check" />
          <col class="col-ean" />
          <col class="col-prod" />
          <col class="col-status" />
        </colgroup>
        <thead>
          <tr>
            <th class="c-check">Spunta</th>
            <th class="c-ean">EAN / Barcode</th>
            <th class="c-prod">Prodotto</th>
            <th class="c-status">Stato attuale</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}
        </tbody>
      </table>
    </section>`;
}).join('');

const logoLightHtml = logoLightB64
  ? `<img src="${logoLightB64}" class="logo-light" alt="Scelta Makeup" />`
  : `<span class="logo-fallback">SCELTA MAKEUP</span>`;

const logoDarkHtml = logoDarkB64
  ? `<img src="${logoDarkB64}" class="logo-dark" alt="Scelta Makeup" />`
  : `<span class="logo-fallback-dark">SCELTA MAKEUP</span>`;

const htmlContent = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Checklist Fotografica Catalogo — Scelta Makeup</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

  @page {
    size: A4;
    margin: 12mm 12mm 14mm 12mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1F1B24;
    background: #FFFFFF;
    font-size: 9pt;
    line-height: 1.45;
  }

  /* ------------------------------------------------------------
     COPERTINA
     ------------------------------------------------------------ */
  .cover {
    position: relative;
    width: 210mm;
    height: 297mm;
    padding: 22mm 20mm 18mm 20mm;
    background: radial-gradient(circle at 82% 16%, #7A3293 0%, #4D1270 48%, #2B0740 100%);
    color: #FFFFFF;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    z-index: 10;
  }

  .cover-border {
    position: absolute;
    top: 11mm;
    bottom: 11mm;
    left: 11mm;
    right: 11mm;
    border: 1px solid rgba(216, 194, 231, 0.28);
    pointer-events: none;
  }

  .cover-border-inner {
    position: absolute;
    top: 14mm;
    bottom: 14mm;
    left: 14mm;
    right: 14mm;
    border: 1px solid rgba(184, 134, 11, 0.38);
    pointer-events: none;
  }

  .cover-inner {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .cover-top {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6mm;
  }

  .cover-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 2.2mm 5mm;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    font-size: 7.2pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #F0E3FA;
    font-weight: 600;
  }

  .cover-eyebrow .cover-eyebrow-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #D462A6;
  }

  .logo-dark {
    height: 42mm;
    max-width: 105mm;
    object-fit: contain;
    filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.28));
  }

  .logo-fallback-dark {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26pt;
    letter-spacing: 4px;
    color: #FFFFFF;
  }

  .cover-middle {
    margin-top: 2mm;
  }

  .cover-kicker {
    font-size: 7.2pt;
    letter-spacing: 2.4px;
    text-transform: uppercase;
    color: #D9BCEC;
    font-weight: 600;
    margin-bottom: 4mm;
  }

  .cover-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 31pt;
    line-height: 1.1;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 2mm 0;
    letter-spacing: -0.4px;
  }

  .cover-title span {
    color: #EBD5F8;
    font-style: italic;
    font-weight: 500;
  }

  .cover-rule {
    width: 58mm;
    height: 2.5px;
    background: linear-gradient(90deg, #B8860B, rgba(184, 134, 11, 0.12));
    margin: 5mm 0;
  }

  .cover-subtitle {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15.5pt;
    font-weight: 500;
    font-style: italic;
    color: #F3E4FB;
    margin-bottom: 5mm;
  }

  .cover-lead {
    font-size: 9.4pt;
    font-weight: 300;
    line-height: 1.6;
    color: #DECBE9;
    max-width: 140mm;
    margin: 0;
  }

  .cover-lead strong {
    color: #FFFFFF;
    font-weight: 600;
  }

  .cover-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
    margin-top: 9mm;
  }

  .cover-stat {
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 3.5mm 3mm;
    text-align: center;
  }

  .cover-stat-value {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 21pt;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1;
  }

  .cover-stat-label {
    margin-top: 1.6mm;
    font-size: 6.4pt;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #D6BEE4;
    line-height: 1.35;
  }

  .cover-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid rgba(255, 255, 255, 0.16);
    padding-top: 5mm;
  }

  .cover-meta {
    font-size: 7.6pt;
    line-height: 1.65;
    color: #D3BFDF;
  }

  .cover-meta strong {
    color: #FFFFFF;
    font-weight: 600;
  }

  .cover-stamp {
    text-align: right;
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #D9B96A;
    font-weight: 600;
    line-height: 1.7;
  }

  /* ------------------------------------------------------------
     PAGINA GUIDA
     ------------------------------------------------------------ */
  .guide {
    page-break-after: always;
    break-after: page;
  }

  .doc-masthead {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #EADBFA;
    padding-bottom: 4mm;
    margin-bottom: 7mm;
  }

  .logo-light {
    height: 19mm;
    max-width: 72mm;
    object-fit: contain;
  }

  .logo-fallback {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15pt;
    letter-spacing: 2px;
    color: #5E1788;
  }

  .masthead-meta {
    text-align: right;
    font-size: 7pt;
    color: #8C789E;
    line-height: 1.55;
  }

  .masthead-meta strong {
    display: block;
    color: #5E1788;
    font-size: 7.6pt;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 0.8mm;
  }

  h1, h2, h3, h4 {
    font-family: 'Playfair Display', Georgia, serif;
    margin: 0;
    line-height: 1.2;
  }

  .section-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22pt;
    font-weight: 700;
    color: #5E1788;
    margin-bottom: 2mm;
  }

  .section-subtitle {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 10.5pt;
    font-style: italic;
    color: #6C587D;
    margin-bottom: 6mm;
  }

  .rules {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3.5mm;
    margin-bottom: 6mm;
  }

  .rule-card {
    background: #FDFBFF;
    border: 1px solid #EADBFA;
    border-top: 3px solid #5E1788;
    border-radius: 5px;
    padding: 4mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .rule-card:nth-child(2) {
    border-top-color: #D462A6;
  }

  .rule-card:nth-child(3) {
    border-top-color: #B8860B;
  }

  .rule-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 7mm;
    height: 7mm;
    border-radius: 50%;
    background: #F3E9FB;
    color: #5E1788;
    font-size: 7.5pt;
    font-weight: 700;
    margin-bottom: 2.5mm;
  }

  .rule-card h3 {
    font-size: 10.5pt;
    color: #2D1145;
    margin-bottom: 1.6mm;
  }

  .rule-card p {
    margin: 0;
    font-size: 7.6pt;
    line-height: 1.5;
    color: #4A3E54;
  }

  .delivery-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
    margin-bottom: 6mm;
  }

  .delivery-card {
    background: #FFFFFF;
    border: 1px solid #EADBFA;
    border-left: 3.5px solid #D462A6;
    border-radius: 5px;
    padding: 4mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .delivery-card:nth-child(2) {
    border-left-color: #5E1788;
  }

  .delivery-card h3 {
    font-size: 10pt;
    color: #5E1788;
    margin-bottom: 1.5mm;
  }

  .delivery-card p {
    margin: 0;
    font-size: 7.6pt;
    line-height: 1.5;
    color: #4A3E54;
  }

  .delivery-card .delivery-tag {
    display: inline-block;
    font-size: 6.2pt;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #9E2B72;
    background: #FCEFF7;
    border-radius: 10px;
    padding: 1mm 2.4mm;
    margin-bottom: 2mm;
  }

  .delivery-card:nth-child(2) .delivery-tag {
    color: #5E1788;
    background: #F3E9FB;
  }

  .legend-box {
    display: flex;
    gap: 8mm;
    align-items: center;
    background: #FAF5FE;
    border: 1px solid #EADBFA;
    border-radius: 5px;
    padding: 3.5mm 4.5mm;
    margin-bottom: 5mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .legend-box .legend-title {
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #5E1788;
    white-space: nowrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    font-size: 7.2pt;
    color: #4A3E54;
  }

  .legend-item .legend-note {
    color: #6C587D;
  }

  .howto {
    background: #FCF9F2;
    border-left: 3.5px solid #B8860B;
    border-radius: 4px;
    padding: 3.5mm 4.5mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .howto-title {
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #8A6A1E;
    margin-bottom: 1.6mm;
  }

  .howto p {
    margin: 0;
    font-size: 7.8pt;
    line-height: 1.55;
    color: #3A3342;
  }

  .howto strong {
    color: #5E1788;
  }

  /* ------------------------------------------------------------
     INDICE BRAND
     ------------------------------------------------------------ */
  .brand-index {
    margin-top: 6mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .brand-index-title {
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: #B8860B;
    margin-bottom: 2.5mm;
  }

  .brand-index-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
  }

  .brand-index-item {
    background: #FFFFFF;
    border: 1px solid #EADBFA;
    border-radius: 4px;
    padding: 3mm 3.2mm;
  }

  .brand-index-num {
    font-size: 6pt;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #D462A6;
    text-transform: uppercase;
    margin-bottom: 1.2mm;
  }

  .brand-index-item strong {
    display: block;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 9.2pt;
    font-weight: 700;
    color: #2D1145;
    line-height: 1.2;
    margin-bottom: 1mm;
  }

  .brand-index-item span {
    display: block;
    font-size: 6.4pt;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #8C789E;
    font-weight: 600;
  }

  /* ------------------------------------------------------------
     SEZIONI BRAND E TABELLE
     ------------------------------------------------------------ */
  .brand-section {
    page-break-before: always;
    break-before: page;
  }

  .brand-section-first {
    page-break-before: auto;
    break-before: auto;
  }

  .brand-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #5E1788;
    padding-bottom: 2.5mm;
    margin-bottom: 3mm;
  }

  .brand-eyebrow {
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #B8860B;
    margin-bottom: 1.2mm;
  }

  .brand-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 19pt;
    font-weight: 700;
    color: #5E1788;
  }

  .brand-count {
    text-align: right;
    line-height: 1.15;
    padding-bottom: 0.5mm;
  }

  .brand-count strong {
    display: block;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 17pt;
    color: #D462A6;
    font-weight: 700;
  }

  .brand-count span {
    font-size: 6.6pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #8C789E;
    font-weight: 600;
    padding-right: 0.6mm;
  }

  table.check-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 7.6pt;
  }

  .col-check { width: 12mm; }
  .col-ean { width: 33mm; }
  .col-prod { width: 75mm; }
  .col-status { width: 62mm; }

  table.check-table thead {
    display: table-header-group;
  }

  table.check-table th {
    background: #5E1788;
    color: #FFFFFF;
    text-align: left;
    padding: 2.2mm 2.4mm;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 6.4pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.9px;
    border-right: 1px solid rgba(255, 255, 255, 0.14);
  }

  table.check-table th.c-check {
    padding-left: 1.8mm;
    padding-right: 1mm;
    font-size: 5.5pt;
    letter-spacing: 0.15px;
  }

  table.check-table th:last-child {
    border-right: none;
  }

  table.check-table td {
    padding: 2.1mm 2.4mm;
    border-bottom: 1px solid #EADBFA;
    vertical-align: middle;
    line-height: 1.35;
  }

  table.check-table tbody tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  table.check-table tbody tr:nth-child(even) td {
    background: #FBF8FE;
  }

  .check-box {
    display: block;
    width: 5.6mm;
    height: 5.6mm;
    border: 1.2px solid #5E1788;
    border-radius: 1.2mm;
    background: #FFFFFF;
    box-shadow: inset 0 0 0 0.6mm #FDFBFF;
  }

  .ean {
    display: inline-block;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 8.8pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #1F1B24;
    background: #F6EFFC;
    border: 1px solid #E4D2F4;
    border-radius: 1.6mm;
    padding: 1.1mm 1.6mm;
    white-space: nowrap;
  }

  .ean-missing {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 6.8pt;
    font-weight: 600;
    color: #9A8AA8;
    background: #F7F5F9;
    border-color: #E7E1EC;
    white-space: normal;
  }

  .product-name {
    display: block;
    font-weight: 700;
    font-size: 8pt;
    color: #1F1B24;
    line-height: 1.3;
    margin-bottom: 0.9mm;
  }

  .product-meta {
    display: block;
    font-size: 6.7pt;
    color: #6C587D;
    line-height: 1.35;
  }

  .product-meta .dot {
    color: #D462A6;
    font-weight: 700;
    padding: 0 1px;
  }

  .product-meta .price {
    color: #B8860B;
    font-weight: 700;
  }

  .badge {
    display: inline-block;
    padding: 0.9mm 2.2mm;
    border-radius: 8px;
    font-size: 6.1pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    white-space: nowrap;
    line-height: 1.25;
  }

  .badge-red {
    background: #FBE9E7;
    color: #A62A20;
    border: 1px solid #F2C9C4;
  }

  .badge-amber {
    background: #FDF1DA;
    color: #8A5A00;
    border: 1px solid #EFD9AE;
  }

  .status-note {
    display: block;
    margin-top: 0.9mm;
    font-size: 6.6pt;
    line-height: 1.38;
    color: #5E5468;
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #5E1788;
    padding-bottom: 3.5mm;
    margin-bottom: 4mm;
  }
  .doc-header-left {
    display: flex;
    align-items: center;
    gap: 4mm;
  }
  .doc-header-left img {
    height: 12mm;
    object-fit: contain;
  }
  .doc-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 16pt;
    font-weight: 700;
    color: #5E1788;
    margin: 0;
    line-height: 1.1;
  }
  .doc-subtitle {
    font-size: 7.2pt;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #8C789E;
    font-weight: 600;
    margin-top: 1mm;
  }
  .doc-legend {
    display: flex;
    gap: 3mm;
    align-items: center;
  }
</style>
</head>
<body>

  <header class="doc-header">
    <div class="doc-header-left">
      ${logoLightHtml}
      <div>
        <h1 class="doc-title">Checklist Foto Catalogo</h1>
        <div class="doc-subtitle">121 referenze da fotografare / aggiornare • Scelta Makeup Napoli</div>
      </div>
    </div>
    <div class="doc-legend">
      <span class="badge badge-red">SENZA FOTO</span>
      <span class="badge badge-amber">FOTO DA SOSTITUIRE</span>
    </div>
  </header>

  ${brandSectionsHtml}

</body>
</html>
`;

/* ------------------------------------------------------------------
   SCRITTURA HTML + RENDER PDF
------------------------------------------------------------------ */
const scratchDir = path.join(workspaceDir, 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

const htmlPath = path.join(scratchDir, 'checklist_federica.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML scritto con successo:', htmlPath);

console.log('Referenze totali:', sortedItems.length);
console.log('  - Senza foto (badge logo):', totalPlaceholders);
console.log('  - Foto da sostituire:', totalFallbacks);
BRAND_ORDER.forEach((brand) => {
  const count = (byBrand.get(brand) || []).length;
  console.log(`  - ${brand}: ${count}`);
});

if (missingFromCatalog.length > 0) {
  console.warn('ATTENZIONE: voci audit non trovate nel catalogo:', missingFromCatalog.join(', '));
}

if (sortedItems.length !== 121) {
  console.warn(`ATTENZIONE: attese 121 referenze, trovate ${sortedItems.length}.`);
}

const outPdfDownloads = 'C:/Users/mario/Downloads/Checklist_Foto_Catalogo_Federica.pdf';
const outPdfArtifact = path.join(artifactDir, 'Checklist_Foto_Catalogo_Federica.pdf');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fileUrl = 'file:///' + encodeURI(htmlPath.replace(/\\/g, '/'));
const command = `"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${outPdfDownloads}" "${fileUrl}"`;

console.log('Esecuzione rendering PDF con Edge...');
execSync(command);

if (fs.existsSync(outPdfDownloads)) {
  const stat = fs.statSync(outPdfDownloads);
  console.log('PDF generato in Download:', outPdfDownloads, `(${(stat.size / 1024).toFixed(1)} KB)`);

  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
  fs.copyFileSync(outPdfDownloads, outPdfArtifact);
  console.log('PDF copiato negli artifacts:', outPdfArtifact);
} else {
  console.error('Errore: PDF non trovato dopo l\'esecuzione.');
  process.exit(1);
}
