import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type Stripe from "stripe";
import rawCatalog from "../data/catalog.json";
import type { Product } from "../types/product";
import { mergeProductWithOverride } from "../lib/catalogMerge";
import { resolveStockDeductions } from "../lib/orderFulfillment";

const ROOT = path.resolve(__dirname, "..");

describe("Storefront Hardening & Order Fulfillment", () => {
  it("strips orphan /products/ gallery URLs when all variants use salone-federica/ images", () => {
    const base = (rawCatalog as Product[]).find((p) => p.id === "cipria-71729");
    assert.ok(base, "cipria-71729 must exist in catalog.json");

    const merged = mergeProductWithOverride(base, {
      images: [
        "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-71729-1790778910901.jpg",
        "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/products/pierre-rene-eveline-cosmetics-precise-slim-eyeliner-waterproof-nero-10.jpg",
      ],
      variants: [
        {
          id: "var-3700467829264",
          name: "10",
          sku: "3700467829264",
          ean: "3700467829264",
          colorHex: "#000000",
          image:
            "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-71729-1790778910901.jpg",
          inStock: true,
          stock: 5,
          price: 12.3,
        },
        {
          id: "var-3700467829288",
          name: "12",
          sku: "3700467829288",
          ean: "3700467829288",
          colorHex: "#000000",
          image:
            "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-71729-1790778816801.jpg",
          inStock: true,
          stock: 4,
          price: 12.3,
        },
      ],
    });

    assert.strictEqual(merged.images.length, 1);
    assert.ok(merged.images[0].includes("salone-federica/"));
    assert.ok(!merged.images.some((u) => u.includes("/products/")));
  });

  it("resolves stock deductions from session.metadata.stockItems and falls back to catalog matching", () => {
    const products = rawCatalog as Product[];

    const sessionWithMeta = {
      metadata: {
        stockItems: JSON.stringify([
          { vid: "var-5901761952162", qty: 1 },
          { vid: "var-5901761952162", qty: 2 },
        ]),
      },
    } as unknown as Stripe.Checkout.Session;

    const fromMeta = resolveStockDeductions(sessionWithMeta, [], products);
    assert.deepStrictEqual(fromMeta, [
      { variantId: "var-5901761952162", quantity: 3 },
    ]);

    const sessionNoMeta = { metadata: {} } as unknown as Stripe.Checkout.Session;
    const fromFallback = resolveStockDeductions(
      sessionNoMeta,
      [
        {
          productId: "cipria-70863",
          productTitle: "Eveline Varietè Satin Matt",
          variantName: "04",
          quantity: 1,
          price: 7.4,
        },
        {
          productId: "ddp-pf00985",
          productTitle: "Icon Time Trattamento Concentrato Ridensificante - Formato Cabina Salone",
          quantity: 2,
          price: 32,
        },
      ],
      products
    );

    assert.deepStrictEqual(fromFallback, [
      { variantId: "var-5901761952162", quantity: 1 },
      { variantId: "var-pf00985", quantity: 2 },
    ]);
  });

  it("enforces HTTP 409 stock guards & stockItems metadata in app/api/checkout/route.ts", () => {
    const code = fs.readFileSync(
      path.join(ROOT, "app", "api", "checkout", "route.ts"),
      "utf8"
    );
    assert.ok(code.includes("status: 409"));
    assert.ok(code.includes("è attualmente esaurito."));
    assert.ok(code.includes("Disponibilità insufficiente"));
    assert.ok(code.includes("requestedQtyByKey"));
    assert.ok(code.includes("stockItems:"));
  });

  it("enforces Stripe line_items truth, fresh order reads, and idempotent side effects in confirm & webhook", () => {
    const confirmCode = fs.readFileSync(
      path.join(ROOT, "app", "api", "orders", "confirm", "route.ts"),
      "utf8"
    );
    assert.ok(confirmCode.includes("getCentralOrders({ fresh: true })"));
    assert.ok(
      confirmCode.includes("stripeLineItems.length > 0 ? stripeLineItems : sanitizedPendingItems")
    );
    assert.ok(confirmCode.includes("applyPaidOrderSideEffects"));

    const webhookCode = fs.readFileSync(
      path.join(ROOT, "app", "api", "webhooks", "stripe", "route.ts"),
      "utf8"
    );
    assert.ok(webhookCode.includes("getCentralOrders({ fresh: true })"));
    assert.ok(webhookCode.includes("applyPaidOrderSideEffects"));
  });

  it("disables Quick-Add on ProductCard when selected variant/product is out of stock", () => {
    const cardCode = fs.readFileSync(
      path.join(ROOT, "components", "ProductCard.tsx"),
      "utf8"
    );
    assert.ok(cardCode.includes("isOutOfStock"));
    assert.ok(cardCode.includes("if (isOutOfStock) return;"));
    assert.ok(cardCode.includes("disabled={isOutOfStock}"));
  });
});
