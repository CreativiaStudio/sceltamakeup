import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type Stripe from "stripe";
import { catalog } from "../lib/catalog";
import {
  extractStripeShippingAddress,
  mapStripeLineItemsToOrderItems,
} from "../lib/stripeOrderMapper";

const ROOT = path.resolve(__dirname, "..");

describe("Stripe & PayPal Order Recovery Mapper", () => {
  it("should map real Stripe Checkout line_items to catalog items and skip shipping lines", () => {
    const mockLineItems = [
      {
        id: "li_1",
        description: "GIVE ME MORE Mascara volume panoramico — Standard",
        quantity: 1,
        amount_total: 2550,
      },
      {
        id: "li_2",
        description: "Matita Labbra Water Resistant E Long Lasting — 31 - Nude Rosato",
        quantity: 1,
        amount_total: 2090,
      },
      {
        id: "li_3",
        description: "Balsamo labbra volumizzante — 43 - null",
        quantity: 1,
        amount_total: 2490,
      },
      {
        id: "li_4",
        description: "Pierre René Vinyl Liquid Lipstick — 04",
        quantity: 1,
        amount_total: 1500,
      },
      {
        id: "li_5",
        description: "Fondotinta HD Effetto lifting — 63 - crema",
        quantity: 1,
        amount_total: 3990,
      },
      {
        id: "li_6",
        description:
          "Icon Time Trattamento Concentrato Ridensificante - Formato Cabina Salone — Formato Originale",
        quantity: 1,
        amount_total: 3200,
      },
      {
        id: "li_ship",
        description: "Spedizione Standard Italia",
        quantity: 1,
        amount_total: 490,
      },
    ] as unknown as Stripe.LineItem[];

    const mapped = mapStripeLineItemsToOrderItems(mockLineItems, catalog);
    assert.strictEqual(mapped.length, 6);
    assert.strictEqual(mapped[0].productId, "rvb-give-me-more-mascara-volume-panoramico");
    assert.strictEqual(mapped[0].variantName, undefined);
    assert.strictEqual(mapped[0].price, 25.5);
    assert.ok(mapped[0].image);

    assert.strictEqual(mapped[2].variantName, "43");
    assert.strictEqual(mapped[3].productId, "cipria-70863");
    assert.strictEqual(mapped[5].productId, "ddp-pf00985");
  });

  it("should extract shipping address from collected_information or customer_details", () => {
    const session = {
      collected_information: {
        shipping_details: {
          address: {
            line1: "Via Mestre, 37",
            line2: null,
            city: "Cerignola",
            postal_code: "71042",
            state: "FG",
          },
        },
      },
    } as unknown as Stripe.Checkout.Session;

    assert.deepStrictEqual(extractStripeShippingAddress(session), {
      street: "Via Mestre, 37",
      city: "Cerignola",
      postalCode: "71042",
      province: "FG",
    });
  });

  it("should ensure webhook lists line_items and CheckoutSuccessClient confirms without local draft", () => {
    const webhookCode = fs.readFileSync(
      path.join(ROOT, "app", "api", "webhooks", "stripe", "route.ts"),
      "utf-8"
    );
    assert.ok(webhookCode.includes("listLineItems"));
    assert.ok(webhookCode.includes("mapStripeLineItemsToOrderItems"));
    assert.strictEqual(webhookCode.includes("items: []"), false);

    const successCode = fs.readFileSync(
      path.join(ROOT, "app", "checkout", "success", "CheckoutSuccessClient.tsx"),
      "utf-8"
    );
    assert.ok(successCode.includes("pendingOrder: null"));
    assert.ok(successCode.includes("keepalive: true"));
  });
});
