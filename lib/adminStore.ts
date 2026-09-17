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

import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";

export const STORAGE_ADMIN_STORE_KEY = "scelta_makeup_admin_store_v2";

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
  id: string; // e.g. "SC-ORD-2026-0001"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: "processing" | "shipped" | "ready_for_pickup" | "completed" | "cancelled";
  fulfillmentType: "courier" | "store_pickup";
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
  const baseTime = Date.now();
  const h = 3600 * 1000;
  const d = 24 * h;

  return [
    {
      id: "SC-ORD-2026-0001",
      customerName: "Giulia Moretti",
      customerEmail: "giulia.moretti@example.com",
      customerPhone: "+39 349 765 4321",
      total: 60.5,
      status: "processing",
      fulfillmentType: "courier",
      shippingAddress: {
        street: "Via Chiaia 142",
        city: "Napoli",
        postalCode: "80121",
        province: "NA",
      },
      courierName: "BRT Express",
      items: [
        {
          productId: "diego-dalla-palma-rossetto-iconico",
          productTitle: "Rossetto Iconico Diego dalla Palma",
          variantName: "01 Rosso Rubino",
          quantity: 1,
          price: 24.5,
          image: "/products/diego-dalla-palma-rossetto-iconico.png",
        },
        {
          productId: "rvb-lab-fondotinta-antieta",
          productTitle: "Fondotinta Anti-Età Effetto Seta",
          variantName: "12 Warm Beige",
          quantity: 1,
          price: 36.0,
          image: "/products/rvb-lab-fondotinta-antieta.png",
        },
      ],
      createdAt: new Date(baseTime - 3 * h).toISOString(),
      updatedAt: new Date(baseTime - 3 * h).toISOString(),
    },
    {
      id: "SC-ORD-2026-0002",
      customerName: "Alessandra De Luca",
      customerEmail: "alessandra.deluca@example.com",
      customerPhone: "+39 338 123 9876",
      total: 36.0,
      status: "ready_for_pickup",
      fulfillmentType: "store_pickup",
      items: [
        {
          productId: "cipria-blush-setoso",
          productTitle: "Blush Compatto Effetto Velluto",
          variantName: "03 Pesca Dorato",
          quantity: 2,
          price: 18.0,
          image: "/products/cipria-blush-setoso.png",
        },
      ],
      createdAt: new Date(baseTime - 18 * h).toISOString(),
      updatedAt: new Date(baseTime - 2 * h).toISOString(),
    },
    {
      id: "SC-ORD-2026-0003",
      customerName: "Chiara Rossi",
      customerEmail: "chiara.rossi@example.com",
      customerPhone: "+39 333 456 7890",
      total: 84.0,
      status: "shipped",
      fulfillmentType: "courier",
      shippingAddress: {
        street: "Corso Trieste 45",
        city: "Caserta",
        postalCode: "81100",
        province: "CE",
      },
      trackingCode: "BRT-9921448102",
      courierName: "BRT Express",
      items: [
        {
          productId: "pierre-rene-palette-nude",
          productTitle: "Palette Ombretti Nude Elegance",
          variantName: "02 Velvet Taupe",
          quantity: 1,
          price: 49.0,
          image: "/products/pierre-rene-palette-nude.png",
        },
        {
          productId: "rvb-lab-mascara-alta-definizione",
          productTitle: "Mascara Alta Definizione Nero Intenso",
          variantName: "Nero Assoluto",
          quantity: 1,
          price: 35.0,
          image: "/products/rvb-lab-mascara-alta-definizione.png",
        },
      ],
      createdAt: new Date(baseTime - 1 * d).toISOString(),
      updatedAt: new Date(baseTime - 6 * h).toISOString(),
    },
    {
      id: "SC-ORD-2026-0004",
      customerName: "Valentina Romano",
      customerEmail: "valentina.romano@example.com",
      customerPhone: "+39 331 998 8776",
      total: 112.5,
      status: "completed",
      fulfillmentType: "courier",
      shippingAddress: {
        street: "Via dei Mercanti 12",
        city: "Salerno",
        postalCode: "84121",
        province: "SA",
      },
      trackingCode: "GLS-7729103982",
      courierName: "GLS Italy",
      items: [
        {
          productId: "diego-dalla-palma-siero-notte",
          productTitle: "Siero Rigenerante Notte Oro Puro",
          variantName: "Formato 30ml",
          quantity: 1,
          price: 78.0,
          image: "/products/diego-dalla-palma-siero-notte.png",
        },
        {
          productId: "cipria-crema-idratante",
          productTitle: "Crema Idratante Viso Comfort",
          variantName: "Formato 50ml",
          quantity: 1,
          price: 34.5,
          image: "/products/cipria-crema-idratante.png",
        },
      ],
      createdAt: new Date(baseTime - 3 * d).toISOString(),
      updatedAt: new Date(baseTime - 1 * d).toISOString(),
    },
    {
      id: "SC-ORD-2026-0005",
      customerName: "Martina Esposito",
      customerEmail: "martina.esposito@example.com",
      customerPhone: "+39 340 554 4332",
      total: 45.0,
      status: "ready_for_pickup",
      fulfillmentType: "store_pickup",
      items: [
        {
          productId: "eveline-drop-glow-illuminante",
          productTitle: "Illuminante Liquido Drop Glow",
          variantName: "01 Champagne Gold",
          quantity: 2,
          price: 22.5,
          image: "/products/eveline-drop-glow-illuminante.png",
        },
      ],
      createdAt: new Date(baseTime - 20 * h).toISOString(),
      updatedAt: new Date(baseTime - 4 * h).toISOString(),
    },
    {
      id: "SC-ORD-2026-0006",
      customerName: "Elena De Angelis",
      customerEmail: "elena.deangelis@example.com",
      customerPhone: "+39 328 667 8901",
      total: 78.0,
      status: "processing",
      fulfillmentType: "courier",
      shippingAddress: {
        street: "Via Cola di Rienzo 88",
        city: "Roma",
        postalCode: "00192",
        province: "RM",
      },
      courierName: "DHL Express",
      items: [
        {
          productId: "pierre-rene-cipria-hd",
          productTitle: "Cipria HD Fissante Invisibile",
          variantName: "Trasparente Opaco",
          quantity: 1,
          price: 42.0,
          image: "/products/pierre-rene-cipria-hd.png",
        },
        {
          productId: "diego-dalla-palma-matita-labbra",
          productTitle: "Matita Labbra Contorno Perfetto",
          variantName: "44 Nude Rose",
          quantity: 2,
          price: 18.0,
          image: "/products/diego-dalla-palma-matita-labbra.png",
        },
      ],
      createdAt: new Date(baseTime - 6 * h).toISOString(),
      updatedAt: new Date(baseTime - 6 * h).toISOString(),
    },
    {
      id: "SC-ORD-2026-0007",
      customerName: "Federica Gentile",
      customerEmail: "federica.gentile@example.com",
      customerPhone: "+39 339 443 2110",
      total: 142.0,
      status: "shipped",
      fulfillmentType: "courier",
      shippingAddress: {
        street: "Corso Italia 204",
        city: "Sorrento",
        postalCode: "80067",
        province: "NA",
      },
      trackingCode: "BRT-4410294819",
      courierName: "BRT Express",
      items: [
        {
          productId: "diego-dalla-palma-kit-sposa",
          productTitle: "Kit Make-up Sposa Luxury Edition",
          variantName: "Palette Completa & Primer",
          quantity: 1,
          price: 142.0,
          image: "/products/diego-dalla-palma-kit-sposa.png",
        },
      ],
      createdAt: new Date(baseTime - 2 * d).toISOString(),
      updatedAt: new Date(baseTime - 12 * h).toISOString(),
    },
    {
      id: "SC-ORD-2026-0008",
      customerName: "Serena Bianchi",
      customerEmail: "serena.bianchi@example.com",
      customerPhone: "+39 345 112 3344",
      total: 29.5,
      status: "completed",
      fulfillmentType: "store_pickup",
      items: [
        {
          productId: "miyo-gloss-volumizzante",
          productTitle: "Gloss Volumizzante Plump & Shine",
          variantName: "04 Candy Pink",
          quantity: 1,
          price: 14.5,
          image: "/products/miyo-gloss-volumizzante.png",
        },
        {
          productId: "miyo-matita-occhi",
          productTitle: "Matita Occhi Waterproof Gel",
          variantName: "Deep Black",
          quantity: 1,
          price: 15.0,
          image: "/products/miyo-matita-occhi.png",
        },
      ],
      createdAt: new Date(baseTime - 4 * d).toISOString(),
      updatedAt: new Date(baseTime - 2 * d).toISOString(),
    },
    {
      id: "SC-ORD-2026-0009",
      customerName: "Laura Ferrara",
      customerEmail: "laura.ferrara@example.com",
      customerPhone: "+39 334 991 2233",
      total: 32.0,
      status: "cancelled",
      fulfillmentType: "courier",
      shippingAddress: {
        street: "Via Toledo 210",
        city: "Napoli",
        postalCode: "80132",
        province: "NA",
      },
      items: [
        {
          productId: "cipria-fondotinta-compatto",
          productTitle: "Fondotinta Compatto Minerale",
          variantName: "02 Sabbia Calda",
          quantity: 1,
          price: 32.0,
          image: "/products/cipria-fondotinta-compatto.png",
        },
      ],
      createdAt: new Date(baseTime - 5 * d).toISOString(),
      updatedAt: new Date(baseTime - 4 * d).toISOString(),
    },
  ];
}

/**
 * Initial omnichannel CRM customer profiles combining e-commerce spend and salon appointments.
 */
export function generateInitialCustomers(): SceltaCrmCustomer[] {
  const baseTime = Date.now();
  const d = 24 * 3600 * 1000;

  return [
    {
      id: "crm-cust-001",
      name: "Chiara Rossi",
      email: "chiara.rossi@example.com",
      phone: "+39 333 456 7890",
      totalSpend: 189.5, // €144.50 orders + €45.00 Trucco Sposa appointment
      ordersCount: 2,
      appointmentsCount: 1,
      lastActive: new Date(baseTime - 1 * d).toISOString(),
      skinType: "Mista",
      preferredBrands: ["Pierre René", "RVB LAB", "Diego dalla Palma"],
      notes: "Pelle mista, predilige toni malva e rossetti no-transfer. Cerimonia di nozze per la sorella.",
    },
    {
      id: "crm-cust-002",
      name: "Alessandra De Luca",
      email: "alessandra.deluca@example.com",
      phone: "+39 338 123 9876",
      totalSpend: 71.0, // €36.00 order + €35.00 appointment
      ordersCount: 1,
      appointmentsCount: 1,
      lastActive: new Date(baseTime - 2 * d).toISOString(),
      skinType: "Secca",
      preferredBrands: ["Diego dalla Palma", "Cipria Make Up"],
      notes: "Cliente abituale quartiere Chiaia, preferisce formule idratanti e blush luminosi.",
    },
    {
      id: "crm-cust-003",
      name: "Giulia Moretti",
      email: "giulia.moretti@example.com",
      phone: "+39 349 765 4321",
      totalSpend: 210.5,
      ordersCount: 3,
      appointmentsCount: 0,
      lastActive: new Date(baseTime - 3 * 3600 * 1000).toISOString(),
      skinType: "Normale",
      preferredBrands: ["RVB LAB", "Diego dalla Palma"],
      notes: "Acquista con regolarità fondotinta RVB LAB tonalità 12 Warm Beige e rossetti iconici.",
    },
    {
      id: "crm-cust-004",
      name: "Valentina Romano",
      email: "valentina.romano@example.com",
      phone: "+39 331 998 8776",
      totalSpend: 202.5,
      ordersCount: 2,
      appointmentsCount: 1,
      lastActive: new Date(baseTime - 3 * d).toISOString(),
      skinType: "Sensibile / Reattiva",
      preferredBrands: ["Diego dalla Palma", "RVB LAB"],
      notes: "Pelle incline a rossori diffusi. Consigliati sieri lenitivi e formule ipoallergeniche certificate.",
    },
    {
      id: "crm-cust-005",
      name: "Martina Esposito",
      email: "martina.esposito@example.com",
      phone: "+39 340 554 4332",
      totalSpend: 85.0,
      ordersCount: 1,
      appointmentsCount: 1,
      lastActive: new Date(baseTime - 4 * 3600 * 1000).toISOString(),
      skinType: "Grassa con pori visibili",
      preferredBrands: ["Eveline Cosmetics", "Miyo"],
      notes: "Ama make-up opaco a lunga tenuta. Ritiro sempre comodo in boutique.",
    },
    {
      id: "crm-cust-006",
      name: "Valeria Esposito",
      email: "valeria.esposito@example.com",
      phone: "+39 347 112 2334",
      totalSpend: 81.0,
      ordersCount: 0,
      appointmentsCount: 2,
      lastActive: new Date(baseTime - 5 * d).toISOString(),
      skinType: "Disidratata",
      preferredBrands: ["Diego dalla Palma"],
      notes: "Molto legata ai trattamenti cabina dermo-rigeneranti eseguiti da Federica.",
    },
    {
      id: "crm-cust-007",
      name: "Serena Bianchi",
      email: "serena.bianchi@example.com",
      phone: "+39 345 112 3344",
      totalSpend: 29.5,
      ordersCount: 1,
      appointmentsCount: 0,
      lastActive: new Date(baseTime - 4 * d).toISOString(),
      skinType: "Normale",
      preferredBrands: ["Miyo"],
      notes: "Passa spesso durante la pausa pranzo in store per novità labbra e gloss rimpolpanti.",
    },
  ];
}

/**
 * Creates the initial default state object.
 */
export function getDefaultAdminStoreState(): SceltaAdminStoreState {
  return {
    version: 2,
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
    // Purge old v1 random mock storage if present
    localStorage.removeItem("scelta_makeup_admin_store_v1");

    const raw = localStorage.getItem(STORAGE_ADMIN_STORE_KEY);
    if (!raw) {
      const defaultState = getDefaultAdminStoreState();
      saveAdminStoreState(defaultState);
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.variantStocks || (parsed.version || 0) < 2) {
      const defaultState = getDefaultAdminStoreState();
      saveAdminStoreState(defaultState);
      return defaultState;
    }

    if (!parsed.productOverrides || typeof parsed.productOverrides !== "object") {
      parsed.productOverrides = {};
    }

    // Auto-heal variant stock images against verified catalog to purge any stale client cache
    if (parsed.variantStocks && typeof parsed.variantStocks === "object") {
      const products = rawCatalog as Product[];
      for (const vStock of Object.values(parsed.variantStocks as Record<string, SceltaVariantStock>)) {
        if (!vStock || !vStock.productId) continue;
        const prod = products.find(p => p.id === vStock.productId);
        if (prod) {
          const freshVariant = prod.variants?.find(v => v.id === vStock.variantId);
          const freshImg = freshVariant?.image || (prod.images && prod.images[0]);
          if (freshImg && vStock.image !== freshImg) {
            vStock.image = freshImg;
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

export function saveAdminStoreState(state: SceltaAdminStoreState): void {
  memoryAdminStore = state;

  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_ADMIN_STORE_KEY, JSON.stringify(state));
    // Emit notification event for any listening reactive React components
    window.dispatchEvent(new CustomEvent("scelta_admin_store_updated", { detail: { timestamp: Date.now() } }));
  } catch (error) {
    console.error("[SceltaAdminStore] Error writing to localStorage:", error);
  }
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
 */
export function updateProductDetails(
  productId: string,
  updates: Partial<Product>
): Partial<Product> {
  const state = getAdminStoreState();
  if (!state.productOverrides) {
    state.productOverrides = {};
  }

  const existing = state.productOverrides[productId] || {};
  const merged: Partial<Product> = {
    ...existing,
    ...updates,
  };

  state.productOverrides[productId] = merged;

  // Synchronize variant stocks if relevant product metadata or variants were updated
  const now = new Date().toISOString();
  const rawProduct = (rawCatalog as Product[]).find((p) => p.id === productId);

  // If variants array is explicitly passed in updates, update/add corresponding variantStocks
  if (updates.variants && Array.isArray(updates.variants)) {
    for (const v of updates.variants) {
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

  saveAdminStoreState(state);
  return merged;
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
  return updated;
}

/**
 * Creates a new admin order. Automatically generates an order number if omitted.
 */
export function createAdminOrder(
  orderInput: Partial<SceltaAdminOrder> & {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    total: number;
    items: SceltaAdminOrder["items"];
  }
): SceltaAdminOrder {
  const state = getAdminStoreState();
  const now = new Date().toISOString();
  const nextSeq = state.orders.length + 1;
  const orderNumber = orderInput.id || `SC-ORD-2026-${nextSeq.toString().padStart(4, "0")}`;

  const newOrder: SceltaAdminOrder = {
    id: orderNumber,
    customerName: orderInput.customerName,
    customerEmail: orderInput.customerEmail,
    customerPhone: orderInput.customerPhone,
    total: Math.round(orderInput.total * 100) / 100,
    status: orderInput.status || "processing",
    fulfillmentType: orderInput.fulfillmentType || "courier",
    shippingAddress: orderInput.shippingAddress,
    trackingCode: orderInput.trackingCode,
    courierName: orderInput.courierName || (orderInput.fulfillmentType === "store_pickup" ? undefined : "BRT Express"),
    items: orderInput.items,
    createdAt: orderInput.createdAt || now,
    updatedAt: now,
  };

  state.orders = [newOrder, ...state.orders];
  saveAdminStoreState(state);
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
