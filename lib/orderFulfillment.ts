/**
 * Scelta Makeup — Idempotent Online Order Fulfillment (Server-Only)
 * Module: lib/orderFulfillment.ts
 *
 * Garantisce che per ogni sessione Stripe pagata:
 *  1. Un solo worker (webhook o /api/orders/confirm) vinca il lock atomico su Supabase.
 *  2. Le quantità vendute vengano scalate una sola volta da `scelta_variant_stocks`.
 *  3. L'eventuale coupon venga incrementato una sola volta.
 */

import type Stripe from "stripe";
import type { SceltaAdminOrder } from "@/lib/adminStore";
import type { Product } from "@/types/product";
import { saveVariantStock } from "@/lib/serverCatalogStore";
import { incrementCouponUsage } from "@/lib/serverCouponStore";

const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AUDIT_TABLE = "scelta_audit_log";

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Acquisisce un lock atomico su `scelta_audit_log` per la sessione Stripe.
 * Restituisce `true` solo per il primo chiamante assoluto (zero doppi scarichi).
 */
export async function claimStripeFulfillmentLock(
  sessionId: string,
  orderId: string,
  summary: string
): Promise<boolean> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY || !sessionId) {
    return false;
  }

  const lockId = `stripe_fulfill_${sessionId}`;
  const now = new Date().toISOString();

  try {
    const res = await fetch(`${DEDICATED_URL}/rest/v1/${AUDIT_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: DEDICATED_SERVICE_KEY,
        Authorization: `Bearer ${DEDICATED_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          id: lockId,
          ts: now,
          payload: {
            id: lockId,
            timestamp: now,
            category: "vendita",
            action: "online_order_stock_deducted",
            title: "Scarico Automatico Ordine Online",
            description: `Ordine ${orderId} confermato su Stripe (${summary})`,
            operator: "E-Commerce Stripe (Automatico)",
            device: "Server Vercel",
            details: { orderId, stripeSessionId: sessionId },
          },
        },
      ]),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[orderFulfillment] Lock insert HTTP error:", res.status);
      return false;
    }

    const rows = (await res.json()) as unknown[];
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    console.error("[orderFulfillment] Lock error:", err);
    return false;
  }
}

/**
 * Ricava la lista `{ variantId, quantity }` da scalare a magazzino.
 * Usa prima `session.metadata.stockItems` (esatto al checkout) e ricade
 * sul matching catalogo da `orderItems` se i metadata sono assenti/troncati.
 */
export function resolveStockDeductions(
  session: Stripe.Checkout.Session,
  orderItems: SceltaAdminOrder["items"],
  catalogProducts: Product[]
): Array<{ variantId: string; quantity: number }> {
  const aggregated = new Map<string, number>();

  const rawMeta = session.metadata?.stockItems;
  if (typeof rawMeta === "string" && rawMeta.trim()) {
    try {
      const parsed = JSON.parse(rawMeta) as Array<{ vid?: unknown; qty?: unknown }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const entry of parsed) {
          const vid = typeof entry?.vid === "string" ? entry.vid.trim() : "";
          const qty = Number(entry?.qty);
          if (vid && Number.isInteger(qty) && qty > 0) {
            aggregated.set(vid, (aggregated.get(vid) ?? 0) + qty);
          }
        }
        if (aggregated.size > 0) {
          return Array.from(aggregated.entries()).map(([variantId, quantity]) => ({
            variantId,
            quantity,
          }));
        }
      }
    } catch {
      // Fallback al matching catalogo qui sotto
    }
  }

  for (const item of orderItems) {
    const qty = Number(item?.quantity);
    if (!Number.isInteger(qty) || qty <= 0) continue;

    const product =
      catalogProducts.find((p) => p.id === item.productId) ||
      catalogProducts.find((p) => norm(p.name) === norm(item.productTitle));

    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
      continue;
    }

    let matchedVariant = product.variants.length === 1 ? product.variants[0] : undefined;
    if (item.variantName) {
      const targetVar = norm(item.variantName);
      matchedVariant =
        product.variants.find((v) => norm(v.name) === targetVar) ||
        product.variants.find((v) => {
          const vn = norm(v.name);
          return vn.length > 0 && (vn.includes(targetVar) || targetVar.includes(vn));
        }) ||
        matchedVariant;
    }

    if (matchedVariant?.id) {
      aggregated.set(matchedVariant.id, (aggregated.get(matchedVariant.id) ?? 0) + qty);
    }
  }

  return Array.from(aggregated.entries()).map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}

/**
 * Esegue in modo idempotente (una sola volta per sessione Stripe) lo scarico
 * giacenze su `scelta_variant_stocks` e l'incremento utilizzo coupon.
 */
export async function applyPaidOrderSideEffects(params: {
  session: Stripe.Checkout.Session;
  orderId: string;
  orderItems: SceltaAdminOrder["items"];
  catalogProducts: Product[];
  couponCode?: string;
}): Promise<{ claimed: boolean; deductedCount: number }> {
  const { session, orderId, orderItems, catalogProducts, couponCode } = params;
  const summary = orderItems
    .map((i) => `${i.productTitle}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity}`)
    .join(", ")
    .slice(0, 220);

  const claimed = await claimStripeFulfillmentLock(session.id, orderId, summary);
  if (!claimed) {
    return { claimed: false, deductedCount: 0 };
  }

  const deductions = resolveStockDeductions(session, orderItems, catalogProducts);
  let deductedCount = 0;

  for (const { variantId, quantity } of deductions) {
    try {
      await saveVariantStock({ variantId, delta: -quantity });
      deductedCount += quantity;
    } catch (err) {
      console.error(
        `[orderFulfillment] Errore scarico giacenza variante ${variantId} (-${quantity}):`,
        err
      );
    }
  }

  if (couponCode) {
    try {
      await incrementCouponUsage(couponCode);
    } catch (err) {
      console.error(`[orderFulfillment] Errore incremento coupon ${couponCode}:`, err);
    }
  }

  return { claimed: true, deductedCount };
}
