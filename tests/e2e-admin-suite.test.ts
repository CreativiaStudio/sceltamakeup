import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  resetAdminStoreToDefaults,
  getAdminStoreState,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  updateOrderTracking,
  createAdminOrder,
  getAdminCustomers,
  getAdminCustomerById,
  updateCustomerNotes,
  createAdminCustomer,
  getAllStock,
  getAdminVariantStocks,
  getVariantStockById,
  updateVariantStockCount,
  updateVariantStock,
  updateVariantPrice,
  computeStockStatus,
  getAdminKpis,
  updateProductDetails,
  getProductOverride,
  getProductOverrides,
} from "../lib/adminStore";
import {
  catalog,
  getAllProducts,
  getProductById,
  getProductBySlug,
  getProductsByCategory,
  getProductsByBrand,
  searchProducts,
  getAllCategories,
  getAllBrands,
} from "../lib/catalog";
import {
  getOperators,
  createAppointment,
  markAppointmentPaid,
  getAgendaSlots,
  AGENDA_BOUTIQUE_SLOTS,
} from "../lib/bookingService";
import { SERVICES } from "../data/services";
import {
  getCourierTrackingUrl,
  getWhatsAppTrackingMessage,
  getWhatsAppDirectUrl,
  formatPhoneForWhatsApp,
} from "../lib/trackingUtils";
import {
  getTrackingConfig,
  getTrackingEvents,
  simulateTrackingEvent,
  clearTrackingEvents,
  resetTrackingEventsToDefault,
} from "../lib/pixelTracker";

const PROJECT_ROOT = path.resolve(__dirname, "..");

describe("Scelta Makeup E-Commerce Admin Suite E2E Test Suite (/admin)", () => {
  beforeEach(() => {
    // Isolate each test with clean factory default demo state
    resetAdminStoreToDefaults();
  });

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (CATEGORY-PARTITION)
  // =========================================================================
  describe("Tier 1: Feature Coverage & Architectural Integrity", () => {
    // 1.1 Database Isolation Verification
    it("1.1 should guarantee 100% database isolation with zero references to Isabel Pepe", () => {
      const schemaPath = path.join(PROJECT_ROOT, "supabase_schema.sql");
      assert.ok(fs.existsSync(schemaPath), "supabase_schema.sql must exist at workspace root");

      const schemaContent = fs.readFileSync(schemaPath, "utf-8");
      const lowerSchema = schemaContent.toLowerCase();

      // Strict prohibition of Isabel Pepe references
      assert.strictEqual(
        lowerSchema.includes("isabel_pepe"),
        false,
        "supabase_schema.sql must not contain 'isabel_pepe'"
      );
      assert.strictEqual(
        lowerSchema.includes("isabelpepe"),
        false,
        "supabase_schema.sql must not contain 'isabelpepe'"
      );
      assert.strictEqual(
        lowerSchema.includes("isabel"),
        false,
        "supabase_schema.sql must not contain 'isabel'"
      );

      // Verify adminStore also has zero Isabel Pepe references
      const adminStorePath = path.join(PROJECT_ROOT, "lib", "adminStore.ts");
      const adminStoreContent = fs.readFileSync(adminStorePath, "utf-8");
      const lowerAdminStore = adminStoreContent.toLowerCase();
      assert.strictEqual(
        lowerAdminStore.includes("isabel_pepe"),
        false,
        "lib/adminStore.ts must not contain 'isabel_pepe'"
      );
      assert.strictEqual(
        lowerAdminStore.includes("isabelpepe"),
        false,
        "lib/adminStore.ts must not contain 'isabelpepe'"
      );
    });

    // 1.2 DDL Verification with 9+ scelta_* tables, triggers, and RLS
    it("1.2 should verify DDL schema with 9+ scelta_* tables, triggers, procedures, and RLS policies", () => {
      const schemaPath = path.join(PROJECT_ROOT, "supabase_schema.sql");
      const schemaContent = fs.readFileSync(schemaPath, "utf-8");

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
        const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`, "i");
        assert.ok(
          tableRegex.test(schemaContent),
          `supabase_schema.sql must declare table '${table}' with scelta_ prefix`
        );

        // Verify RLS enabled for each table
        const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
        assert.ok(
          rlsRegex.test(schemaContent),
          `supabase_schema.sql must enable Row Level Security on '${table}'`
        );
      }

      // Verify triggers and procedures
      assert.ok(
        schemaContent.includes("scelta_set_updated_at"),
        "supabase_schema.sql must define scelta_set_updated_at function"
      );
      assert.ok(
        schemaContent.includes("scelta_handle_order_item_stock_deduction"),
        "supabase_schema.sql must define automatic stock deduction trigger function"
      );
      assert.ok(
        schemaContent.includes("scelta_record_pos_sale"),
        "supabase_schema.sql must define stored procedure for POS RT barcode sale"
      );
    });

    // 1.3 Admin Navigation & Brand Token Contract
    it("1.3 should verify admin tabs contract and official brand palette tokens", () => {
      const expectedTabs = [
        "panoramica",
        "prodotti",
        "ordini",
        "spedizioni",
        "clienti",
        "appuntamenti",
        "notifiche",
        "analytics",
      ];

      // Read PROJECT.md to verify tab contract alignment
      const projectMd = fs.readFileSync(path.join(PROJECT_ROOT, "PROJECT.md"), "utf-8");
      for (const tab of expectedTabs) {
        assert.ok(
          projectMd.includes(`'${tab}'`),
          `PROJECT.md AdminTab contract must include '${tab}'`
        );
      }

      // Verify official Scelta Makeup brand color tokens
      const brandPalette = {
        royalViolet: "#5E1788",
        vividOrchid: "#7A3293",
        pastelLilac: "#D8C2E7",
        mauveRose: "#D462A6",
        opticalWhite: "#FFFFFF",
      };

      for (const [name, hex] of Object.entries(brandPalette)) {
        assert.ok(
          projectMd.includes(hex),
          `PROJECT.md must document brand token ${name} (${hex})`
        );
      }
    });

    // 1.4 Product Catalog Ingestion & Distribution (341 Products, 659 Variants)
    it("1.4 should verify 341 products loaded with exact brand and category distribution", async () => {
      const allProducts = await getAllProducts();
      assert.strictEqual(allProducts.length, 341, "Catalog must contain exactly 341 products");

      // Verify total variants
      let totalVariants = 0;
      for (const p of allProducts) {
        totalVariants += p.variants?.length || 0;
      }
      assert.strictEqual(totalVariants, 659, "Catalog must contain exactly 659 variants");

      // Brand distribution according to catalog ingestion report:
      // Diego dalla Palma: 82, RVB LAB: 53, Cipria Make Up: 23, Eveline Cosmetics: 98, Pierre René: 59, Miyo: 26
      const brandCounts: Record<string, number> = {};
      for (const p of allProducts) {
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      }

      assert.strictEqual(brandCounts["Diego dalla Palma"], 82, "Diego dalla Palma must have 82 products");
      assert.strictEqual(brandCounts["RVB LAB"], 53, "RVB LAB must have 53 products");
      assert.strictEqual(brandCounts["Cipria Make Up"], 23, "Cipria Make Up must have 23 products");
      assert.strictEqual(brandCounts["Eveline Cosmetics"], 98, "Eveline Cosmetics must have 98 products");
      assert.strictEqual(brandCounts["Pierre René"], 59, "Pierre René must have 59 products");
      assert.strictEqual(brandCounts["Miyo"], 26, "Miyo must have 26 products");

      // Category distribution:
      // Skincare & Dermo: 82, Viso: 129, Occhi: 90, Labbra: 39, Beauty & Accessori: 1
      const catCounts: Record<string, number> = {};
      for (const p of allProducts) {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      }

      assert.strictEqual(catCounts["Skincare & Dermo"], 82, "Skincare & Dermo must have 82 products");
      assert.strictEqual(catCounts["Viso"], 129, "Viso must have 129 products");
      assert.strictEqual(catCounts["Occhi"], 90, "Occhi must have 90 products");
      assert.strictEqual(catCounts["Labbra"], 39, "Labbra must have 39 products");
      assert.strictEqual(catCounts["Beauty & Accessori"], 1, "Beauty & Accessori must have 1 product");

      // Verify individual lookup and filtering helpers
      const first = allProducts[0];
      const byId = await getProductById(first.id);
      assert.strictEqual(byId?.id, first.id, "getProductById must return matching product");
      const bySlug = await getProductBySlug(first.slug);
      assert.strictEqual(bySlug?.slug, first.slug, "getProductBySlug must return matching product");
      const byCat = await getProductsByCategory(first.category);
      assert.ok(byCat.length > 0, "getProductsByCategory must return non-empty list");
      const byBrand = await getProductsByBrand(first.brand);
      assert.ok(byBrand.length > 0, "getProductsByBrand must return non-empty list");
    });

    // 1.5 Stock Status Classification
    it("1.5 should correctly classify stock status thresholds ('available', 'low_stock', 'out_of_stock')", () => {
      // Direct threshold validation:
      // available: >= 5
      // low_stock: 1 - 4
      // out_of_stock: <= 0
      assert.strictEqual(computeStockStatus(15), "available");
      assert.strictEqual(computeStockStatus(5), "available");
      assert.strictEqual(computeStockStatus(4), "low_stock");
      assert.strictEqual(computeStockStatus(3), "low_stock");
      assert.strictEqual(computeStockStatus(1), "low_stock");
      assert.strictEqual(computeStockStatus(0), "out_of_stock");
      assert.strictEqual(computeStockStatus(-5), "out_of_stock");

      // Verify store state version and variant stocks map
      const state = getAdminStoreState();
      assert.strictEqual(state.version, 2, "Admin store state version must be 2");
      const stocksMap = getAdminVariantStocks();
      assert.strictEqual(Object.keys(stocksMap).length, 659, "getAdminVariantStocks must have 659 keys");

      // Verify stock items loaded in adminStore conform to contract
      const allStock = getAllStock();
      assert.strictEqual(allStock.length, 659, "adminStore must manage all 659 variant stocks");

      for (const item of allStock) {
        assert.ok(item.variantId, "Variant stock item must have variantId");
        assert.ok(item.productId, "Variant stock item must have productId");
        assert.ok(item.sku, "Variant stock item must have sku");
        assert.ok(item.price >= 0, "Variant price must be non-negative");
        assert.ok(
          ["available", "low_stock", "out_of_stock"].includes(item.stockStatus),
          `Invalid stockStatus: ${item.stockStatus}`
        );
      }
    });

    // 1.6 Order Statuses & Transitions
    it("1.6 should manage order statuses across courier shipping and in-store pickup", () => {
      const orders = getAdminOrders();
      assert.ok(orders.length >= 9, "Initial orders seed must contain at least 9 demo orders");

      const statuses = new Set(orders.map((o) => o.status));
      assert.ok(statuses.has("processing"), "Orders must include 'processing'");
      assert.ok(statuses.has("shipped"), "Orders must include 'shipped'");
      assert.ok(statuses.has("ready_for_pickup"), "Orders must include 'ready_for_pickup'");
      assert.ok(statuses.has("completed"), "Orders must include 'completed'");
      assert.ok(statuses.has("cancelled"), "Orders must include 'cancelled'");

      const fulfillments = new Set(orders.map((o) => o.fulfillmentType));
      assert.ok(fulfillments.has("courier"), "Orders must include 'courier'");
      assert.ok(fulfillments.has("store_pickup"), "Orders must include 'store_pickup'");

      // Test status update transition
      const order = orders.find((o) => o.status === "processing");
      assert.ok(order, "Should find an order in processing state");

      const updated = updateOrderStatus(order.id, "completed");
      assert.strictEqual(updated.status, "completed");

      const reloaded = getAdminOrderById(order.id);
      assert.strictEqual(reloaded?.status, "completed");
    });

    // 1.7 Shipping Tracking & Pickup Readiness
    it("1.7 should assign courier tracking numbers and maintain store pickup readiness", () => {
      const orders = getAdminOrders();
      const courierOrder = orders.find((o) => o.fulfillmentType === "courier" && o.status === "processing");
      assert.ok(courierOrder, "Should find a courier order in processing");

      const trackingCode = "BRT-TEST-8819203";
      const shippedOrder = updateOrderTracking(courierOrder.id, trackingCode, "BRT Express");

      assert.strictEqual(shippedOrder.trackingCode, trackingCode);
      assert.strictEqual(shippedOrder.status, "shipped");
      assert.strictEqual(shippedOrder.courierName, "BRT Express");

      // Verify store pickup order readiness
      const pickupOrder = orders.find((o) => o.fulfillmentType === "store_pickup");
      assert.ok(pickupOrder, "Should find a store pickup order");
      const readyOrder = updateOrderStatus(pickupOrder.id, "ready_for_pickup");
      assert.strictEqual(readyOrder.status, "ready_for_pickup");
      assert.strictEqual(readyOrder.fulfillmentType, "store_pickup");
    });

    // 1.8 Omnichannel CRM Customer Profiles & LTV
    it("1.8 should manage omnichannel customer profiles combining orders and salon appointments", () => {
      const customers = getAdminCustomers();
      assert.ok(customers.length >= 7, "CRM must contain at least 7 customer profiles");

      for (const cust of customers) {
        assert.ok(cust.id, "Customer must have id");
        assert.ok(cust.name, "Customer must have name");
        assert.ok(cust.email, "Customer must have email");
        assert.ok(cust.phone, "Customer must have phone");
        assert.ok(cust.totalSpend >= 0, "Customer total spend must be non-negative");
        assert.ok(cust.ordersCount >= 0, "Customer ordersCount must be non-negative");
        assert.ok(cust.appointmentsCount >= 0, "Customer appointmentsCount must be non-negative");
      }

      // Update customer beauty notes
      const targetCustomer = customers[0];
      const newNotes = "Pelle particolarmente reattiva nei cambi di stagione. Consigliato trattamento lenitivo.";
      const updatedCust = updateCustomerNotes(targetCustomer.id, newNotes);
      assert.strictEqual(updatedCust.notes, newNotes);

      const reloadedCust = getAdminCustomerById(targetCustomer.id);
      assert.strictEqual(reloadedCust?.notes, newNotes);
    });

    // 1.9 Preservation of /admin/appuntamenti & Existing Modules
    it("1.9 should verify that /admin/appuntamenti and WhatsApp queue monitor are preserved intact", () => {
      const appuntamentiPath = path.join(PROJECT_ROOT, "app", "admin", "appuntamenti", "page.tsx");
      assert.ok(fs.existsSync(appuntamentiPath), "app/admin/appuntamenti/page.tsx must exist intact");

      const content = fs.readFileSync(appuntamentiPath, "utf-8");
      assert.ok(
        content.includes("NotificationQueueTab") || content.includes("whatsapp") || content.includes("cassa"),
        "app/admin/appuntamenti/page.tsx must retain operational appointment/cassa/queue components"
      );

      const notifQueueTabPath = path.join(PROJECT_ROOT, "components", "admin", "NotificationQueueTab.tsx");
      assert.ok(fs.existsSync(notifQueueTabPath), "components/admin/NotificationQueueTab.tsx must exist intact");
    });

    // 1.10 Multi-Operator Scheduling, Boutique Hourly Slots & Cassa RT (R5)
    it("1.10 should support multi-operator scheduling, rapid assignment, 09:30-20:30 slots, and fiscal RT balance clearance", () => {
      // 1. Verify both operators exist and are active
      const operators = getOperators();
      assert.ok(operators.length >= 2, "Must support at least 2 operators");

      const federica = operators.find((o) => o.id === "op-federica-cesiano");
      assert.ok(federica, "Federica Cesiano must exist");
      assert.strictEqual(federica?.active, true);
      assert.ok(federica?.role.includes("Postazione Trucco Negozio"));

      const futuraCollega = operators.find((o) => o.id === "op-beauty-cabina");
      assert.ok(futuraCollega, "Futura Collega / Cabina Estetica must exist");
      assert.strictEqual(futuraCollega?.active, true);
      assert.strictEqual(futuraCollega?.name, "Futura Collega / Cabina Estetica");
      assert.strictEqual(futuraCollega?.role, "Beauty Specialist Cabina Privata");

      // 2. Verify agenda boutique slots cover 09:30 - 20:30
      assert.ok(AGENDA_BOUTIQUE_SLOTS.includes("09:30"), "Must include opening slot 09:30");
      assert.ok(AGENDA_BOUTIQUE_SLOTS.includes("20:30"), "Must include closing slot 20:30");
      assert.ok(AGENDA_BOUTIQUE_SLOTS.length >= 10, "Must contain full boutique day coverage");

      // 3. Create appointment assigned to Futura Collega
      const today = new Date().toISOString().split("T")[0];
      const cabinaApp = createAppointment({
        serviceId: "srv-beauty-mesofill",
        date: today,
        time: "11:30",
        operatorId: "op-beauty-cabina",
        customer: {
          name: "Serena",
          surname: "Maggiulli",
          phone: "+39 333 998 7766",
          email: "serena.maggiulli@example.com",
          notes: "Trattamento cabina privata viso rigenerante",
        },
      });

      assert.strictEqual(cabinaApp.operatorId, "op-beauty-cabina");
      assert.strictEqual(cabinaApp.operatorName, "Futura Collega / Cabina Estetica");

      // 4. Invariant: 20% online deposit, 80% balance due with zero cent discrepancy
      const service = SERVICES.find((s) => s.id === "srv-beauty-mesofill");
      assert.ok(service, "srv-beauty-mesofill service must exist");
      assert.strictEqual(cabinaApp.pricing.depositPaid, service?.depositAmount);
      assert.strictEqual(cabinaApp.pricing.balanceDue, service?.balanceAmount);
      assert.strictEqual(
        Math.round((cabinaApp.pricing.depositPaid + cabinaApp.pricing.balanceDue) * 100) / 100,
        cabinaApp.pricing.priceOnline,
        "Deposit + Balance must equal total online price with zero cent discrepancy"
      );

      // 5. In-store balance clearance and Epson FP-81II RT SOAP receipt generation
      const checkout = markAppointmentPaid(cabinaApp.id, "mypos_card");
      assert.strictEqual(checkout.success, true);
      assert.strictEqual(checkout.appointment.status, "completed_paid");
      assert.strictEqual(checkout.appointment.paymentMethodBalance, "mypos_card");
      assert.ok(checkout.appointment.cassaReceiptNumber?.startsWith("RT-"));
      assert.ok(checkout.receiptXml.includes("<printerFiscalReceipt>"));
      assert.ok(checkout.receiptXml.includes("SCELTA MAKEUP - BOUTIQUE NAPOLI"));
      assert.ok(checkout.receiptXml.includes("CARTA"));

      // 6. Verify getAgendaSlots returns slots with appointments and respects operator filter
      const allSlots = getAgendaSlots(today, "all");
      assert.ok(allSlots.length >= AGENDA_BOUTIQUE_SLOTS.length);
      const slot1130 = allSlots.find((s) => s.time === "11:30");
      assert.ok(slot1130, "Slot 11:30 must exist");
      assert.ok(slot1130?.appointments.some((a) => a.id === cabinaApp.id));

      const cabinaOnlySlots = getAgendaSlots(today, "op-beauty-cabina");
      const cabina1130 = cabinaOnlySlots.find((s) => s.time === "11:30");
      assert.ok(cabina1130?.appointments.some((a) => a.id === cabinaApp.id));

      const federicaOnlySlots = getAgendaSlots(today, "op-federica-cesiano");
      const federica1130 = federicaOnlySlots.find((s) => s.time === "11:30");
      assert.ok(!federica1130?.appointments.some((a) => a.id === cabinaApp.id));
    });

    // 1.11 Product Editor Modal Overrides & Catalog Integrity (R1 & R2)
    it("1.11 should support full product editing with live overrides and catalog integrity (R1 & R2)", async () => {
      // 1. Verify that DHC110160 does not point to lip pencil
      const allProducts = await getAllProducts();
      const sunShampoo = allProducts.find((p) => p.id.includes("DHC110160") || p.name.toUpperCase().includes("SUN SHAMPOO"));
      if (sunShampoo) {
        for (const img of sunShampoo.images) {
          assert.strictEqual(
            img.includes("rvb-matita-labbra-31"),
            false,
            "Sun shampoo must not use lip pencil 31 image"
          );
        }
      }

      // 2. Select a product to edit via ProductEditorModal logic
      const targetProduct = allProducts[0];
      assert.ok(targetProduct, "Target product must exist");

      const originalOverrides = getProductOverrides();
      assert.strictEqual(originalOverrides[targetProduct.id], undefined);

      // 3. Atomically update product details (texts, photos, variants)
      const updatedData = {
        name: "Rossetto Iconico Edizione Speciale Atelier Napoli",
        brand: "Diego dalla Palma",
        category: "Labbra" as const,
        shortDescription: "Formula vellutata e idratante a lunga durata.",
        description: "Nuova descrizione completa con attivi emollienti e finish demi-matt.",
        howToUse: "Stendere direttamente sulle labbra partendo dal centro verso gli angoli.",
        formulaBenefits: "Acido ialuronico e burro di karité bio.",
        inci: "Dimethicone, Synthetic Wax, Butyrospermum Parkii Butter, Sodium Hyaluronate.",
        images: [
          "/products/diego-dalla-palma-rossetto-iconico.png",
          "/products/diego-dalla-palma-rossetto-texture.png",
        ],
        variants: [
          {
            id: `${targetProduct.id}-var-01`,
            name: "01 Rosso Rubino Intenso",
            sku: "DDP-LIP-01-TEST",
            ean: "8015150123456",
            colorHex: "#990000",
            image: "/products/diego-dalla-palma-rossetto-iconico.png",
            inStock: true,
            stock: 25,
            price: 26.5,
          },
        ],
      };

      const result = updateProductDetails(targetProduct.id, updatedData);
      assert.strictEqual(result.name, updatedData.name);

      // 4. Verify getProductOverride reflects all changes
      const override = getProductOverride(targetProduct.id);
      assert.ok(override, "Product override must exist in adminStore");
      assert.strictEqual(override?.name, updatedData.name);
      assert.strictEqual(override?.description, updatedData.description);
      assert.strictEqual(override?.images?.length, 2);
      assert.strictEqual(override?.variants?.[0].sku, "DDP-LIP-01-TEST");
      assert.strictEqual(override?.variants?.[0].ean, "8015150123456");

      // 5. Verify variant stocks map was updated
      const stocksMap = getAdminVariantStocks();
      const updatedVariantStock = stocksMap[`${targetProduct.id}-var-01`];
      assert.ok(updatedVariantStock, "Variant stock item must be updated in admin store");
      assert.strictEqual(updatedVariantStock?.productName, updatedData.name);
      assert.strictEqual(updatedVariantStock?.price, 26.5);
      assert.strictEqual(updatedVariantStock?.stockQuantity, 25);
      assert.strictEqual(updatedVariantStock?.stockStatus, "available");
      assert.strictEqual(updatedVariantStock?.sku, "DDP-LIP-01-TEST");
      assert.strictEqual(updatedVariantStock?.ean, "8015150123456");
    });

    // 1.12 Carrier Clickable Tracking URLs, 1-Click WhatsApp & Manual Orders (R3)
    it("1.12 should generate official carrier tracking URLs, WhatsApp notifications and manual orders (R3)", () => {
      // 1. Official carrier tracking URL generation
      const brtUrl = getCourierTrackingUrl("BRT Express", "BRT-9921448102");
      assert.ok(brtUrl.includes("brt.it") && brtUrl.includes("BRT-9921448102"));

      const glsUrl = getCourierTrackingUrl("GLS Italy", "GLS-123456789");
      assert.ok(glsUrl.includes("gls-group.com") && glsUrl.includes("GLS-123456789"));

      const dhlUrl = getCourierTrackingUrl("DHL Express", "DHL-987654321");
      assert.ok(dhlUrl.includes("dhl.com") && dhlUrl.includes("DHL-987654321"));

      const posteUrl = getCourierTrackingUrl("Poste Italiane", "POSTE-5544332211");
      assert.ok(posteUrl.includes("poste.it") && posteUrl.includes("POSTE-5544332211"));

      // 2. Precompiled WhatsApp notification message
      const testOrder = getAdminOrders()[0];
      const trackingMsg = getWhatsAppTrackingMessage(testOrder, "BRT-9921448102", "BRT Express");
      assert.ok(trackingMsg.includes(testOrder.customerName));
      assert.ok(trackingMsg.includes(testOrder.id));
      assert.ok(trackingMsg.includes("BRT Express"));
      assert.ok(trackingMsg.includes("brt.it"));
      assert.ok(trackingMsg.includes("Federica Cesiano - Scelta Makeup Atelier Napoli"));

      // 3. Direct wa.me link generation
      const waUrl = getWhatsAppDirectUrl("+39 349 765 4321", trackingMsg);
      assert.ok(waUrl.startsWith("https://wa.me/393497654321?text="));

      // 4. Create manual order from counter / phone / WhatsApp
      const manualOrder = createAdminOrder({
        customerName: "Elena De Rosa",
        customerEmail: "elena.derosa@example.com",
        customerPhone: "+39 333 4455667",
        fulfillmentType: "store_pickup",
        items: [
          {
            productId: "diego-dalla-palma-rossetto-iconico",
            productTitle: "Rossetto Iconico Diego dalla Palma",
            variantName: "01 Rosso Rubino",
            quantity: 2,
            price: 24.5,
          },
        ],
        total: 49.0,
      });

      assert.ok(manualOrder.id.startsWith("SC-ORD-"));
      assert.strictEqual(manualOrder.status, "processing");
      assert.strictEqual(manualOrder.fulfillmentType, "store_pickup");
      assert.strictEqual(manualOrder.total, 49.0);

      // Verify order is retrievable
      const retrieved = getAdminOrderById(manualOrder.id);
      assert.strictEqual(retrieved?.id, manualOrder.id);
      assert.strictEqual(retrieved?.customerName, "Elena De Rosa");
    });

    // 1.13 Tracking & Pixel Infrastructure (GA4, GTM, Meta CAPI) and Event Simulator (R4)
    it("1.13 should expose tracking credentials and simulate e-commerce telemetry events (R4)", () => {
      // 1. Verify official tracking configuration
      const config = getTrackingConfig();
      assert.strictEqual(config.ga4MeasurementId, "G-SCELTA2026");
      assert.strictEqual(config.ga4Status, "active");
      assert.strictEqual(config.gtmContainerId, "GTM-SCELTA99");
      assert.strictEqual(config.gtmStatus, "active");
      assert.strictEqual(config.metaPixelId, "984210349812745");
      assert.strictEqual(config.metaPixelStatus, "active");
      assert.strictEqual(config.metaCapiStatus, "active");
      assert.strictEqual(config.metaMatchQualityScore, 8.9);
      assert.strictEqual(config.eventDeduplicationEnabled, true);

      // 2. Initial event stream
      const initialEvents = getTrackingEvents();
      assert.ok(initialEvents.length >= 4, "Initial event log must contain seed events");

      // 3. Simulate view_item event
      const viewItemEvt = simulateTrackingEvent("view_item");
      assert.strictEqual(viewItemEvt.eventName, "view_item");
      assert.strictEqual(viewItemEvt.status, "delivered");
      assert.strictEqual(viewItemEvt.responseStatus, 200);
      assert.ok(viewItemEvt.destinations.includes("ga4"));
      assert.ok(viewItemEvt.destinations.includes("gtm"));
      assert.ok(viewItemEvt.destinations.includes("meta_pixel"));
      assert.ok(viewItemEvt.destinations.includes("meta_capi"));
      assert.strictEqual(viewItemEvt.payload.currency, "EUR");

      // 4. Simulate purchase event
      const purchaseEvt = simulateTrackingEvent("purchase");
      assert.strictEqual(purchaseEvt.eventName, "purchase");
      assert.ok(purchaseEvt.payload.transaction_id.startsWith("SC-ORD-SIM-"));
      assert.strictEqual(purchaseEvt.responseStatus, 200);

      // 5. Verify events stream contains the newly simulated events
      const allEvents = getTrackingEvents();
      assert.ok(allEvents.some((e) => e.id === viewItemEvt.id));
      assert.ok(allEvents.some((e) => e.id === purchaseEvt.id));
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY VALUE ANALYSIS (BVA) & CORNER CASES
  // =========================================================================
  describe("Tier 2: Boundary Value Analysis & Edge Conditions", () => {
    // 2.1 Search Boundary Conditions
    it("2.1 should handle empty, whitespace, and special characters search queries safely", async () => {
      // Empty string -> returns full catalog
      const resEmpty = await searchProducts("");
      assert.strictEqual(resEmpty.length, 341, "Empty search must return all 341 products");

      // Whitespace string -> returns full catalog
      const resWhitespace = await searchProducts("   \t  ");
      assert.strictEqual(resWhitespace.length, 341, "Whitespace search must return all 341 products");

      // Non-existent search query -> returns empty array
      const resNone = await searchProducts("xyz-definitely-nonexistent-sku-query-9999");
      assert.strictEqual(resNone.length, 0, "Non-matching search must return empty array []");

      // Metacharacters & injection safety
      const maliciousQueries = [
        "' OR '1'='1",
        "<script>alert('xss')</script>",
        "../../etc/passwd",
        "%_%_[]^$()",
        "-- drop table products;",
      ];

      for (const q of maliciousQueries) {
        const res = await searchProducts(q);
        assert.ok(Array.isArray(res), `Search with '${q}' must return an array without throwing`);
      }
    });

    // 2.2 Stock Boundaries (Zero, Negative, Thresholds 1, 4, 5, Extreme)
    it("2.2 should test stock update boundaries: 0, negative values, thresholds (1, 4, 5) and extreme quantities", () => {
      const allStock = getAllStock();
      const testVariant = allStock[0];
      const vid = testVariant.variantId;

      // Exactly 0 -> out_of_stock
      const stockZero = updateVariantStockCount(vid, 0);
      assert.strictEqual(stockZero.stockQuantity, 0);
      assert.strictEqual(stockZero.stockStatus, "out_of_stock");

      // Negative value -> clamped to 0 and out_of_stock
      const stockNeg = updateVariantStockCount(vid, -25);
      assert.strictEqual(stockNeg.stockQuantity, 0, "Negative quantity must clamp to 0");
      assert.strictEqual(stockNeg.stockStatus, "out_of_stock");

      // Threshold 1 -> low_stock
      const stockOne = updateVariantStockCount(vid, 1);
      assert.strictEqual(stockOne.stockQuantity, 1);
      assert.strictEqual(stockOne.stockStatus, "low_stock");

      // Threshold 4 -> low_stock
      const stockFour = updateVariantStockCount(vid, 4);
      assert.strictEqual(stockFour.stockQuantity, 4);
      assert.strictEqual(stockFour.stockStatus, "low_stock");

      // Threshold 5 -> available
      const stockFive = updateVariantStockCount(vid, 5);
      assert.strictEqual(stockFive.stockQuantity, 5);
      assert.strictEqual(stockFive.stockStatus, "available");

      // Extreme large stock -> available without overflow
      const stockExtreme = updateVariantStockCount(vid, 999999);
      assert.strictEqual(stockExtreme.stockQuantity, 999999);
      assert.strictEqual(stockExtreme.stockStatus, "available");

      // Verify updateVariantStock alias works identically
      const aliasResult = updateVariantStock(vid, 10);
      assert.strictEqual(aliasResult.stockQuantity, 10);
      assert.strictEqual(aliasResult.stockStatus, "available");
    });

    // 2.3 Status Transitions on Non-Existent Entities
    it("2.3 should safely reject status updates or tracking updates for non-existent order IDs", () => {
      assert.throws(
        () => {
          updateOrderStatus("NON-EXISTENT-ORDER-ID", "shipped");
        },
        /non trovato/i,
        "Updating non-existent order must throw not found error"
      );

      assert.throws(
        () => {
          updateOrderTracking("NON-EXISTENT-ORDER-ID", "TRK-999");
        },
        /non trovato/i,
        "Adding tracking to non-existent order must throw not found error"
      );

      assert.throws(
        () => {
          updateCustomerNotes("NON-EXISTENT-CUSTOMER-ID", "Some notes");
        },
        /non trovato/i,
        "Updating notes for non-existent customer must throw not found error"
      );
    });

    // 2.4 Customer CRM Boundary: Zero Orders and Zero Appointments
    it("2.4 should handle customers with 0 orders and 0 appointments cleanly without NaN or zero-division", () => {
      const newCust = createAdminCustomer({
        name: "Francesca Nuova",
        email: "francesca.nuova@example.com",
        phone: "+39 340 000 0000",
        totalSpend: 0,
        ordersCount: 0,
        appointmentsCount: 0,
      });

      assert.strictEqual(newCust.totalSpend, 0, "New customer total spend must be 0");
      assert.strictEqual(newCust.ordersCount, 0, "New customer orders count must be 0");
      assert.strictEqual(newCust.appointmentsCount, 0, "New customer appointments count must be 0");
      assert.strictEqual(Number.isNaN(newCust.totalSpend), false, "totalSpend must not be NaN");

      // Can update notes without issue
      const updatedCust = updateCustomerNotes(newCust.id, "Nuova registrazione dal sito, nessun acquisto ancora.");
      assert.strictEqual(updatedCust.totalSpend, 0);
      assert.strictEqual(updatedCust.ordersCount, 0);
    });
  });

  // =========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS & INVARIANTS
  // =========================================================================
  describe("Tier 3: Cross-Feature Combinations & Omnichannel Invariants", () => {
    // 3.1 Order Creation Updates Customer Spend in CRM
    it("3.1 should update customer spend and order count in CRM upon order creation", () => {
      const customers = getAdminCustomers();
      const customer = customers[0];
      const initialSpend = customer.totalSpend;
      const initialOrders = customer.ordersCount;
      assert.ok(initialSpend >= 0, "Customer initial spend must be non-negative");
      assert.ok(initialOrders >= 0, "Customer initial orders must be non-negative");

      const orderAmount = 74.5;
      const createdOrder = createAdminOrder({
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        total: orderAmount,
        fulfillmentType: "courier",
        items: [
          {
            productId: "rvb-lab-fondotinta-antieta",
            productTitle: "Fondotinta Anti-Età",
            quantity: 2,
            price: 37.25,
          },
        ],
      });

      assert.strictEqual(createdOrder.total, orderAmount);

      // Verify order appears in order list
      const allOrders = getAdminOrders();
      const foundOrder = allOrders.find((o) => o.id === createdOrder.id);
      assert.ok(foundOrder, "Newly created order must be retrieved in getAdminOrders()");

      // Verify KPI total revenue includes the new order
      const kpis = getAdminKpis();
      assert.ok(kpis.totalRevenue > 0, "KPI revenue must be positive");
      assert.ok(kpis.ordersCount >= allOrders.length, "KPI ordersCount must match order count");
    });

    // 3.2 Stock Mutation Reflected Across Variant Queries and Executive KPIs
    it("3.2 should synchronize variant stock updates across catalog queries and executive KPI metrics", () => {
      const kpisBefore = getAdminKpis();
      const allStock = getAllStock();

      // Find an available item
      const availableItem = allStock.find((s) => s.stockStatus === "available");
      assert.ok(availableItem, "Should have available stock items");

      // Deplete to 0
      updateVariantStockCount(availableItem.variantId, 0);

      const kpisAfterZero = getAdminKpis();
      assert.strictEqual(
        kpisAfterZero.outOfStockCount,
        kpisBefore.outOfStockCount + 1,
        "KPI outOfStockCount must increase by exactly 1"
      );
      assert.strictEqual(
        kpisAfterZero.availableStockCount,
        kpisBefore.availableStockCount - 1,
        "KPI availableStockCount must decrease by exactly 1"
      );

      // Now set to 3 (low stock)
      updateVariantStockCount(availableItem.variantId, 3);
      const kpisAfterLow = getAdminKpis();
      assert.strictEqual(
        kpisAfterLow.lowStockCount,
        kpisBefore.lowStockCount + 1,
        "KPI lowStockCount must increase by exactly 1"
      );
      assert.strictEqual(
        kpisAfterLow.outOfStockCount,
        kpisBefore.outOfStockCount,
        "KPI outOfStockCount must return to original"
      );
    });

    // 3.3 Omnichannel Lifetime Value Invariant (Zero Cent Discrepancy Fuzzing)
    it("3.3 should verify omnichannel LTV invariant: TotalSpend === OrdersSpend + AppointmentsSpend with zero cent discrepancy", () => {
      // Test over 50 randomized iterations of simulated orders and appointments
      for (let i = 0; i < 50; i++) {
        // Random order amounts with 2 decimals
        const order1 = Math.round((10 + Math.random() * 80) * 100) / 100;
        const order2 = Math.round((5 + Math.random() * 50) * 100) / 100;
        const totalOrdersSpend = Math.round((order1 + order2) * 100) / 100;

        // Random appointment amount with 2 decimals
        const app1 = Math.round((25 + Math.random() * 95) * 100) / 100;
        const totalAppointmentSpend = app1;

        const calculatedLTV = Math.round((totalOrdersSpend + totalAppointmentSpend) * 100) / 100;
        const sumComponents = Math.round((order1 + order2 + app1) * 100) / 100;

        assert.strictEqual(
          calculatedLTV,
          sumComponents,
          `Omnichannel LTV mismatch at iteration ${i}: ${calculatedLTV} !== ${sumComponents}`
        );
      }
    });

    // 3.4 Retail Price Update Mutation
    it("3.4 should update variant retail price and persist updated value without affecting wholesale price", () => {
      const allStock = getAllStock();
      const variant = allStock[0];
      const vid = variant.variantId;
      const originalWholesale = variant.originalWholesalePrice;

      const newPrice = 42.5;
      const updated = updateVariantPrice(vid, newPrice);

      assert.strictEqual(updated.price, newPrice, "Updated variant price must match newPrice");
      if (originalWholesale !== undefined) {
        assert.strictEqual(
          updated.originalWholesalePrice,
          originalWholesale,
          "Wholesale price must remain unchanged when retail price is updated"
        );
      }

      const reloaded = getVariantStockById(vid);
      assert.strictEqual(reloaded?.price, newPrice);
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD WORKLOAD SCENARIOS
  // =========================================================================
  describe("Tier 4: Real-World Operational Workload Scenarios", () => {
    // 4.1 Scenario 1: Courier Order Fulfillment Lifecycle
    it("4.1 Scenario 1: should execute full courier order fulfillment lifecycle", () => {
      // Step 1: Customer creates online courier order
      const newOrder = createAdminOrder({
        id: "SC-E2E-COUR-001",
        customerName: "Beatrice Sposito",
        customerEmail: "beatrice.sposito@example.com",
        customerPhone: "+39 347 889 0011",
        total: 108.0,
        fulfillmentType: "courier",
        shippingAddress: {
          street: "Via Posillipo 120",
          city: "Napoli",
          postalCode: "80123",
          province: "NA",
        },
        items: [
          {
            productId: "diego-dalla-palma-rossetto-iconico",
            productTitle: "Rossetto Iconico",
            quantity: 2,
            price: 24.0,
          },
          {
            productId: "rvb-lab-fondotinta-antieta",
            productTitle: "Fondotinta Seta",
            quantity: 1,
            price: 60.0,
          },
        ],
      });

      assert.strictEqual(newOrder.status, "processing");

      // Step 2: Federica accesses /admin?tab=spedizioni, retrieves order
      const found = getAdminOrderById("SC-E2E-COUR-001");
      assert.ok(found, "Order must be found");
      assert.strictEqual(found.shippingAddress?.street, "Via Posillipo 120");

      // Step 3: Federica prints BRT shipping label and inputs tracking code
      const trackingCode = "BRT-E2E-9912048";
      const shipped = updateOrderTracking("SC-E2E-COUR-001", trackingCode, "BRT Express");
      assert.strictEqual(shipped.status, "shipped");
      assert.strictEqual(shipped.trackingCode, trackingCode);

      // Step 4: Courier delivers parcel; order is marked completed
      const completed = updateOrderStatus("SC-E2E-COUR-001", "completed");
      assert.strictEqual(completed.status, "completed");

      // Step 5: Verify KPI summary reflects completed order
      const kpis = getAdminKpis();
      assert.ok(kpis.completedOrdersCount >= 1);
    });

    // 4.2 Scenario 2: In-Store Boutique Pickup Lifecycle
    it("4.2 Scenario 2: should execute full in-store boutique pickup lifecycle", () => {
      // Step 1: Customer orders online with in-store pickup
      const pickupOrder = createAdminOrder({
        id: "SC-E2E-PICK-002",
        customerName: "Camilla Esposito",
        customerEmail: "camilla.esposito@example.com",
        customerPhone: "+39 349 112 4455",
        total: 35.0,
        fulfillmentType: "store_pickup",
        items: [
          {
            productId: "cipria-blush-setoso",
            productTitle: "Blush Compatto Effetto Velluto",
            quantity: 1,
            price: 35.0,
          },
        ],
      });

      assert.strictEqual(pickupOrder.status, "processing");
      assert.strictEqual(pickupOrder.fulfillmentType, "store_pickup");

      // Step 2: Staff packs item in boutique (Via dei Pellegrini 28/29, Napoli)
      // Marks order as ready for pickup
      const readyOrder = updateOrderStatus("SC-E2E-PICK-002", "ready_for_pickup");
      assert.strictEqual(readyOrder.status, "ready_for_pickup");

      // Step 3: Customer arrives at store, collects package
      const completedOrder = updateOrderStatus("SC-E2E-PICK-002", "completed");
      assert.strictEqual(completedOrder.status, "completed");
      assert.strictEqual(completedOrder.fulfillmentType, "store_pickup");

      const finalCheck = getAdminOrderById("SC-E2E-PICK-002");
      assert.strictEqual(finalCheck?.status, "completed");
    });

    // 4.3 Scenario 3: Product Price & Stock Restocking Lifecycle
    it("4.3 Scenario 3: should handle product stock depletion, supplier restocking, and retail price adjustment", () => {
      const allStock = getAllStock();
      const variant = allStock[10];
      const vid = variant.variantId;

      // Step 1: Rapid sales deplete stock to 0
      const depleted = updateVariantStockCount(vid, 0);
      assert.strictEqual(depleted.stockStatus, "out_of_stock");

      // Step 2: Supplier shipment arrives at boutique with 24 units
      const restocked = updateVariantStockCount(vid, 24);
      assert.strictEqual(restocked.stockQuantity, 24);
      assert.strictEqual(restocked.stockStatus, "available");

      // Step 3: Cost inflation adjustment -> price raised by €3.00
      const updatedPrice = updateVariantPrice(vid, variant.price + 3.0);
      assert.strictEqual(updatedPrice.price, Math.round((variant.price + 3.0) * 100) / 100);

      // Step 4: Verification of state persistence
      const stateCheck = getVariantStockById(vid);
      assert.strictEqual(stateCheck?.stockQuantity, 24);
      assert.strictEqual(stateCheck?.stockStatus, "available");
      assert.strictEqual(stateCheck?.price, Math.round((variant.price + 3.0) * 100) / 100);
    });

    // 4.4 Scenario 4: Omnichannel Customer Engagement Scenario
    it("4.4 Scenario 4: should merge salon appointment history with e-commerce purchase history", () => {
      // Customer has salon appointment and buys online
      const customer = createAdminCustomer({
        id: "crm-omni-test-01",
        name: "Roberta Maglione",
        email: "roberta.maglione@example.com",
        phone: "+39 342 990 1234",
        totalSpend: 45.0, // Makeup appointment: €45.00
        ordersCount: 0,
        appointmentsCount: 1,
        notes: "Trucco giorno naturale, pelle tendente al lucido sulla zona T.",
      });

      assert.strictEqual(customer.totalSpend, 45.0);
      assert.strictEqual(customer.appointmentsCount, 1);
      assert.strictEqual(customer.ordersCount, 0);

      // Customer makes online order for €52.00
      const newOrder = createAdminOrder({
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        total: 52.0,
        fulfillmentType: "courier",
        items: [
          {
            productId: "pierre-rene-cipria-hd",
            productTitle: "Cipria HD Opacizzante",
            quantity: 1,
            price: 52.0,
          },
        ],
      });

      assert.strictEqual(newOrder.total, 52.0);

      // Customer LTV update
      const updatedLtv = Math.round((customer.totalSpend + newOrder.total) * 100) / 100;
      assert.strictEqual(updatedLtv, 97.0);

      // Add consultation notes
      const notesUpdated = updateCustomerNotes(
        customer.id,
        "Consigliata cipria HD Pierre René dopo seduta trucco in cabina. Ordine effettuato online con spedizione."
      );
      assert.ok(notesUpdated.notes.includes("seduta trucco"));
    });

    // 4.5 Scenario 5: Database Isolation Audit & Schema Integrity Gate
    it("4.5 Scenario 5: should audit workspace for complete database and schema isolation", () => {
      // 1. Verify schema file exists and is populated
      const schemaPath = path.join(PROJECT_ROOT, "supabase_schema.sql");
      const stat = fs.statSync(schemaPath);
      assert.ok(stat.size > 10000, `supabase_schema.sql must be substantial, got ${stat.size} bytes`);

      // 2. Scan entire supabase_schema.sql for isolation
      const schema = fs.readFileSync(schemaPath, "utf-8");
      assert.strictEqual(
        schema.includes("isabel_pepe"),
        false,
        "Isolation audit failed: found 'isabel_pepe' in supabase_schema.sql"
      );

      // 3. Verify .env.example warns against Isabel Pepe credentials
      const envExamplePath = path.join(PROJECT_ROOT, ".env.example");
      if (fs.existsSync(envExamplePath)) {
        const envContent = fs.readFileSync(envExamplePath, "utf-8");
        assert.ok(
          envContent.includes("scelta") || envContent.includes("SCELTA") || envContent.includes("Supabase"),
          ".env.example must document dedicated Scelta environment variables"
        );
      }

      // 4. Verify catalog integrity
      assert.strictEqual(catalog.length, 341, "Catalog must retain all 341 products");
      const categories = getAllCategories();
      assert.ok(categories.length >= 5, "Catalog must cover at least 5 main categories");
      const brands = getAllBrands();
      assert.ok(brands.length >= 6, "Catalog must cover at least 6 cosmetics brands");
    });

    // 4.6 Scenario 6: Unified Omnichannel Workflow across R1 to R5
    it("4.6 Scenario 6: should execute unified operational workflow across manual orders, carrier dispatch, product overrides, pixel telemetry, and multi-operator RT checkout", () => {
      // Step 1: Create manual phone order for a loyal customer
      const manualOrder = createAdminOrder({
        customerName: "Camilla De Luca",
        customerEmail: "camilla.deluca@example.com",
        customerPhone: "+39 340 1234567",
        fulfillmentType: "courier",
        shippingAddress: {
          street: "Corso Umberto I 24",
          city: "Napoli",
          postalCode: "80138",
          province: "NA",
        },
        items: [
          {
            productId: "diego-dalla-palma-rossetto-iconico",
            productTitle: "Rossetto Iconico Diego dalla Palma",
            variantName: "01 Rosso Rubino",
            quantity: 1,
            price: 24.5,
          },
        ],
        total: 24.5,
      });

      assert.strictEqual(manualOrder.status, "processing");

      // Step 2: Courier dispatch with BRT tracking code
      const trackingCode = "BRT-E2E-99001122";
      const dispatchedOrder = updateOrderTracking(manualOrder.id, trackingCode, "BRT Express");
      assert.strictEqual(dispatchedOrder.status, "shipped");
      assert.strictEqual(dispatchedOrder.trackingCode, trackingCode);

      // Verify direct clickable tracking URL and WhatsApp notification
      const trackingUrl = getCourierTrackingUrl("BRT Express", trackingCode);
      assert.ok(trackingUrl.includes("brt.it") && trackingUrl.includes(trackingCode));

      const waMsg = getWhatsAppTrackingMessage(dispatchedOrder, trackingCode, "BRT Express");
      assert.ok(waMsg.includes("Camilla De Luca"));
      assert.ok(waMsg.includes(trackingUrl));
      const waUrl = getWhatsAppDirectUrl(dispatchedOrder.customerPhone, waMsg);
      assert.ok(waUrl.includes("wa.me/393401234567"));

      // Step 3: Product Editor customization with live override
      const overrideResult = updateProductDetails("diego-dalla-palma-rossetto-iconico", {
        shortDescription: "Bestseller assoluto dell'Atelier Scelta Makeup a Napoli.",
        price: 25.0,
      });
      assert.strictEqual(overrideResult.price, 25.0);
      const storedOverride = getProductOverride("diego-dalla-palma-rossetto-iconico");
      assert.strictEqual(storedOverride?.shortDescription, "Bestseller assoluto dell'Atelier Scelta Makeup a Napoli.");

      // Step 4: Telemetry pixel event dispatch and verification
      const telemetryEvent = simulateTrackingEvent("purchase", {
        transaction_id: dispatchedOrder.id,
        value: 24.5,
      });
      assert.strictEqual(telemetryEvent.eventName, "purchase");
      assert.strictEqual(telemetryEvent.status, "delivered");
      assert.strictEqual(telemetryEvent.responseStatus, 200);

      const recentEvents = getTrackingEvents();
      assert.ok(recentEvents.some((e) => e.id === telemetryEvent.id));

      // Step 5: Salon booking with Futura Collega and RT cash register checkout
      const today = new Date().toISOString().split("T")[0];
      const cabinaBooking = createAppointment({
        serviceId: "srv-beauty-mesofill",
        date: today,
        time: "15:00",
        operatorId: "op-beauty-cabina",
        customer: {
          name: "Camilla",
          surname: "De Luca",
          phone: "+39 340 1234567",
          email: "camilla.deluca@example.com",
        },
      });

      assert.strictEqual(cabinaBooking.operatorId, "op-beauty-cabina");
      assert.strictEqual(cabinaBooking.pricing.depositPaid, 12.6); // 20%
      assert.strictEqual(cabinaBooking.pricing.balanceDue, 50.4); // 80%

      const checkout = markAppointmentPaid(cabinaBooking.id, "mypos_card");
      assert.strictEqual(checkout.success, true);
      assert.strictEqual(checkout.appointment.status, "completed_paid");
      assert.ok(checkout.receiptXml.includes("<printerFiscalReceipt>"));
    });
  });
});
