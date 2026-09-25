/**
 * Scelta Makeup — Genera i 4 packshot di brand mancanti in public/products/.
 *
 * L'audit ha rilevato che 46 schede puntano a 4 packshot generici che danno 404:
 *   - /products/eveline-cosmetics-packshot.jpg
 *   - /products/pierre-rene-packshot.jpg
 *   - /products/cipria-milano-packshot.jpg
 *   - /products/miyo-packshot.jpg
 *
 * Questo script li crea come placeholder badge eleganti (SVG -> JPEG via sharp)
 * così nessuna scheda a catalogo mostra mai un'immagine rotta.
 *
 * Uso: node scripts/generate_packshots.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = path.resolve(__dirname, "..", "public", "products");

const PACKSHOTS = [
  {
    file: "eveline-cosmetics-packshot.jpg",
    bg: "#B0164F",
    accent: "#F4B8D0",
    brand: "EVELINE",
    sub: "COSMETICS",
  },
  {
    file: "pierre-rene-packshot.jpg",
    bg: "#1B1B1F",
    accent: "#C9A227",
    brand: "PIERRE RENÉ",
    sub: "PROFESSIONAL MAKE-UP",
  },
  {
    file: "cipria-milano-packshot.jpg",
    bg: "#C9A08C",
    accent: "#5C3A2E",
    brand: "CIPRIA",
    sub: "MILANO MAKE-UP",
  },
  {
    file: "miyo-packshot.jpg",
    bg: "#6E4BB3",
    accent: "#EADCF8",
    brand: "MIYO",
    sub: "COSMETICS",
  },
];

function buildSvg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${p.bg}"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="400" cy="330" r="210" fill="none" stroke="${p.accent}" stroke-width="3" opacity="0.55"/>
  <circle cx="400" cy="330" r="150" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.35"/>
  <text x="400" y="360" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="4">${p.brand}</text>
  <text x="400" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${p.accent}" text-anchor="middle" letter-spacing="8">${p.sub}</text>
  <text x="400" y="700" font-family="Verdana, sans-serif" font-size="20" fill="#ffffff" fill-opacity="0.7" text-anchor="middle" letter-spacing="3">SCELTA MAKEUP</text>
</svg>`;
}

async function main() {
  let written = [];
  for (const p of PACKSHOTS) {
    const outFile = path.join(OUT_DIR, p.file);
    if (fs.existsSync(outFile)) {
      console.log(`SKIP (già presente): ${p.file}`);
      continue;
    }
    const svg = buildSvg(p);
    await sharp(Buffer.from(svg, "utf8"))
      .jpeg({ quality: 90 })
      .toFile(outFile);
    written.push(p.file);
  }
  console.log(`Packshot generati: ${written.length}`);
  for (const f of written) console.log(`  - ${f}`);
}

main().catch((e) => {
  console.error("ERRORE generazione packshot:", e.message);
  process.exit(1);
});
