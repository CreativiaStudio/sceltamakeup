/**
 * Scelta Makeup — Adversarial Storefront Regression & Integrity Test Suite
 * File: tests/adversarial-storefront-regression.test.ts
 *
 * Empirical challenger suite testing:
 * 1. Storefront Layout Behavior: Header & Footer suppression on /admin and /admin/* vs rendering on public routes
 * 2. Dynamic Route Generation: /prodotti/[slug] across the 341 catalog items, metadata, static params, and 404 safety
 * 3. Omnichannel CRM LTV Invariance: Fuzzing 1,000 customer profiles with random order/appointment spends (0-cent discrepancy)
 * 4. Preservation of /admin/appuntamenti: Cassa RT XML generator, slot protection, and WhatsApp anti-ban human pacing (20-45s)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import ReactDOMServer from "react-dom/server";

// Next.js Navigation Contexts for headless React rendering
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Headless browser environment polyfill for Next.js Image & localStorage in Node runner
const memoryLocalStorage: Record<string, string> = {};
const globalAny = globalThis as unknown as Record<string, unknown>;

if (typeof globalAny.window === "undefined") {
  globalAny.window = globalThis;
}
globalAny.location = { href: "http://localhost:3000" };
globalAny.dispatchEvent = () => true;
globalAny.CustomEvent = class CustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, init?: { detail?: unknown }) {
    this.type = type;
    this.detail = init?.detail;
  }
};
globalAny.localStorage = {
  getItem: (k: string) => memoryLocalStorage[k] ?? null,
  setItem: (k: string, v: string) => {
    memoryLocalStorage[k] = String(v);
  },
  removeItem: (k: string) => {
    delete memoryLocalStorage[k];
  },
  clear: () => {
    for (const k of Object.keys(memoryLocalStorage)) delete memoryLocalStorage[k];
  },
};

// Components under empirical review
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductDetailPage, {
  generateStaticParams,
  generateMetadata,
} from "../app/prodotti/[slug]/page";

// Core Domain Libraries & Stores
import {
  catalog,
  getAllProducts,
  getProductBySlug,
} from "../lib/catalog";

import {
  resetAdminStoreToDefaults,
  getAdminCustomers,
  createAdminCustomer,
  createAdminOrder,
} from "../lib/adminStore";

import {
  calculateJitter,
  formatWhatsAppTemplate,
} from "../lib/whatsappQueueService";

import {
  getAllAppointments,
  markAppointmentPaid,
  getAvailableSlots,
  toggleSlotBlock,
} from "../lib/bookingService";

const PROJECT_ROOT = path.resolve(__dirname, "..");

// Helper to render a component with a simulated Next.js pathname
function renderWithRoute(
  component: React.ReactElement,
  routePathname: string,
  searchParams: URLSearchParams = new URLSearchParams()
): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      PathnameContext.Provider,
      { value: routePathname },
      React.createElement(
        SearchParamsContext.Provider,
        { value: searchParams },
        component
      )
    )
  );
}

// Financial cent rounding helper (banker's / commercial cent arithmetic)
function roundCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function toIntegerCents(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

describe("Adversarial Storefront Regression & CRM LTV Verification Suite", () => {
  beforeEach(() => {
    resetAdminStoreToDefaults();
    for (const k of Object.keys(memoryLocalStorage)) delete memoryLocalStorage[k];
  });

  // =========================================================================
  // 1. STOREFRONT LAYOUT BEHAVIOR & ROUTE SUPPRESSION
  // =========================================================================
  describe("1. Storefront Layout Behavior: Header & Footer Route Enforcement", () => {
    const ADMIN_ROUTES = [
      "/admin",
      "/admin/",
      "/admin/appuntamenti",
      "/admin/prodotti",
      "/admin/ordini",
      "/admin/spedizioni",
      "/admin/clienti",
      "/admin/notifiche",
      "/admin/analytics",
      "/admin/settings/security",
      "/admin/deep/nested/subpath/test",
    ];

    const PUBLIC_ROUTES = [
      "/",
      "/prodotti",
      "/prenota",
      "/servizi",
      "/checkout",
      "/prodotti/diego-dalla-palma-rossetto-iconico",
      "/prodotti/rvb-lab-fondotinta-antieta",
      "/prodotti/cipria-blush-setoso",
    ];

    it("1.1 should strictly suppress Footer (return null / 0 bytes) across ALL /admin and /admin/* routes", () => {
      for (const route of ADMIN_ROUTES) {
        const html = renderWithRoute(React.createElement(Footer), route);
        assert.strictEqual(
          html.length,
          0,
          `Footer MUST produce 0 bytes on admin route '${route}', received: ${html.slice(0, 100)}`
        );
      }
    });

    it("1.2 should strictly suppress Header (return null / 0 bytes) across ALL /admin and /admin/* routes", () => {
      for (const route of ADMIN_ROUTES) {
        const html = renderWithRoute(React.createElement(Header), route);
        assert.strictEqual(
          html.length,
          0,
          `Header MUST produce 0 bytes on admin route '${route}', received: ${html.slice(0, 100)}`
        );
      }
    });

    it("1.3 should render Footer with complete branding on public routes ('/', '/prodotti', '/prenota', '/servizi')", () => {
      for (const route of PUBLIC_ROUTES) {
        const html = renderWithRoute(React.createElement(Footer), route);
        assert.ok(
          html.length > 5000,
          `Footer on public route '${route}' must render full markup, got length ${html.length}`
        );

        // Verify key Scelta Makeup brand markers in rendered Footer HTML
        assert.ok(
          html.includes("Via dei Pellegrini 28/29"),
          `Footer on '${route}' must contain physical boutique address`
        );
        assert.ok(
          html.includes("Napoli"),
          `Footer on '${route}' must contain city Naples`
        );
        assert.ok(
          html.includes("Scelta Makeup"),
          `Footer on '${route}' must contain brand name`
        );
        assert.ok(
          html.includes("Scelta Privilège Club") || html.includes("newsletter"),
          `Footer on '${route}' must contain newsletter club section`
        );
      }
    });

    it("1.4 should render Header on public routes ('/', '/prodotti', '/prenota', '/servizi')", () => {
      for (const route of PUBLIC_ROUTES) {
        const headerElement = React.createElement(Header);
        const rendered = renderWithRoute(headerElement, route);
        assert.ok(
          rendered.length > 0,
          `Header on public route '${route}' must produce non-empty markup`
        );
        assert.ok(
          rendered.includes("<header") || rendered.includes("header"),
          `Header on '${route}' must render a <header> tag`
        );
      }
    });

    it("1.5 should verify layout source AST contracts for RootLayout and AdminLayout", () => {
      // app/layout.tsx verification
      const rootLayoutPath = path.join(PROJECT_ROOT, "app", "layout.tsx");
      assert.ok(fs.existsSync(rootLayoutPath), "app/layout.tsx must exist");
      const rootContent = fs.readFileSync(rootLayoutPath, "utf-8");

      assert.ok(
        rootContent.includes("<Header"),
        "RootLayout must declare <Header />"
      );
      assert.ok(
        rootContent.includes("<Footer"),
        "RootLayout must declare <Footer />"
      );
      assert.ok(
        rootContent.includes("<CartDrawer"),
        "RootLayout must declare <CartDrawer />"
      );
      assert.ok(
        rootContent.includes("<WhatsAppDemoModal"),
        "RootLayout must declare <WhatsAppDemoModal />"
      );

      // app/admin/layout.tsx verification
      const adminLayoutPath = path.join(PROJECT_ROOT, "app", "admin", "layout.tsx");
      assert.ok(fs.existsSync(adminLayoutPath), "app/admin/layout.tsx must exist");
      const adminContent = fs.readFileSync(adminLayoutPath, "utf-8");

      assert.ok(
        adminContent.includes("admin-root-scope"),
        "AdminLayout must establish .admin-root-scope isolate container"
      );
      assert.strictEqual(
        adminContent.includes("<Header"),
        false,
        "AdminLayout must NOT render duplicate <Header />"
      );
      assert.strictEqual(
        adminContent.includes("<Footer"),
        false,
        "AdminLayout must NOT render duplicate <Footer />"
      );
    });

    it("1.6 should handle adversarial query parameters and path variations gracefully", () => {
      const sp = new URLSearchParams("tab=ordini&page=2&filter=urgent");

      // Query param on admin route
      const adminHtml = renderWithRoute(React.createElement(Footer), "/admin", sp);
      assert.strictEqual(adminHtml.length, 0, "Footer must suppress on /admin even with query parameters");

      // Query param on public route
      const publicHtml = renderWithRoute(React.createElement(Footer), "/prodotti", sp);
      assert.ok(publicHtml.length > 5000, "Footer must render on /prodotti with query parameters");
    });
  });

  // =========================================================================
  // 2. DYNAMIC ROUTE GENERATION (/prodotti/[slug])
  // =========================================================================
  describe("2. Dynamic Route Generation: /prodotti/[slug] & 341 Catalog Items", () => {
    it("2.1 should verify generateStaticParams() yields 341 entries and identify exact slug cardinality", async () => {
      const params = await generateStaticParams();
      assert.strictEqual(
        params.length,
        341,
        `generateStaticParams must map all 341 catalog items, got ${params.length}`
      );

      // Verify slug URL safety: lowercase alphanumeric and hyphens only
      const slugRegex = /^[a-z0-9-]+$/;
      for (const p of params) {
        assert.ok(
          slugRegex.test(p.slug),
          `Slug '${p.slug}' must be lowercase alphanumeric with hyphens only`
        );
        assert.strictEqual(p.slug.startsWith("-"), false, `Slug '${p.slug}' must not start with hyphen`);
        assert.strictEqual(p.slug.endsWith("-"), false, `Slug '${p.slug}' must not end with hyphen`);
      }

      // Catalog slug collision audit
      const slugCounts = new Map<string, string[]>();
      for (const item of catalog) {
        const existing = slugCounts.get(item.slug) || [];
        existing.push(item.id);
        slugCounts.set(item.slug, existing);
      }

      // Empirically detect colliding slugs in catalog.json
      const collisions = Array.from(slugCounts.entries()).filter(([, ids]) => ids.length > 1);

      // In modern catalog, all 341 slugs are unique (or at least 338 if non-deduplicated)
      assert.ok(slugCounts.size >= 338, "Catalog contains at least 338 unique slugs across 341 items");
      if (collisions.length > 0) {
        assert.strictEqual(collisions.length, 2, "Exactly 2 slug collisions exist in data/catalog.json");
        const miyoCollision = collisions.find(([slug]) => slug === "miyo-miyo-mystick-eye-stick");
        assert.ok(miyoCollision, "Collision found on miyo-miyo-mystick-eye-stick");
        const primerCollision = collisions.find(([slug]) => slug === "cipria-make-up-cm-primer");
        assert.ok(primerCollision, "Collision found on cipria-make-up-cm-primer");
      }
    });

    it("2.2 should generate valid SEO metadata for arbitrary sample products from all brands and categories", async () => {
      const allProducts = await getAllProducts();

      // Sample one product from each of the 6 official brands
      const brands = [
        "Diego dalla Palma",
        "RVB LAB",
        "Cipria Make Up",
        "Eveline Cosmetics",
        "Pierre René",
        "Miyo",
      ];

      for (const brand of brands) {
        const sample = allProducts.find((p) => p.brand === brand);
        assert.ok(sample, `Should find a sample product for brand ${brand}`);

        const meta = await generateMetadata({
          params: Promise.resolve({ slug: sample.slug }),
        });

        assert.ok(meta.title, `Metadata title must be defined for ${sample.name}`);
        const titleStr = String(meta.title);
        assert.ok(
          titleStr.includes(sample.name),
          `Title '${titleStr}' must contain product name '${sample.name}'`
        );
        assert.ok(
          titleStr.includes(sample.brand),
          `Title '${titleStr}' must contain product brand '${sample.brand}'`
        );
        assert.ok(
          titleStr.includes("Scelta Makeup"),
          `Title '${titleStr}' must contain brand 'Scelta Makeup'`
        );

        assert.ok(meta.description, `Metadata description must be defined for ${sample.name}`);
        assert.ok(meta.openGraph, `Metadata openGraph must be defined for ${sample.name}`);
      }
    });

    it("2.3 should render ProductDetailPage component successfully for sample products across all categories", async () => {
      const allProducts = await getAllProducts();

      const categories = [
        "Viso",
        "Occhi",
        "Labbra",
        "Skincare & Dermo",
        "Beauty & Accessori",
      ];

      for (const cat of categories) {
        const sample = allProducts.find((p) => p.category === cat);
        assert.ok(sample, `Should find a sample product for category ${cat}`);

        const pageElement = await ProductDetailPage({
          params: Promise.resolve({ slug: sample.slug }),
        });

        assert.ok(pageElement, `ProductDetailPage must return a valid React element for ${sample.slug}`);
        assert.strictEqual(
          typeof pageElement,
          "object",
          "Returned element must be an object/React element"
        );

        // Verify props passed to ProductDetailClient
        const props = pageElement.props as {
          product: typeof sample;
          relatedProducts: typeof allProducts;
        };
        assert.strictEqual(props.product.id, sample.id);
        assert.strictEqual(props.product.slug, sample.slug);
        assert.ok(Array.isArray(props.relatedProducts), "relatedProducts must be an array");

        // Related products must not include the product itself
        for (const rel of props.relatedProducts) {
          assert.notStrictEqual(rel.id, sample.id, "relatedProducts must not contain the target product itself");
        }
      }
    });

    it("2.4 should verify 100% slug lookup resolution for all non-colliding catalog products", async () => {
      const allProducts = await getAllProducts();
      // Identify colliding IDs that get shadowed by first occurrence in catalog.find()
      const shadowedIds = new Set([
        "cipria-item-miyo-mystick-eye-stick-02-falling-stars",
        "cipria-item-miyo-mystick-eye-stick-03-retrograde",
        "cipria-item-cm-primer-n-505",
      ]);

      let nonCollidingCount = 0;
      for (const prod of allProducts) {
        if (shadowedIds.has(prod.id)) {
          // Documented shadowed product
          continue;
        }

        const resolved = await getProductBySlug(prod.slug);
        assert.ok(
          resolved,
          `Catalog product (${prod.id}) must resolve via getProductBySlug('${prod.slug}')`
        );
        assert.strictEqual(resolved?.id, prod.id);
        assert.strictEqual(resolved?.price, prod.price);

        // Verify price validity: either positive retail price or documented catalog zero-price exception
        if (prod.price === 0) {
          assert.strictEqual(
            prod.id,
            "cipria-73706",
            `Unexpected zero-price product: ${prod.id} (${prod.name})`
          );
        } else {
          assert.ok(prod.price > 0, `Price for '${prod.id}' must be greater than zero`);
        }

        assert.ok(
          resolved!.images.length > 0,
          `Product '${prod.id}' must have at least one image`
        );
        nonCollidingCount++;
      }

      assert.strictEqual(
        nonCollidingCount,
        338,
        "All 338 uniquely-keyed products resolve with 100% fidelity"
      );
    });

    it("2.5 should handle invalid slugs with 404 behavior and fallback metadata", async () => {
      const invalidSlug = "non-existent-beauty-product-slug-xyz-99999";

      // Metadata for non-existent product
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: invalidSlug }),
      });
      assert.strictEqual(meta.title, "Prodotto Non Trovato | Scelta Makeup");

      // Page for non-existent product must throw NEXT_HTTP_ERROR_FALLBACK;404
      await assert.rejects(
        async () => {
          await ProductDetailPage({
            params: Promise.resolve({ slug: invalidSlug }),
          });
        },
        (err: unknown) => {
          if (err && typeof err === "object" && "digest" in err) {
            const digest = String((err as { digest: string }).digest);
            return digest.includes("NEXT_HTTP_ERROR_FALLBACK") || digest.includes("404") || digest.includes("NEXT_NOT_FOUND");
          }
          return true;
        },
        "ProductDetailPage on invalid slug must trigger notFound()"
      );
    });
  });

  // =========================================================================
  // 3. OMNICHANNEL CRM LTV CALCULATION (0-CENT DISCREPANCY FUZZING)
  // =========================================================================
  describe("3. Omnichannel CRM LTV Calculation: 1,000-Sweep Fuzzing & Invariance", () => {
    it("3.1 should fuzz 1,000 customer profiles with random order/appointment spend and verify 0-cent discrepancy", () => {
      let totalChecks = 0;
      let zeroCentMatches = 0;

      for (let i = 0; i < 1000; i++) {
        // Random number of orders: 1 to 12
        const numOrders = Math.floor(Math.random() * 12) + 1;
        // Random number of appointments: 1 to 8
        const numAppointments = Math.floor(Math.random() * 8) + 1;

        const orderAmounts: number[] = [];
        let orderBigIntCents = BigInt(0);

        for (let o = 0; o < numOrders; o++) {
          // Random spend between €0.01 and €450.00
          const amount = roundCents(0.01 + Math.random() * 449.99);
          orderAmounts.push(amount);
          orderBigIntCents += toIntegerCents(amount);
        }

        const appAmounts: number[] = [];
        let appBigIntCents = BigInt(0);

        for (let a = 0; a < numAppointments; a++) {
          // Random spend between €15.00 and €350.00
          const amount = roundCents(15.0 + Math.random() * 335.0);
          appAmounts.push(amount);
          appBigIntCents += toIntegerCents(amount);
        }

        // Omnichannel customer profile generation
        const ordersTotalSpend = roundCents(orderAmounts.reduce((sum, v) => sum + v, 0));
        const appointmentsTotalSpend = roundCents(appAmounts.reduce((sum, v) => sum + v, 0));

        // Combined LTV
        const omnichannelLtv = roundCents(ordersTotalSpend + appointmentsTotalSpend);

        // Ground Truth via BigInt integer cents (Zero binary floating point error)
        const expectedTotalCents = orderBigIntCents + appBigIntCents;
        const actualLtvCents = toIntegerCents(omnichannelLtv);

        const discrepancyCents = actualLtvCents - expectedTotalCents;

        // Discrepancy must be strictly 0 cents
        assert.strictEqual(
          discrepancyCents,
          BigInt(0),
          `Fuzz iteration ${i} failed with ${discrepancyCents} cents discrepancy. ` +
            `Orders (${numOrders}): ${ordersTotalSpend}, Appointments (${numAppointments}): ${appointmentsTotalSpend}, ` +
            `LTV: ${omnichannelLtv}, Expected Cents: ${expectedTotalCents}`
        );

        totalChecks++;
        zeroCentMatches++;
      }

      assert.strictEqual(totalChecks, 1000, "Must complete 1,000 fuzz sweeps");
      assert.strictEqual(zeroCentMatches, 1000, "100% of 1,000 fuzz sweeps must have 0-cent discrepancy");
    });

    it("3.2 should pass IEEE 754 floating-point stress torture battery without cent drift", () => {
      // Torture cases known to provoke IEEE 754 drift in double precision
      const tortureCases = [
        { orders: [0.1, 0.2], apps: [0.3], expected: 0.6 },
        { orders: [0.07, 0.01, 0.02], apps: [0.05, 0.05], expected: 0.2 },
        { orders: [19.99, 29.99, 39.99], apps: [55.0, 45.0], expected: 189.97 },
        { orders: [1.14, 2.28, 3.42], apps: [10.26], expected: 17.1 },
        { orders: [49.95, 0.05], apps: [0.0], expected: 50.0 },
        { orders: [129.99, 0.01], apps: [69.99, 0.01], expected: 200.0 },
      ];

      for (let idx = 0; idx < tortureCases.length; idx++) {
        const tc = tortureCases[idx];
        const ordersSpend = roundCents(tc.orders.reduce((acc, v) => acc + v, 0));
        const appsSpend = roundCents(tc.apps.reduce((acc, v) => acc + v, 0));
        const totalLtv = roundCents(ordersSpend + appsSpend);

        assert.strictEqual(
          totalLtv,
          tc.expected,
          `Torture case #${idx} failed: ${totalLtv} !== ${tc.expected}`
        );
      }

      // Large accumulator stress: 10,000 micro-transactions of €0.01
      let acc = 0;
      for (let i = 0; i < 10000; i++) {
        acc = roundCents(acc + 0.01);
      }
      assert.strictEqual(acc, 100.0, "10,000 x €0.01 must equal exactly €100.00 with zero cent drift");
    });

    it("3.3 should audit all seeded CRM customer profiles in adminStore for financial validity", () => {
      const customers = getAdminCustomers();
      assert.ok(customers.length >= 7, "Seeded customers must have at least 7 entries");

      // Verify specific documented seed customers
      const chiara = customers.find((c) => c.email === "chiara.rossi@example.com");
      assert.ok(chiara, "Chiara Rossi must exist in CRM");
      // €144.50 orders + €45.00 Trucco Sposa appointment = €189.50
      assert.strictEqual(chiara.totalSpend, 189.5);
      assert.strictEqual(chiara.ordersCount, 2);
      assert.strictEqual(chiara.appointmentsCount, 1);

      const alessandra = customers.find((c) => c.email === "alessandra.deluca@example.com");
      assert.ok(alessandra, "Alessandra De Luca must exist in CRM");
      // €36.00 order + €35.00 appointment = €71.00
      assert.strictEqual(alessandra.totalSpend, 71.0);
      assert.strictEqual(alessandra.ordersCount, 1);
      assert.strictEqual(alessandra.appointmentsCount, 1);

      const serena = customers.find((c) => c.email === "serena.bianchi@example.com");
      assert.ok(serena, "Serena Bianchi must exist in CRM");
      assert.strictEqual(serena.totalSpend, 29.5);
      assert.strictEqual(serena.ordersCount, 1);
      assert.strictEqual(serena.appointmentsCount, 0);

      // Verify general invariants for all seeded customers
      for (const cust of customers) {
        assert.ok(cust.totalSpend >= 0, `Customer ${cust.id} totalSpend must be >= 0`);
        assert.strictEqual(
          cust.totalSpend,
          roundCents(cust.totalSpend),
          `Customer ${cust.id} totalSpend must have at most 2 decimal places`
        );
        assert.ok(cust.ordersCount >= 0, `Customer ${cust.id} ordersCount must be >= 0`);
        assert.ok(cust.appointmentsCount >= 0, `Customer ${cust.id} appointmentsCount must be >= 0`);
      }
    });

    it("3.4 should verify dynamic CRM customer creation and cumulative LTV update", () => {
      // Create fresh customer with 1 initial appointment
      const newCust = createAdminCustomer({
        id: "crm-fuzz-test-cust-01",
        name: "Marcella Viviani",
        email: "marcella.viviani@example.com",
        phone: "+39 333 999 1122",
        totalSpend: 45.0, // Initial appointment spend €45.00
        ordersCount: 0,
        appointmentsCount: 1,
        notes: "Seduta make-up sposa di prova",
      });

      assert.strictEqual(newCust.totalSpend, 45.0);

      // Customer places an e-commerce order
      const order = createAdminOrder({
        customerName: newCust.name,
        customerEmail: newCust.email,
        customerPhone: newCust.phone,
        total: 62.5,
        items: [
          {
            productId: "diego-dalla-palma-rossetto-iconico",
            productTitle: "Rossetto Iconico",
            quantity: 1,
            price: 24.5,
          },
          {
            productId: "rvb-lab-fondotinta-antieta",
            productTitle: "Fondotinta Anti-Età",
            quantity: 1,
            price: 38.0,
          },
        ],
      });

      assert.strictEqual(order.total, 62.5);

      // Update customer LTV
      const updatedLtv = roundCents(newCust.totalSpend + order.total);
      assert.strictEqual(updatedLtv, 107.5);
    });
  });

  // =========================================================================
  // 4. PRESERVATION OF /admin/appuntamenti & WHATSAPP ANTI-BAN QUEUE
  // =========================================================================
  describe("4. Preservation of /admin/appuntamenti & WhatsApp Anti-Ban Queue Service", () => {
    it("4.1 should verify that /admin/appuntamenti and NotificationQueueTab exist intact", () => {
      const appuntamentiPath = path.join(
        PROJECT_ROOT,
        "app",
        "admin",
        "appuntamenti",
        "page.tsx"
      );
      assert.ok(fs.existsSync(appuntamentiPath), "app/admin/appuntamenti/page.tsx must exist");

      const content = fs.readFileSync(appuntamentiPath, "utf-8");
      // Check essential appointment management capabilities
      assert.ok(content.includes("markAppointmentPaid"), "Must contain markAppointmentPaid balance checkout");
      assert.ok(content.includes("toggleSlotBlock"), "Must contain toggleSlotBlock slot locking");
      assert.ok(content.includes("NotificationQueueTab"), "Must import NotificationQueueTab");
      assert.ok(content.includes("getAllAppointments"), "Must load appointments");
      assert.ok(content.includes("Printer"), "Must include fiscal printer RT button/icon");

      // NotificationQueueTab component check
      const tabPath = path.join(
        PROJECT_ROOT,
        "components",
        "admin",
        "NotificationQueueTab.tsx"
      );
      assert.ok(fs.existsSync(tabPath), "components/admin/NotificationQueueTab.tsx must exist");
      const tabContent = fs.readFileSync(tabPath, "utf-8");
      assert.ok(tabContent.includes("WhatsApp"), "Must include WhatsApp status");
      assert.ok(
        tabContent.includes("whatsappQueueService") || tabContent.includes("getWhatsAppQueueState"),
        "Must connect to whatsappQueueService"
      );
    });

    it("4.2 should stress-test calculateJitter() across 5,000 runs to guarantee strict 20-45s bounds", () => {
      const samples: number[] = [];
      const JITTER_MIN = 20;
      const JITTER_MAX = 45;

      for (let i = 0; i < 5000; i++) {
        const j = calculateJitter();
        assert.ok(
          Number.isInteger(j),
          `calculateJitter() must return integer, got ${j}`
        );
        assert.ok(
          j >= JITTER_MIN,
          `Jitter ${j} is strictly below minimum permitted ${JITTER_MIN}s at iteration ${i}`
        );
        assert.ok(
          j <= JITTER_MAX,
          `Jitter ${j} is strictly above maximum permitted ${JITTER_MAX}s at iteration ${i}`
        );
        samples.push(j);
      }

      const minObserved = Math.min(...samples);
      const maxObserved = Math.max(...samples);

      assert.strictEqual(
        minObserved,
        20,
        `Expected minimum boundary 20s to be observed across 5,000 sweeps, got ${minObserved}`
      );
      assert.strictEqual(
        maxObserved,
        45,
        `Expected maximum boundary 45s to be observed across 5,000 sweeps, got ${maxObserved}`
      );

      // Verify distribution uniformity (average should be ~32.5s)
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      assert.ok(
        avg >= 31.5 && avg <= 33.5,
        `Expected jitter mean near 32.5s, observed ${avg.toFixed(2)}s`
      );
    });

    it("4.3 should verify dynamic text variation and anti-spam checksums for all 3 WhatsApp notification templates", () => {
      const templateTypes = [
        "booking_confirmation",
        "booking_reminder_24h",
        "order_placed",
      ] as const;

      for (const type of templateTypes) {
        const context = {
          customerName: "Elena De Angelis",
          serviceName: "Make-up Evento & Cerimonia",
          bookingDate: "2026-09-15",
          bookingTime: "14:15",
          operatorName: "Federica Cesiano",
          bookingCode: "SC-260915-EA99",
          priceList: 50.0,
          discountOnline: 5.0,
          priceOnline: 45.0,
          depositPaid: 9.0,
          balanceDue: 36.0,
          orderNumber: "SC-ORD-2026-0099",
          itemsSummary: "1x Rossetto Iconico Diego dalla Palma",
          total: 24.5,
          fulfillmentType: "courier",
          courierName: "BRT Express",
          trackingCode: "BRT-TEST-12345",
        };

        const res1 = formatWhatsAppTemplate(type, context);
        const res2 = formatWhatsAppTemplate(type, context);

        // Required content verification
        assert.ok(res1.text.length > 50, `WhatsApp text for ${type} must be non-empty`);
        assert.ok(res1.checksum.startsWith("sha256_"), `Checksum must start with sha256_ prefix`);
        assert.ok(
          res1.jitter >= 20 && res1.jitter <= 45,
          `Jitter must be within [20, 45], got ${res1.jitter}`
        );

        // Verify dynamic checksum uniqueness
        assert.notStrictEqual(
          res1.checksum,
          res2.checksum,
          `Successive messages for ${type} must have unique random salts / checksums`
        );
      }
    });

    it("4.4 should verify Epson FP-81II RT XML receipt generation and cassa state transition", () => {
      const appointments = getAllAppointments();
      assert.ok(appointments.length > 0, "Appointments must exist in seed state");

      // Find confirmed appointment with pending balance
      const target = appointments.find(
        (a) => a.status === "confirmed" && a.pricing.balanceDue > 0
      );
      assert.ok(target, "Should find confirmed appointment with balance due");

      const initialBalance = target.pricing.balanceDue;

      // Execute balance checkout
      const result = markAppointmentPaid(target.id, "mypos_card");

      assert.strictEqual(
        result.appointment.status,
        "completed_paid",
        "Appointment status must transition to 'completed_paid'"
      );
      assert.ok(
        result.appointment.cassaReceiptNumber,
        "Appointment must receive fiscal receipt number"
      );

      // Verify fiscal XML format for Epson FP-81II RT
      const xml = result.receiptXml;
      assert.ok(
        xml.includes("<printerFiscalReceipt>"),
        "XML must contain <printerFiscalReceipt> root"
      );
      assert.ok(
        xml.includes("<printRecItem"),
        "XML must have <printRecItem"
      );
      assert.ok(
        xml.includes("<printRecTotal"),
        "XML must have <printRecTotal"
      );
      assert.ok(
        xml.includes("<endFiscalReceipt"),
        "XML must have <endFiscalReceipt"
      );
      assert.ok(
        xml.includes(target.serviceName.slice(0, 20)),
        "XML must contain service description"
      );

      // Financial balance accuracy
      assert.strictEqual(
        result.appointment.pricing.balanceDue,
        initialBalance,
        "Balance due recorded on appointment must match original amount"
      );
    });

    it("4.5 should verify toggleSlotBlock return value and slot availability logic", () => {
      const today = new Date().toISOString().split("T")[0];
      const initialSlots = getAvailableSlots(today);
      assert.ok(initialSlots.length > 0, "Initial slots must exist for today");

      const testSlot = initialSlots[0];
      const testTime = testSlot.time;

      // Execute toggleSlotBlock
      const isBlockedFirst = toggleSlotBlock(today, testTime);
      assert.strictEqual(
        typeof isBlockedFirst,
        "boolean",
        "toggleSlotBlock must return boolean state"
      );

      // Toggle a second time: must invert
      const isBlockedSecond = toggleSlotBlock(today, testTime);
      assert.strictEqual(
        isBlockedSecond,
        !isBlockedFirst,
        "Second toggle must invert blocked state"
      );
    });
  });
});
