/**
 * Scelta Makeup — Verifica integrità catalogo dopo lo split dei pennelli Pierre René.
 *
 * Controlli:
 *  1. JSON valido e struttura array.
 *  2. Nessun ID/slug duplicato.
 *  3. La vecchia scheda raggruppata "prod-pierre-ren-brushes" non esiste più.
 *  4. Le 12 nuove schede esistono con EAN, SKU, prezzo, wholesale, stock e
 *     categoria corretti, `shades: []` e una sola variante.
 *  5. Ogni prodotto ha i campi obbligatori e ogni variante un EAN.
 *
 * Uso: node scripts/verify_catalog_integrity.js
 */

const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.resolve(__dirname, "..", "data", "catalog.json");
const GROUPED_ID = "prod-pierre-ren-brushes";

const EXPECTED = [
  { ean: "3700467837115", name: "Pierre René Pennello Occhi Sfumatura Mini Blend 206", slug: "pierre-rene-pennello-occhi-sfumatura-mini-blend-206", price: 15.5, wholesale: 5.5, stock: 3 },
  { ean: "3700467848166", name: "Pierre René Pennello Precision Line 209", slug: "pierre-rene-pennello-precision-line-209", price: 14.5, wholesale: 5.15, stock: 3 },
  { ean: "8032179084620", name: "Pierre René Spugnetta Trucco Blender a Uovo Professional", slug: "pierre-rene-spugnetta-trucco-blender-uovo", price: 8.9, wholesale: 3.12, stock: 6 },
  { ean: "3700467837047", name: "Pierre René Pennello Cipria e Polveri Powder Brush 107", slug: "pierre-rene-pennello-cipria-polveri-powder-brush-107", price: 21.9, wholesale: 7.9, stock: 3 },
  { ean: "3700467837016", name: "Pierre René Pennello Fondotinta Foundation Brush 104", slug: "pierre-rene-pennello-fondotinta-foundation-brush-104", price: 21.9, wholesale: 7.9, stock: 3 },
  { ean: "3700467837078", name: "Pierre René Pennello Applicatore Ombretto 202", slug: "pierre-rene-pennello-applicatore-ombretto-202", price: 15.5, wholesale: 5.6, stock: 3 },
  { ean: "3700467837030", name: "Pierre René Pennello Polveri e Bronzer Powder & Bronzer 106", slug: "pierre-rene-pennello-polveri-bronzer-106", price: 20.5, wholesale: 7.3, stock: 3 },
  { ean: "3700467837023", name: "Pierre René Pennello Fard e Blush Rouge Powder 105", slug: "pierre-rene-pennello-fard-blush-rouge-powder-105", price: 16.5, wholesale: 5.9, stock: 3 },
  { ean: "3700467837054", name: "Pierre René Pennello Correttore Concealer Brush", slug: "pierre-rene-pennello-correttore-concealer", price: 14.5, wholesale: 5.2, stock: 3 },
  { ean: "3700467845813", name: "Pierre René Pennello Occhiaie e Zona Perioculare Under Eye 109", slug: "pierre-rene-pennello-under-eye-109", price: 19.5, wholesale: 7.0, stock: 3 },
  { ean: "3700467845806", name: "Pierre René Pennello Illuminante Viso Highlighter 110", slug: "pierre-rene-pennello-illuminante-highlighter-110", price: 16.5, wholesale: 5.9, stock: 3 },
  { ean: "3700467837085", name: "Pierre René Pennello Dettaglio Occhi Mini Eyeshadow 203", slug: "pierre-rene-pennello-dettaglio-occhi-mini-203", price: 15.5, wholesale: 5.6, stock: 3 },
];

const failures = [];
const checks = [];

function check(label, condition, detail = "") {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  check("catalog.json esiste", fs.existsSync(CATALOG_PATH));
  if (!fs.existsSync(CATALOG_PATH)) return finish();

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  } catch (err) {
    check("JSON valido", false, String(err.message));
    return finish();
  }
  check("JSON valido", true);
  check("Il catalogo è un array", Array.isArray(catalog));

  // 2. Unicità ID / slug.
  const ids = catalog.map((p) => p.id);
  const slugs = catalog.map((p) => p.slug);
  check("Nessun ID duplicato", new Set(ids).size === ids.length);
  check("Nessuno slug duplicato", new Set(slugs).size === slugs.length);

  // 3. La scheda raggruppata è stata rimossa.
  check(
    `Scheda raggruppata "${GROUPED_ID}" rimossa`,
    !catalog.some((p) => p.id === GROUPED_ID)
  );

  // 4/5. Le 12 schede attese.
  EXPECTED.forEach((exp, i) => {
    const id = `prod-single-${exp.ean}`;
    const p = catalog.find((x) => x.id === id);
    check(`Scheda ${i + 1} presente (${id})`, Boolean(p));
    if (!p) return;

    check(`  ${i + 1}. nome`, p.name === exp.name, `atteso "${exp.name}", trovato "${p.name}"`);
    check(`  ${i + 1}. slug`, p.slug === exp.slug, `atteso "${exp.slug}", trovato "${p.slug}"`);
    check(`  ${i + 1}. brand`, p.brand === "Pierre René", p.brand);
    check(`  ${i + 1}. categoria`, p.category === "Beauty & Accessori", p.category);
    check(`  ${i + 1}. prezzo`, p.price === exp.price, String(p.price));
    check(`  ${i + 1}. wholesale`, p.originalWholesalePrice === exp.wholesale, String(p.originalWholesalePrice));
    check(`  ${i + 1}. stock`, p.stock === exp.stock, String(p.stock));
    check(`  ${i + 1}. shades vuoto`, Array.isArray(p.shades) && p.shades.length === 0, JSON.stringify(p.shades));
    check(`  ${i + 1}. una variante`, Array.isArray(p.variants) && p.variants.length === 1);
    check(`  ${i + 1}. immagini`, Array.isArray(p.images) && p.images.length > 0);
    check(`  ${i + 1}. descrizione`, typeof p.description === "string" && p.description.length > 40);
    check(`  ${i + 1}. howToUse`, typeof p.howToUse === "string" && p.howToUse.length > 20);
    if (p.variants && p.variants[0]) {
      const v = p.variants[0];
      check(`  ${i + 1}. variante EAN`, v.ean === exp.ean, v.ean);
      check(`  ${i + 1}. variante SKU`, v.sku === exp.ean, v.sku);
      check(`  ${i + 1}. variante prezzo`, v.price === exp.price, String(v.price));
      check(`  ${i + 1}. variante wholesale`, v.originalWholesalePrice === exp.wholesale, String(v.originalWholesalePrice));
      check(`  ${i + 1}. variante stock`, v.stock === exp.stock, String(v.stock));
    }
  });

  // 6. Tutti i prodotti: campi obbligatori e varianti con EAN.
  const required = ["id", "slug", "name", "brand", "category", "price", "description", "variants", "images"];
  let productsOk = true;
  let variantsMissingEan = 0;
  for (const p of catalog) {
    for (const field of required) {
      if (p[field] === undefined || p[field] === null) {
        productsOk = false;
        failures.push(`Prodotto ${p.id} privo del campo "${field}"`);
      }
    }
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      productsOk = false;
      failures.push(`Prodotto ${p.id} senza varianti`);
      continue;
    }
    for (const v of p.variants) {
      if (!v.ean) variantsMissingEan += 1;
    }
  }
  check("Tutti i prodotti con campi obbligatori", productsOk);
  check("Tutte le varianti con EAN", variantsMissingEan === 0, `${variantsMissingEan} varianti senza EAN`);

  finish(catalog.length);
}

function finish(totalProducts) {
  const passed = checks.filter((c) => c.ok).length;
  console.log(`\nControlli integrità catalogo: ${passed}/${checks.length} superati`);
  if (typeof totalProducts === "number") console.log(`Prodotti totali: ${totalProducts}`);
  if (failures.length > 0) {
    console.error("\n❌ FALLIMENTI:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("✅ Integrità catalogo verificata: nessuna anomalia.\n");
}

main();
