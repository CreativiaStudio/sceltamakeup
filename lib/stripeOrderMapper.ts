/**
 * Scelta Makeup — Mapping Stripe Checkout Session -> SceltaAdminOrder (Server-Only)
 * Module: lib/stripeOrderMapper.ts
 *
 * Converte i `line_items` e i dettagli di spedizione di Stripe nel formato
 * canonico `SceltaAdminOrder`, abbinando i prodotti al catalogo locale per
 * recuperare `productId` e `image` reali anche in assenza di bozza client
 * (es. ritorno da PayPal su iOS/Safari o salvataggio diretto via webhook).
 */

import type Stripe from "stripe";
import type { SceltaAdminOrder } from "@/lib/adminStore";
import type { Product } from "@/types/product";

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanVariantLabel(rawVariant: string): string | undefined {
  const cleaned = rawVariant.replace(/\s*-\s*null$/i, "").trim();
  if (!cleaned || cleaned.toLowerCase() === "standard") return undefined;
  return cleaned;
}

/**
 * Converte i `line_items` di Stripe Checkout in voci `SceltaAdminOrder["items"]`,
 * escludendo le righe di spedizione e risolvendo `productId` e `image` dal catalogo.
 */
export function mapStripeLineItemsToOrderItems(
  lineItems: Stripe.LineItem[] | undefined | null,
  catalogProducts: Product[]
): SceltaAdminOrder["items"] {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return [];

  const out: SceltaAdminOrder["items"] = [];

  for (const li of lineItems) {
    const desc = (li.description || "").trim();
    if (!desc || /^spedizione\b/i.test(desc) || /\bspedizione\s+(standard|gratuita|corriere)/i.test(desc)) {
      continue;
    }

    const parts = desc.split(" — ");
    const title = (parts[0] || desc).trim();
    const rawVariant = parts.slice(1).join(" — ").trim();
    const variantName = rawVariant ? cleanVariantLabel(rawVariant) : undefined;

    const quantity = li.quantity && li.quantity > 0 ? Math.floor(li.quantity) : 1;
    const totalCents = typeof li.amount_total === "number" ? li.amount_total : 0;
    const unitPrice = Math.round(((totalCents / 100) / quantity) * 100) / 100;

    const normTitle = norm(title);
    const matchedProduct =
      catalogProducts.find((p) => norm(p.name) === normTitle) ||
      catalogProducts.find((p) => {
        const pNorm = norm(p.name);
        return pNorm.length > 0 && (pNorm.includes(normTitle) || normTitle.includes(pNorm));
      });

    let image = matchedProduct?.images?.[0];
    if (matchedProduct && variantName && Array.isArray(matchedProduct.variants)) {
      const normVar = norm(variantName);
      const matchedVariant = matchedProduct.variants.find((v) => {
        const vNorm = norm(v.name);
        return vNorm === normVar || (normVar.length > 0 && vNorm.includes(normVar));
      });
      if (matchedVariant?.image) image = matchedVariant.image;
    }

    out.push({
      productId: matchedProduct?.id || li.id || `stripe-item-${out.length + 1}`,
      productTitle: matchedProduct?.name || title,
      ...(variantName ? { variantName } : {}),
      quantity,
      price: unitPrice,
      ...(image ? { image } : {}),
    });
  }

  return out;
}

/**
 * Estrae l'indirizzo di spedizione da `collected_information.shipping_details.address`
 * (o `customer_details.address` come fallback) di una sessione Stripe.
 */
export function extractStripeShippingAddress(
  session: Stripe.Checkout.Session
): SceltaAdminOrder["shippingAddress"] | undefined {
  const addr =
    session.collected_information?.shipping_details?.address ??
    session.customer_details?.address;

  const street = addr?.line1?.trim() || "";
  if (!street) return undefined;

  return {
    street: addr?.line2?.trim() ? `${street}, ${addr.line2.trim()}` : street,
    city: addr?.city?.trim() || "Napoli",
    postalCode: addr?.postal_code?.trim() || "",
    province: addr?.state?.trim() || "",
  };
}
