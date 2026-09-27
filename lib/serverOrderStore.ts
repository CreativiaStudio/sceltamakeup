/**
 * Scelta Makeup — Centralized Cloud Orders Persistence (Server-Only)
 * Module: lib/serverOrderStore.ts
 *
 * Single source of truth for all boutique orders and in-store Cassa RT receipts,
 * synchronized across all devices (remote admin + in-store POS laptop in Naples).
 *
 * Backend (isolato):
 *   - Dedicated Supabase project (`zsycaulbamdxqhcukrvn`), table
 *     `scelta_admin_orders` (id, data JSONB, status, created_at, updated_at).
 *     Nessuna dipendenza da hub o progetti esterni.
 *
 * Features:
 *   - Promise write queue to serialize concurrent checkouts (zero lost updates).
 *   - Fast in-memory cache with 3s TTL for instant queries.
 *   - Robust reconciliation that prevents duplicate order IDs.
 */

import type { SceltaAdminOrder } from "@/lib/adminStore";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const DEDICATED_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ORDERS_TABLE = "scelta_admin_orders";
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

function sortOrders(orders: SceltaAdminOrder[]): SceltaAdminOrder[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

/** Maps a domain order to the `scelta_admin_orders` row shape. */
function toRow(order: SceltaAdminOrder): Record<string, unknown> {
  return {
    id: order.id,
    data: order,
    status: order.status ?? null,
    created_at: order.createdAt,
    updated_at: order.updatedAt || order.createdAt,
  };
}

async function readFromDedicated(): Promise<SceltaAdminOrder[] | null> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return null;
  try {
    const url = `${DEDICATED_URL}/rest/v1/${ORDERS_TABLE}?select=data&order=created_at.desc`;
    const res = await fetch(url, {
      method: "GET",
      headers: headersFor(DEDICATED_SERVICE_KEY),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[serverOrderStore] Read error: HTTP", res.status, res.statusText);
      return null;
    }

    const rows = (await res.json()) as Array<{ data?: SceltaAdminOrder }>;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => r?.data)
      .filter((o): o is SceltaAdminOrder => Boolean(o && typeof o === "object"));
  } catch (err) {
    console.error("[serverOrderStore] Read error:", err);
    return null;
  }
}

async function upsertRows(rows: Array<Record<string, unknown>>): Promise<boolean> {
  if (rows.length === 0) return true;
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${DEDICATED_URL}/rest/v1/${ORDERS_TABLE}`, {
      method: "POST",
      headers: {
        ...headersFor(DEDICATED_SERVICE_KEY),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    });
    return res.ok;
  } catch (err) {
    console.error("[serverOrderStore] Write error:", err);
    return false;
  }
}

async function patchRow(order: SceltaAdminOrder): Promise<boolean> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return false;
  try {
    const url = `${DEDICATED_URL}/rest/v1/${ORDERS_TABLE}?id=eq.${encodeURIComponent(order.id)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        ...headersFor(DEDICATED_SERVICE_KEY),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        data: order,
        status: order.status ?? null,
        updated_at: order.updatedAt || order.createdAt,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[serverOrderStore] PATCH error:", err);
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

  const read = await readFromDedicated();
  const orders = sortOrders(read ?? memoryCache ?? []);

  memoryCache = orders;
  cacheFetchedAt = Date.now();
  return orders;
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

    const updated = sortOrders(Array.from(map.values()));

    const ok = await upsertRows([toRow(safeOrder)]);
    if (ok) {
      memoryCache = updated;
      cacheFetchedAt = Date.now();
    }

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

    const updated = sortOrders(Array.from(map.values()));
    const rows = ordersBatch.map((o) => toRow(normalizeOrder(o)));

    const ok = await upsertRows(rows);
    if (ok) {
      memoryCache = updated;
      cacheFetchedAt = Date.now();
    }

    return updated;
  });
}

export async function updateCentralOrderStatus(
  orderId: string,
  status: SceltaAdminOrder["status"]
): Promise<SceltaAdminOrder[]> {
  return enqueue(async () => {
    const current = await getCentralOrders();
    let target: SceltaAdminOrder | undefined;

    const updated = current.map((o) => {
      if (o.id.toLowerCase() === orderId.toLowerCase()) {
        target = { ...o, status, updatedAt: new Date().toISOString() };
        return target;
      }
      return o;
    });

    if (target) {
      const ok = await patchRow(target);
      if (ok) {
        memoryCache = sortOrders(updated);
        cacheFetchedAt = Date.now();
      }
    }

    return sortOrders(updated);
  });
}
