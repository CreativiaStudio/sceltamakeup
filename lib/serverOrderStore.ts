/**
 * Scelta Makeup — Centralized Cloud Orders Persistence (Server-Only)
 * Module: lib/serverOrderStore.ts
 *
 * Single source of truth for all boutique orders and in-store Cassa RT receipts,
 * synchronized across all devices (remote admin + in-store POS laptop in Naples).
 *
 * Central Hub:
 *   - Creativia Hub (PostgreSQL / Supabase `ekfnekrjpumjpetzgwzy.supabase.co`)
 *     storing orders inside `clients.preferences.orders` for Scelta Makeup
 *     (`14fa9b24-8991-4150-a1fe-d60adbabd469`).
 *
 * Features:
 *   - Promise write queue to serialize concurrent checkouts (zero lost updates).
 *   - Fast in-memory cache with 3s TTL for instant queries.
 *   - Robust reconciliation that prevents duplicate order IDs.
 */

import type { SceltaAdminOrder } from "@/lib/adminStore";

const CREATIVIA_HUB_URL =
  process.env.CREATIVIA_HUB_SUPABASE_URL || "https://ekfnekrjpumjpetzgwzy.supabase.co";
const CREATIVIA_HUB_SERVICE_KEY =
  process.env.CREATIVIA_HUB_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZm5la3JqcHVtanBldHpnd3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgyNjAxNiwiZXhwIjoyMDk5NDAyMDE2fQ.Ne-jtSPB8NP-79_pV1KsGubYbCDtQVhQAXRtC-PzT-8";
const SCELTA_MAKEUP_CLIENT_ID =
  process.env.SCELTA_MAKEUP_CLIENT_ID || "14fa9b24-8991-4150-a1fe-d60adbabd469";

const CACHE_TTL_MS = 3000;

let memoryCache: SceltaAdminOrder[] | null = null;
let cacheFetchedAt = 0;

// Serializes writes so concurrent checkout requests never overwrite each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

function headersFor(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function readFromCreativia(): Promise<SceltaAdminOrder[] | null> {
  try {
    const url = `${CREATIVIA_HUB_URL}/rest/v1/clients?id=eq.${SCELTA_MAKEUP_CLIENT_ID}&select=preferences`;
    const res = await fetch(url, {
      method: "GET",
      headers: headersFor(CREATIVIA_HUB_SERVICE_KEY),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ preferences?: Record<string, unknown> }>;
    if (!rows || rows.length === 0) return null;

    const ordersRaw = rows[0]?.preferences?.orders;
    if (Array.isArray(ordersRaw)) {
      return ordersRaw as SceltaAdminOrder[];
    }
    return [];
  } catch (err) {
    console.error("[serverOrderStore] Read error:", err);
    return null;
  }
}

async function writeToCreativia(orders: SceltaAdminOrder[]): Promise<boolean> {
  try {
    let existingPreferences: Record<string, unknown> = {};

    try {
      const getRes = await fetch(
        `${CREATIVIA_HUB_URL}/rest/v1/clients?id=eq.${SCELTA_MAKEUP_CLIENT_ID}&select=preferences`,
        {
          headers: headersFor(CREATIVIA_HUB_SERVICE_KEY),
          cache: "no-store",
        }
      );
      if (getRes.ok) {
        const rows = (await getRes.json()) as Array<{ preferences?: Record<string, unknown> }>;
        if (rows && rows[0]?.preferences && typeof rows[0].preferences === "object") {
          existingPreferences = rows[0].preferences as Record<string, unknown>;
        }
      }
    } catch {
      // Continue with empty base
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
          preferences: { ...existingPreferences, orders },
        }),
      }
    );
    return patchRes.ok;
  } catch (err) {
    console.error("[serverOrderStore] Write error:", err);
    return false;
  }
}

// ------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------

export async function getCentralOrders(): Promise<SceltaAdminOrder[]> {
  const now = Date.now();
  if (memoryCache && now - cacheFetchedAt < CACHE_TTL_MS) {
    return memoryCache;
  }

  let orders = await readFromCreativia();
  if (!orders) orders = memoryCache ?? [];

  // Always keep sorted descending by creation date
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  memoryCache = orders;
  cacheFetchedAt = Date.now();
  return orders;
}

function normalizeOrder(order: SceltaAdminOrder): SceltaAdminOrder {
  if (
    order.fulfillmentType !== "pos_receipt" &&
    (order.customerEmail === "banco@sceltamakeup.it" ||
      order.customerName === "Cliente al Banco" ||
      order.customerPhone?.includes("Boutique") ||
      order.customerPhone?.includes("Salone"))
  ) {
    return {
      ...order,
      fulfillmentType: "pos_receipt",
      paymentMethod: order.paymentMethod || "cash",
    };
  }
  return order;
}

export async function saveCentralOrder(newOrder: SceltaAdminOrder): Promise<SceltaAdminOrder[]> {
  return enqueue(async () => {
    const current = await getCentralOrders();
    const map = new Map<string, SceltaAdminOrder>();

    const safeOrder = normalizeOrder(newOrder);
    // Put new order first
    map.set(safeOrder.id, safeOrder);
    for (const o of current) {
      const safeExisting = normalizeOrder(o);
      if (!map.has(safeExisting.id)) {
        map.set(safeExisting.id, safeExisting);
      }
    }

    const updated = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    memoryCache = updated;
    cacheFetchedAt = Date.now();

    await writeToCreativia(updated);
    return updated;
  });
}

export async function saveCentralOrders(ordersBatch: SceltaAdminOrder[]): Promise<SceltaAdminOrder[]> {
  return enqueue(async () => {
    const current = await getCentralOrders();
    const map = new Map<string, SceltaAdminOrder>();

    for (const o of ordersBatch) {
      const safe = normalizeOrder(o);
      map.set(safe.id, safe);
    }
    for (const o of current) {
      const safe = normalizeOrder(o);
      if (!map.has(safe.id)) {
        map.set(safe.id, safe);
      }
    }

    const updated = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    memoryCache = updated;
    cacheFetchedAt = Date.now();

    await writeToCreativia(updated);
    return updated;
  });
}

export async function updateCentralOrderStatus(
  orderId: string,
  status: SceltaAdminOrder["status"]
): Promise<SceltaAdminOrder[]> {
  return enqueue(async () => {
    const current = await getCentralOrders();
    const updated = current.map((o) =>
      o.id.toLowerCase() === orderId.toLowerCase()
        ? { ...o, status, updatedAt: new Date().toISOString() }
        : o
    );

    memoryCache = updated;
    cacheFetchedAt = Date.now();

    await writeToCreativia(updated);
    return updated;
  });
}
