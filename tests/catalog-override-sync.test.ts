import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import rawCatalog from "../data/catalog.json";
import type { Product } from "../types/product";
import type { SceltaVariantStock } from "../lib/adminStore";
import { applyCatalogOverrides, mergeProductWithOverride } from "../lib/catalogMerge";

const ROOT = path.resolve(__dirname, "..");

describe("Catalog Override & Shades Synchronization", () => {
  it("synchronizes cipria-70863 shades, price, images, slug and stock from override + variantStocks", () => {
    const base = (rawCatalog as Product[]).find((p) => p.id === "cipria-70863");
    assert.ok(base, "cipria-70863 must exist in catalog.json");

    const override: Partial<Product> = {
      name: "Eveline Varietè Satin Matt",
      slug: "eveline-variete-satin-matt",
      price: 7.4,
      stock: 4,
      images: [
        "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-70863-1790434360443.jpg",
        "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-70863-1790434437347.jpg",
      ],
      inStock: true,
      variants: [
        {
          id: "var-5901761952162",
          ean: "5901761952162",
          sku: "5901761952162",
          name: "04",
          image:
            "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-70863-1790434360443.jpg",
          price: 7.4,
          stock: 2,
          inStock: true,
          colorHex: "#BD5563",
          originalWholesalePrice: 3.44,
        },
        {
          id: "var-5901761952179",
          ean: "5901761952179",
          sku: "5901761952179",
          name: "05",
          image:
            "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/salone-federica/prod-cipria-70863-1790434437347.jpg",
          price: 7.4,
          stock: 2,
          inStock: true,
          colorHex: "#BD5563",
          originalWholesalePrice: 3.44,
        },
      ],
    };

    const variantStocks: Record<string, Partial<SceltaVariantStock>> = {
      "var-5901761952162": {
        variantId: "var-5901761952162",
        productId: "cipria-70863",
        price: 7.4,
        stockQuantity: 2,
      },
      "var-5901761952179": {
        variantId: "var-5901761952179",
        productId: "cipria-70863",
        price: 7.4,
        stockQuantity: 2,
      },
    };

    const merged = mergeProductWithOverride(base, override, variantStocks);

    assert.strictEqual(merged.name, "Eveline Varietè Satin Matt");
    assert.strictEqual(merged.slug, "eveline-variete-satin-matt");
    assert.strictEqual(merged.price, 7.4);
    assert.strictEqual(merged.stock, 4);
    assert.strictEqual(merged.shades.length, 2);
    assert.strictEqual(merged.variants.length, 2);

    for (const shade of merged.shades) {
      assert.strictEqual(shade.price, 7.4);
      assert.strictEqual(shade.stock, 2);
      assert.ok(shade.image.includes("salone-federica/prod-cipria-70863-"));
      assert.ok(!shade.image.includes("pierre-rene-vinyl-liquid-lipstick"));
    }

    for (const img of merged.images) {
      assert.ok(!img.includes("pierre-rene-vinyl-liquid-lipstick"));
    }
  });

  it("propagates variantStocks price & stock precedence identically to variants and shades", () => {
    const base = (rawCatalog as Product[]).find((p) => p.id === "cipria-70863")!;
    const merged = mergeProductWithOverride(
      base,
      { price: 9.9 },
      {
        "var-5901761952162": {
          variantId: "var-5901761952162",
          price: 6.5,
          stockQuantity: 0,
        },
        "var-5901761952179": {
          variantId: "var-5901761952179",
          price: 8.2,
          stockQuantity: 5,
        },
      }
    );

    assert.strictEqual(merged.variants[0].price, 6.5);
    assert.strictEqual(merged.shades[0].price, 6.5);
    assert.strictEqual(merged.variants[0].stock, 0);
    assert.strictEqual(merged.shades[0].stock, 0);
    assert.strictEqual(merged.variants[0].inStock, false);
    assert.strictEqual(merged.shades[0].inStock, false);

    assert.strictEqual(merged.variants[1].price, 8.2);
    assert.strictEqual(merged.shades[1].price, 8.2);
    assert.strictEqual(merged.variants[1].stock, 5);
    assert.strictEqual(merged.shades[1].stock, 5);
    assert.strictEqual(merged.variants[1].inStock, true);
    assert.strictEqual(merged.shades[1].inStock, true);

    assert.strictEqual(merged.stock, 5);
    assert.strictEqual(merged.inStock, true);
  });

  it("excludes products flagged isLocalOnly in overrides when filtered for public storefront", () => {
    const base = (rawCatalog as Product[]).slice(0, 2);
    const merged = applyCatalogOverrides(base, {
      [base[0].id]: { isLocalOnly: true },
    });
    const publicOnly = merged.filter((p) => !p.isLocalOnly);
    assert.strictEqual(merged[0].isLocalOnly, true);
    assert.strictEqual(publicOnly.length, 1);
    assert.strictEqual(publicOnly[0].id, base[1].id);
  });

  it("enforces fail-closed 503 handling in app/api/checkout/route.ts without silent fallback", () => {
    const checkoutRoute = fs.readFileSync(
      path.join(ROOT, "app", "api", "checkout", "route.ts"),
      "utf8"
    );
    assert.ok(checkoutRoute.includes("getCentralCatalogState({ fresh: true })"));
    assert.ok(checkoutRoute.includes("status: 503"));
    assert.ok(!checkoutRoute.includes("getCentralCatalogState().catch(() => null)"));
  });
});
