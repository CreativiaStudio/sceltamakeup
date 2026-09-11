/**
 * Verification Script for Milestone 1:
 * Standalone Supabase DDL & Isolated Local Storage Engine
 */

import * as fs from "fs";
import * as path from "path";
import {
  getAllStock,
  updateVariantStockCount,
  updateVariantPrice,
  computeStockStatus,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  updateOrderTracking,
  createAdminOrder,
  getAdminCustomers,
  getAdminCustomerById,
  updateCustomerNotes,
  resetAdminStoreToDefaults,
  getAdminKpis,
} from "../lib/adminStore";

function runVerification() {
  console.log("=== SCELTA MAKEUP — MILESTONE 1 VERIFICATION ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. Verify supabase_schema.sql
  // --------------------------------------------------------------------------
  console.log("1. Checking supabase_schema.sql...");
  const sqlPath = path.resolve(__dirname, "../supabase_schema.sql");
  assert(fs.existsSync(sqlPath), "supabase_schema.sql exists at workspace root");

  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  // Zero mentions of Isabel Pepe
  assert(
    !sqlContent.toLowerCase().includes("isabel"),
    "supabase_schema.sql contains ZERO references to Isabel Pepe"
  );

  // All 9 core tables with scelta_ prefix
  const requiredTables = [
    "scelta_customers",
    "scelta_products",
    "scelta_variants",
    "scelta_inventory",
    "scelta_inventory_logs",
    "scelta_orders",
    "scelta_order_items",
    "scelta_appointments",
    "scelta_blocked_slots",
    "scelta_notification_logs",
  ];

  for (const table of requiredTables) {
    assert(
      sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
      `Table ${table} is defined with scelta_ prefix`
    );
  }

  // Check automated stock deduction trigger
  assert(
    sqlContent.includes("scelta_handle_order_item_stock_deduction"),
    "Trigger function scelta_handle_order_item_stock_deduction exists"
  );
  assert(
    sqlContent.includes("trg_scelta_deduct_stock_on_order_item"),
    "Trigger trg_scelta_deduct_stock_on_order_item exists on scelta_order_items"
  );

  // Check POS procedure
  assert(
    sqlContent.includes("scelta_record_pos_sale"),
    "Stored procedure scelta_record_pos_sale exists"
  );

  // Check high performance EAN barcode index
  assert(
    sqlContent.includes("idx_scelta_variants_ean"),
    "EAN barcode index idx_scelta_variants_ean exists"
  );

  // Check RLS
  for (const table of requiredTables) {
    assert(
      sqlContent.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`),
      `RLS enabled on ${table}`
    );
  }

  // --------------------------------------------------------------------------
  // 2. Verify .env.example
  // --------------------------------------------------------------------------
  console.log("\n2. Checking .env.example...");
  const envPath = path.resolve(__dirname, "../.env.example");
  assert(fs.existsSync(envPath), ".env.example exists at workspace root");

  const envContent = fs.readFileSync(envPath, "utf-8");
  assert(
    envContent.includes("NEXT_PUBLIC_SUPABASE_URL") &&
    envContent.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
    envContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
    ".env.example contains dedicated Supabase configuration variables"
  );
  assert(
    envContent.includes("ISOLAMENTO") || envContent.includes("Isabel Pepe"),
    ".env.example contains prominent isolation warning against using Isabel Pepe credentials"
  );

  // --------------------------------------------------------------------------
  // 3. Verify lib/adminStore.ts
  // --------------------------------------------------------------------------
  console.log("\n3. Checking lib/adminStore.ts variant stock engine...");

  // Status computation logic
  assert(computeStockStatus(0) === "out_of_stock", "Stock 0 -> out_of_stock");
  assert(computeStockStatus(1) === "low_stock", "Stock 1 -> low_stock (< 5)");
  assert(computeStockStatus(4) === "low_stock", "Stock 4 -> low_stock (< 5)");
  assert(computeStockStatus(5) === "available", "Stock 5 -> available");
  assert(computeStockStatus(20) === "available", "Stock 20 -> available");

  // Stock initialization
  const allStocks = getAllStock();
  assert(allStocks.length === 659, `All 659 variants loaded (got: ${allStocks.length})`);

  const availableCount = allStocks.filter((s) => s.stockStatus === "available").length;
  const lowStockCount = allStocks.filter((s) => s.stockStatus === "low_stock").length;
  const outOfStockCount = allStocks.filter((s) => s.stockStatus === "out_of_stock").length;

  assert(availableCount > 0, `Available stock count: ${availableCount} (> 0)`);
  assert(lowStockCount > 0, `Low stock count: ${lowStockCount} (> 0)`);
  assert(outOfStockCount > 0, `Out of stock count: ${outOfStockCount} (> 0)`);
  assert(
    availableCount + lowStockCount + outOfStockCount === 659,
    "Status badges cover 100% of variants"
  );

  // Variant stock update
  const sampleVariant = allStocks[0];
  const updatedStock = updateVariantStockCount(sampleVariant.variantId, 2);
  assert(updatedStock.stockQuantity === 2, "Stock count successfully updated to 2");
  assert(updatedStock.stockStatus === "low_stock", "Status recalculated to low_stock");

  const updatedStockZero = updateVariantStockCount(sampleVariant.variantId, 0);
  assert(updatedStockZero.stockQuantity === 0, "Stock count successfully updated to 0");
  assert(updatedStockZero.stockStatus === "out_of_stock", "Status recalculated to out_of_stock");

  // Variant price update
  const updatedPrice = updateVariantPrice(sampleVariant.variantId, 99.5);
  assert(updatedPrice.price === 99.5, "Variant price successfully updated to 99.5");

  // --------------------------------------------------------------------------
  // 4. Verify Orders Management
  // --------------------------------------------------------------------------
  console.log("\n4. Checking lib/adminStore.ts orders management...");
  const orders = getAdminOrders();
  assert(orders.length >= 8, `Initial demo orders count >= 8 (got: ${orders.length})`);

  const courierOrders = orders.filter((o) => o.fulfillmentType === "courier");
  const pickupOrders = orders.filter((o) => o.fulfillmentType === "store_pickup");
  assert(courierOrders.length > 0, `Courier orders present (${courierOrders.length})`);
  assert(pickupOrders.length > 0, `Store pickup orders present (${pickupOrders.length})`);

  const statuses = new Set(orders.map((o) => o.status));
  assert(statuses.has("processing"), "Status 'processing' present");
  assert(statuses.has("shipped"), "Status 'shipped' present");
  assert(statuses.has("ready_for_pickup"), "Status 'ready_for_pickup' present");
  assert(statuses.has("completed"), "Status 'completed' present");

  // Update order status
  const orderToUpdate = orders[0];
  const updatedOrder = updateOrderStatus(orderToUpdate.id, "shipped");
  assert(updatedOrder.status === "shipped", `Order status updated to shipped`);

  // Update tracking code
  const trackedOrder = updateOrderTracking(orderToUpdate.id, "TEST-TRACKING-12345", "GLS Italy");
  assert(trackedOrder.trackingCode === "TEST-TRACKING-12345", "Tracking code updated");
  assert(trackedOrder.courierName === "GLS Italy", "Courier name updated");

  // Create admin order
  const newOrder = createAdminOrder({
    customerName: "Maria Test",
    customerEmail: "maria.test@example.com",
    customerPhone: "+39 333 111 2222",
    total: 49.9,
    fulfillmentType: "courier",
    items: [
      {
        productId: sampleVariant.productId,
        productTitle: sampleVariant.productName || "Test Product",
        quantity: 1,
        price: 49.9,
      },
    ],
  });
  assert(newOrder.id.startsWith("SC-ORD-"), `New order created with ID: ${newOrder.id}`);
  assert(getAdminOrderById(newOrder.id) !== undefined, "New order retrievable by ID");

  // --------------------------------------------------------------------------
  // 5. Verify Omnichannel CRM Customers
  // --------------------------------------------------------------------------
  console.log("\n5. Checking lib/adminStore.ts CRM customers...");
  const customers = getAdminCustomers();
  assert(customers.length >= 6, `Initial CRM customers count >= 6 (got: ${customers.length})`);

  const chiara = getAdminCustomerById("crm-cust-001");
  assert(chiara !== undefined, "Customer Chiara Rossi retrievable by ID");
  assert(
    chiara!.ordersCount > 0 && chiara!.appointmentsCount > 0,
    "Customer has merged order history and appointment history"
  );
  assert(chiara!.totalSpend > 0, `Customer total spend calculated (€${chiara!.totalSpend})`);

  const updatedNotes = updateCustomerNotes("crm-cust-001", "Updated note for VIP bridal makeup");
  assert(
    updatedNotes.notes === "Updated note for VIP bridal makeup",
    "Customer notes successfully updated"
  );

  // --------------------------------------------------------------------------
  // 6. Verify Reset Functionality
  // --------------------------------------------------------------------------
  console.log("\n6. Checking lib/adminStore.ts 1-click factory reset...");
  const resetState = resetAdminStoreToDefaults();
  assert(resetState.version === 1, "Factory reset returned fresh state (version 1)");
  assert(
    Object.keys(resetState.variantStocks).length === 659,
    "Reset reloaded all 659 variant stocks"
  );
  assert(resetState.orders.length >= 8, "Reset reloaded default demo orders");
  assert(resetState.customers.length >= 6, "Reset reloaded default CRM customers");

  // Check KPIs helper
  const kpis = getAdminKpis();
  assert(kpis.totalRevenue > 0, `KPI Total Revenue: €${kpis.totalRevenue}`);
  assert(kpis.ordersCount > 0, `KPI Orders Count: ${kpis.ordersCount}`);
  assert(kpis.registeredCustomers > 0, `KPI Customers: ${kpis.registeredCustomers}`);

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
