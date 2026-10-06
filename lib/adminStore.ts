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
import { forceUploadDeviceSnapshot } from "@/lib/deviceSnapshot";

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
      // Esclude categoricamente immagini in Base64 (data:image/...) per evitare QuotaExceeded su localStorage
      const filtered = source.images.filter((img) => isNonEmptyString(img) && !img.startsWith("data:image/"));
      clean.images = filtered.length > 0 ? filtered : ["/brand/logo.png"];
    } else {
      delete clean.images;
    }
  }

  if (clean.variants && Array.isArray(clean.variants)) {
    clean.variants = clean.variants.map((v) => ({
      ...v,
      image: typeof v.image === "string" && v.image.startsWith("data:image/") ? "/brand/logo.png" : v.image,
    }));
  }

  return clean;
}

/** Libera memoria da localStorage rimuovendo residui storici pesanti. */
export function pruneOldLocalStorageArtifacts(): void {
  if (typeof window === "undefined") return;
  try {
    const rawAudit = localStorage.getItem("scelta_admin_audit_logs_v1");
    if (rawAudit) {
      const logs = JSON.parse(rawAudit);
      if (Array.isArray(logs) && logs.length > 50) {
        localStorage.setItem("scelta_admin_audit_logs_v1", JSON.stringify(logs.slice(-50)));
      }
    }
    localStorage.removeItem("scelta_admin_snapshot_backup");
  } catch {
    // ignore
  }
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
    pruneOldLocalStorageArtifacts();

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
            // Sync image if not custom overridden (neither product images nor variant image)
            const overrideVariantImage = overrides[vStock.productId]?.variants?.find(
              (ov) => ov && ov.id === vStock.variantId
            )?.image;
            if (
              !overrideVariantImage &&
              (!overrides[vStock.productId]?.images || (overrides[vStock.productId]?.images?.length ?? 0) === 0)
            ) {
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
 * caller. Usato SOLO per gli ordini (già una riga per ordine lato server).
 * Le scritture del catalogo passano invece dalla outbox persistente qui sotto.
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

// ------------------------------------------------------------------------------
// Outbox persistente — consegna garantita delle modifiche al catalogo
// ------------------------------------------------------------------------------
// Ogni modifica (prezzo, foto, nome, giacenza) viene messa in coda in
// localStorage e inviata in ordine FIFO. Esce dalla coda SOLO quando il server
// conferma il salvataggio (HTTP 2xx). In caso di rete assente o errore del
// server resta in coda e viene ritentata (intervallo, focus, ritorno online).
// Finché è in coda, la modifica viene sovrapposta ai dati cloud in locale, così
// Federica non la vede mai "tornare indietro" e non viene mai persa.

export const CATALOG_OUTBOX_STORAGE_KEY = "scelta_catalog_outbox_v1";
export const CATALOG_SYNC_EVENT = "scelta_catalog_sync_status";

interface OutboxEntry {
  id: string;
  path: string;
  body: Record<string, unknown>;
  productId?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface CatalogSyncStatus {
  pending: number;
  attempts: number;
  lastError?: string;
  oldestPendingAt?: string;
}

let outboxMemory: OutboxEntry[] = [];
const deliveredOutboxIds = new Set<string>();
const rejectedOutboxIds = new Map<string, string>();
let outboxFlushPromise: Promise<void> | null = null;
/** Incrementato a ogni conferma del server (protegge la sync da snapshot in volo). */
let outboxDeliveryCounter = 0;
/** productId -> `_updatedAt` (epoch ms) dell'ultima riga confermata in questa sessione. */
const confirmedOverrideTimestamps: Record<string, number> = {};

function readOutbox(): OutboxEntry[] {
  if (typeof window === "undefined") return outboxMemory;
  try {
    const raw = localStorage.getItem(CATALOG_OUTBOX_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    outboxMemory = Array.isArray(parsed)
      ? (parsed as OutboxEntry[]).filter((e) => e && typeof e.id === "string" && typeof e.path === "string")
      : [];
  } catch {
    // Storage illeggibile: si usa la copia in memoria.
  }
  return outboxMemory;
}

function writeOutbox(entries: OutboxEntry[]): void {
  outboxMemory = entries;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATALOG_OUTBOX_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota piena: la coda resta comunque in memoria per questa sessione.
  }
  try {
    window.dispatchEvent(new CustomEvent(CATALOG_SYNC_EVENT, { detail: getCatalogSyncStatus() }));
  } catch {
    /* ignore */
  }
}

/** Stato della sincronizzazione (modifiche ancora da confermare dal server). */
export function getCatalogSyncStatus(): CatalogSyncStatus {
  const queue = typeof window === "undefined" ? outboxMemory : readOutbox();
  if (queue.length === 0) return { pending: 0, attempts: 0 };
  return {
    pending: queue.length,
    attempts: Math.max(...queue.map((e) => e.attempts || 0)),
    lastError: queue.find((e) => e.lastError)?.lastError,
    oldestPendingAt: queue[0]?.createdAt,
  };
}

/** Numero di modifiche in attesa di conferma dal server. */
export function getPendingCatalogSyncCount(): number {
  return getCatalogSyncStatus().pending;
}

function enqueueCatalogWrite(path: string, body: Record<string, unknown>, productId?: string): string {
  const entry: OutboxEntry = {
    id: `ob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    path,
    body,
    productId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  writeOutbox([...readOutbox(), entry]);
  void flushCatalogOutbox();
  return entry.id;
}

/**
 * Invia la coda in ordine. Si ferma al primo errore temporaneo (riprova più
 * tardi) per non applicare mai le modifiche fuori ordine.
 */
export function flushCatalogOutbox(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (outboxFlushPromise) return outboxFlushPromise;

  outboxFlushPromise = (async () => {
    try {
      for (let guard = 0; guard < 500; guard += 1) {
        const queue = readOutbox();
        if (queue.length === 0) break;
        const entry = queue[0];

        let res: Response | null = null;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);
        try {
          res = await fetch(entry.path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry.body),
            cache: "no-store",
            signal: controller.signal,
          });
        } catch {
          res = null;
        } finally {
          clearTimeout(timeoutId);
        }

        if (res && res.ok) {
          const payload = (await res.json().catch(() => null)) as {
            success?: boolean;
            productOverrides?: Record<string, Partial<Product>>;
            variantStocks?: Record<string, SceltaVariantStock>;
          } | null;
          writeOutbox(readOutbox().filter((e) => e.id !== entry.id));
          deliveredOutboxIds.add(entry.id);
          outboxDeliveryCounter += 1;
          if (payload?.success) applyConfirmedServerRows(payload);
          continue;
        }

        if (res && res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          // Richiesta non valida: scartata per non bloccare la coda (errore registrato).
          writeOutbox(readOutbox().filter((e) => e.id !== entry.id));
          rejectedOutboxIds.set(entry.id, `HTTP ${res.status}`);
          continue;
        }

        const nextAttempts = (entry.attempts || 0) + 1;
        if (nextAttempts >= 5) {
          // Dopo 5 tentativi falliti, scarta la singola voce bloccata per non inchiodare tutti i salvataggi successivi
          console.warn("[SceltaAdminStore] Scarto voce outbox bloccata dopo 5 tentativi:", entry.id, entry.productId);
          writeOutbox(readOutbox().filter((e) => e.id !== entry.id));
          rejectedOutboxIds.set(entry.id, res ? `HTTP ${res.status}` : "max_retries_reached");
          continue;
        }

        writeOutbox(
          readOutbox().map((e) =>
            e.id === entry.id
              ? { ...e, attempts: nextAttempts, lastError: res ? `HTTP ${res.status}` : "rete non disponibile" }
              : e
          )
        );
        break;
      }
    } finally {
      outboxFlushPromise = null;
    }
  })();

  return outboxFlushPromise;
}

/** Attende la conferma del server per una specifica voce della coda. */
async function waitForOutboxDelivery(
  entryId: string,
  timeoutMs = 15_000
): Promise<{ delivered: boolean; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await flushCatalogOutbox();
    if (deliveredOutboxIds.has(entryId)) return { delivered: true };
    if (rejectedOutboxIds.has(entryId)) return { delivered: false, error: rejectedOutboxIds.get(entryId) };
    if (!readOutbox().some((e) => e.id === entryId)) return { delivered: true };
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { delivered: false, error: "timeout" };
}

// ------------------------------------------------------------------------------
// Patch locali (stessa semantica delle funzioni SQL lato server)
// ------------------------------------------------------------------------------

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function catalogBaseVariants(productId: string): ProductVariant[] | undefined {
  const p = (rawCatalog as Product[]).find((x) => x.id === productId);
  return p && Array.isArray(p.variants) ? p.variants : undefined;
}

/** Merge varianti per id (identico a `scelta_merge_variants` in Postgres). */
function mergeVariantsLocal(
  base: ProductVariant[] | undefined,
  patch: Array<Partial<ProductVariant>>,
  replaceMode: boolean
): ProductVariant[] {
  const baseList = (Array.isArray(base) ? base : []).filter((v) => v && isNonEmptyString(v.id));
  const patchList = patch.filter((v) => v && isNonEmptyString(v.id));
  if (replaceMode) {
    return patchList.map((pv) => ({ ...(baseList.find((b) => b.id === pv.id) || {}), ...pv }) as ProductVariant);
  }
  const merged = baseList.map((bv) => {
    const pv = patchList.find((p) => p.id === bv.id);
    return pv ? ({ ...bv, ...pv } as ProductVariant) : bv;
  });
  for (const pv of patchList) {
    if (!baseList.some((b) => b.id === pv.id)) merged.push(pv as ProductVariant);
  }
  return merged;
}

function applyOverridePatchLocally(
  productId: string,
  base: Partial<Product> | undefined,
  patch: Record<string, unknown>,
  replaceVariants: boolean
): Partial<Product> {
  const { variants: vpatch, ...rest } = patch as { variants?: unknown } & Record<string, unknown>;
  const merged = { ...(base || {}), ...rest } as Partial<Product>;
  if (Array.isArray(vpatch)) {
    merged.variants = mergeVariantsLocal(
      base?.variants ?? catalogBaseVariants(productId),
      vpatch as Array<Partial<ProductVariant>>,
      replaceVariants
    );
  }
  return merged;
}

/** Sovrappone alle righe cloud le modifiche ancora in coda (non ancora confermate). */
function overlayPendingOutbox(
  overrides: Record<string, Partial<Product>>,
  stocks: Record<string, SceltaVariantStock>,
  onlyProductId?: string
): void {
  for (const entry of readOutbox()) {
    const body = entry.body || {};
    if (entry.path === CATALOG_OVERRIDES_API) {
      const pid = typeof body.productId === "string" ? body.productId : "";
      if (!pid || (onlyProductId && pid !== onlyProductId)) continue;
      const updates = (body.updates && typeof body.updates === "object" ? body.updates : {}) as Record<string, unknown>;
      if (Object.keys(updates).length > 0) {
        overrides[pid] = applyOverridePatchLocally(pid, overrides[pid], updates, body.replaceVariants === true);
      }
      const vs = (body.variantStocks && typeof body.variantStocks === "object" ? body.variantStocks : {}) as Record<
        string,
        Partial<SceltaVariantStock>
      >;
      for (const [vid, patch] of Object.entries(vs)) {
        if (stocks[vid]) stocks[vid] = { ...stocks[vid], ...patch } as SceltaVariantStock;
      }
    } else if (entry.path === CATALOG_STOCK_API) {
      const vid = typeof body.variantId === "string" ? body.variantId : "";
      if (!vid || !stocks[vid]) continue;
      if (onlyProductId && stocks[vid].productId !== onlyProductId) continue;
      const patch = (body.variantStock && typeof body.variantStock === "object" ? body.variantStock : {}) as Partial<SceltaVariantStock>;
      const next = { ...stocks[vid], ...patch } as SceltaVariantStock;
      if (typeof body.newQuantity === "number") {
        next.stockQuantity = Math.max(0, Math.floor(body.newQuantity));
        next.stockStatus = computeStockStatus(next.stockQuantity);
      }
      stocks[vid] = next;
    }
  }
}

/** Applica al negozio locale le righe confermate dal server (+ coda ancora pendente). */
function applyConfirmedServerRows(payload: {
  productOverrides?: Record<string, Partial<Product>>;
  variantStocks?: Record<string, SceltaVariantStock>;
}): void {
  const state = getAdminStoreState();
  let changed = false;

  const serverOverrides = payload.productOverrides ? sanitizeProductOverrides(payload.productOverrides) : {};
  for (const [pid, row] of Object.entries(serverOverrides)) {
    const confirmedAt = getOverrideUpdatedAt(row);
    if (confirmedAt !== null) confirmedOverrideTimestamps[pid] = confirmedAt;
    const tmp: Record<string, Partial<Product>> = { [pid]: row };
    overlayPendingOutbox(tmp, state.variantStocks, pid);
    if (!jsonEqual(state.productOverrides[pid], tmp[pid])) {
      state.productOverrides[pid] = tmp[pid];
      changed = true;
    }
  }

  if (payload.variantStocks) {
    for (const [vid, row] of Object.entries(payload.variantStocks)) {
      if (!row || typeof row !== "object") continue;
      const next = { ...(state.variantStocks[vid] || {}), ...row, variantId: vid } as SceltaVariantStock;
      const tmpStocks: Record<string, SceltaVariantStock> = { [vid]: next };
      overlayPendingOutbox({}, tmpStocks);
      if (!jsonEqual(state.variantStocks[vid], tmpStocks[vid])) {
        state.variantStocks[vid] = tmpStocks[vid];
        changed = true;
      }
    }
  }

  if (changed) saveAdminStoreState(state);
}

// ------------------------------------------------------------------------------
// Cutover sicuro: prima di lasciare che il cloud diventi l'unica verità su
// questo dispositivo, si invia UNA copia forense dei dati locali (contengono le
// modifiche mai arrivate al server con il vecchio sistema). Finché l'invio non
// riesce, resta attiva la vecchia logica che preserva i dati locali.
// ------------------------------------------------------------------------------
const ROW_LEVEL_CUTOVER_FLAG = "scelta_rowlevel_cutover_v1";

async function ensureLegacyLocalDataCaptured(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(ROW_LEVEL_CUTOVER_FLAG)) return true;
  } catch {
    return false;
  }
  const ok = await forceUploadDeviceSnapshot("pre-cutover-row-level");
  if (ok) {
    try {
      localStorage.setItem(ROW_LEVEL_CUTOVER_FLAG, new Date().toISOString());
    } catch {
      /* ignore */
    }
  }
  return ok;
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
    // Prima consegna eventuali modifiche in coda, poi legge lo stato cloud.
    await flushCatalogOutbox();
    const cloudIsAuthoritative = await ensureLegacyLocalDataCaptured();
    const deliveryCounterAtStart = outboxDeliveryCounter;

    const res = await fetch(`${CATALOG_OVERRIDES_API}?fresh=1`, {
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

    // Una conferma è arrivata mentre la GET era in volo: questo snapshot potrebbe
    // non includerla. Si salta il giro (il prossimo arriva a breve).
    if (outboxDeliveryCounter !== deliveryCounterAtStart) return false;

    const state = getAdminStoreState();
    let changed = false;
    const now = Date.now();

    if (cloudIsAuthoritative) {
      // ---------------- Modalità row-level: il cloud è l'unica verità ----------------
      const cloudOverrides =
        payload.productOverrides && typeof payload.productOverrides === "object"
          ? sanitizeProductOverrides(payload.productOverrides)
          : {};
      const mergedOverrides: Record<string, Partial<Product>> = { ...cloudOverrides };

      // Riga confermata in questa sessione più recente di quella appena letta
      // (lettura servita da un'istanza in ritardo): si tiene quella confermata.
      for (const [pid, confirmedAt] of Object.entries(confirmedOverrideTimestamps)) {
        const local = state.productOverrides[pid];
        const cloudAt = getOverrideUpdatedAt(cloudOverrides[pid]);
        if (local && (cloudAt === null || confirmedAt > cloudAt)) mergedOverrides[pid] = local;
      }

      const localStocks = state.variantStocks || {};
      const mergedStocks: Record<string, SceltaVariantStock> = { ...localStocks };
      if (payload.variantStocks && typeof payload.variantStocks === "object") {
        for (const [variantId, cloudStock] of Object.entries(payload.variantStocks)) {
          if (!cloudStock || typeof cloudStock !== "object") continue;
          mergedStocks[variantId] = { ...(localStocks[variantId] || {}), ...cloudStock, variantId } as SceltaVariantStock;
        }
      }

      overlayPendingOutbox(mergedOverrides, mergedStocks);

      if (!jsonEqual(mergedOverrides, state.productOverrides || {})) {
        state.productOverrides = mergedOverrides;
        changed = true;
      }
      if (!jsonEqual(mergedStocks, state.variantStocks || {})) {
        state.variantStocks = mergedStocks;
        changed = true;
      }
    } else {
      // ---- Modalità legacy (copia forense non ancora inviata): preserva i dati locali ----
      if (payload.productOverrides && typeof payload.productOverrides === "object") {
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
          if (localOverride && preserveLocal) continue;
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
          if (preserveLocal) continue;
          mergedStocks[variantId] = cloudStock;
        }

        if (JSON.stringify(mergedStocks) !== JSON.stringify(state.variantStocks || {})) {
          state.variantStocks = mergedStocks;
          changed = true;
        }
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
export function useAdminCatalogSync(intervalMs = 30000): void {
  useEffect(() => {
    let inFlight = false;

    const runSync = () => {
      // Nessun polling a schermo spento / scheda in background.
      if (typeof document !== "undefined" && document.hidden) return;
      // Evita richieste sovrapposte se la precedente è ancora in corso.
      if (inFlight) return;
      inFlight = true;
      void syncAdminStoreFromCloud().finally(() => {
        inFlight = false;
      });
    };

    runSync();

    const interval = setInterval(runSync, intervalMs);
    const onFocus = () => runSync();
    // Al ritorno in primo piano forza un sync immediato.
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) runSync();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Coda modifiche: ritenta ogni 10s se c'è qualcosa in attesa (anche a scheda
    // in background) e subito al ritorno della connessione.
    const flushIfPending = () => {
      if (getPendingCatalogSyncCount() > 0) void flushCatalogOutbox();
    };
    const outboxInterval = setInterval(flushIfPending, 10_000);
    const onOnline = () => {
      flushIfPending();
      runSync();
    };
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(interval);
      clearInterval(outboxInterval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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

  // Solo la quantità (valore assoluto) viaggia verso il cloud: prezzo e altri
  // campi NON vengono mai reinviati da una copia locale potenzialmente vecchia.
  enqueueCatalogWrite(
    CATALOG_STOCK_API,
    { variantId, newQuantity: safeQuantity, seed: updated },
    updated.productId
  );

  return updated;
}

/**
 * Alias for updateVariantStockCount.
 */
export function updateVariantStock(variantId: string, quantity: number): SceltaVariantStock {
  return updateVariantStockCount(variantId, quantity);
}

/**
 * Varianti effettive di un prodotto (override locale, altrimenti catalogo), con
 * la quantità attuale presa dalle giacenze (che è ciò che le vendite aggiornano).
 */
function effectiveVariants(state: SceltaAdminStoreState, productId: string): ProductVariant[] {
  const fromOverride = state.productOverrides?.[productId]?.variants;
  const base =
    Array.isArray(fromOverride) && fromOverride.length > 0 ? fromOverride : catalogBaseVariants(productId) || [];
  return base
    .filter((v) => v && isNonEmptyString(v.id))
    .map((v) => {
      const s = state.variantStocks?.[v.id];
      return s ? { ...v, stock: s.stockQuantity, inStock: s.stockQuantity > 0 } : v;
    });
}

/**
 * Riduce `updates` alle SOLE modifiche fatte dall'operatrice rispetto alla copia
 * da cui è partita (`baseline`, es. il prodotto mostrato nel popup o la scheda
 * all'apertura dell'editor) e le applica sopra lo stato ATTUALE del dispositivo.
 * Così una copia vecchia in memoria non può mai reinviare prezzi/foto/giacenze
 * superati.
 */
function resolveUpdatesAgainstBaseline(
  productId: string,
  updates: Partial<Product>,
  baseline: Partial<Product>
): Partial<Product> {
  const norm: Partial<Product> = { ...updates };
  let safeVariants: ProductVariant[] | undefined;
  if ("variants" in norm) {
    safeVariants = sanitizeVariantsArray(updates.variants);
    if (safeVariants) norm.variants = safeVariants;
    else delete norm.variants;
  }
  const base: Partial<Product> = { ...baseline };
  if ("variants" in base) {
    const cleanedBase = sanitizeVariantsArray(baseline.variants);
    if (cleanedBase) base.variants = cleanedBase;
    else delete base.variants;
  }

  const { patch, replaceVariants } = buildOverridePatch(productId, base, norm, safeVariants);
  const { variants: vpatch, ...rest } = patch as { variants?: unknown } & Record<string, unknown>;
  const out = { ...rest } as Partial<Product>;
  if (Array.isArray(vpatch)) {
    out.variants = mergeVariantsLocal(
      effectiveVariants(getAdminStoreState(), productId),
      vpatch as Array<Partial<ProductVariant>>,
      replaceVariants
    );
  }
  return out;
}

/**
 * Updates the price for a specific variant.
 */
export function updateVariantPrice(variantId: string, price: number): SceltaVariantStock {
  const state = getAdminStoreState();
  const existing = state.variantStocks[variantId];
  const safePrice = Math.max(0, Math.round(price * 100) / 100);
  const productId = existing?.productId;

  // Se la variante appartiene a un prodotto noto, il prezzo va nell'override
  // (unica fonte letta da vetrina e cassa) + giacenza, con patch a livello di campo.
  if (productId && productId !== "unknown") {
    const variants = effectiveVariants(state, productId);
    if (variants.some((v) => v.id === variantId)) {
      updateProductDetails(productId, {
        variants: variants.map((v) => (v.id === variantId ? { ...v, price: safePrice } : v)),
      });
      return getAdminStoreState().variantStocks[variantId];
    }
  }

  const now = new Date().toISOString();
  const updated: SceltaVariantStock = existing
    ? { ...existing, price: safePrice, updatedAt: now }
    : {
        variantId,
        productId: "unknown",
        sku: variantId,
        name: "Variante",
        stockQuantity: 10,
        stockStatus: "available",
        price: safePrice,
        updatedAt: now,
      };

  state.variantStocks[variantId] = updated;
  saveAdminStoreState(state);

  enqueueCatalogWrite(
    CATALOG_STOCK_API,
    { variantId, variantStock: { price: safePrice, productId: updated.productId }, seed: updated },
    updated.productId
  );

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

/** Copia profonda delle giacenze di un prodotto (per calcolare le differenze). */
function snapshotProductStocks(
  state: SceltaAdminStoreState,
  productId: string
): Record<string, SceltaVariantStock> {
  const out: Record<string, SceltaVariantStock> = {};
  for (const [vid, s] of Object.entries(state.variantStocks)) {
    if (s && s.productId === productId) out[vid] = JSON.parse(JSON.stringify(s)) as SceltaVariantStock;
  }
  return out;
}

/**
 * Differenze campo-per-campo tra giacenze prima/dopo. Restituisce solo i campi
 * realmente cambiati (+ productId) e i record completi come seed (usati dal
 * server SOLO se la riga non esiste ancora).
 */
function diffProductStocks(
  before: Record<string, SceltaVariantStock>,
  after: Record<string, SceltaVariantStock>
): {
  patches: Record<string, Partial<SceltaVariantStock>>;
  seeds: Record<string, SceltaVariantStock>;
} {
  const patches: Record<string, Partial<SceltaVariantStock>> = {};
  const seeds: Record<string, SceltaVariantStock> = {};
  for (const [vid, a] of Object.entries(after)) {
    const b = before[vid] as unknown as Record<string, unknown> | undefined;
    const diff: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(a as unknown as Record<string, unknown>)) {
      if (k === "updatedAt" || k === "variantId") continue;
      if (!b || !jsonEqual(val, b[k])) diff[k] = val;
    }
    if (Object.keys(diff).length > 0) {
      diff.productId = a.productId;
      patches[vid] = diff as Partial<SceltaVariantStock>;
      seeds[vid] = a;
    }
  }
  return { patches, seeds };
}

/**
 * Costruisce la PATCH cloud: SOLO i campi che l'operatrice ha davvero cambiato
 * rispetto a quanto vedeva il dispositivo. Così una vendita, una rettifica di
 * giacenza o una finestra aperta da tempo non reinviano mai prezzi/foto/nomi
 * vecchi sopra modifiche fatte altrove.
 */
function buildOverridePatch(
  productId: string,
  beforeOverride: Partial<Product> | undefined,
  normalizedUpdates: Partial<Product>,
  safeVariants: ProductVariant[] | undefined
): { patch: Record<string, unknown>; replaceVariants: boolean } {
  const rawProduct = (rawCatalog as Product[]).find((p) => p.id === productId);
  const beforeEffective = {
    ...((rawProduct || {}) as unknown as Record<string, unknown>),
    ...((beforeOverride || {}) as unknown as Record<string, unknown>),
  };

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(normalizedUpdates as Record<string, unknown>)) {
    if (k === "variants" || k === "_updatedAt" || k === "id" || v === undefined) continue;
    if (!jsonEqual(v, beforeEffective[k])) patch[k] = v;
  }

  let replaceVariants = false;
  if (safeVariants) {
    const beforeVariants: ProductVariant[] =
      (Array.isArray(beforeOverride?.variants) ? beforeOverride?.variants : undefined) ||
      rawProduct?.variants ||
      [];
    const beforeIds = beforeVariants.filter((v) => v && isNonEmptyString(v.id)).map((v) => v.id);
    const newIds = safeVariants.map((v) => v.id);
    const kept = beforeIds.filter((id) => newIds.includes(id));
    const added = newIds.filter((id) => !beforeIds.includes(id));
    const removed = kept.length !== beforeIds.length;
    const reordered = !jsonEqual(newIds, [...kept, ...added]);

    if (removed || reordered) {
      // Eliminazione/riordino varianti (azione esplicita in editor): elenco completo.
      patch.variants = safeVariants;
      replaceVariants = true;
    } else {
      const newPrice = typeof patch.price === "number" ? patch.price : undefined;
      const variantPatches: Array<Partial<ProductVariant>> = [];
      for (const v of safeVariants) {
        const b = beforeVariants.find((x) => x && x.id === v.id) as unknown as Record<string, unknown> | undefined;
        if (!b) {
          variantPatches.push(v);
          continue;
        }
        const diff: Record<string, unknown> = { id: v.id };
        for (const [k, val] of Object.entries(v as unknown as Record<string, unknown>)) {
          if (val === undefined) continue;
          if (!jsonEqual(val, b[k])) diff[k] = val;
        }
        // Prezzo prodotto cambiato: le varianti allineate lo ricevono esplicitamente.
        if (newPrice !== undefined && v.price === newPrice) diff.price = v.price;
        if (Object.keys(diff).length > 1) variantPatches.push(diff as Partial<ProductVariant>);
      }
      if (variantPatches.length > 0) patch.variants = variantPatches;
    }
  }

  return { patch, replaceVariants };
}

/**
 * Applica la modifica in locale (istantanea) e prepara il corpo della richiesta
 * cloud con le sole differenze. `body` è null se non è cambiato nulla.
 */
function applyProductUpdateLocally(
  productId: string,
  updates: Partial<Product>
): { merged: TimestampedProductOverride; isSaved: boolean; body: Record<string, unknown> | null } {
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

  const beforeOverride = state.productOverrides[productId]
    ? (JSON.parse(JSON.stringify(state.productOverrides[productId])) as Partial<Product>)
    : undefined;
  const beforeStocks = snapshotProductStocks(state, productId);

  const existing = state.productOverrides[productId] || {};
  const writeTimestamp = new Date().toISOString();
  const merged: TimestampedProductOverride = {
    ...existing,
    ...normalizedUpdates,
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

  const { patch, replaceVariants } = buildOverridePatch(productId, beforeOverride, normalizedUpdates, safeVariants);
  const { patches, seeds } = diffProductStocks(beforeStocks, snapshotProductStocks(state, productId));

  const hasOverridePatch = Object.keys(patch).length > 0;
  const hasStockPatch = Object.keys(patches).length > 0;
  const body =
    hasOverridePatch || hasStockPatch
      ? {
          productId,
          updates: patch,
          variantStocks: patches,
          variantStockSeeds: seeds,
          replaceVariants,
        }
      : null;

  return { merged, isSaved, body };
}

/**
 * Atomically updates product details (texts, photos, variants) and updates
 * synchronized variantStocks in the admin store. Emits scelta_admin_store_updated.
 *
 * Il cloud riceve SOLO i campi cambiati, tramite la coda persistente (consegna
 * garantita con ritentativi automatici, anche dopo un riavvio del browser).
 *
 * @param options.skipCloudSync When true, only the local store is updated.
 * @param options.baseline La copia del prodotto da cui il chiamante è partito:
 *   se presente, vengono applicati/inviati SOLO i campi cambiati rispetto ad essa.
 */
export function updateProductDetails(
  productId: string,
  updates: Partial<Product>,
  options?: { skipCloudSync?: boolean; baseline?: Partial<Product> | null }
): Partial<Product> & { error?: string } {
  const effectiveUpdates = options?.baseline
    ? resolveUpdatesAgainstBaseline(productId, updates, options.baseline)
    : updates;
  const { merged, isSaved, body } = applyProductUpdateLocally(productId, effectiveUpdates);

  if (!options?.skipCloudSync && body) {
    enqueueCatalogWrite(CATALOG_OVERRIDES_API, body, productId);
  }

  if (!isSaved) {
    return {
      ...merged,
      error: "Memoria del browser esaurita (QuotaExceeded). L'immagine caricata è troppo pesante.",
    };
  }
  return merged;
}

const CLOUD_PENDING_MESSAGE =
  "Modifica salvata su questo dispositivo ma NON ancora confermata dal cloud: il sistema riprova da solo ogni pochi secondi. Non svuotare la cache del browser finché l'indicatore di sincronizzazione non sparisce.";

function describeDeliveryFailure(error?: string): string {
  if (error && /^HTTP 4/.test(error)) {
    return `Il server ha rifiutato la modifica (${error}). Riprova o contatta l'assistenza.`;
  }
  return CLOUD_PENDING_MESSAGE;
}

/**
 * Saves product details to the cloud with a definitive, awaited result.
 *
 * Flow:
 *   1. Applies the change locally first (optimistic, instant UI update).
 *   2. Mette in coda la PATCH (solo campi cambiati) e ATTENDE la conferma del
 *      server, così la UI mostra un esito onesto.
 *   3. Se il server non risponde, la modifica resta in coda e viene ritentata
 *      automaticamente: non si perde mai.
 */
export async function saveProductDetailsToCloud(
  productId: string,
  updates: Partial<Product>,
  options?: { baseline?: Partial<Product> | null }
): Promise<{ success: boolean; error?: string }> {
  const effectiveUpdates = options?.baseline
    ? resolveUpdatesAgainstBaseline(productId, updates, options.baseline)
    : updates;
  const { isSaved, body } = applyProductUpdateLocally(productId, effectiveUpdates);
  if (!isSaved) {
    pruneOldLocalStorageArtifacts();
    const retry = saveAdminStoreState(getAdminStoreState());
    if (!retry) {
      return {
        success: false,
        error: "Memoria del browser esaurita (QuotaExceeded). Ricarica la pagina per liberare la cache.",
      };
    }
  }

  if (typeof window === "undefined") {
    return { success: true };
  }

  if (!body) {
    return { success: true };
  }

  // TENTATIVO ONLINE DIRETTO IMMEDIATO (Zero Attese di 15 secondi)
  if (typeof navigator === "undefined" || navigator.onLine) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(CATALOG_OVERRIDES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          success?: boolean;
          productOverrides?: Record<string, Partial<Product>>;
          variantStocks?: Record<string, SceltaVariantStock>;
        } | null;
        if (payload?.success) {
          applyConfirmedServerRows(payload);
          writeOutbox(readOutbox().filter((e) => e.productId !== productId));
          return { success: true };
        }
      }
    } catch {
      // Fallback trasparente su coda offline in caso di rete lenta o micro-disconnessione
    }
  }

  // FALLBACK OFFLINE: accoda in outbox e lancia il flush asincrono senza bloccare l'operatrice
  enqueueCatalogWrite(CATALOG_OVERRIDES_API, body, productId);
  void flushCatalogOutbox();
  return { success: true };
}

/**
 * Persists a batch of variant stock/price edits for a single product in ONE
 * atomic local pass and ONE cloud request (patch a livello di campo).
 *
 * Il prezzo viene scritto sia nella variante dell'override (fonte letta da
 * vetrina e cassa) sia nella giacenza.
 *
 * @returns `true` when the cloud write was confirmed, `false` otherwise (the
 *   change stays queued and is retried automatically).
 */
export async function batchUpdateProductVariants(
  productId: string,
  items: Array<{ variantId: string; stockQuantity?: number; price?: number }>
): Promise<boolean> {
  const state = getAdminStoreState();
  const validItems = items.filter((i) => i && isNonEmptyString(i.variantId));
  const byId = new Map(validItems.map((i) => [i.variantId, i]));
  const qtyOf = (n: number) => Math.max(0, Math.floor(n));
  const priceOf = (n: number) => Math.max(0, Math.round(n * 100) / 100);

  const variants = effectiveVariants(state, productId);
  const inVariantList = validItems.filter((i) => variants.some((v) => v.id === i.variantId));
  const orphanItems = validItems.filter((i) => !variants.some((v) => v.id === i.variantId));

  const entryIds: string[] = [];

  if (inVariantList.length > 0) {
    const nextVariants = variants.map((v) => {
      const item = byId.get(v.id);
      if (!item) return v;
      const next: ProductVariant = { ...v };
      if (typeof item.stockQuantity === "number") {
        next.stock = qtyOf(item.stockQuantity);
        next.inStock = next.stock > 0;
      }
      if (typeof item.price === "number") next.price = priceOf(item.price);
      return next;
    });
    const { body } = applyProductUpdateLocally(productId, { variants: nextVariants });
    if (body) entryIds.push(enqueueCatalogWrite(CATALOG_OVERRIDES_API, body, productId));
  }

  if (orphanItems.length > 0) {
    // Varianti presenti solo in giacenza (caso raro): patch diretta delle giacenze.
    const fresh = getAdminStoreState();
    const before = snapshotProductStocks(fresh, productId);
    const now = new Date().toISOString();
    for (const item of orphanItems) {
      const existing = fresh.variantStocks[item.variantId];
      const safeQuantity =
        typeof item.stockQuantity === "number" ? qtyOf(item.stockQuantity) : (existing?.stockQuantity ?? 0);
      const safePrice = typeof item.price === "number" ? priceOf(item.price) : (existing?.price ?? 0);
      fresh.variantStocks[item.variantId] = existing
        ? { ...existing, stockQuantity: safeQuantity, stockStatus: computeStockStatus(safeQuantity), price: safePrice, updatedAt: now }
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
    }
    markProductLocallyModified(productId);
    saveAdminStoreState(fresh);
    const { patches, seeds } = diffProductStocks(before, snapshotProductStocks(fresh, productId));
    if (Object.keys(patches).length > 0) {
      entryIds.push(
        enqueueCatalogWrite(
          CATALOG_OVERRIDES_API,
          { productId, updates: {}, variantStocks: patches, variantStockSeeds: seeds, replaceVariants: false },
          productId
        )
      );
    }
  }

  if (typeof window === "undefined") return true;

  // Avvia il flush in background senza bloccare la schermata con attese seriali
  void flushCatalogOutbox();
  return true;
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

  // Synchronize immediately to cloud (Supabase dedicato)
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
