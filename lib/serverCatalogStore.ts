/**
 * Scelta Makeup — Centralized Cloud Catalog Persistence (Server-Only)
 * Module: lib/serverCatalogStore.ts
 *
 * Single source of truth for product overrides and variant giacenze, shared
 * across all devices (Mario's remote admin + Federica's point-of-sale laptop).
 *
 * Backend (isolato):
 *   - Dedicated Supabase project (`zsycaulbamdxqhcukrvn`) via REST API using
 *     `SUPABASE_SERVICE_ROLE_KEY`. Table: `scelta_catalog_overrides` (singleton
 *     JSONB document). Nessuna dipendenza da altri progetti o hub esterni.
 *
 * In-memory cache with 5s TTL keeps reads instant without redundant round-trips;
 * writes are serialized through a promise queue to avoid lost updates. La cache
 * viene aggiornata solo dopo una scrittura confermata.
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
  /** Scatola nera: timeline immutabile delle operazioni (max 1000 eventi). */
  auditLogs?: AdminActivityLogItem[];
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// Backend configuration
// ------------------------------------------------------------------------------

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const DEDICATED_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const OVERRIDES_TABLE = "scelta_catalog_overrides";
const SINGLETON_ID = "singleton";

const CACHE_TTL_MS = 5000;

let memoryCache: CentralCatalogState | null = null;
let cacheFetchedAt = 0;

// Serializes writes so concurrent requests never clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

// ------------------------------------------------------------------------------
// State helpers
// ------------------------------------------------------------------------------

function emptyState(): CentralCatalogState {
  return {
    version: 2,
    productOverrides: {},
    variantStocks: {},
    auditLogs: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeAuditLogs(raw: unknown): AdminActivityLogItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminActivityLogItem[] = [];
  for (const entry of raw) {
    const clean = sanitizeAdminActivityLogItem(entry);
    if (clean) out.push(clean);
  }
  // Ordine dal più recente al più vecchio, taglio alla capienza cloud.
  out.sort((a, b) => {
    const ta = Date.parse(a.timestamp);
    const tb = Date.parse(b.timestamp);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
  return out.slice(0, MAX_CLOUD_AUDIT_LOGS);
}

function normalizeState(raw: unknown): CentralCatalogState {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    version: typeof obj.version === "number" ? obj.version : 2,
    productOverrides: (obj.productOverrides && typeof obj.productOverrides === "object"
      ? obj.productOverrides
      : {}) as Record<string, Partial<Product>>,
    variantStocks: (obj.variantStocks && typeof obj.variantStocks === "object"
      ? obj.variantStocks
      : {}) as Record<string, SceltaVariantStock>,
    auditLogs: normalizeAuditLogs(obj.auditLogs),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

function computeStatus(quantity: number): SceltaVariantStock["stockStatus"] {
  if (quantity <= 0) return "out_of_stock";
  if (quantity < 5) return "low_stock";
  return "available";
}

function headersFor(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

// ------------------------------------------------------------------------------
// Primary backend: dedicated Supabase
// ------------------------------------------------------------------------------

async function readFromDedicated(): Promise<CentralCatalogState> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) {
    throw new Error(
      "Configurazione Supabase dedicata mancante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const url = `${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?id=eq.${SINGLETON_ID}&select=data`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: headersFor(DEDICATED_SERVICE_KEY),
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      `Lettura catalogo centralizzato fallita (rete): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!res.ok) {
    throw new Error(`Lettura catalogo centralizzato fallita (HTTP ${res.status}).`);
  }

  const rows = (await res.json()) as Array<{ data?: unknown }>;
  // 200 OK con array vuoto: il singleton non esiste ancora.
  if (!Array.isArray(rows) || rows.length === 0) {
    return emptyState();
  }
  return normalizeState(rows[0].data);
}

async function writeToDedicated(state: CentralCatalogState): Promise<boolean> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}`, {
      method: "POST",
      headers: {
        ...headersFor(DEDICATED_SERVICE_KEY),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: SINGLETON_ID,
        data: state,
        updated_at: state.updatedAt,
      }),
    });
    // Successo solo con 200/201/204: la cache viene aggiornata solo in questo caso.
    return res.status === 200 || res.status === 201 || res.status === 204;
  } catch {
    return false;
  }
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
// Public API
// ------------------------------------------------------------------------------

export async function getCentralCatalogState(): Promise<CentralCatalogState> {
  const now = Date.now();
  if (memoryCache && now - cacheFetchedAt < CACHE_TTL_MS) {
    return memoryCache;
  }

  let state: CentralCatalogState;
  try {
    state = await readFromDedicated();
  } catch (err) {
    // Fallback in memoria: se il DB dedicato è momentaneamente irraggiungibile
    // manteniamo l'ultimo snapshot valido invece di interrompere il servizio.
    if (memoryCache) {
      console.warn(
        "[serverCatalogStore] Lettura cloud fallita, uso la cache in memoria:",
        err instanceof Error ? err.message : err
      );
      return memoryCache;
    }
    throw err;
  }

  memoryCache = state;
  cacheFetchedAt = Date.now();
  return state;
}

async function persist(state: CentralCatalogState): Promise<void> {
  // La cache viene aggiornata SOLO dopo una scrittura confermata dal cloud.
  const ok = await writeToDedicated(state);
  if (!ok) {
    throw new Error("Scrittura del catalogo centralizzato non riuscita.");
  }
  memoryCache = state;
  cacheFetchedAt = Date.now();
}

export async function saveProductOverride(
  productId: string,
  updates: Partial<Product>,
  variantStocks?: Record<string, SceltaVariantStock>
): Promise<CentralCatalogState> {
  return enqueue(async () => {
    const current = await getCentralCatalogState();
    const existing = current.productOverrides[productId] || {};
    const merged: Partial<Product> = { ...existing, ...updates };

    const next: CentralCatalogState = {
      ...current,
      productOverrides: { ...current.productOverrides, [productId]: merged },
      variantStocks: { ...current.variantStocks, ...(variantStocks || {}) },
      updatedAt: new Date().toISOString(),
    };

    await persist(next);
    return next;
  });
}

export async function deleteProductOverride(productId: string): Promise<CentralCatalogState> {
  return enqueue(async () => {
    const current = await getCentralCatalogState();
    const nextOverrides = { ...current.productOverrides };
    delete nextOverrides[productId];

    const next: CentralCatalogState = {
      ...current,
      productOverrides: nextOverrides,
      updatedAt: new Date().toISOString(),
    };

    await persist(next);
    return next;
  });
}

export async function saveVariantStock(input: {
  variantId: string;
  delta?: number;
  newQuantity?: number;
  variantStock?: SceltaVariantStock;
}): Promise<CentralCatalogState> {
  return enqueue(async () => {
    const current = await getCentralCatalogState();

    let record: SceltaVariantStock | undefined =
      input.variantStock ?? current.variantStocks[input.variantId];

    if (!record) {
      record = resolveVariantStockFromCatalog(input.variantId);
    }

    if (!record) {
      record = {
        variantId: input.variantId,
        productId: "unknown",
        sku: input.variantId,
        name: "Variante",
        stockQuantity: Math.max(0, Math.floor(input.newQuantity ?? 0)),
        stockStatus: computeStatus(input.newQuantity ?? 0),
        price: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    const quantity =
      input.newQuantity !== undefined
        ? input.newQuantity
        : (record.stockQuantity ?? 0) + (input.delta ?? 0);
    const safeQuantity = Math.max(0, Math.floor(quantity));

    const updated: SceltaVariantStock = {
      ...record,
      stockQuantity: safeQuantity,
      stockStatus: computeStatus(safeQuantity),
      updatedAt: new Date().toISOString(),
    };

    const next: CentralCatalogState = {
      ...current,
      variantStocks: { ...current.variantStocks, [input.variantId]: updated },
      updatedAt: new Date().toISOString(),
    };

    await persist(next);
    return next;
  });
}

// ------------------------------------------------------------------------------
// Scatola Nera — Audit Trail (Registro Attività Operatore)
// ------------------------------------------------------------------------------

/**
 * Appende uno o più eventi alla timeline cloud della scatola nera.
 * Deduplica per id (idempotente rispetto ai retry del client), ordina dal più
 * recente e conserva al massimo `MAX_CLOUD_AUDIT_LOGS` eventi nel singleton.
 */
export async function appendAuditLogs(
  incoming: AdminActivityLogItem[]
): Promise<CentralCatalogState> {
  return enqueue(async () => {
    const current = await getCentralCatalogState();

    const byId = new Map<string, AdminActivityLogItem>();
    for (const item of current.auditLogs || []) byId.set(item.id, item);
    for (const entry of incoming) {
      const clean = sanitizeAdminActivityLogItem(entry);
      if (clean) byId.set(clean.id, clean);
    }

    const next: CentralCatalogState = {
      ...current,
      auditLogs: normalizeAuditLogs(Array.from(byId.values())),
      updatedAt: new Date().toISOString(),
    };

    await persist(next);
    return next;
  });
}
