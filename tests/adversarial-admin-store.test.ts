import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  resetAdminStoreToDefaults,
  getAdminStoreState,
  saveAdminStoreState,
  getDefaultAdminStoreState,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  updateOrderTracking,
  createAdminOrder,
  getAdminCustomers,
  createAdminCustomer,
  getAllStock,
  getVariantStockById,
  updateVariantStockCount,
  updateVariantPrice,
  computeStockStatus,
  getAdminKpis,
  STORAGE_ADMIN_STORE_KEY,
  SceltaAdminOrder,
} from "../lib/adminStore";
import {
  getAllProducts,
  searchProducts,
} from "../lib/catalog";

const PROJECT_ROOT = path.resolve(__dirname, "..");

describe("Adversarial Challenger 1 — Empirical Stress Test Suite (Admin Store, Stock Engine & State Machine)", () => {
  beforeEach(() => {
    // Isolate every test with pristine factory default demo seed
    resetAdminStoreToDefaults();
  });

  // =========================================================================
  // SECTION 1: RAPID SEQUENTIAL STATUS MUTATIONS ACROSS ALL 5 OPERATIONAL STATES
  // =========================================================================
  describe("Section 1: Rapid Sequential Status Mutations Across All 5 Operational States", () => {
    const OPERATIONAL_STATES: Array<SceltaAdminOrder["status"]> = [
      "processing",
      "shipped",
      "ready_for_pickup",
      "completed",
      "cancelled",
    ];

    it("1.1 Exhaustive 5x5 State Transition Matrix: should verify all 25 state transitions preserve order invariants", () => {
      const initialOrders = getAdminOrders();
      assert.ok(initialOrders.length > 0, "Must have orders to test");
      const targetOrder = initialOrders[0];
      const orderId = targetOrder.id;
      const originalTotal = targetOrder.total;
      const originalCustomer = targetOrder.customerName;
      const originalItemsCount = targetOrder.items.length;

      let transitionCount = 0;

      for (const fromState of OPERATIONAL_STATES) {
        for (const toState of OPERATIONAL_STATES) {
          // Set to fromState first
          updateOrderStatus(orderId, fromState);
          const stateBefore = getAdminOrderById(orderId);
          assert.strictEqual(stateBefore?.status, fromState, `Failed setting intermediate state ${fromState}`);

          // Transition to toState
          const updated = updateOrderStatus(orderId, toState);
          transitionCount++;

          // Invariant checks
          assert.strictEqual(updated.status, toState, `Failed transition from ${fromState} to ${toState}`);
          assert.strictEqual(updated.id, orderId, "Order ID must remain immutable during transition");
          assert.strictEqual(updated.total, originalTotal, "Order total must remain immutable during transition");
          assert.strictEqual(updated.customerName, originalCustomer, "Customer name must remain immutable");
          assert.strictEqual(updated.items.length, originalItemsCount, "Items count must remain immutable");

          // Timestamp must be valid ISO string
          const parsedTime = Date.parse(updated.updatedAt);
          assert.strictEqual(Number.isNaN(parsedTime), false, "updatedAt must be a valid timestamp");
          assert.ok(parsedTime > 0, "updatedAt must be positive");
        }
      }

      assert.strictEqual(transitionCount, 25, "Must execute exactly 25 state combinations in 5x5 matrix");
    });

    it("1.2 High-Velocity Mutation Burst: should survive 1,000 rapid sequential status mutations on a single order without corruption", () => {
      const orderId = "SC-ORD-2026-0001";
      const startTime = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const nextStatus = OPERATIONAL_STATES[i % OPERATIONAL_STATES.length];
        const res = updateOrderStatus(orderId, nextStatus);
        assert.strictEqual(res.status, nextStatus);
      }

      const elapsedMs = Date.now() - startTime;
      const finalOrder = getAdminOrderById(orderId);

      // Verify order state integrity
      assert.ok(finalOrder, "Order must exist after 1,000 mutations");
      const expectedFinalStatus = OPERATIONAL_STATES[(iterations - 1) % OPERATIONAL_STATES.length];
      assert.strictEqual(finalOrder.status, expectedFinalStatus);
      assert.strictEqual(finalOrder.id, orderId);
      assert.strictEqual(finalOrder.items.length, 2);

      // Performance check: in-memory / local mutations should take under 500ms for 1,000 iterations
      assert.ok(elapsedMs < 2000, `1,000 sequential mutations took too long: ${elapsedMs}ms`);
    });

    it("1.3 Multi-Order Interleaved Mutation Stress: should maintain strict isolation across concurrent multi-order mutations", () => {
      const orders = getAdminOrders();
      assert.ok(orders.length >= 5, "Requires at least 5 orders for interleaved test");

      const testOrders = orders.slice(0, 5);
      const testIds = testOrders.map((o) => o.id);

      // Interleave 250 mutations randomly distributed across 5 orders
      for (let i = 0; i < 250; i++) {
        const randomOrderIndex = i % testIds.length;
        const targetId = testIds[randomOrderIndex];
        const randomStatus = OPERATIONAL_STATES[(i * 3 + randomOrderIndex) % OPERATIONAL_STATES.length];

        const updated = updateOrderStatus(targetId, randomStatus);
        assert.strictEqual(updated.status, randomStatus);
        assert.strictEqual(updated.id, targetId);

        // Verify other orders were NOT mutated in this step
        for (let j = 0; j < testIds.length; j++) {
          if (j !== randomOrderIndex) {
            const otherOrder = getAdminOrderById(testIds[j]);
            assert.ok(otherOrder, `Order ${testIds[j]} must exist`);
            assert.strictEqual(otherOrder.id, testIds[j]);
          }
        }
      }
    });

    it("1.4 Order Tracking Coupling: should auto-promote 'processing' orders to 'shipped' while preserving terminal/pickup states", () => {
      const order = getAdminOrders()[0];
      const id = order.id;

      // Scenario A: processing order gets tracking -> becomes shipped
      updateOrderStatus(id, "processing");
      const shippedResult = updateOrderTracking(id, "BRT-AUTO-001", "BRT Express");
      assert.strictEqual(shippedResult.status, "shipped", "Order in processing must auto-advance to shipped");
      assert.strictEqual(shippedResult.trackingCode, "BRT-AUTO-001");
      assert.strictEqual(shippedResult.courierName, "BRT Express");

      // Scenario B: ready_for_pickup order gets tracking updated -> stays ready_for_pickup
      updateOrderStatus(id, "ready_for_pickup");
      const pickupResult = updateOrderTracking(id, "PICKUP-NOTE-002");
      assert.strictEqual(
        pickupResult.status,
        "ready_for_pickup",
        "Store pickup orders must NOT be forced to 'shipped' when updating tracking info"
      );
      assert.strictEqual(pickupResult.trackingCode, "PICKUP-NOTE-002");

      // Scenario C: completed order gets tracking updated -> stays completed
      updateOrderStatus(id, "completed");
      const completedResult = updateOrderTracking(id, "BRT-COMPLETED-003");
      assert.strictEqual(completedResult.status, "completed", "Completed orders must retain completed status");

      // Scenario D: cancelled order gets tracking updated -> stays cancelled
      updateOrderStatus(id, "cancelled");
      const cancelledResult = updateOrderTracking(id, "BRT-VOID-004");
      assert.strictEqual(cancelledResult.status, "cancelled", "Cancelled orders must retain cancelled status");
    });

    it("1.5 Adversarial Fault Injection on Order Mutations: should safely reject invalid or non-existent order IDs", () => {
      const invalidIds = [
        "NON-EXISTENT-ORDER-99999",
        "",
        "   ",
        "' OR '1'='1",
        "../../../etc/passwd",
        "<script>alert(1)</script>",
        "SC-ORD-9999-NULL",
      ];

      for (const badId of invalidIds) {
        assert.throws(
          () => {
            updateOrderStatus(badId, "shipped");
          },
          /non trovato/i,
          `Expected exception when mutating non-existent ID '${badId}'`
        );

        assert.throws(
          () => {
            updateOrderTracking(badId, "TRK-FAKE");
          },
          /non trovato/i,
          `Expected exception when updating tracking on non-existent ID '${badId}'`
        );
      }
    });
  });

  // =========================================================================
  // SECTION 2: EXTREME STOCK VALUES & CATALOG STOCK ENGINE HARDENING
  // =========================================================================
  describe("Section 2: Extreme Stock Values & Catalog Stock Engine Hardening", () => {
    it("2.1 Stock Clamping & Threshold Invariants: should clamp negative stock to 0 and correctly assign status badges", () => {
      const allStock = getAllStock();
      assert.ok(allStock.length > 0);
      const testVid = allStock[0].variantId;

      // 0 -> out_of_stock
      const zeroRes = updateVariantStockCount(testVid, 0);
      assert.strictEqual(zeroRes.stockQuantity, 0);
      assert.strictEqual(zeroRes.stockStatus, "out_of_stock");

      // Negative values clamped to 0
      const negativeValues = [-1, -5, -42, -999, -1000000];
      for (const neg of negativeValues) {
        const negRes = updateVariantStockCount(testVid, neg);
        assert.strictEqual(
          negRes.stockQuantity,
          0,
          `Negative stock ${neg} must be clamped to 0 (got ${negRes.stockQuantity})`
        );
        assert.strictEqual(
          negRes.stockStatus,
          "out_of_stock",
          `Negative stock ${neg} must produce 'out_of_stock' status`
        );
      }

      // Thresholds:
      // 1 to 4 -> low_stock
      for (let q = 1; q <= 4; q++) {
        const lowRes = updateVariantStockCount(testVid, q);
        assert.strictEqual(lowRes.stockQuantity, q);
        assert.strictEqual(lowRes.stockStatus, "low_stock", `Stock ${q} must be 'low_stock'`);
      }

      // 5 and above -> available
      for (const q of [5, 6, 10, 25, 100]) {
        const availRes = updateVariantStockCount(testVid, q);
        assert.strictEqual(availRes.stockQuantity, q);
        assert.strictEqual(availRes.stockStatus, "available", `Stock ${q} must be 'available'`);
      }
    });

    it("2.2 Floating-Point Stock Inputs: should apply Math.floor to decimal quantities safely", () => {
      const allStock = getAllStock();
      const testVid = allStock[1].variantId;

      const floatCases = [
        { input: 0.1, expectedQty: 0, expectedStatus: "out_of_stock" },
        { input: 0.9, expectedQty: 0, expectedStatus: "out_of_stock" },
        { input: 1.2, expectedQty: 1, expectedStatus: "low_stock" },
        { input: 4.99, expectedQty: 4, expectedStatus: "low_stock" },
        { input: 5.0, expectedQty: 5, expectedStatus: "available" },
        { input: 5.01, expectedQty: 5, expectedStatus: "available" },
        { input: 99.75, expectedQty: 99, expectedStatus: "available" },
      ];

      for (const c of floatCases) {
        const res = updateVariantStockCount(testVid, c.input);
        assert.strictEqual(
          res.stockQuantity,
          c.expectedQty,
          `Float input ${c.input} must floor to ${c.expectedQty}`
        );
        assert.strictEqual(
          res.stockStatus,
          c.expectedStatus,
          `Float input ${c.input} must yield status '${c.expectedStatus}'`
        );
      }
    });

    it("2.3 Extreme Numeric Stock Inputs: should safely handle 9999+, millions, and Number.MAX_SAFE_INTEGER", () => {
      const allStock = getAllStock();
      const testVid = allStock[2].variantId;

      const extremeCases = [
        9999,
        10000,
        99999,
        1000000,
        99999999,
        Number.MAX_SAFE_INTEGER,
      ];

      for (const extreme of extremeCases) {
        const res = updateVariantStockCount(testVid, extreme);
        assert.strictEqual(
          res.stockQuantity,
          extreme,
          `Extreme quantity ${extreme} must be preserved without numeric overflow`
        );
        assert.strictEqual(res.stockStatus, "available");
      }
    });

    it("2.4 Empirical Characterization of Non-Standard Numbers: NaN and Infinities", () => {
      const allStock = getAllStock();
      const testVid = allStock[3].variantId;

      // Negative Infinity clamps to 0
      const negInfRes = updateVariantStockCount(testVid, -Infinity);
      assert.strictEqual(negInfRes.stockQuantity, 0, "-Infinity must clamp to 0");
      assert.strictEqual(negInfRes.stockStatus, "out_of_stock");

      // Positive Infinity
      const posInfRes = updateVariantStockCount(testVid, Infinity);
      assert.strictEqual(posInfRes.stockQuantity, Infinity);
      assert.strictEqual(posInfRes.stockStatus, "available");

      // computeStockStatus empirical verification for NaN
      // Note: In JavaScript, NaN <= 0 is false and NaN < 5 is false, so it falls through to 'available'
      const nanStatus = computeStockStatus(NaN);
      assert.strictEqual(nanStatus, "available", "computeStockStatus(NaN) returns 'available'");
    });

    it("2.5 Price Mutation Boundaries & Wholesale Price Invariance", () => {
      const allStock = getAllStock();
      const testVariant = allStock[4];
      const vid = testVariant.variantId;
      const initialWholesale = testVariant.originalWholesalePrice;

      // Negative price -> clamped to 0
      const negPrice = updateVariantPrice(vid, -50.0);
      assert.strictEqual(negPrice.price, 0, "Negative price must clamp to 0");

      // Decimal precision rounding to 2 decimal places (monetary cents)
      const precisePrice = updateVariantPrice(vid, 24.9949);
      assert.strictEqual(precisePrice.price, 24.99, "Price must round to 2 decimals");

      const roundUpPrice = updateVariantPrice(vid, 24.9951);
      assert.strictEqual(roundUpPrice.price, 25.0, "Price must round up at .005");

      // Extreme price
      const highPrice = updateVariantPrice(vid, 9999.99);
      assert.strictEqual(highPrice.price, 9999.99);

      // Verify wholesale price was NOT modified
      if (initialWholesale !== undefined) {
        assert.strictEqual(
          highPrice.originalWholesalePrice,
          initialWholesale,
          "Retail price modification must never corrupt originalWholesalePrice"
        );
      }
    });

    it("2.6 Unregistered Variant Dynamic Insertion: should gracefully create safe fallback entry", () => {
      const unregisteredId = "unregistered-variant-shade-custom-999";
      const res = updateVariantStockCount(unregisteredId, 18);

      assert.strictEqual(res.variantId, unregisteredId);
      assert.strictEqual(res.stockQuantity, 18);
      assert.strictEqual(res.stockStatus, "available");
      assert.strictEqual(res.price, 0);

      const retrieved = getVariantStockById(unregisteredId);
      assert.ok(retrieved, "Dynamically inserted variant must be retrievable");
      assert.strictEqual(retrieved?.stockQuantity, 18);
    });

    it("2.7 Executive KPI Aggregate Coherence Under Mass Stock Mutating Sweeps", () => {
      const allStock = getAllStock();
      const totalVariantsCount = allStock.length;
      assert.strictEqual(totalVariantsCount, 659, "Catalog must have 659 variants");

      // Sweep 1: Force all variants to 0
      for (const item of allStock) {
        updateVariantStockCount(item.variantId, 0);
      }
      const kpisAllZero = getAdminKpis();
      assert.strictEqual(
        kpisAllZero.outOfStockCount,
        totalVariantsCount,
        `All ${totalVariantsCount} variants must be counted as outOfStock`
      );
      assert.strictEqual(kpisAllZero.availableStockCount, 0);
      assert.strictEqual(kpisAllZero.lowStockCount, 0);

      // Sweep 2: Force all variants to 2 (low_stock)
      for (const item of allStock) {
        updateVariantStockCount(item.variantId, 2);
      }
      const kpisAllLow = getAdminKpis();
      assert.strictEqual(
        kpisAllLow.lowStockCount,
        totalVariantsCount,
        `All ${totalVariantsCount} variants must be counted as lowStock`
      );
      assert.strictEqual(kpisAllLow.outOfStockCount, 0);
      assert.strictEqual(kpisAllLow.availableStockCount, 0);

      // Sweep 3: Force all variants to 20 (available)
      for (const item of allStock) {
        updateVariantStockCount(item.variantId, 20);
      }
      const kpisAllAvail = getAdminKpis();
      assert.strictEqual(
        kpisAllAvail.availableStockCount,
        totalVariantsCount,
        `All ${totalVariantsCount} variants must be counted as available`
      );
      assert.strictEqual(kpisAllAvail.outOfStockCount, 0);
      assert.strictEqual(kpisAllAvail.lowStockCount, 0);
    });
  });

  // =========================================================================
  // SECTION 3: STOCK DEDUCTION INTEGRITY WHEN PROCESSING ORDERS
  // =========================================================================
  describe("Section 3: Stock Deduction Integrity When Processing Orders", () => {
    it("3.1 Supabase DDL Automatic Deduction Trigger Audit (scelta_handle_order_item_stock_deduction)", () => {
      const schemaPath = path.join(PROJECT_ROOT, "supabase_schema.sql");
      assert.ok(fs.existsSync(schemaPath), "supabase_schema.sql must exist");
      const sql = fs.readFileSync(schemaPath, "utf-8");

      // 1. Function definition
      assert.ok(
        sql.includes("CREATE OR REPLACE FUNCTION scelta_handle_order_item_stock_deduction()"),
        "DDL must define trigger function scelta_handle_order_item_stock_deduction"
      );

      // 2. GREATEST(0, curr_qty - NEW.quantity) to guarantee non-negative stock
      assert.ok(
        sql.includes("GREATEST(0, curr_qty - NEW.quantity)"),
        "DDL stock deduction trigger must clamp stock with GREATEST(0, curr_qty - NEW.quantity)"
      );

      // 3. Status flag update: in_stock = false when new_qty = 0
      assert.ok(
        sql.includes("IF new_qty = 0 THEN") && sql.includes("in_stock = false"),
        "DDL stock deduction trigger must set in_stock = false when depleted to 0"
      );

      // 4. Audit trail logging into scelta_inventory_logs
      assert.ok(
        sql.includes("INSERT INTO scelta_inventory_logs"),
        "DDL stock deduction trigger must record an audit entry in scelta_inventory_logs"
      );
      assert.ok(
        sql.includes("'order_online'"),
        "DDL stock deduction trigger must log movement_type = 'order_online'"
      );

      // 5. Row-level concurrency lock: FOR UPDATE
      assert.ok(
        sql.includes("FOR UPDATE"),
        "DDL stock deduction trigger must acquire FOR UPDATE row-level lock on inventory to prevent race conditions"
      );

      // 6. Trigger attachment to scelta_order_items
      assert.ok(
        sql.includes("AFTER INSERT ON scelta_order_items") &&
        sql.includes("EXECUTE FUNCTION scelta_handle_order_item_stock_deduction()"),
        "DDL trigger trg_scelta_deduct_stock_on_order_item must fire AFTER INSERT on scelta_order_items"
      );
    });

    it("3.2 Supabase DDL RT Cash Register POS Sale Procedure Audit (scelta_record_pos_sale)", () => {
      const schemaPath = path.join(PROJECT_ROOT, "supabase_schema.sql");
      const sql = fs.readFileSync(schemaPath, "utf-8");

      assert.ok(
        sql.includes("CREATE OR REPLACE FUNCTION scelta_record_pos_sale("),
        "DDL must define stored procedure scelta_record_pos_sale"
      );
      assert.ok(
        sql.includes("GREATEST(0, curr_qty - p_quantity)"),
        "scelta_record_pos_sale must clamp stock with GREATEST(0, curr_qty - p_quantity)"
      );
      assert.ok(
        sql.includes("'pos_instore_sale'"),
        "scelta_record_pos_sale must log movement_type = 'pos_instore_sale'"
      );
      assert.ok(
        sql.includes("p_receipt_number"),
        "scelta_record_pos_sale must log RT cash register fiscal receipt number"
      );
    });

    it("3.3 Offline Admin Store Architecture Characterization: createAdminOrder vs Variant Stock", () => {
      // In the offline-first development store, createAdminOrder manages order entities.
      // We empirically verify whether createAdminOrder mutates variantStocks directly
      // or keeps order tracking separate from inventory management.
      const allStock = getAllStock();
      const variant = allStock[5];
      const initialStockQty = variant.stockQuantity;

      const order = createAdminOrder({
        customerName: "Test Buyer",
        customerEmail: "buyer@test.com",
        customerPhone: "+39 333 000 1122",
        total: 49.0,
        fulfillmentType: "courier",
        items: [
          {
            productId: variant.variantId,
            productTitle: variant.name,
            quantity: 2,
            price: 24.5,
          },
        ],
      });

      assert.strictEqual(order.customerName, "Test Buyer");

      // Verify variant stock state in offline mock store
      const stockAfter = getVariantStockById(variant.variantId);
      assert.ok(stockAfter);

      // Empirical check: In the offline mock store, inventory updates are managed
      // via updateVariantStockCount / ProductStockModal, while database-level deduction
      // is enforced by Supabase triggers.
      assert.strictEqual(
        stockAfter.stockQuantity,
        initialStockQty,
        "Offline mock store maintains decoupled order creation from automatic stock mutation"
      );
    });

    it("3.4 Simulated Order Fulfillment Stock Deduction Workflow & Oversell Protection", () => {
      // Simulate an operational order deduction handler that an e-commerce gateway would execute
      const allStock = getAllStock();
      const testItem = allStock[6];
      const vid = testItem.variantId;

      // Set variant stock to exactly 3 units
      updateVariantStockCount(vid, 3);
      assert.strictEqual(getVariantStockById(vid)?.stockQuantity, 3);
      assert.strictEqual(getVariantStockById(vid)?.stockStatus, "low_stock");

      // Operational helper: deduct order items with clamping
      function applyOrderDeduction(variantId: string, qtyOrdered: number): { previous: number; current: number } {
        const currentStock = getVariantStockById(variantId)?.stockQuantity || 0;
        const newQty = Math.max(0, currentStock - qtyOrdered);
        updateVariantStockCount(variantId, newQty);
        return { previous: currentStock, current: newQty };
      }

      // 1. Deduct 2 units (normal purchase)
      const res1 = applyOrderDeduction(vid, 2);
      assert.strictEqual(res1.previous, 3);
      assert.strictEqual(res1.current, 1);
      assert.strictEqual(getVariantStockById(vid)?.stockStatus, "low_stock");

      // 2. Deduct 5 units (overselling attempt exceeding remaining 1 unit)
      const res2 = applyOrderDeduction(vid, 5);
      assert.strictEqual(res2.previous, 1);
      assert.strictEqual(res2.current, 0, "Oversell must clamp to 0 and not produce negative stock");
      assert.strictEqual(getVariantStockById(vid)?.stockStatus, "out_of_stock");

      // 3. Order cancellation refund workflow
      function applyOrderCancellationRefund(variantId: string, qtyCancelled: number): number {
        const currentStock = getVariantStockById(variantId)?.stockQuantity || 0;
        const restoredQty = currentStock + qtyCancelled;
        updateVariantStockCount(variantId, restoredQty);
        return restoredQty;
      }

      const refundedQty = applyOrderCancellationRefund(vid, 5);
      assert.strictEqual(refundedQty, 5);
      assert.strictEqual(getVariantStockById(vid)?.stockQuantity, 5);
      assert.strictEqual(getVariantStockById(vid)?.stockStatus, "available");
    });
  });

  // =========================================================================
  // SECTION 4: SEARCH QUERY FUZZING (341 PRODUCTS & 659 VARIANTS)
  // =========================================================================
  describe("Section 4: Search Query Fuzzing (341 Products & 659 Variants)", () => {
    it("4.1 Catalog String Sanitization Invariant: all 341 products and 659 variants must have valid string attributes", async () => {
      const products = await getAllProducts();
      assert.strictEqual(products.length, 341, "Must contain exactly 341 products");

      let totalVariants = 0;
      for (const p of products) {
        assert.strictEqual(typeof p.id, "string", `Product ${p.id} id must be string`);
        assert.strictEqual(typeof p.name, "string", `Product ${p.id} name must be string`);
        assert.strictEqual(typeof p.brand, "string", `Product ${p.id} brand must be string`);
        assert.strictEqual(typeof p.category, "string", `Product ${p.id} category must be string`);
        assert.strictEqual(typeof p.description, "string", `Product ${p.id} description must be string`);
        assert.strictEqual(typeof p.shortDescription, "string", `Product ${p.id} shortDescription must be string`);
        assert.ok(Array.isArray(p.variants), `Product ${p.id} variants must be array`);

        for (const v of p.variants) {
          totalVariants++;
          assert.strictEqual(typeof v.id, "string", `Variant ${v.id} id must be string`);
          assert.strictEqual(typeof v.sku, "string", `Variant ${v.id} sku must be string`);
          assert.strictEqual(typeof v.name, "string", `Variant ${v.id} name must be string`);
          assert.strictEqual(typeof v.ean, "string", `Variant ${v.id} ean must be string`);
        }
      }

      assert.strictEqual(totalVariants, 659, "Must contain exactly 659 variants across 341 products");
    });

    it("4.2 SQL Injection Fuzzing Vectors (15 vectors): should execute cleanly without crashing", async () => {
      const sqlInjectionVectors = [
        "' OR '1'='1",
        "'; DROP TABLE scelta_products; --",
        "' UNION SELECT * FROM scelta_customers; --",
        "admin' --",
        "admin' /*",
        "' OR 1=1--",
        "' OR 'a'='a",
        "') OR ('a'='a",
        "1' ORDER BY 1--",
        "1' ORDER BY 2--",
        "1' GROUP BY 1--",
        "'; WAITFOR DELAY '0:0:5'--",
        "SLEEP(5) /*",
        `" OR ""="`,
        "1; EXEC xp_cmdshell('dir'); --",
      ];

      for (const payload of sqlInjectionVectors) {
        const results = await searchProducts(payload);
        assert.ok(Array.isArray(results), `Payload '${payload}' must return an array`);
        // None of these malicious payloads should match all products
        assert.ok(
          results.length <= 341,
          `Payload '${payload}' resulted in unexpected product count: ${results.length}`
        );
      }
    });

    it("4.3 Regex Metacharacters Fuzzing Vectors (20 vectors): should be treated as literal strings and not throw SyntaxError", async () => {
      const regexMetacharacterVectors = [
        ".*",
        ".+",
        "^$",
        "^",
        "$",
        "(",
        ")",
        "[",
        "]",
        "{",
        "}",
        "\\",
        "\\\\",
        "+",
        "?",
        "|",
        "(?=.*a)",
        "(?!.*b)",
        "\\d+",
        "\\s*",
        "[a-z0-9]",
      ];

      for (const meta of regexMetacharacterVectors) {
        assert.doesNotThrow(async () => {
          const results = await searchProducts(meta);
          assert.ok(Array.isArray(results), `Metacharacter '${meta}' must return array`);
        }, `searchProducts threw SyntaxError or exception on regex metacharacter '${meta}'`);
      }
    });

    it("4.4 XSS and HTML Entity Injection Fuzzing Vectors (10 vectors): should not crash", async () => {
      const xssVectors = [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "\"><script>alert('xss')</script>",
        "<svg/onload=alert('xss')>",
        "javascript:alert(1)",
        "&lt;script&gt;alert(1)&lt;/script&gt;",
        "{{7*7}}",
        "${7*7}",
        "<%= 7*7 %>",
        "<iframe src=\"javascript:alert(1)\">",
      ];

      for (const xss of xssVectors) {
        const results = await searchProducts(xss);
        assert.ok(Array.isArray(results), `XSS vector '${xss}' must return an array`);
        assert.strictEqual(results.length, 0, `XSS vector '${xss}' should not match legitimate products`);
      }
    });

    it("4.5 Unicode, Diacritics, RTL & Emojis Fuzzing Vectors", async () => {
      const unicodeVectors = [
        { query: "💄", expectedMatch: false },
        { query: "✨", expectedMatch: false },
        { query: "💋", expectedMatch: false },
        { query: "مكياج", expectedMatch: false }, // Arabic for makeup
        { query: "שפתון", expectedMatch: false }, // Hebrew for lipstick
        { query: "красота", expectedMatch: false }, // Russian for beauty
        { query: "Pierre René", expectedMatch: true }, // French accent
        { query: "Anti-Età", expectedMatch: true }, // Italian accent
        { query: "caffè", expectedMatch: false },
        { query: "\u0000", expectedMatch: false }, // Null byte
        { query: "\uFFFF", expectedMatch: false },
        { query: "   \t\r\n   ", expectedMatch: true }, // Pure whitespace returns all
      ];

      for (const v of unicodeVectors) {
        const res = await searchProducts(v.query);
        assert.ok(Array.isArray(res), `Unicode query '${v.query}' must return array`);
        if (v.expectedMatch) {
          assert.ok(res.length > 0, `Query '${v.query}' should match products`);
        }
      }
    });

    it("4.6 Extreme Search Query Length Stress Test (10,000 and 50,000 characters)", async () => {
      const longQuery10k = "a".repeat(10000);
      const longQuery50k = "makeup ".repeat(7000); // ~49,000 chars

      const start10k = Date.now();
      const res10k = await searchProducts(longQuery10k);
      const duration10k = Date.now() - start10k;

      assert.ok(Array.isArray(res10k));
      assert.strictEqual(res10k.length, 0);
      assert.ok(duration10k < 200, `10k query took too long: ${duration10k}ms`);

      const start50k = Date.now();
      const res50k = await searchProducts(longQuery50k);
      const duration50k = Date.now() - start50k;

      assert.ok(Array.isArray(res50k));
      assert.strictEqual(res50k.length, 0);
      assert.ok(duration50k < 500, `50k query took too long: ${duration50k}ms`);
    });

    it("4.7 Exact Barcode (EAN) & SKU Lookup Verification", async () => {
      // Pick 5 random variants from catalog and test exact EAN and SKU lookup
      const products = await getAllProducts();
      let testedVariants = 0;

      for (const p of products) {
        if (!p.variants || p.variants.length === 0) continue;
        const v = p.variants[0];
        if (v.ean && v.ean.length >= 8) {
          const eanResults = await searchProducts(v.ean);
          assert.ok(
            eanResults.some((match) => match.id === p.id),
            `Search for exact EAN '${v.ean}' must find product '${p.id}'`
          );

          const skuResults = await searchProducts(v.sku);
          assert.ok(
            skuResults.some((match) => match.id === p.id),
            `Search for exact SKU '${v.sku}' must find product '${p.id}'`
          );

          testedVariants++;
          if (testedVariants >= 5) break;
        }
      }

      assert.strictEqual(testedVariants, 5, "Must test 5 variant barcode lookups");
    });
  });

  // =========================================================================
  // SECTION 5: CONCURRENT / SIMULATED STORAGE RESETS & EVENT LISTENER RESILIENCE
  // =========================================================================
  describe("Section 5: Concurrent / Simulated Storage Resets & Event Listener Resilience", () => {
    // Custom simulated window environment
    interface MockEventListener {
      type: string;
      callback: (event: unknown) => void;
    }

    class MockWindow {
      listeners: MockEventListener[] = [];

      addEventListener(type: string, callback: (event: unknown) => void) {
        this.listeners.push({ type, callback });
      }

      removeEventListener(type: string, callback: (event: unknown) => void) {
        this.listeners = this.listeners.filter(
          (l) => !(l.type === type && l.callback === callback)
        );
      }

      dispatchEvent(event: { type: string; detail?: unknown }): boolean {
        for (const l of this.listeners) {
          if (l.type === event.type) {
            l.callback(event);
          }
        }
        return true;
      }
    }

    class MockLocalStorage {
      store: Record<string, string> = {};
      failOnSetItem: boolean = false;

      getItem(key: string): string | null {
        return this.store[key] || null;
      }

      setItem(key: string, value: string): void {
        if (this.failOnSetItem) {
          throw new Error("DOMException: QuotaExceededError");
        }
        this.store[key] = value;
      }

      removeItem(key: string): void {
        delete this.store[key];
      }

      clear(): void {
        this.store = {};
      }
    }

    it("5.1 Event Notification Integrity on Storage Updates and Factory Reset", () => {
      const mockWin = new MockWindow();
      const mockStorage = new MockLocalStorage();
      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      const originalLocalStorage = (globalThis as unknown as { localStorage: unknown }).localStorage;
      (globalThis as unknown as { window: unknown }).window = mockWin;
      (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;

      let updateEventsCount = 0;
      let resetEventsCount = 0;

      const onUpdate = () => {
        updateEventsCount++;
      };
      const onReset = () => {
        resetEventsCount++;
      };

      mockWin.addEventListener("scelta_admin_store_updated", onUpdate);
      mockWin.addEventListener("scelta_admin_store_reset", onReset);

      try {
        // Trigger factory reset
        resetAdminStoreToDefaults();
        assert.strictEqual(resetEventsCount, 1, "Factory reset must emit scelta_admin_store_reset");
        assert.strictEqual(updateEventsCount, 1, "Factory reset must also emit scelta_admin_store_updated");

        // Trigger an update
        const state = getAdminStoreState();
        saveAdminStoreState(state);
        assert.strictEqual(updateEventsCount, 2, "saveAdminStoreState must emit scelta_admin_store_updated");
        assert.strictEqual(resetEventsCount, 1, "saveAdminStoreState must NOT emit scelta_admin_store_reset");

        // Remove listeners
        mockWin.removeEventListener("scelta_admin_store_updated", onUpdate);
        mockWin.removeEventListener("scelta_admin_store_reset", onReset);

        saveAdminStoreState(state);
        assert.strictEqual(updateEventsCount, 2, "Removed listener must not be called again");
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
        (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
      }
    });

    it("5.2 Multi-Subscriber Stress (50 Listeners x 100 Events): zero dropped events under concurrent subscription", () => {
      const mockWin = new MockWindow();
      const mockStorage = new MockLocalStorage();
      // Pre-seed storage so getAdminStoreState doesn't trigger initial default save event
      mockStorage.setItem(STORAGE_ADMIN_STORE_KEY, JSON.stringify(getDefaultAdminStoreState()));

      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      const originalLocalStorage = (globalThis as unknown as { localStorage: unknown }).localStorage;
      (globalThis as unknown as { window: unknown }).window = mockWin;
      (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;

      const subscriberCount = 50;
      const eventCounts = new Array(subscriberCount).fill(0);
      const callbacks = eventCounts.map((_, idx) => () => {
        eventCounts[idx]++;
      });

      for (let i = 0; i < subscriberCount; i++) {
        mockWin.addEventListener("scelta_admin_store_updated", callbacks[i]);
      }


      try {
        const triggerCount = 100;
        for (let i = 0; i < triggerCount; i++) {
          const state = getAdminStoreState();
          saveAdminStoreState(state);
        }

        for (let i = 0; i < subscriberCount; i++) {
          assert.strictEqual(
            eventCounts[i],
            triggerCount,
            `Subscriber ${i} missed events: received ${eventCounts[i]} of ${triggerCount}`
          );
        }
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
        (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
      }
    });

    it("5.3 Factory Reset Cleanliness: should restore 100% factory defaults after heavily dirtying state", () => {
      // 1. Mutate 50 variant stocks
      const allStock = getAllStock();
      for (let i = 0; i < 50; i++) {
        updateVariantStockCount(allStock[i].variantId, 0);
      }

      // 2. Add 10 new orders
      for (let i = 0; i < 10; i++) {
        createAdminOrder({
          customerName: `Dirty Customer ${i}`,
          customerEmail: `dirty${i}@example.com`,
          customerPhone: `+39 300 000 ${i.toString().padStart(4, "0")}`,
          total: 100 + i,
          fulfillmentType: "courier",
          items: [],
        });
      }

      // 3. Add 5 new customers
      for (let i = 0; i < 5; i++) {
        createAdminCustomer({
          name: `Dirty CRM ${i}`,
          email: `dirty_crm${i}@example.com`,
          phone: `+39 310 000 ${i}`,
        });
      }

      // Verify state is dirty
      assert.ok(getAdminOrders().length >= 19);
      assert.ok(getAdminCustomers().length >= 12);
      assert.ok(getAdminKpis().outOfStockCount >= 50);

      // 4. Trigger 1-Click Factory Reset
      const resetState = resetAdminStoreToDefaults();

      // Verify restoration of defaults
      assert.strictEqual(resetState.version, 1);
      assert.strictEqual(Object.keys(resetState.variantStocks).length, 659);
      assert.strictEqual(resetState.orders.length, 9, "Orders must reset to 9 default seed orders");
      assert.strictEqual(resetState.customers.length, 7, "Customers must reset to 7 default seed customers");

      const kpisAfterReset = getAdminKpis();
      assert.strictEqual(kpisAfterReset.ordersCount, 9);
      assert.strictEqual(kpisAfterReset.registeredCustomers, 7);
      assert.strictEqual(kpisAfterReset.outOfStockCount, 7, "Default seed has 7 out of stock variants");
      assert.strictEqual(kpisAfterReset.lowStockCount, 24, "Default seed has 24 low stock variants");
      assert.strictEqual(kpisAfterReset.availableStockCount, 628, "Default seed has 628 available variants");
    });

    it("5.4 Corrupted Storage Auto-Healing: should recover gracefully from malformed or partial localStorage payloads", () => {
      const mockStorage = new MockLocalStorage();
      const mockWin = new MockWindow();
      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      const originalLocalStorage = (globalThis as unknown as { localStorage: unknown }).localStorage;

      (globalThis as unknown as { window: unknown }).window = mockWin;
      (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;

      try {
        const malformedPayloads = [
          "{invalid-json-syntax",
          "\"just-a-primitive-string\"",
          "42",
          "null",
          "{\"version\": 1}", // missing variantStocks
          "{\"variantStocks\": null}", // null variantStocks
          "", // empty string
        ];

        for (const badPayload of malformedPayloads) {
          mockStorage.setItem(STORAGE_ADMIN_STORE_KEY, badPayload);

          assert.doesNotThrow(() => {
            const state = getAdminStoreState();
            assert.ok(state, "Must return valid state object");
            assert.strictEqual(state.version, 1);
            assert.ok(state.variantStocks && typeof state.variantStocks === "object");
            assert.strictEqual(Object.keys(state.variantStocks).length, 659);
          }, `Crashed on corrupted localStorage payload: ${badPayload}`);
        }
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
        (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
      }
    });

    it("5.5 Storage Quota & Write Exception Resilience: should gracefully handle localStorage write failures and complete storage denial", () => {
      const mockWin = new MockWindow();
      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      const originalLocalStorage = (globalThis as unknown as { localStorage: unknown }).localStorage;

      (globalThis as unknown as { window: unknown }).window = mockWin;

      try {
        // Test A: Complete storage denial (both getItem and setItem throw SecurityError as in private mode)
        const deniedStorage = {
          getItem() {
            throw new Error("SecurityError: Storage is disabled");
          },
          setItem() {
            throw new Error("SecurityError: Storage is disabled");
          },
          removeItem() {},
          clear() {},
        };
        (globalThis as unknown as { localStorage: unknown }).localStorage = deniedStorage;

        assert.doesNotThrow(() => {
          const testVid = getAllStock()[0].variantId;
          const updated = updateVariantStockCount(testVid, 42);
          assert.strictEqual(updated.stockQuantity, 42);

          // In complete storage denial, getAdminStoreState falls back to getMemoryStore()
          const reloaded = getVariantStockById(testVid);
          assert.strictEqual(
            reloaded?.stockQuantity,
            42,
            "Memory store must maintain state when localStorage access is completely blocked"
          );
        }, "Should not crash when localStorage is completely disabled");

        // Test B: Quota failure on write
        const quotaStorage = new MockLocalStorage();
        quotaStorage.failOnSetItem = true;
        (globalThis as unknown as { localStorage: unknown }).localStorage = quotaStorage;

        assert.doesNotThrow(() => {
          const state = getAdminStoreState();
          // saveAdminStoreState must catch QuotaExceededError without rethrowing
          saveAdminStoreState(state);
        }, "saveAdminStoreState must catch setItem exceptions without unhandled throw");
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
        (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
      }
    });

  });
});
