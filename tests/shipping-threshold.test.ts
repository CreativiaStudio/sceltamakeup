import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_COST,
  calculateShippingCost,
  getFreeShippingProgress,
  isFreeShippingEligible,
} from "../lib/shipping";
import { FREE_SHIPPING_THRESHOLD as STORE_FREE_SHIPPING_THRESHOLD } from "../store/useCartStore";

describe("Shipping Threshold (€70) & Standard Rate (€4.90)", () => {
  it("should define €70.00 threshold and €4.90 standard cost consistently across shipping module and cart store", () => {
    assert.strictEqual(FREE_SHIPPING_THRESHOLD, 70);
    assert.strictEqual(STORE_FREE_SHIPPING_THRESHOLD, 70);
    assert.strictEqual(STANDARD_SHIPPING_COST, 4.9);
  });

  it("should charge €4.90 below €70 and €0.00 starting at €70.00", () => {
    assert.strictEqual(calculateShippingCost(0, "shipping", false), 0);
    assert.strictEqual(calculateShippingCost(49.0, "shipping"), 4.9);
    assert.strictEqual(calculateShippingCost(69.99, "shipping"), 4.9);
    assert.strictEqual(calculateShippingCost(70.0, "shipping"), 0);
    assert.strictEqual(calculateShippingCost(70.01, "shipping"), 0);
    assert.strictEqual(calculateShippingCost(69.99999999999999, "shipping"), 0);
    assert.strictEqual(calculateShippingCost(49.0, "courier"), 4.9);
    assert.strictEqual(calculateShippingCost(70.0, "courier"), 0);
  });

  it("should always keep boutique / store_pickup free regardless of cart total", () => {
    assert.strictEqual(calculateShippingCost(15.0, "boutique"), 0);
    assert.strictEqual(calculateShippingCost(15.0, "store_pickup"), 0);
    assert.strictEqual(isFreeShippingEligible(69.99), false);
    assert.strictEqual(isFreeShippingEligible(70.0), true);
  });

  it("should compute accurate free-shipping progress towards €70", () => {
    assert.deepStrictEqual(getFreeShippingProgress(0), {
      threshold: 70,
      current: 0,
      remaining: 70,
      isFree: false,
      percentage: 0,
    });

    assert.deepStrictEqual(getFreeShippingProgress(35), {
      threshold: 70,
      current: 35,
      remaining: 35,
      isFree: false,
      percentage: 50,
    });

    const justBelow = getFreeShippingProgress(69.99);
    assert.strictEqual(justBelow.threshold, 70);
    assert.strictEqual(justBelow.current, 69.99);
    assert.strictEqual(justBelow.remaining, 0.01);
    assert.strictEqual(justBelow.isFree, false);
    assert.strictEqual(justBelow.percentage, 100);

    assert.deepStrictEqual(getFreeShippingProgress(70), {
      threshold: 70,
      current: 70,
      remaining: 0,
      isFree: true,
      percentage: 100,
    });

    assert.deepStrictEqual(getFreeShippingProgress(120), {
      threshold: 70,
      current: 120,
      remaining: 0,
      isFree: true,
      percentage: 100,
    });
  });
});
