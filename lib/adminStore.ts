/**
 * Scelta Makeup — Isolated Local Storage Engine
 * Module: lib/adminStore.ts
 *
 * Provides offline-first mock storage management for:
 * 1. Product & Variant Stock levels (341 products, 659 variants initialized from data/catalog.json)
 *    Status badges: 'available', 'low_stock' (< 5), 'out_of_stock' (0)
 * 2. E-Commerce Orders (courier & store pickup, multi-status state machine)
 * 3. Omnichannel CRM Customers (combining e-commerce order spend and salon appointments)
 * 4. 1-Click Factory Reset to restore original demo seed state
 * 5. Atomic persistence in localStorage (scelta_makeup_admin_store_v1) with SSR fallback
 *
 * STRICT ISOLATION MANDATE:
 * Zero network calls to external databases, zero shared state with any external project.
 */

import { useEffect } from "react";
import rawCatalog from "@/data/catalog.json";
import { Product, ProductVariant } from "@/types/product";

export const STORAGE_ADMIN_STORE_KEY = "scelta_makeup_admin_store_v7";

// ------------------------------------------------------------------------------
// Null-Safety Sanitizers (Data Self-Healing)
// ------------------------------------------------------------------------------
// A persisted sparse array ([v0, , , ..., v6]) becomes [v0, null, null, ..., v6]
// after JSON.stringify, and JSON.parse gives back dense arrays containing null.
// Rendering then crashes on `v.id`, `v.colorHex`, `v.name.toLowerCase()`, etc.
// These helpers strip every invalid entry at the storage boundary so corrupted
// legacy/cloud data can never reach the render tree.

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Removes null/undefined/hole entries and rows without a valid id from a
 * variants array. Returns `undefined` when the input is not an array.
 */
export function sanitizeVariantsArray(input: unknown): ProductVariant[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return input.filter(
    (v): v is ProductVariant =>
      Boolean(v && typeof v === "object" && isNonEmptyString((v as ProductVariant).id))
  );
}

/**
 * Returns a cleaned copy of a product override, deleting malformed `variants`,
 * `shades` or `images` fields instead of letting them poison the catalog.
 */
export function sanitizeProductOverride(override: unknown): Partial<Product> | undefined {
  if (!override || typeof override !== "object") return undefined;
  const source = override as Partial<Product>;
  const clean: Partial<Product> = { ...source };

  if ("variants" in source) {
    const variants = sanitizeVariantsArray(source.variants);
    if (variants === undefined) delete clean.variants;
    else clean.variants = variants;
  }

  if ("shades" in source) {
    if (Array.isArray(source.shades)) {
      clean.shades = source.shades.filter((s) => Boolean(s && typeof s === "object"));
    } else {
      delete clean.shades;
    }
  }

  if ("images" in source) {
    if (Array.isArray(source.images)) {
      clean.images = source.images.filter((img) => isNonEmptyString(img));
    } else {
      delete clean.images;
    }
  }

  return clean;
}

/** Sanitizes an entire overrides dictionary, dropping entries that became empty. */
export function sanitizeProductOverrides(
  overrides: unknown
): Record<string, Partial<Product>> {
  const result: Record<string, Partial<Product>> = {};
  if (!overrides || typeof overrides !== "object") return result;
  for (const [productId, override] of Object.entries(overrides as Record<string, unknown>)) {
    const safe = sanitizeProductOverride(override);
    if (safe) result[productId] = safe;
  }
  return result;
}

// Centralized cloud catalog endpoints (real-time multi-device sync)
const CATALOG_OVERRIDES_API = "/api/catalog/overrides";
const CATALOG_STOCK_API = "/api/catalog/stock";
const ORDERS_API = "/api/admin/orders";

// ------------------------------------------------------------------------------
// Interface Contracts (PROJECT.md)
// ------------------------------------------------------------------------------

export interface SceltaVariantStock {
  variantId: string;
  productId: string;
  sku: string;
  ean?: string;
  name: string;
  colorHex?: string;
  stockQuantity: number;
  stockStatus: "available" | "low_stock" | "out_of_stock";
  price: number;
  originalWholesalePrice?: number;
  // Helpful metadata for admin tables and previews
  productName?: string;
  brand?: string;
  category?: string;
  image?: string;
  updatedAt?: string;
}

export interface SceltaAdminOrder {
  id: string; // e.g. "SC-ORD-2026-0001" or "SC-POS-2026-0001"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: "processing" | "shipped" | "ready_for_pickup" | "completed" | "cancelled";
  fulfillmentType: "courier" | "store_pickup" | "pos_receipt";
  paymentMethod?: "cash" | "card" | "stripe" | "mypos";
  change?: number;
  receiptNumber?: string;
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    province: string;
  };
  trackingCode?: string;
  courierName?: string;
  items: Array<{
    productId: string;
    productTitle: string;
    variantName?: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SceltaCrmCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpend: number;
  ordersCount: number;
  appointmentsCount: number;
  lastActive: string;
  notes: string;
  skinType?: string;
  preferredBrands?: string[];
}

export interface SceltaAdminStoreState {
  version: number;
  variantStocks: Record<string, SceltaVariantStock>;
  productOverrides: Record<string, Partial<Product>>;
  orders: SceltaAdminOrder[];
  customers: SceltaCrmCustomer[];
  lastResetAt: string;
}

/** Product override enriched with an internal write timestamp (never rendered). */
type TimestampedProductOverride = Partial<Product> & { _updatedAt?: string };

// ------------------------------------------------------------------------------
// Anti-Clobber Engine (Race Condition Guard)
// ------------------------------------------------------------------------------
// Federica's point-of-sale laptop keeps the local store as the source of truth
// and reconciles with the cloud every 5s. A background GET that resolves while a
// POST is still in flight used to return the OLD cloud snapshot and overwrite the
// change she had just typed. This in-memory registry records the moment each
// product was written locally so the reconciler can preserve any very recent
// local change until the cloud snapshot catches up.
const RECENT_LOCAL_MODIFICATION_WINDOW_MS = 45_000;

/** productId -> epoch ms of the latest local write on this device. */
const localProductModifications: Record<string, number> = {};

/** Marks a product as locally modified *right now* (extends the anti-clobber window). */
function markProductLocallyModified(productId: string, at: number = Date.now()): void {
  if (!productId) return;
  localProductModifications[productId] = at;
}

/** True when the product was written locally within the anti-clobber window. */
function isRecentlyModifiedLocally(
  productId: string | undefined,
  now: number = Date.now()
): boolean {
  if (!productId) return false;
  const writtenAt = localProductModifications[productId];
  return typeof writtenAt === "number" && now - writtenAt < RECENT_LOCAL_MODIFICATION_WINDOW_MS;
}

/** Parses an ISO timestamp into epoch ms; returns null when absent/unparseable. */
function parseUpdatedAt(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads the internal `_updatedAt` timestamp carried inside a product override. */
function getOverrideUpdatedAt(override: Partial<Product> | undefined): number | null {
  return parseUpdatedAt((override as TimestampedProductOverride | undefined)?._updatedAt);
}

/**
 * Returns true when the cloud snapshot must NOT overwrite the local value.
 *
 * Product overrides and variant stocks are both protected: a local write that is
 * either newer than the cloud record, or happened within the last 45 seconds
 * while the cloud is not strictly newer, always wins.
 */
function shouldPreserveLocal(params: {
  productId?: string;
  localUpdatedAt: number | null;
  cloudUpdatedAt: number | null;
  now: number;
}): boolean {
  const { productId, localUpdatedAt, cloudUpdatedAt, now } = params;
  const cloudIsStrictlyNewer =
    cloudUpdatedAt !== null && localUpdatedAt !== null && cloudUpdatedAt > localUpdatedAt;

  if (isRecentlyModifiedLocally(productId, now) && !cloudIsStrictlyNewer) {
    return true;
  }
  return localUpdatedAt !== null && cloudUpdatedAt !== null && localUpdatedAt > cloudUpdatedAt;
}

// ------------------------------------------------------------------------------
// Stock Status Calculation
// ------------------------------------------------------------------------------

export function computeStockStatus(quantity: number): "available" | "low_stock" | "out_of_stock" {
  if (quantity <= 0) {
    return "out_of_stock";
  }
  if (quantity < 5) {
    return "low_stock";
  }
  return "available";
}

// ------------------------------------------------------------------------------
// Initial Seed Data Generators
// ------------------------------------------------------------------------------

/**
 * Initializes stock levels for all 341 catalog products and 659 variants.
 * Uses the exact stock quantities verified from official supplier invoices (DDP & Cipria).
 */
export function generateInitialVariantStocks(): Record<string, SceltaVariantStock> {
  const stockMap: Record<string, SceltaVariantStock> = {};
  const products = rawCatalog as Product[];
  const now = new Date().toISOString();

  for (const product of products) {
    if (!product.variants || !Array.isArray(product.variants)) continue;

    for (const variant of product.variants) {
      if (!variant || typeof variant !== "object" || !isNonEmptyString(variant.id)) continue;
      const quantity = typeof variant.stock === "number" ? variant.stock : 0;
      const status = computeStockStatus(quantity);
      const effectivePrice = variant.price !== undefined ? variant.price : product.price;
      const wholesalePrice = variant.originalWholesalePrice !== undefined
        ? variant.originalWholesalePrice
        : product.originalWholesalePrice;

      stockMap[variant.id] = {
        variantId: variant.id,
        productId: product.id,
        sku: variant.sku,
        ean: variant.ean || "",
        name: variant.name,
        colorHex: variant.colorHex || undefined,
        stockQuantity: quantity,
        stockStatus: status,
        price: effectivePrice,
        originalWholesalePrice: wholesalePrice,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        image: variant.image || (product.images && product.images[0]) || "",
        updatedAt: now,
      };
    }
  }

  return stockMap;
}

/**
 * Initial multi-status demo orders covering courier & store pickup across all statuses:
 * processing, shipped, ready_for_pickup, completed, cancelled.
 */
export function generateInitialOrders(): SceltaAdminOrder[] {
  // Clean production state: zero fake orders
  return [];
}

/**
 * Initial omnichannel CRM customer profiles.
 * Clean production state: zero fake demo customers.
 */
export function generateInitialCustomers(): SceltaCrmCustomer[] {
  // Clean production state: zero fake demo customers
  return [];
}

/**
 * Creates the initial default state object.
 */
export function getDefaultAdminStoreState(): SceltaAdminStoreState {
  return {
    version: 3,
    variantStocks: generateInitialVariantStocks(),
    productOverrides: {},
    orders: generateInitialOrders(),
    customers: generateInitialCustomers(),
    lastResetAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// In-Memory Storage Cache for SSR & Safe Fallback
// ------------------------------------------------------------------------------

let memoryAdminStore: SceltaAdminStoreState | null = null;

function getMemoryStore(): SceltaAdminStoreState {
  if (!memoryAdminStore) {
    memoryAdminStore = getDefaultAdminStoreState();
  }
  return memoryAdminStore;
}

// ------------------------------------------------------------------------------
// Atomic Storage Load / Save Engine
// ------------------------------------------------------------------------------

export function getAdminStoreState(): SceltaAdminStoreState {
  if (typeof window === "undefined") {
    return getMemoryStore();
  }

  try {
    // Purge old versions of storage if present
    localStorage.removeItem("scelta_makeup_admin_store_v1");
    localStorage.removeItem("scelta_makeup_admin_store_v2");
    localStorage.removeItem("scelta_makeup_admin_store_v3");
    localStorage.removeItem("scelta_makeup_admin_store_v4");
    localStorage.removeItem("scelta_makeup_admin_store_v5");
    localStorage.removeItem("scelta_makeup_admin_store_v6");

    const raw = localStorage.getItem(STORAGE_ADMIN_STORE_KEY);
    if (!raw) {
      const defaultState = getDefaultAdminStoreState();
      saveAdminStoreState(defaultState);
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.variantStocks || (parsed.version || 0) < 3) {
      const defaultState = getDefaultAdminStoreState();
      saveAdminStoreState(defaultState);
      return defaultState;
    }

    if (!parsed.productOverrides || typeof parsed.productOverrides !== "object") {
      parsed.productOverrides = {};
    } else {
      // Self-heal any corrupted override persisted by an older/cloud bug.
      parsed.productOverrides = sanitizeProductOverrides(parsed.productOverrides);
    }

    // Drop malformed variant stock rows before the reconciliation loop runs.
    if (parsed.variantStocks && typeof parsed.variantStocks === "object") {
      for (const [key, value] of Object.entries(parsed.variantStocks as Record<string, unknown>)) {
        if (!value || typeof value !== "object" || !isNonEmptyString((value as SceltaVariantStock).variantId)) {
          delete (parsed.variantStocks as Record<string, unknown>)[key];
        }
      }
    }

    // Auto-heal variant stock images, EANs, prices, and sync any new variants from catalog
    if (parsed.variantStocks && typeof parsed.variantStocks === "object") {
      const products = rawCatalog as Product[];
      const overrides = (parsed.productOverrides || {}) as Record<string, Partial<Product>>;

      // 1. Sync existing variant stocks (image, EAN, SKU, price, names)
      for (const vStock of Object.values(parsed.variantStocks as Record<string, SceltaVariantStock>)) {
        if (!vStock || !vStock.productId) continue;
        let prod = products.find(p => p.id === vStock.productId);
        // Migrazione: la variante è stata spostata su una nuova scheda autonoma
        // (es. split di una scheda raggruppata in più prodotti). Ricollega la
        // giacenza al prodotto che ora possiede quella variante.
        if (!prod) {
          prod = products.find(p => (p.variants || []).some(v => v.id === vStock.variantId));
          if (prod) vStock.productId = prod.id;
        }
        if (prod) {
          const freshVariant = prod.variants?.find(v => v.id === vStock.variantId);
          if (freshVariant) {
            // Sync EAN and SKU from catalog if not overridden
            if (freshVariant.ean && vStock.ean !== freshVariant.ean && !overrides[prod.id]?.variants) {
              vStock.ean = freshVariant.ean;
            }
            if (freshVariant.sku && vStock.sku !== freshVariant.sku && !overrides[prod.id]?.variants) {
              vStock.sku = freshVariant.sku;
            }
            // Sync price and names from catalog if not overridden
            if (freshVariant.price !== undefined && !overrides[prod.id]?.variants && !overrides[prod.id]?.price) {
              vStock.price = freshVariant.price;
            }
            if (freshVariant.name && !overrides[prod.id]?.variants) {
              vStock.name = freshVariant.name;
            }
            if (prod.name && !overrides[prod.id]?.name) {
              vStock.productName = prod.name;
            }
            if (prod.brand && !overrides[prod.id]?.brand) {
              vStock.brand = prod.brand;
            }
            if (prod.category && !overrides[prod.id]?.category) {
              vStock.category = prod.category;
            }
            // Sync image if not custom overridden
            if (!overrides[vStock.productId]?.images || (overrides[vStock.productId]?.images?.length ?? 0) === 0) {
              const freshImg = freshVariant.image || (prod.images && prod.images[0]);
              if (freshImg && vStock.image !== freshImg) {
                vStock.image = freshImg;
              }
            }
          }
        }
      }

      // 2. Add any newly defined variants from catalog & overrides that are missing in local storage cache
      const allProductSources = [...products];
      const baseIds = new Set(products.map(p => p.id));
      for (const [ovId, ovProd] of Object.entries(overrides)) {
        if (!baseIds.has(ovId) && ovProd && ovProd.variants) {
          allProductSources.push(ovProd as Product);
        }
      }

      for (const prod of allProductSources) {
        if (!prod.variants) continue;
        for (const v of prod.variants) {
          if (!parsed.variantStocks[v.id]) {
            parsed.variantStocks[v.id] = {
              variantId: v.id,
              productId: prod.id,
              sku: v.sku,
              ean: v.ean || "",
              name: v.name,
              colorHex: v.colorHex || undefined,
              stockQuantity: typeof v.stock === "number" ? v.stock : 0,
              stockStatus: computeStockStatus(typeof v.stock === "number" ? v.stock : 0),
              price: v.price !== undefined ? v.price : prod.price,
              originalWholesalePrice: v.originalWholesalePrice !== undefined ? v.originalWholesalePrice : prod.originalWholesalePrice,
              productName: prod.name,
              brand: prod.brand,
              category: prod.category,
              image: v.image || (prod.images && prod.images[0]) || "",
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }

      // Auto-normalize legacy in-store orders created as store_pickup to pos_receipt
      if (Array.isArray(parsed.orders)) {
        let orderMigrated = false;
        for (const ord of parsed.orders) {
          if (
            ord.fulfillmentType !== "pos_receipt" &&
            (ord.customerEmail === "banco@sceltamakeup.it" ||
              ord.customerName === "Cliente al Banco" ||
              ord.customerPhone?.includes("Boutique") ||
              ord.customerPhone?.includes("Salone"))
          ) {
            ord.fulfillmentType = "pos_receipt";
            if (!ord.paymentMethod) ord.paymentMethod = "cash";
            orderMigrated = true;
          }
        }
        if (orderMigrated && typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_ADMIN_STORE_KEY, JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }
      }
    }

    memoryAdminStore = parsed as SceltaAdminStoreState;
    return parsed as SceltaAdminStoreState;
  } catch (error) {
    console.error("[SceltaAdminStore] Error reading localStorage, falling back to memory store:", error);
    return getMemoryStore();
  }
}

export function saveAdminStoreState(state: SceltaAdminStoreState): boolean {
  memoryAdminStore = state;

  if (typeof window === "undefined") {
    return true;
  }

  try {
    localStorage.setItem(STORAGE_ADMIN_STORE_KEY, JSON.stringify(state));
    // Emit notification event for any listening reactive React components
    window.dispatchEvent(new CustomEvent("scelta_admin_store_updated", { detail: { timestamp: Date.now() } }));
    return true;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    console.error("[SceltaAdminStore] Error writing to localStorage:", err?.name, err?.message);
    return false;
  }
}

// ------------------------------------------------------------------------------
// Cloud Synchronization Engine (Real-Time Multi-Device Centralized Catalog)
// ------------------------------------------------------------------------------

/**
 * Fire-and-forget POST to a Next.js API route. Never throws and never blocks the
 * caller: the optimistic local update always wins, and network failures are
 * silently ignored so the point-of-sale keeps working even when offline.
 */
function postCatalogUpdate(path: string, body: unknown): void {
  if (typeof window === "undefined") return;
  try {
    fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      /* Offline: local optimistic state remains the source of truth */
    });
  } catch {
    /* Ignore network/hardware errors during background sync */
  }
}

/**
 * Fetches the centralized catalog overrides from the cloud and reconciles them
 * into the local admin store (productOverrides + variantStocks). Local cache is
 * always authoritative for instant 0ms rendering; this runs in the background.
 * Returns true when a successful reconciliation occurred.
 */
export async function syncAdminStoreFromCloud(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const res = await fetch(CATALOG_OVERRIDES_API, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // Explicitly bypass any browser/HTTP cache so reconciliation always sees
      // the true cloud state (paired with the no-store headers on the route).
      cache: "no-store",
    });
    if (!res.ok) return false;

    const payload = (await res.json()) as {
      success?: boolean;
      productOverrides?: Record<string, Partial<Product>>;
      variantStocks?: Record<string, SceltaVariantStock>;
    };
    if (!payload || !payload.success) return false;

    const state = getAdminStoreState();
    let changed = false;
    const now = Date.now();

    if (payload.productOverrides && typeof payload.productOverrides === "object") {
      // Sanitize cloud payloads before merging: a poisoned row (null variants)
      // must never reach the local catalog and crash the products table.
      const cloudOverrides = sanitizeProductOverrides(payload.productOverrides);
      const localOverrides = state.productOverrides || {};
      const mergedOverrides: Record<string, Partial<Product>> = { ...localOverrides };

      for (const [productId, cloudOverride] of Object.entries(cloudOverrides)) {
        const localOverride = localOverrides[productId];
        const preserveLocal = shouldPreserveLocal({
          productId,
          localUpdatedAt: getOverrideUpdatedAt(localOverride),
          cloudUpdatedAt: getOverrideUpdatedAt(cloudOverride),
          now,
        });

        if (localOverride && preserveLocal) {
          // A stale GET resolved while Federica's POST was still in flight:
          // keep her freshly typed override instead of reverting it.
          continue;
        }
        mergedOverrides[productId] = cloudOverride;
      }

      if (JSON.stringify(mergedOverrides) !== JSON.stringify(state.productOverrides || {})) {
        state.productOverrides = mergedOverrides;
        changed = true;
      }
    }

    if (payload.variantStocks && typeof payload.variantStocks === "object") {
      const localStocks = state.variantStocks || {};
      const mergedStocks: Record<string, SceltaVariantStock> = { ...localStocks };

      for (const [variantId, cloudStock] of Object.entries(
        payload.variantStocks as Record<string, SceltaVariantStock>
      )) {
        if (!cloudStock || typeof cloudStock !== "object") continue;
        const localStock = localStocks[variantId];

        if (!localStock) {
          mergedStocks[variantId] = cloudStock;
          continue;
        }

        const productId = localStock.productId || cloudStock.productId;
        const preserveLocal = shouldPreserveLocal({
          productId,
          localUpdatedAt: parseUpdatedAt(localStock.updatedAt),
          cloudUpdatedAt: parseUpdatedAt(cloudStock.updatedAt),
          now,
        });

        if (preserveLocal) {
          // Never blind-overwrite giacenze with an obsolete cloud snapshot.
          continue;
        }
        mergedStocks[variantId] = cloudStock;
      }

      if (JSON.stringify(mergedStocks) !== JSON.stringify(state.variantStocks || {})) {
        state.variantStocks = mergedStocks;
        changed = true;
      }
    }

    // Reconcile centralized cloud orders & POS receipts
    try {
      const ordersRes = await fetch(ORDERS_API, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (ordersRes.ok) {
        const ordersPayload = (await ordersRes.json()) as {
          success?: boolean;
          orders?: SceltaAdminOrder[];
        };
        if (ordersPayload?.success && Array.isArray(ordersPayload.orders)) {
          const cloudOrders = ordersPayload.orders;
          const map = new Map<string, SceltaAdminOrder>();
          // Cloud orders are the primary source of truth
          for (const co of cloudOrders) {
            map.set(co.id, co);
          }
          // Preserve any locally created orders not yet on cloud and push them up
          for (const lo of state.orders) {
            if (
              lo.fulfillmentType !== "pos_receipt" &&
              (lo.customerEmail === "banco@sceltamakeup.it" ||
                lo.customerName === "Cliente al Banco" ||
                lo.customerPhone?.includes("Boutique") ||
                lo.customerPhone?.includes("Salone"))
            ) {
              lo.fulfillmentType = "pos_receipt";
              if (!lo.paymentMethod) lo.paymentMethod = "cash";
            }
            if (!map.has(lo.id)) {
              map.set(lo.id, lo);
              postCatalogUpdate(ORDERS_API, { order: lo });
            }
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          if (JSON.stringify(merged) !== JSON.stringify(state.orders)) {
            state.orders = merged;
            changed = true;
          }
        }
      }
    } catch {
      // Offline fallback
    }

    if (changed) {
      saveAdminStoreState(state);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * React hook: synchronizes the local admin store with the centralized cloud
 * catalog on mount, then keeps it fresh via a light polling interval and on tab
 * focus. Reconciliation is idempotent, so it is safe to call from multiple
 * components.
 */
export function useAdminCatalogSync(intervalMs = 5000): void {
  useEffect(() => {
    const runSync = () => {
      void syncAdminStoreFromCloud();
    };

    runSync();

    const interval = setInterval(runSync, intervalMs);
    const onFocus = () => runSync();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
}

// ------------------------------------------------------------------------------
// Stock Management API
// ------------------------------------------------------------------------------

/**
 * Returns all variant stocks as a dictionary mapped by variantId.
 */
export function getAdminVariantStocks(): Record<string, SceltaVariantStock> {
  return getAdminStoreState().variantStocks;
}

/**
 * Returns an array of all variant stocks (659 items from the 341 catalog products).
 */
export function getAllStock(): SceltaVariantStock[] {
  const stocks = getAdminVariantStocks();
  return Object.values(stocks);
}

/**
 * Alias for getAllStock() to support alternative caller naming.
 */
export function getAdminVariantStockList(): SceltaVariantStock[] {
  return getAllStock();
}

/**
 * Retrieves a single variant stock entry by variantId.
 */
export function getVariantStockById(variantId: string): SceltaVariantStock | undefined {
  const stocks = getAdminVariantStocks();
  return stocks[variantId];
}

/**
 * Updates the stock quantity of a variant and recalculates its status badge:
 * 'available' (>= 5), 'low_stock' (< 5), 'out_of_stock' (0).
 */
export function updateVariantStockCount(variantId: string, quantity: number): SceltaVariantStock {
  const state = getAdminStoreState();
  const existing = state.variantStocks[variantId];

  const safeQuantity = Math.max(0, Math.floor(quantity));
  const newStatus = computeStockStatus(safeQuantity);
  const now = new Date().toISOString();

  let updated: SceltaVariantStock;

  if (existing) {
    updated = {
      ...existing,
      stockQuantity: safeQuantity,
      stockStatus: newStatus,
      updatedAt: now,
    };
  } else {
    // Fallback if variant was not in initial map
    updated = {
      variantId,
      productId: "unknown",
      sku: variantId,
      name: "Variante",
      stockQuantity: safeQuantity,
      stockStatus: newStatus,
      price: 0,
      updatedAt: now,
    };
  }

  state.variantStocks[variantId] = updated;
  saveAdminStoreState(state);

  // Real-time cloud sync of the giacenza scarico/carico (e.g. vendita al banco).
  postCatalogUpdate(CATALOG_STOCK_API, {
    variantId,
    delta: safeQuantity - (existing?.stockQuantity ?? 0),
    newQuantity: safeQuantity,
    variantStock: updated,
  });

  return updated;
}

/**
 * Alias for updateVariantStockCount.
 */
export function updateVariantStock(variantId: string, quantity: number): SceltaVariantStock {
  return updateVariantStockCount(variantId, quantity);
}

/**
 * Updates the price for a specific variant.
 */
export function updateVariantPrice(variantId: string, price: number): SceltaVariantStock {
  const state = getAdminStoreState();
  const existing = state.variantStocks[variantId];

  const safePrice = Math.max(0, Math.round(price * 100) / 100);
  const now = new Date().toISOString();

  let updated: SceltaVariantStock;

  if (existing) {
    updated = {
      ...existing,
      price: safePrice,
      updatedAt: now,
    };
  } else {
    updated = {
      variantId,
      productId: "unknown",
      sku: variantId,
      name: "Variante",
      stockQuantity: 10,
      stockStatus: "available",
      price: safePrice,
      updatedAt: now,
    };
  }

  state.variantStocks[variantId] = updated;
  saveAdminStoreState(state);

  // Sync variant price to the centralized cloud giacenze record.
  postCatalogUpdate(CATALOG_STOCK_API, {
    variantId,
    variantStock: updated,
  });

  return updated;
}

// ------------------------------------------------------------------------------
// Product Overrides Management API (R2)
// ------------------------------------------------------------------------------

/**
 * Returns all custom product overrides stored in local state.
 */
export function getProductOverrides(): Record<string, Partial<Product>> {
  const state = getAdminStoreState();
  return state.productOverrides || {};
}

/**
 * Retrieves custom product overrides by product ID or slug.
 */
export function getProductOverride(idOrSlug: string): Partial<Product> | undefined {
  if (!idOrSlug) return undefined;
  const state = getAdminStoreState();
  const overrides = state.productOverrides || {};

  // Direct match by productId
  if (overrides[idOrSlug]) {
    return overrides[idOrSlug];
  }

  // Search by slug or id property inside overrides
  for (const [key, ov] of Object.entries(overrides)) {
    if (key === idOrSlug || ov.slug === idOrSlug || ov.id === idOrSlug) {
      return ov;
    }
  }

  // Also check if idOrSlug matches a product in catalog
  const catalogProduct = (rawCatalog as Product[]).find(
    (p) => p.id === idOrSlug || p.slug === idOrSlug
  );
  if (catalogProduct && overrides[catalogProduct.id]) {
    return overrides[catalogProduct.id];
  }

  return undefined;
}

/**
 * Atomically updates product details (texts, photos, variants) and updates
 * synchronized variantStocks in the admin store. Emits scelta_admin_store_updated.
 *
 * @param options.skipCloudSync When true, skips the fire-and-forget background
 *   POST. Used by `saveProductDetailsToCloud`, which performs its own awaited POST
 *   so the caller gets a definitive success/failure result.
 */
export function updateProductDetails(
  productId: string,
  updates: Partial<Product>,
  options?: { skipCloudSync?: boolean }
): Partial<Product> & { error?: string } {
  const state = getAdminStoreState();
  if (!state.productOverrides) {
    state.productOverrides = {};
  }

  // Defense-in-depth: never persist a sparse/null variants array. An out-of-bounds
  // write ([v0, , , v3]) is serialized by JSON.stringify as nulls and later crashes
  // the admin render tree with "Cannot read properties of null (reading 'id')".
  const normalizedUpdates: Partial<Product> = { ...updates };
  let safeVariants: ProductVariant[] | undefined;
  if ("variants" in normalizedUpdates) {
    const cleaned = sanitizeVariantsArray(updates.variants);
    if (cleaned) {
      safeVariants = cleaned;
      normalizedUpdates.variants = cleaned;
    } else {
      delete normalizedUpdates.variants;
    }
  }

  const existing = state.productOverrides[productId] || {};
  const writeTimestamp = new Date().toISOString();
  const merged: TimestampedProductOverride = {
    ...existing,
    ...normalizedUpdates,
    // Per-product write timestamp used by the anti-clobber reconciler so a stale
    // cloud snapshot can never revert this change.
    _updatedAt: writeTimestamp,
  };

  state.productOverrides[productId] = merged;
  markProductLocallyModified(productId);

  // Synchronize variant stocks if relevant product metadata or variants were updated
  const now = writeTimestamp;
  const rawProduct = (rawCatalog as Product[]).find((p) => p.id === productId);

  // If variants array is explicitly passed in updates, update/add corresponding variantStocks
  if (safeVariants) {
    for (const v of safeVariants) {
      const existingStock = state.variantStocks[v.id];
      const quantity = typeof v.stock === "number" ? v.stock : (existingStock?.stockQuantity ?? 0);
      const effectivePrice = v.price !== undefined ? v.price : (existingStock?.price ?? updates.price ?? 0);

      state.variantStocks[v.id] = {
        variantId: v.id,
        productId,
        sku: v.sku || existingStock?.sku || v.id,
        ean: v.ean || existingStock?.ean || "",
        name: v.name || existingStock?.name || "Variante",
        colorHex: v.colorHex !== undefined ? (v.colorHex || undefined) : existingStock?.colorHex,
        stockQuantity: Math.max(0, Math.floor(quantity)),
        stockStatus: computeStockStatus(quantity),
        price: Math.max(0, Math.round(effectivePrice * 100) / 100),
        originalWholesalePrice: v.originalWholesalePrice ?? existingStock?.originalWholesalePrice,
        productName: updates.name || existingStock?.productName || rawProduct?.name,
        brand: updates.brand || existingStock?.brand || rawProduct?.brand,
        category: updates.category || existingStock?.category || rawProduct?.category,
        image: v.image || (updates.images && updates.images[0]) || existingStock?.image || "",
        updatedAt: now,
      };
    }
  } else {
    // If top-level fields like name, brand, category, images, or price changed without replacing variants array:
    // Propagate changes to existing variants of this product in variantStocks
    for (const [varId, vStock] of Object.entries(state.variantStocks)) {
      if (vStock.productId === productId) {
        let changed = false;
        const updatedV: SceltaVariantStock = { ...vStock };
        if (updates.name && updates.name !== vStock.productName) {
          updatedV.productName = updates.name;
          changed = true;
        }
        if (updates.brand && updates.brand !== vStock.brand) {
          updatedV.brand = updates.brand;
          changed = true;
        }
        if (updates.category && updates.category !== vStock.category) {
          updatedV.category = updates.category;
          changed = true;
        }
        if (updates.images && updates.images[0] && (!vStock.image || vStock.image === rawProduct?.images[0])) {
          updatedV.image = updates.images[0];
          changed = true;
        }
        if (updates.price !== undefined && updates.price > 0 && (!rawProduct?.variants?.some((v) => v.id === varId && v.price !== undefined))) {
          updatedV.price = updates.price;
          changed = true;
        }
        if (changed) {
          updatedV.updatedAt = now;
          state.variantStocks[varId] = updatedV;
        }
      }
    }
  }

  const isSaved = saveAdminStoreState(state);

  // Synchronize the affected variant giacenze + product override to the cloud so
  // every device (admin remote + point-of-sale laptop) stays aligned in real-time.
  // When the caller performs its own awaited POST (saveProductDetailsToCloud),
  // this background fire-and-forget is skipped to avoid a duplicate request.
  if (!options?.skipCloudSync) {
    postCatalogUpdate(CATALOG_OVERRIDES_API, {
      productId,
      updates: merged,
      variantStocks: collectProductVariantStocks(state, productId),
    });
  }

  if (!isSaved) {
    return {
      ...merged,
      error: "Memoria del browser esaurita (QuotaExceeded). L'immagine caricata è troppo pesante.",
    };
  }
  return merged;
}

/** Collects every variant stock belonging to a product (for cloud payloads). */
function collectProductVariantStocks(
  state: SceltaAdminStoreState,
  productId: string
): Record<string, SceltaVariantStock> {
  const affected: Record<string, SceltaVariantStock> = {};
  for (const [varId, vStock] of Object.entries(state.variantStocks)) {
    if (vStock.productId === productId) {
      affected[varId] = vStock;
    }
  }
  return affected;
}

/**
 * Saves product details to the cloud with a definitive, awaited result.
 *
 * Flow:
 *   1. Applies the change locally first (optimistic, instant UI update).
 *   2. POSTs to the centralized `/api/catalog/overrides` endpoint and AWAITS
 *      the HTTP response, so the caller can display honest feedback.
 *   3. On success, reconciles the server-confirmed snapshot into the local store
 *      (newer-timestamp wins, protecting the local write).
 *   4. On failure, returns `{ success: false, error }` but keeps the local data,
 *      so nothing typed by Federica is ever lost.
 */
export async function saveProductDetailsToCloud(
  productId: string,
  updates: Partial<Product>
): Promise<{ success: boolean; error?: string }> {
  // 1. Optimistic local update (records the anti-clobber timestamp).
  const localResult = updateProductDetails(productId, updates, { skipCloudSync: true });
  if (localResult && localResult.error) {
    return { success: false, error: localResult.error };
  }

  if (typeof window === "undefined") {
    return { success: true };
  }

  // 2. Awaited POST with a hard timeout so the UI can never hang forever.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const state = getAdminStoreState();
    const confirmedOverride = state.productOverrides[productId] || {};
    const affectedStocks = collectProductVariantStocks(state, productId);

    const res = await fetch(CATALOG_OVERRIDES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        productId,
        updates: confirmedOverride,
        variantStocks: affectedStocks,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Salvataggio cloud non riuscito (HTTP ${res.status}). Il dato resta salvato in locale.`,
      };
    }

    const payload = (await res.json().catch(() => null)) as {
      success?: boolean;
      productOverrides?: Record<string, Partial<Product>>;
      variantStocks?: Record<string, SceltaVariantStock>;
    } | null;

    if (payload?.success) {
      reconcileConfirmedServerSnapshot(productId, payload);
      // Keep the anti-clobber guard active a while longer so the next polling
      // GET (which may still be cached upstream) cannot revert this save.
      markProductLocallyModified(productId);
    }

    return { success: true };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      success: false,
      error: aborted
        ? "Timeout di salvataggio cloud. Il dato resta salvato in locale."
        : "Errore di rete durante il salvataggio. Il dato resta salvato in locale.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reconciles the server-confirmed snapshot returned by POST into the local store.
 * Newer timestamps win; a locally recorded change is never overwritten by an
 * older record.
 */
function reconcileConfirmedServerSnapshot(
  productId: string,
  payload: {
    productOverrides?: Record<string, Partial<Product>>;
    variantStocks?: Record<string, SceltaVariantStock>;
  }
): void {
  const state = getAdminStoreState();
  let changed = false;
  const now = Date.now();

  if (payload.productOverrides) {
    for (const [id, serverOverride] of Object.entries(
      sanitizeProductOverrides(payload.productOverrides)
    )) {
      const localOverride = state.productOverrides[id];
      const preserveLocal = shouldPreserveLocal({
        productId: id,
        localUpdatedAt: getOverrideUpdatedAt(localOverride),
        cloudUpdatedAt: getOverrideUpdatedAt(serverOverride),
        now,
      });
      if (localOverride && preserveLocal) continue;
      state.productOverrides[id] = serverOverride;
      changed = true;
    }
  }

  if (payload.variantStocks) {
    for (const [variantId, serverStock] of Object.entries(payload.variantStocks)) {
      if (!serverStock || typeof serverStock !== "object") continue;
      const localStock = state.variantStocks[variantId];
      if (!localStock) {
        state.variantStocks[variantId] = serverStock;
        changed = true;
        continue;
      }
      const preserveLocal = shouldPreserveLocal({
        productId: localStock.productId || serverStock.productId || productId,
        localUpdatedAt: parseUpdatedAt(localStock.updatedAt),
        cloudUpdatedAt: parseUpdatedAt(serverStock.updatedAt),
        now,
      });
      if (preserveLocal) continue;
      state.variantStocks[variantId] = serverStock;
      changed = true;
    }
  }

  if (changed) {
    saveAdminStoreState(state);
  }
}

/**
 * Persists a batch of variant stock/price edits for a single product in ONE
 * atomic local pass and ONE awaited POST request.
 *
 * Replaces the old per-variant loop that fired 2×N uncoordinated HTTP requests
 * (16 requests for an 8-variant product), which saturated the salon network and
 * made saves feel slow/unreliable.
 *
 * @returns `true` when the cloud write succeeded, `false` otherwise. Local data
 *   is always written first and preserved even when the network fails.
 */
export async function batchUpdateProductVariants(
  productId: string,
  items: Array<{ variantId: string; stockQuantity: number; price: number }>
): Promise<boolean> {
  const state = getAdminStoreState();
  const now = new Date().toISOString();
  const affectedStocks: Record<string, SceltaVariantStock> = {};

  for (const item of items) {
    if (!item || !isNonEmptyString(item.variantId)) continue;
    const existing = state.variantStocks[item.variantId];
    const safeQuantity = Math.max(0, Math.floor(item.stockQuantity));
    const safePrice = Math.max(0, Math.round(item.price * 100) / 100);

    const updated: SceltaVariantStock = existing
      ? {
          ...existing,
          stockQuantity: safeQuantity,
          stockStatus: computeStockStatus(safeQuantity),
          price: safePrice,
          updatedAt: now,
        }
      : {
          variantId: item.variantId,
          productId,
          sku: item.variantId,
          name: "Variante",
          stockQuantity: safeQuantity,
          stockStatus: computeStockStatus(safeQuantity),
          price: safePrice,
          updatedAt: now,
        };

    state.variantStocks[item.variantId] = updated;
    affectedStocks[item.variantId] = updated;
  }

  markProductLocallyModified(productId);
  saveAdminStoreState(state);

  if (typeof window === "undefined") {
    return true;
  }

  // Single awaited POST carrying every edited variant at once.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(CATALOG_OVERRIDES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        productId,
        updates: state.productOverrides[productId] || {},
        variantStocks: affectedStocks,
      }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}


// ------------------------------------------------------------------------------
// Orders Management API
// ------------------------------------------------------------------------------

/**
 * Returns all admin e-commerce orders sorted by creation date descending.
 */
export function getAdminOrders(): SceltaAdminOrder[] {
  const state = getAdminStoreState();
  return [...state.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Retrieves a single order by ID or orderNumber.
 */
export function getAdminOrderById(orderId: string): SceltaAdminOrder | undefined {
  const orders = getAdminOrders();
  const search = orderId.trim().toLowerCase();
  return orders.find((o) => o.id.toLowerCase() === search);
}

/**
 * Updates the state of an existing admin order.
 */
export function updateOrderStatus(
  orderId: string,
  status: SceltaAdminOrder["status"],
  trackingCode?: string
): SceltaAdminOrder {
  const state = getAdminStoreState();
  const index = state.orders.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());

  if (index === -1) {
    throw new Error(`[SceltaAdminStore] Ordine ${orderId} non trovato`);
  }

  const existing = state.orders[index];
  const updated: SceltaAdminOrder = {
    ...existing,
    status,
    trackingCode: trackingCode !== undefined ? trackingCode : existing.trackingCode,
    updatedAt: new Date().toISOString(),
  };

  state.orders[index] = updated;
  saveAdminStoreState(state);
  postCatalogUpdate(ORDERS_API, { order: updated });
  return updated;
}

/**
 * Updates courier tracking information for an order and optionally sets status to 'shipped'.
 */
export function updateOrderTracking(
  orderId: string,
  trackingCode: string,
  courierName?: string
): SceltaAdminOrder {
  const state = getAdminStoreState();
  const index = state.orders.findIndex((o) => o.id.toLowerCase() === orderId.toLowerCase());

  if (index === -1) {
    throw new Error(`[SceltaAdminStore] Ordine ${orderId} non trovato`);
  }

  const existing = state.orders[index];
  const updated: SceltaAdminOrder = {
    ...existing,
    trackingCode,
    courierName: courierName || existing.courierName || "BRT Express",
    status: existing.status === "processing" ? "shipped" : existing.status,
    updatedAt: new Date().toISOString(),
  };

  state.orders[index] = updated;
  saveAdminStoreState(state);
  postCatalogUpdate(ORDERS_API, { order: updated });
  return updated;
}

/**
 * Creates a new admin order. Automatically generates an order number if omitted.
 */
export function createAdminOrder(
  orderInput: Partial<SceltaAdminOrder> & {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    total: number;
    items: SceltaAdminOrder["items"];
  }
): SceltaAdminOrder {
  const state = getAdminStoreState();
  const now = new Date().toISOString();
  const nextSeq = state.orders.length + 1;
  const isPos = orderInput.fulfillmentType === "pos_receipt";
  const orderNumber =
    orderInput.id ||
    (isPos
      ? `SC-POS-2026-${nextSeq.toString().padStart(4, "0")}`
      : `SC-ORD-2026-${nextSeq.toString().padStart(4, "0")}`);

  const newOrder: SceltaAdminOrder = {
    id: orderNumber,
    customerName: orderInput.customerName || (isPos ? "Cliente al Banco" : "Cliente"),
    customerEmail: orderInput.customerEmail || (isPos ? "banco@sceltamakeup.it" : "info@sceltamakeup.it"),
    customerPhone: orderInput.customerPhone || (isPos ? "Vendita Diretta Salone (Cassa RT)" : ""),
    total: Math.round(orderInput.total * 100) / 100,
    status: orderInput.status || (isPos ? "completed" : "processing"),
    fulfillmentType: orderInput.fulfillmentType || "courier",
    paymentMethod: orderInput.paymentMethod,
    change: orderInput.change !== undefined ? Math.round(orderInput.change * 100) / 100 : undefined,
    receiptNumber: orderInput.receiptNumber,
    shippingAddress: orderInput.shippingAddress,
    trackingCode: orderInput.trackingCode,
    courierName:
      orderInput.courierName ||
      (orderInput.fulfillmentType === "courier" ? "BRT Express" : undefined),
    items: orderInput.items,
    createdAt: orderInput.createdAt || now,
    updatedAt: now,
  };

  state.orders = [newOrder, ...state.orders];
  saveAdminStoreState(state);

  // Synchronize immediately to cloud (Creativia Hub / Supabase)
  postCatalogUpdate(ORDERS_API, { order: newOrder });

  return newOrder;
}

// ------------------------------------------------------------------------------
// Omnichannel CRM Customers API
// ------------------------------------------------------------------------------

/**
 * Returns all omnichannel CRM customer profiles.
 */
export function getAdminCustomers(): SceltaCrmCustomer[] {
  const state = getAdminStoreState();
  return state.customers;
}

/**
 * Retrieves a customer profile by ID, email, or phone.
 */
export function getAdminCustomerById(customerId: string): SceltaCrmCustomer | undefined {
  const state = getAdminStoreState();
  const search = customerId.trim().toLowerCase();
  return state.customers.find(
    (c) =>
      c.id.toLowerCase() === search ||
      c.email.toLowerCase() === search ||
      c.phone.replace(/\s+/g, "") === search.replace(/\s+/g, "")
  );
}

/**
 * Updates beauty notes and skin profile for a customer.
 */
export function updateCustomerNotes(customerId: string, notes: string): SceltaCrmCustomer {
  const state = getAdminStoreState();
  const index = state.customers.findIndex((c) => c.id === customerId || c.email === customerId);

  if (index === -1) {
    throw new Error(`[SceltaAdminStore] Cliente CRM ${customerId} non trovato`);
  }

  const existing = state.customers[index];
  const updated: SceltaCrmCustomer = {
    ...existing,
    notes,
    lastActive: new Date().toISOString(),
  };

  state.customers[index] = updated;
  saveAdminStoreState(state);
  return updated;
}

/**
 * Adds or updates a CRM customer.
 */
export function createAdminCustomer(
  customerInput: Partial<SceltaCrmCustomer> & {
    name: string;
    email: string;
    phone: string;
  }
): SceltaCrmCustomer {
  const state = getAdminStoreState();
  const now = new Date().toISOString();
  const newCustomer: SceltaCrmCustomer = {
    id: customerInput.id || `crm-cust-${Date.now()}`,
    name: customerInput.name,
    email: customerInput.email,
    phone: customerInput.phone,
    totalSpend: customerInput.totalSpend || 0,
    ordersCount: customerInput.ordersCount || 0,
    appointmentsCount: customerInput.appointmentsCount || 0,
    lastActive: customerInput.lastActive || now,
    notes: customerInput.notes || "",
    skinType: customerInput.skinType || "Normale",
    preferredBrands: customerInput.preferredBrands || ["Diego dalla Palma"],
  };

  state.customers = [newCustomer, ...state.customers];
  saveAdminStoreState(state);
  return newCustomer;
}

// ------------------------------------------------------------------------------
// Executive KPI Calculations
// ------------------------------------------------------------------------------

export interface AdminKpiSummary {
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  registeredCustomers: number;
  lowStockCount: number;
  outOfStockCount: number;
  availableStockCount: number;
  pendingOrdersCount: number;
  readyForPickupCount: number;
  shippedOrdersCount: number;
  completedOrdersCount: number;
}

export function getAdminKpis(): AdminKpiSummary {
  const state = getAdminStoreState();
  const orders = state.orders;
  const stocks = Object.values(state.variantStocks);

  let totalRevenue = 0;
  let pendingOrdersCount = 0;
  let readyForPickupCount = 0;
  let shippedOrdersCount = 0;
  let completedOrdersCount = 0;

  for (const order of orders) {
    if (order.status !== "cancelled") {
      totalRevenue += order.total;
    }
    if (order.status === "processing") pendingOrdersCount++;
    else if (order.status === "ready_for_pickup") readyForPickupCount++;
    else if (order.status === "shipped") shippedOrdersCount++;
    else if (order.status === "completed") completedOrdersCount++;
  }

  const validOrdersCount = orders.filter((o) => o.status !== "cancelled").length;
  const averageOrderValue = validOrdersCount > 0 ? Math.round((totalRevenue / validOrdersCount) * 100) / 100 : 0;

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let availableStockCount = 0;

  for (const item of stocks) {
    if (item.stockStatus === "out_of_stock") outOfStockCount++;
    else if (item.stockStatus === "low_stock") lowStockCount++;
    else availableStockCount++;
  }

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    ordersCount: orders.length,
    averageOrderValue,
    registeredCustomers: state.customers.length,
    lowStockCount,
    outOfStockCount,
    availableStockCount,
    pendingOrdersCount,
    readyForPickupCount,
    shippedOrdersCount,
    completedOrdersCount,
  };
}

// ------------------------------------------------------------------------------
// 1-Click Factory Reset to Initial Defaults
// ------------------------------------------------------------------------------

/**
 * Resets all admin store collections to factory default demo seed state.
 * Erases custom modifications and re-initializes stock from data/catalog.json.
 */
export function resetAdminStoreToDefaults(): SceltaAdminStoreState {
  const defaultState = getDefaultAdminStoreState();

  memoryAdminStore = defaultState;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_ADMIN_STORE_KEY, JSON.stringify(defaultState));
      window.dispatchEvent(new CustomEvent("scelta_admin_store_reset", { detail: { timestamp: Date.now() } }));
      window.dispatchEvent(new CustomEvent("scelta_admin_store_updated", { detail: { timestamp: Date.now() } }));
    } catch (error) {
      console.error("[SceltaAdminStore] Error during factory reset:", error);
    }
  }

  return defaultState;
}
