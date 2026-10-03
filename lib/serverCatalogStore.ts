/**
 * Scelta Makeup — Centralized Cloud Catalog Persistence (Server-Only)
 * Module: lib/serverCatalogStore.ts
 *
 * Fonte di verità unica per override prodotto, giacenze varianti e Scatola Nera,
 * condivisa da tutti i dispositivi (admin remoto di Mario + laptop salone YASHI).
 *
 * Architettura row-level (3 ottobre 2026) — fine dei "salvataggi fantasma":
 *   - `scelta_product_overrides`  una riga per prodotto
 *   - `scelta_variant_stocks`     una riga per variante
 *   - `scelta_audit_log`          Scatola Nera append-only (solo INSERT)
 *
 * Ogni scrittura è una PATCH atomica (funzioni RPC Postgres con row lock) che
 * tocca SOLO la riga interessata e SOLO i campi inviati. Non esiste più alcun
 * read-modify-write dell'intero catalogo, quindi più istanze Vercel in parallelo
 * non possono cancellarsi le modifiche a vicenda.
 *
 * La vecchia tabella `scelta_catalog_overrides` (singleton JSONB) resta intatta
 * come archivio di sola lettura.
 */

import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";
import type { SceltaVariantStock } from "@/lib/adminStore";
import {
  MAX_CLOUD_AUDIT_LOGS,
  sanitizeAdminActivityLogItem,
  type AdminActivityLogItem,
} from "@/lib/auditLogger";

export interface CentralCatalogState {
  version: number;
  productOverrides: Record<string, Partial<Product>>;
  variantStocks: Record<string, SceltaVariantStock>;
  /** Scatola nera: popolata solo da `getAuditLogs()` (non dalla lettura catalogo). */
  auditLogs?: AdminActivityLogItem[];
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// Backend configuration
// ------------------------------------------------------------------------------

// Resilienza produzione (pattern identico a lib/r2.ts): se le variabili non sono
// ancora configurate nel pannello Vercel, l'app continua a usare il progetto
// Supabase dedicato `zsycaulbamdxqhcukrvn` invece di fallire a runtime.
const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEFAULT_DEDICATED_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_DEDICATED_SERVICE_KEY;

const OVERRIDES_TABLE = "scelta_product_overrides";
const STOCKS_TABLE = "scelta_variant_stocks";
const AUDIT_TABLE = "scelta_audit_log";

/** Micro-cache SOLO per le letture (vetrina pubblica). Mai usata come base di una scrittura. */
const READ_CACHE_TTL_MS = 2000;
let readCache: CentralCatalogState | null = null;
let readCacheAt = 0;

function invalidateReadCache(): void {
  readCache = null;
  readCacheAt = 0;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: DEDICATED_SERVICE_KEY,
    Authorization: `Bearer ${DEDICATED_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

function assertConfigured(): void {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) {
    throw new Error(
      "Configurazione Supabase dedicata mancante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  assertConfigured();
  const res = await fetch(`${DEDICATED_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Scrittura cloud non riuscita (${fn}, HTTP ${res.status}) ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Legge tutte le righe di una tabella con paginazione (PostgREST max 1000/pagina). */
async function selectAll<T>(table: string, select: string): Promise<T[]> {
  assertConfigured();
  const pageSize = 1000;
  const out: T[] = [];
  for (let from = 0; from < 100_000; from += pageSize) {
    const res = await fetch(`${DEDICATED_URL}/rest/v1/${table}?select=${select}`, {
      headers: headers({ Range: `${from}-${from + pageSize - 1}`, "Range-Unit": "items" }),
      cache: "no-store",
    });
    if (!res.ok && res.status !== 206) {
      throw new Error(`Lettura catalogo centralizzato fallita (${table}, HTTP ${res.status}).`);
    }
    const rows = (await res.json()) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

function computeStatus(quantity: number): SceltaVariantStock["stockStatus"] {
  if (quantity <= 0) return "out_of_stock";
  if (quantity < 5) return "low_stock";
  return "available";
}

function baseVariantsFor(productId: string): unknown[] | null {
  const p = (rawCatalog as Product[]).find((x) => x.id === productId);
  return p && Array.isArray(p.variants) ? (p.variants as unknown[]) : null;
}

// ------------------------------------------------------------------------------
// Catalog variant resolution (fallback for stock-only requests)
// ------------------------------------------------------------------------------

function resolveVariantStockFromCatalog(variantId: string): SceltaVariantStock | undefined {
  const products = rawCatalog as Product[];
  for (const p of products) {
    if (!p.variants) continue;
    const v = p.variants.find((x) => x.id === variantId);
    if (!v) continue;
    const qty = typeof v.stock === "number" ? v.stock : 0;
    return {
      variantId: v.id,
      productId: p.id,
      sku: v.sku,
      ean: v.ean || "",
      name: v.name,
      colorHex: v.colorHex || undefined,
      stockQuantity: qty,
      stockStatus: computeStatus(qty),
      price: v.price !== undefined ? v.price : p.price,
      originalWholesalePrice: v.originalWholesalePrice ?? p.originalWholesalePrice,
      productName: p.name,
      brand: p.brand,
      category: p.category,
      image: v.image || (p.images && p.images[0]) || "",
      updatedAt: new Date().toISOString(),
    };
  }
  return undefined;
}

// ------------------------------------------------------------------------------
// Public API — Letture
// ------------------------------------------------------------------------------

export async function getCentralCatalogState(options?: { fresh?: boolean }): Promise<CentralCatalogState> {
  const now = Date.now();
  if (!options?.fresh && readCache && now - readCacheAt < READ_CACHE_TTL_MS) return readCache;

  try {
    const [ovRows, vsRows] = await Promise.all([
      selectAll<{ product_id: string; data: Partial<Product> & { _updatedAt?: string }; updated_at: string }>(
        OVERRIDES_TABLE,
        "product_id,data,updated_at"
      ),
      selectAll<{ variant_id: string; data: SceltaVariantStock; updated_at: string }>(
        STOCKS_TABLE,
        "variant_id,data,updated_at"
      ),
    ]);

    const productOverrides: Record<string, Partial<Product>> = {};
    let latest = 0;
    for (const row of ovRows) {
      if (!row || !row.product_id || !row.data || typeof row.data !== "object") continue;
      productOverrides[row.product_id] = {
        ...row.data,
        _updatedAt: row.data._updatedAt || row.updated_at,
      } as Partial<Product>;
      latest = Math.max(latest, Date.parse(row.updated_at) || 0);
    }

    const variantStocks: Record<string, SceltaVariantStock> = {};
    for (const row of vsRows) {
      if (!row || !row.variant_id || !row.data || typeof row.data !== "object") continue;
      variantStocks[row.variant_id] = { ...row.data, variantId: row.variant_id };
      latest = Math.max(latest, Date.parse(row.updated_at) || 0);
    }

    const state: CentralCatalogState = {
      version: 3,
      productOverrides,
      variantStocks,
      updatedAt: new Date(latest || Date.now()).toISOString(),
    };
    readCache = state;
    readCacheAt = Date.now();
    return state;
  } catch (err) {
    // Solo per la vetrina: se il DB è momentaneamente irraggiungibile si serve
    // l'ultimo snapshot letto. Le scritture non dipendono mai da questa cache.
    if (readCache && !options?.fresh) {
      console.warn(
        "[serverCatalogStore] Lettura cloud fallita, uso l'ultimo snapshot:",
        err instanceof Error ? err.message : err
      );
      return readCache;
    }
    throw err;
  }
}

// ------------------------------------------------------------------------------
// Public API — Scritture atomiche
// ------------------------------------------------------------------------------

export interface PatchResult {
  productOverrides: Record<string, Partial<Product>>;
  variantStocks: Record<string, SceltaVariantStock>;
  updatedAt: string;
}

/**
 * Applica una PATCH (solo i campi inviati) all'override di un prodotto e,
 * opzionalmente, alle giacenze delle sue varianti. Atomico per riga.
 *
 * @param options.replaceVariants true solo quando l'editor elimina varianti:
 *   l'elenco varianti diventa quello inviato (i campi non inviati restano).
 */
export async function saveProductOverride(
  productId: string,
  updates: Partial<Product>,
  variantStocks?: Record<string, Partial<SceltaVariantStock>>,
  options?: {
    replaceVariants?: boolean;
    /** Record completi usati SOLO se la giacenza non esiste ancora nel DB. */
    variantStockSeeds?: Record<string, Partial<SceltaVariantStock>>;
  }
): Promise<PatchResult> {
  const result: PatchResult = {
    productOverrides: {},
    variantStocks: {},
    updatedAt: new Date().toISOString(),
  };

  const patch = { ...(updates || {}) } as Record<string, unknown>;
  delete patch._updatedAt;
  delete patch.id;

  if (Object.keys(patch).length > 0) {
    const merged = await rpc<Partial<Product>>("scelta_patch_product_override", {
      p_product_id: productId,
      p_patch: patch,
      p_base_variants: baseVariantsFor(productId),
      p_replace_variants: Boolean(options?.replaceVariants),
    });
    result.productOverrides[productId] = merged;
  }

  if (variantStocks && Object.keys(variantStocks).length > 0) {
    const items: Record<string, Partial<SceltaVariantStock>> = {};
    const seeds: Record<string, Partial<SceltaVariantStock>> = {};
    for (const [variantId, v] of Object.entries(variantStocks)) {
      if (!variantId || !v || typeof v !== "object") continue;
      const clean = { ...v } as Record<string, unknown>;
      delete clean.updatedAt;
      if (!clean.productId) clean.productId = productId;
      items[variantId] = clean as Partial<SceltaVariantStock>;
      const seed = options?.variantStockSeeds?.[variantId] ?? resolveVariantStockFromCatalog(variantId);
      if (seed && typeof seed === "object") seeds[variantId] = { ...seed, productId: seed.productId || productId };
    }
    if (Object.keys(items).length > 0) {
      const rows = await rpc<Record<string, SceltaVariantStock>>("scelta_patch_variant_stocks", {
        p_items: items,
        p_seeds: seeds,
      });
      result.variantStocks = rows || {};
    }
  }

  invalidateReadCache();
  return result;
}

export async function deleteProductOverride(productId: string): Promise<PatchResult> {
  assertConfigured();
  const res = await fetch(
    `${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?product_id=eq.${encodeURIComponent(productId)}`,
    { method: "DELETE", headers: headers({ Prefer: "return=minimal" }), cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Eliminazione override non riuscita (HTTP ${res.status}).`);
  }
  invalidateReadCache();
  return { productOverrides: {}, variantStocks: {}, updatedAt: new Date().toISOString() };
}

/**
 * Rettifica giacenza di una variante: delta (vendita/carico) o valore assoluto.
 * Eventuali altri campi in `variantStock` (es. prezzo) vengono applicati come
 * patch sulla stessa riga, senza toccare il resto.
 */
export async function saveVariantStock(input: {
  variantId: string;
  delta?: number;
  newQuantity?: number;
  variantStock?: Partial<SceltaVariantStock>;
  /** Record completo usato SOLO se la giacenza non esiste ancora. */
  seed?: Partial<SceltaVariantStock>;
}): Promise<PatchResult> {
  const seed =
    (input.seed && input.seed.productId ? input.seed : undefined) ??
    resolveVariantStockFromCatalog(input.variantId) ??
    (input.variantStock && input.variantStock.productId ? input.variantStock : undefined) ??
    null;

  let row: SceltaVariantStock | undefined;

  if (input.delta !== undefined || input.newQuantity !== undefined) {
    row = await rpc<SceltaVariantStock>("scelta_adjust_variant_stock", {
      p_variant_id: input.variantId,
      p_delta: input.newQuantity !== undefined ? null : Math.trunc(input.delta ?? 0),
      p_new_quantity: input.newQuantity !== undefined ? Math.max(0, Math.floor(input.newQuantity)) : null,
      p_seed: seed,
    });
  }

  // Campi extra (es. prezzo variante) come patch, esclusa la quantità già gestita sopra.
  if (input.variantStock) {
    const extra = { ...input.variantStock } as Record<string, unknown>;
    delete extra.stockQuantity;
    delete extra.stockStatus;
    delete extra.updatedAt;
    delete extra.variantId;
    if (Object.keys(extra).length > 0) {
      const rows = await rpc<Record<string, SceltaVariantStock>>("scelta_patch_variant_stocks", {
        p_items: { [input.variantId]: extra },
      });
      row = rows?.[input.variantId] ?? row;
    }
  }

  invalidateReadCache();
  return {
    productOverrides: {},
    variantStocks: row ? { [input.variantId]: row } : {},
    updatedAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// Scatola Nera — Audit Trail (append-only)
// ------------------------------------------------------------------------------

/** Inserisce gli eventi (idempotente sugli id: i retry del client non duplicano). */
export async function appendAuditLogs(incoming: AdminActivityLogItem[]): Promise<number> {
  assertConfigured();
  const rows: Array<{ id: string; ts: string; payload: AdminActivityLogItem }> = [];
  for (const entry of incoming) {
    const clean = sanitizeAdminActivityLogItem(entry);
    if (!clean) continue;
    const ts = Number.isNaN(Date.parse(clean.timestamp)) ? new Date().toISOString() : clean.timestamp;
    rows.push({ id: clean.id, ts, payload: clean });
  }
  if (rows.length === 0) return 0;

  const res = await fetch(`${DEDICATED_URL}/rest/v1/${AUDIT_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Scrittura Scatola Nera non riuscita (HTTP ${res.status}).`);
  }
  return rows.length;
}

/** Ultimi eventi della Scatola Nera, dal più recente. */
export async function getAuditLogs(limit: number = MAX_CLOUD_AUDIT_LOGS): Promise<AdminActivityLogItem[]> {
  assertConfigured();
  const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)));
  const res = await fetch(
    `${DEDICATED_URL}/rest/v1/${AUDIT_TABLE}?select=payload&order=ts.desc&limit=${safeLimit}`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Lettura Scatola Nera fallita (HTTP ${res.status}).`);
  }
  const rows = (await res.json()) as Array<{ payload: unknown }>;
  const out: AdminActivityLogItem[] = [];
  for (const row of rows) {
    const clean = sanitizeAdminActivityLogItem(row?.payload);
    if (clean) out.push(clean);
  }
  return out;
}
