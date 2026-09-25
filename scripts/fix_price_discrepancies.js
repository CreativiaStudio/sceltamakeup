/**
 * fix_price_discrepancies.js
 * -----------------------------------------------------------------------------
 * Verifica e allinea le discrepanze di prezzo in `data/catalog.json`:
 * il prezzo di ogni variante / nuance deve essere coerente con il prezzo
 * della scheda prodotto a cui appartiene.
 *
 * Regole di bonifica
 * ------------------
 *  Regola 1 — Linee make-up con nuance
 *    (ciprie, rossetti, matite, fondotinta, correttori, tinte labbra, ...):
 *    il prezzo di OGNI variante e nuance va sincronizzato al prezzo retail
 *    della scheda principale.
 *    Es.: cipria a 9.40 -> tutte le tonalita' 01/02/03 devono essere 9.40.
 *
 *  Regola 2 — Schede raggruppate con prezzi differenziati (id `prod-*`,
 *    es. i pennelli Pierre Rene'): la scheda raggruppa articoli diversi, quindi
 *    il prezzo base della scheda viene impostato al prezzo della variante
 *    MINIMA (variante di riferimento). I prezzi differenziati delle singole
 *    varianti restano invariati perche' rappresentano articoli differenti.
 *
 *  Regola 3 — ddp-pf01631 (Diego dalla Palma Icon Time Maschera Viso)
 *    Il prodotto venduto al dettaglio e' la MASCHERA SINGOLA (SKU 2PF01631):
 *      • prezzo retail della maschera singola = 15.00 EUR;
 *      • prezzo base della scheda = 15.00 EUR;
 *      • nessuna variante errata a 120.00 EUR: il "Cofanetto Display 8 pz"
 *        (SKU PF01631) non e' un articolo venduto al dettaglio su questa scheda
 *        e viene rimosso dalle varianti/nuance (il dato rimosso e' conservato
 *        nel report per piena tracciabilita').
 *
 * Esecuzione:  node scripts/fix_price_discrepancies.js
 * -----------------------------------------------------------------------------
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const REPORT_PATH = path.join(ROOT, "scratch", "fix_price_discrepancies_report.json");

const EPS = 1e-9;

/** Regola 3 — scheda speciale maschera singola. */
const SINGLE_MASK_ID = "ddp-pf01631";
const SINGLE_MASK_SKU = "2PF01631";
const SINGLE_MASK_RETAIL = 15.0;
/** Prezzo errato da rimuovere dalla scheda della maschera singola. */
const ERRONEOUS_BOX_PRICE = 120.0;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function isNum(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function samePrice(a, b) {
  return isNum(a) && isNum(b) && Math.abs(a - b) <= EPS;
}

function eur(x) {
  return isNum(x) ? `EUR ${x.toFixed(2)}` : "n/d";
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

/** Elenca tutte le voci di prezzo di una scheda (varianti + nuance). */
function priceEntries(p) {
  const out = [];
  (p.variants || []).forEach((v, i) => {
    out.push({ list: "variants", index: i, ref: v, where: `variants[${i}]`, label: v.sku || v.name || v.id });
  });
  (p.shades || []).forEach((s, i) => {
    out.push({ list: "shades", index: i, ref: s, where: `shades[${i}]`, label: s.code || s.name || s.id });
  });
  return out;
}

/** Le schede raggruppate nascono dalle riconciliazioni e usano il prefisso `prod-`. */
function isGroupedProduct(p) {
  return /^prod-/.test(String(p.id));
}

function isSingleMaskEntry(entry) {
  const ref = entry.ref || entry;
  const sku = String(ref.sku || ref.code || "").trim().toUpperCase();
  const name = String(ref.name || "");
  return sku === SINGLE_MASK_SKU || /maschera\s+singola|monouso/i.test(name);
}

function isBoxEntry(entry) {
  const ref = entry.ref || entry;
  const sku = String(ref.sku || ref.code || "").trim().toUpperCase();
  const name = String(ref.name || "");
  return sku === "PF01631" || /cofanetto|display|8\s*pz/i.test(name);
}

// ---------------------------------------------------------------------------
// Rilevamento discrepanze (per il conteggio before/after)
// ---------------------------------------------------------------------------

function detectDiscrepancies(catalog) {
  const items = [];
  for (const p of catalog) {
    for (const e of priceEntries(p)) {
      if (!samePrice(e.ref.price, p.price)) {
        items.push({
          productId: p.id,
          name: p.name,
          brand: p.brand,
          where: e.where,
          label: e.label,
          variantPrice: e.ref.price,
          cardPrice: p.price,
          grouped: isGroupedProduct(p),
        });
      }
    }
  }
  return items;
}

function summarize(items) {
  return items.reduce(
    (acc, i) => {
      acc.total++;
      if (i.grouped) acc.grouped++;
      else acc.nuance++;
      return acc;
    },
    { total: 0, nuance: 0, grouped: 0 }
  );
}

// ---------------------------------------------------------------------------
// Bonifica
// ---------------------------------------------------------------------------

function applyFixes(catalog) {
  const changes = [];
  const groupedCards = [];
  const singleMask = { keptEntries: [], removedEntries: [], baseBefore: null, baseAfter: null };

  for (const p of catalog) {
    const entries = priceEntries(p);
    const discrepancies = entries.filter((e) => !samePrice(e.ref.price, p.price));

    // --- Regola 3: ddp-pf01631 (maschera singola) --------------------------
    if (p.id === SINGLE_MASK_ID) {
      // La maschera singola e' l'articolo venduto al dettaglio: il suo prezzo
      // e' il riferimento ufficiale della scheda.
      singleMask.baseBefore = p.price;
      singleMask.baseAfter = SINGLE_MASK_RETAIL;

      if (!samePrice(p.price, SINGLE_MASK_RETAIL)) {
        p.price = SINGLE_MASK_RETAIL;
        changes.push({
          type: "rule3-base",
          productId: p.id,
          name: p.name,
          from: singleMask.baseBefore,
          to: SINGLE_MASK_RETAIL,
        });
      }

      // 3a. La maschera singola deve costare 15.00 in entrambe le liste.
      for (const e of entries.filter(isSingleMaskEntry)) {
        if (!samePrice(e.ref.price, SINGLE_MASK_RETAIL)) {
          const from = e.ref.price;
          e.ref.price = SINGLE_MASK_RETAIL;
          changes.push({
            type: "rule3-single-mask",
            productId: p.id,
            name: p.name,
            where: e.where,
            label: e.label,
            from,
            to: SINGLE_MASK_RETAIL,
          });
        }
        singleMask.keptEntries.push({ where: e.where, label: e.label, price: SINGLE_MASK_RETAIL });
      }

      // 3b. Rimuove le varianti errate del cofanetto (8 pz a 120.00 EUR):
      //     non sono articoli venduti al dettaglio su questa scheda.
      for (const listKey of ["variants", "shades"]) {
        const list = p[listKey];
        if (!Array.isArray(list)) continue;
        const filtered = [];
        list.forEach((ref, index) => {
          const entry = { ref, where: `${listKey}[${index}]`, label: ref.sku || ref.code || ref.name };
          const erroneous =
            !isSingleMaskEntry(entry) && (isBoxEntry(entry) || samePrice(ref.price, ERRONEOUS_BOX_PRICE));
          if (erroneous) {
            singleMask.removedEntries.push({
              where: entry.where,
              label: entry.label,
              name: ref.name || null,
              price: isNum(ref.price) ? ref.price : null,
              stock: isNum(ref.stock) ? ref.stock : null,
            });
            changes.push({
              type: "rule3-remove-erroneous-box",
              productId: p.id,
              name: p.name,
              where: entry.where,
              label: entry.label,
              from: ref.price,
              to: null,
            });
          } else {
            filtered.push(ref);
          }
        });
        p[listKey] = filtered;
      }

      continue;
    }

    if (discrepancies.length === 0) continue;

    // --- Regola 2: schede raggruppate a prezzo differenziato ----------------
    if (isGroupedProduct(p)) {
      const prices = entries.map((e) => e.ref.price).filter(isNum);
      const cheapest = round2(Math.min(...prices));
      const representative = entries.find((e) => samePrice(e.ref.price, cheapest));
      const from = p.price;
      if (!samePrice(p.price, cheapest)) {
        p.price = cheapest;
        changes.push({
          type: "rule2-base",
          productId: p.id,
          name: p.name,
          from,
          to: cheapest,
          representativeVariant: representative ? representative.label : null,
        });
      }
      groupedCards.push({
        productId: p.id,
        name: p.name,
        brand: p.brand,
        oldCardPrice: from,
        newCardPrice: p.price,
        cheapestVariant: representative ? representative.label : null,
        priceRange: [cheapest, round2(Math.max(...prices))],
      });
      continue;
    }

    // --- Regola 1: varianti colore / nuance ---------------------------------
    for (const e of entries) {
      if (!samePrice(e.ref.price, p.price)) {
        const from = e.ref.price;
        e.ref.price = p.price;
        changes.push({
          type: "rule1-nuance-sync",
          productId: p.id,
          name: p.name,
          brand: p.brand,
          where: e.where,
          label: e.label,
          from,
          to: p.price,
        });
      }
    }
  }

  return { changes, groupedCards, singleMask };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8").replace(/^\uFEFF/, ""));

  const before = detectDiscrepancies(catalog);
  const beforeSummary = summarize(before);

  const { changes, groupedCards, singleMask } = applyFixes(catalog);

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8");

  const after = detectDiscrepancies(catalog);
  const afterSummary = summarize(after);

  const rule1 = changes.filter((c) => c.type === "rule1-nuance-sync");
  const rule2 = changes.filter((c) => c.type === "rule2-base");
  const rule3Base = changes.filter((c) => c.type === "rule3-base");
  const rule3Single = changes.filter((c) => c.type === "rule3-single-mask");
  const rule3Removed = changes.filter((c) => c.type === "rule3-remove-erroneous-box");

  const residualExplanation =
    "Le voci residue sono i prezzi differenziati VOLUTI delle schede raggruppate " +
    "(`prod-*`, es. pennelli/matite di modelli diversi): il prezzo base e' la variante " +
    "piu economica, mentre le singole varianti mantengono il proprio prezzo di listino.";

  const report = {
    generatedAt: new Date().toISOString(),
    catalogFile: "data/catalog.json",
    rules: {
      rule1:
        "Linee make-up con nuance: ogni variante/nuance viene sincronizzata al prezzo retail della scheda.",
      rule2:
        "Schede raggruppate (prod-*): prezzo base = variante minima di riferimento, prezzi differenziati preservati.",
      rule3:
        "ddp-pf01631: maschera singola retail 15.00 EUR, prezzo base 15.00 EUR, rimosse le varianti errate del cofanetto 8 pz a 120.00 EUR.",
    },
    totals: {
      productsInCatalog: catalog.length,
      discrepanciesBefore: beforeSummary.total,
      discrepanciesAfter: afterSummary.total,
      entriesSyncedRule1: rule1.length,
      cardsRebasedRule2: rule2.length,
      specialFixesRule3: rule3Single.length + rule3Base.length + rule3Removed.length,
    },
    before: {
      total: beforeSummary.total,
      nuanceEntries: beforeSummary.nuance,
      groupedEntries: beforeSummary.grouped,
      byProduct: Object.values(
        before.reduce((acc, i) => {
          const k = i.productId;
          if (!acc[k]) {
            acc[k] = {
              productId: i.productId,
              name: i.name,
              category: i.grouped ? "grouped" : "nuance",
              entries: 0,
            };
          }
          acc[k].entries++;
          return acc;
        }, {})
      ),
    },
    applied: {
      rule1SyncedEntries: rule1,
      rule2RebasedCards: groupedCards,
      rule3SingleMask: singleMask,
      changes,
    },
    after: {
      total: after.total,
      nuanceEntries: afterSummary.nuance,
      groupedEntries: afterSummary.grouped,
      explanation: residualExplanation,
    },
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  // ------------------------------ REPORT FINALE ------------------------------
  console.log("===============================================================");
  console.log("  ALLINEAMENTO DISCREPANZE PREZZI  -  data/catalog.json");
  console.log("===============================================================");
  console.log(`Schede nel catalogo                     : ${catalog.length}`);
  console.log(`Discrepanze rilevate (pre-fix)          : ${beforeSummary.total}`);
  console.log(`   - varianti colore/nuance (Regola 1)  : ${beforeSummary.nuance} voci`);
  console.log(`   - schede raggruppate     (Regola 2)  : ${beforeSummary.grouped} voci`);
  console.log("");
  console.log("FIX APPLICATI");
  console.log(`   - Regola 1: ${rule1.length} varianti/nuance sincronizzate al prezzo scheda`);
  console.log(`   - Regola 2: ${rule2.length} schede raggruppate ri-baselizzate alla variante minima:`);
  for (const c of groupedCards) {
    console.log(
      `       * ${c.productId}: ${eur(c.oldCardPrice)} -> ${eur(c.newCardPrice)} ` +
        `[min ${c.cheapestVariant}, range ${eur(c.priceRange[0])}-${eur(c.priceRange[1])}]`
    );
  }
  console.log(
    `   - Regola 3: ddp-pf01631 -> maschera singola ${eur(SINGLE_MASK_RETAIL)}` +
      ` (${rule3Single.length} prezzi corretti, ${rule3Removed.length} varianti errate rimosse)`
  );
  for (const c of rule3Removed) {
    console.log(`       * rimossa ${c.where} "${c.label}" (era ${eur(c.from)})`);
  }
  console.log("");
  console.log("DETTAGLIO REGOLA 1 (sincronizzazioni al prezzo scheda)");
  for (const c of rule1) {
    console.log(`   * ${c.productId} [${c.where}] ${c.label}: ${eur(c.from)} -> ${eur(c.to)}`);
  }
  console.log("");
  console.log("DISCREPANZE RESIDUE (post-fix)          : " + afterSummary.total);
  console.log("   " + residualExplanation);
  console.log(`   - raggruppate: ${afterSummary.grouped} voci | nuance: ${afterSummary.nuance} voci`);
  console.log("");
  console.log("Report JSON salvato in: " + path.relative(ROOT, REPORT_PATH));
  console.log("Catalogo aggiornato in: " + path.relative(ROOT, CATALOG_PATH));
  console.log("===============================================================");
}

main();
