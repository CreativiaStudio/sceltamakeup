/**
 * Migrazione immagini catalogo -> Cloudflare R2 CDN.
 *
 * Legge `data/catalog.json`, crea un backup una sola volta in
 * `data/catalog.backup-pre-r2.json` e riscrive tutti i riferimenti locali
 * `/products/<file>` come URL assoluti serviti dal dominio pubblico R2.
 *
 * Campi migrati per ogni prodotto:
 *   - images[]             -> immagini packshot del prodotto
 *   - variant.image        -> packshot della variante
 *   - variant.textureImage -> texture della variante
 *   - shade.image          -> packshot della shade
 *   - shade.textureImage   -> texture della shade
 *   - image (top-level)    -> mirror di images[0], mantenuto coerente
 */

const fs = require("fs");
const path = require("path");

const R2_PUBLIC_BASE_URL = "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev";
const LOCAL_PREFIX = "/products/";

const CATALOG_PATH = path.join(__dirname, "..", "data", "catalog.json");
const BACKUP_PATH = path.join(__dirname, "..", "data", "catalog.backup-pre-r2.json");

/**
 * Converte un singolo riferimento immagine.
 * @returns {{ value: unknown, changed: boolean }}
 */
function migrateImageRef(src) {
  if (typeof src !== "string" || !src.startsWith(LOCAL_PREFIX)) {
    return { value: src, changed: false };
  }
  const filename = src.slice(LOCAL_PREFIX.length);
  return { value: `${R2_PUBLIC_BASE_URL}${LOCAL_PREFIX}${filename}`, changed: true };
}

function run() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`❌ Catalogo non trovato: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CATALOG_PATH, "utf8");

  // Backup di sicurezza: creato solo se non esiste già (non sovrascrive mai).
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.writeFileSync(BACKUP_PATH, raw, "utf8");
    console.log(`💾 Backup creato: ${path.relative(process.cwd(), BACKUP_PATH)}`);
  } else {
    console.log(
      `ℹ️  Backup già presente, non sovrascritto: ${path.relative(process.cwd(), BACKUP_PATH)}`
    );
  }

  const catalog = JSON.parse(raw);
  const products = Array.isArray(catalog) ? catalog : catalog.products || [];

  const stats = {
    totalProducts: products.length,
    productsChanged: 0,
    productImages: 0,
    variantImages: 0,
    variantTextures: 0,
    shadeImages: 0,
    shadeTextures: 0,
    topLevelImages: 0,
  };

  for (const product of products) {
    if (!product || typeof product !== "object") continue;
    let productTouched = false;

    // 1. Array `images`
    if (Array.isArray(product.images)) {
      product.images = product.images.map((src) => {
        const { value, changed } = migrateImageRef(src);
        if (changed) {
          stats.productImages++;
          productTouched = true;
        }
        return value;
      });
    }

    // 2. `variants[].image` e `variants[].textureImage`
    if (Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (!variant || typeof variant !== "object") continue;

        const variantImage = migrateImageRef(variant.image);
        if (variantImage.changed) {
          variant.image = variantImage.value;
          stats.variantImages++;
          productTouched = true;
        }

        const variantTexture = migrateImageRef(variant.textureImage);
        if (variantTexture.changed) {
          variant.textureImage = variantTexture.value;
          stats.variantTextures++;
          productTouched = true;
        }
      }
    }

    // 3. `shades[].image` e `shades[].textureImage`
    if (Array.isArray(product.shades)) {
      for (const shade of product.shades) {
        if (!shade || typeof shade !== "object") continue;

        const shadeImage = migrateImageRef(shade.image);
        if (shadeImage.changed) {
          shade.image = shadeImage.value;
          stats.shadeImages++;
          productTouched = true;
        }

        const shadeTexture = migrateImageRef(shade.textureImage);
        if (shadeTexture.changed) {
          shade.textureImage = shadeTexture.value;
          stats.shadeTextures++;
          productTouched = true;
        }
      }
    }

    // 4. Campo top-level `image` (mirror di images[0], mantenuto coerente)
    {
      const { value, changed } = migrateImageRef(product.image);
      if (changed) {
        product.image = value;
        stats.topLevelImages++;
        productTouched = true;
      }
    }

    if (productTouched) stats.productsChanged++;
  }

  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log("");
  console.log("============================================================");
  console.log("✅ MIGRAZIONE CATALOGO -> R2 COMPLETATA");
  console.log("============================================================");
  console.log(`CDN URL            : ${R2_PUBLIC_BASE_URL}`);
  console.log(`Prodotti totali    : ${stats.totalProducts}`);
  console.log(`Prodotti aggiornati: ${stats.productsChanged}`);
  console.log(`Immagini prodotto  : ${stats.productImages} aggiornate (array images[])`);
  console.log(`Immagini varianti  : ${stats.variantImages} aggiornate (variants[].image)`);
  console.log(`Texture varianti   : ${stats.variantTextures} aggiornate (variants[].textureImage)`);
  console.log(`Immagini shades    : ${stats.shadeImages} aggiornate (shades[].image)`);
  console.log(`Texture shades     : ${stats.shadeTextures} aggiornate (shades[].textureImage)`);
  console.log(`Campo image top-lvl: ${stats.topLevelImages} aggiornati (image)`);
  console.log("============================================================");
}

run();
