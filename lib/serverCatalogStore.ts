/**
 * Scelta Makeup — Centralized Cloud Catalog Persistence (Server-Only)
 * Module: lib/serverCatalogStore.ts
 *
 * Single source of truth for product overrides and variant giacenze, shared
 * across all devices (Mario's remote admin + Federica's point-of-sale laptop).
 *
 * Primary backend:
 *   - Dedicated Supabase project (`zsycaulbamdxqhcukrvn`) via REST API using
 *     `SUPABASE_SERVICE_ROLE_KEY`. Table: `scelta_catalog_overrides` (singleton
 *     JSONB document).
 *
 * Resilient fallback:
 *   - Creativia Hub (`https://ekfnekrjpumjpetzgwzy.supabase.co`), storing the
 *     same document inside `clients.preferences.catalog_overrides` for the
 *     `scelta_makeup` client (`14fa9b24-8991-4150-a1fe-d60adbabd469`).
 *
 * In-memory cache with 5s TTL keeps reads instant without redundant round-trips;
 * writes are serialized through a promise queue to avoid lost updates.
 */

import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";
import type { SceltaVariantStock } from "@/lib/adminStore";

export interface CentralCatalogState {
  version: number;
  productOverrides: Record<string, Partial<Product>>;
  variantStocks: Record<string, SceltaVariantStock>;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// Backend configuration
// ------------------------------------------------------------------------------

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const DEDICATED_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const CREATIVIA_HUB_URL =
  process.env.CREATIVIA_HUB_SUPABASE_URL || "https://ekfnekrjpumjpetzgwzy.supabase.co";
const CREATIVIA_HUB_SERVICE_KEY =
  process.env.CREATIVIA_HUB_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZm5la3JqcHVtanBldHpnd3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgyNjAxNiwiZXhwIjoyMDk5NDAyMDE2fQ.Ne-jtSPB8NP-79_pV1KsGubYbCDtQVhQAXRtC-PzT-8";
const SCELTA_MAKEUP_CLIENT_ID =
  process.env.SCELTA_MAKEUP_CLIENT_ID || "14fa9b24-8991-4150-a1fe-d60adbabd469";

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
    updatedAt: new Date().toISOString(),
  };
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

async function readFromDedicated(): Promise<CentralCatalogState | null> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return null;
  try {
    const url = `${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?id=eq.${SINGLETON_ID}&select=data`;
    const res = await fetch(url, {
      headers: headersFor(DEDICATED_SERVICE_KEY),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ data?: unknown }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return normalizeState(rows[0].data);
  } catch {
    return null;
  }
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
    return res.ok;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------
// Fallback backend: Creativia Hub clients.preferences.catalog_overrides
// ------------------------------------------------------------------------------

async function readFromCreativia(): Promise<CentralCatalogState | null> {
  if (!CREATIVIA_HUB_SERVICE_KEY) return null;
  try {
    const url = `${CREATIVIA_HUB_URL}/rest/v1/clients?id=eq.${SCELTA_MAKEUP_CLIENT_ID}&select=preferences`;
    const res = await fetch(url, {
      headers: headersFor(CREATIVIA_HUB_SERVICE_KEY),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ preferences?: unknown }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const preferences = rows[0].preferences;
    if (!preferences || typeof preferences !== "object") return null;
    const overrides = (preferences as Record<string, unknown>).catalog_overrides;
    if (!overrides || typeof overrides !== "object") return null;
    return normalizeState(overrides);
  } catch {
    return null;
  }
}

async function writeToCreativia(state: CentralCatalogState): Promise<boolean> {
  if (!CREATIVIA_HUB_SERVICE_KEY) return false;
  try {
    // Preserve any sibling preference keys while updating only catalog_overrides.
    let existingPreferences: Record<string, unknown> = {};
    try {
      const readUrl = `${CREATIVIA_HUB_URL}/rest/v1/clients?id=eq.${SCELTA_MAKEUP_CLIENT_ID}&select=preferences`;
      const readRes = await fetch(readUrl, {
        headers: headersFor(CREATIVIA_HUB_SERVICE_KEY),
        cache: "no-store",
      });
      if (readRes.ok) {
        const rows = (await readRes.json()) as Array<{ preferences?: unknown }>;
        if (
          Array.isArray(rows) &&
          rows.length > 0 &&
          rows[0].preferences &&
          typeof rows[0].preferences === "object"
        ) {
          existingPreferences = rows[0].preferences as Record<string, unknown>;
        }
      }
    } catch {
      // Continue with an empty base if the read fails.
    }

    const patchRes = await fetch(
      `${CREATIVIA_HUB_URL}/rest/v1/clients?id=eq.${SCELTA_MAKEUP_CLIENT_ID}`,
      {
        method: "PATCH",
        headers: {
          ...headersFor(CREATIVIA_HUB_SERVICE_KEY),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          preferences: { ...existingPreferences, catalog_overrides: state },
        }),
      }
    );
    return patchRes.ok;
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

  let state = await readFromDedicated();
  if (!state) state = await readFromCreativia();
  if (!state) state = memoryCache ?? emptyState();

  memoryCache = state;
  cacheFetchedAt = Date.now();
  return state;
}

async function persist(state: CentralCatalogState): Promise<void> {
  // Update in-memory cache immediately for instant local consistency.
  memoryCache = state;
  cacheFetchedAt = Date.now();

  const ok = await writeToDedicated(state);
  if (!ok) {
    await writeToCreativia(state);
  }
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
