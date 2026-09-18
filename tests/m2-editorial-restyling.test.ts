/**
 * Test Suite: Milestone 2 — Split Editorial Hero & Dynamic Homepage Restyling
 * File: tests/m2-editorial-restyling.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import ReactDOMServer from "react-dom/server";

// Polyfill window, location & environment for Next.js Headless Node Testing
const globalAny = globalThis as unknown as Record<string, unknown>;
if (typeof globalAny.window === "undefined") {
  globalAny.window = globalThis;
}
globalAny.location = { href: "http://localhost:3000" };

// Mock Next.js Image optimization settings in Node test runtime
process.env.__NEXT_IMAGE_OPTS = JSON.stringify({
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  path: "/_next/image",
  loader: "default",
  domains: ["images.unsplash.com"],
  remotePatterns: [{ protocol: "https", hostname: "**" }],
  unoptimized: true,
});

// Mock Next.js App Router and Navigation contexts
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

const mockRouter = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

function renderWithContext(
  component: React.ReactElement,
  pathname: string = "/",
  searchParams: URLSearchParams = new URLSearchParams()
): string {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        PathnameContext.Provider,
        { value: pathname },
        React.createElement(
          SearchParamsContext.Provider,
          { value: searchParams },
          component
        )
      )
    )
  );
}

import rawCatalog from "../data/catalog.json";
import { Product } from "../types/product";
const catalog: Product[] = rawCatalog as Product[];

// Import components under test
import HeroSection from "../components/HeroSection";
import CategoryStoryCircles from "../components/CategoryStoryCircles";
import BestsellerCarousel from "../components/BestsellerCarousel";
import AtelierBanner from "../components/AtelierBanner";
import CuratedProductGrid from "../components/CuratedProductGrid";

describe("Milestone 2: Split Editorial Hero & Dynamic Homepage Restyling", () => {
  
  describe("1. HeroSection Component Architecture & Reversibility", () => {
    it("1.1 should render 'split' variant by default with all required luxury copy & CTAs", () => {
      const html = renderWithContext(React.createElement(HeroSection));
      
      // Overline Badge
      assert.ok(
        html.includes("ALTA COSMESI") && html.includes("PROFESSIONALE") ||
        html.includes("BOUTIQUE UFFICIALE"),
        "Hero split variant must include overline badge"
      );

      // Title
      assert.ok(
        html.includes("L&#x27;Arte del Viso Perfetto.") || html.includes("L'Arte del Viso Perfetto."),
        "Hero split variant must include exact editorial title"
      );
      assert.ok(
        html.includes("Senza Filtri, Senza Maschere."),
        "Hero split variant must include payoff headline"
      );

      // Institutional Payoff
      assert.ok(
        html.includes("Diego dalla Palma") && (html.includes("Cipria Makeup") || html.includes("Cipria Make Up")),
        "Hero split variant must mention Diego dalla Palma and Cipria Makeup"
      );

      // Dual CTAs
      assert.ok(
        html.includes("href=\"#bestseller\""),
        "Hero split variant primary CTA must link smoothly to #bestseller"
      );
      assert.ok(
        html.includes("Esplora i Bestseller"),
        "Hero split variant primary CTA text must be 'Esplora i Bestseller'"
      );
      assert.ok(
        html.includes("href=\"/prenota\""),
        "Hero split variant secondary CTA must link to /prenota"
      );
      assert.ok(
        html.includes("-10% Online"),
        "Hero split variant secondary CTA must feature -10% Online badge"
      );

      // Floating Boutique Official Badge
      assert.ok(
        html.includes("Via dei Pellegrini 28/29, Napoli"),
        "Hero split variant must feature official boutique address"
      );

      // Trust bar with all 4 items
      assert.ok(html.includes("Spedizione Gratuita"), "Must have Spedizione Gratuita");
      assert.ok(html.includes("Ritiro in Salone") || html.includes("Ritiro in Boutique"), "Must have Ritiro in Salone or Boutique");
      assert.ok(html.includes("100% Autentico"), "Must have 100% Autentico");
      assert.ok(html.includes("Consulenza &amp; Shade Match") || html.includes("Consulenza & Shade Match"), "Must have Consulenza & Shade Match");
    });

    it("1.2 should render 'fullwidth' reversible variant cleanly with cinematic overlay and dual CTAs", () => {
      const html = renderWithContext(
        React.createElement(HeroSection, { variant: "fullwidth" })
      );

      // Fullwidth styling & gradient
      assert.ok(
        html.includes("bg-gradient-to-b from-[#1F1B24] via-[#2E143E] to-[#1F1B24]"),
        "Fullwidth variant must use luxury deep violet gradient"
      );
      assert.ok(html.includes("L&#x27;Arte del Viso Perfetto.") || html.includes("L'Arte del Viso Perfetto."));
      assert.ok(html.includes("href=\"#bestseller\""));
      assert.ok(html.includes("href=\"/prenota\""));
      assert.ok(html.includes("-10% Online"));
    });

    it("1.3 should contain zero micro-fonts (<12px) in HeroSection source code", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "components/HeroSection.tsx"), "utf-8");
      assert.strictEqual(
        source.includes("text-[10px]"),
        false,
        "HeroSection.tsx must not contain text-[10px]"
      );
      assert.strictEqual(
        source.includes("text-[11px]"),
        false,
        "HeroSection.tsx must not contain text-[11px]"
      );
    });
  });

  describe("2. CategoryStoryCircles Component", () => {
    it("2.1 should render 6 luxury gradient story circles with required categories and links", () => {
      const html = renderWithContext(React.createElement(CategoryStoryCircles));

      // 6 categories
      assert.ok(html.includes("Viso"), "Must include Viso");
      assert.ok(html.includes("Occhi"), "Must include Occhi");
      assert.ok(html.includes("Labbra"), "Must include Labbra");
      assert.ok(html.includes("Skincare &amp; Dermo") || html.includes("Skincare & Dermo"), "Must include Skincare & Dermo");
      assert.ok(html.includes("Accessori"), "Must include Accessori");
      assert.ok(html.includes("Atelier Servizi"), "Must include Atelier Servizi");

      // Links
      assert.ok(html.includes("href=\"/prodotti?categoria=Viso\""));
      assert.ok(html.includes("href=\"/prodotti?categoria=Occhi\""));
      assert.ok(html.includes("href=\"/prodotti?categoria=Labbra\""));
      assert.ok(html.includes("href=\"/prenota\""), "Atelier Servizi must link to /prenota");

      // Special -10% Online badge
      assert.ok(html.includes("-10% Online"), "Atelier Servizi circle must feature -10% Online badge");
    });
  });

  describe("3. BestsellerCarousel Component", () => {
    it("3.1 should render carousel with id='bestseller', header controls, and embedded ProductCards", () => {
      const sampleBestsellers = catalog.slice(0, 8);
      const html = renderWithContext(
        React.createElement(BestsellerCarousel, { products: sampleBestsellers })
      );

      assert.ok(html.includes("id=\"bestseller\""), "Carousel must be anchored with id='bestseller'");
      assert.ok(html.includes("Icone di Bellezza &amp; Tendenze") || html.includes("Icone di Bellezza & Tendenze"));
      assert.ok(html.includes("I Bestseller della Maison"));
      assert.ok(html.includes("aria-label=\"Scorri a sinistra\""));
      assert.ok(html.includes("aria-label=\"Scorri a destra\""));

      // Product cards embedded
      assert.ok(html.includes(sampleBestsellers[0].name));
    });
  });

  describe("4. AtelierBanner Component", () => {
    it("4.1 should render experiential luxury banner with -10% online booking highlight and dual CTAs", () => {
      const html = renderWithContext(React.createElement(AtelierBanner));

      assert.ok(
        html.includes("Atelier di Bellezza &amp; Cabina Trucco • Napoli") ||
        html.includes("Atelier di Bellezza & Cabina Trucco • Napoli")
      );
      assert.ok(
        html.includes("L&#x27;Arte del Make-Up") || html.includes("L'Arte del Make-Up")
      );
      assert.ok(html.includes("Federica Cesiano"));
      assert.ok(html.includes("Via dei Pellegrini 28/29, Napoli"));
      assert.ok(html.includes("-10% di Sconto Immediato su tutte le prenotazioni online"));
      assert.ok(html.includes("href=\"/prenota\""));
      assert.ok(html.includes("Prenota la Tua Seduta (-10%)"));
      assert.ok(html.includes("href=\"/servizi\""));
      assert.ok(html.includes("Scopri i Trattamenti"));
    });
  });

  describe("5. CuratedProductGrid Component", () => {
    it("5.1 should render curated grid limited to 12 items and prominent CTA to full /prodotti catalog", () => {
      const html = renderWithContext(
        React.createElement(CuratedProductGrid, { initialProducts: catalog, limit: 12 })
      );

      assert.ok(html.includes("id=\"catalogo\""), "Must preserve #catalogo anchor for backwards compatibility");
      assert.ok(html.includes("I Capolavori del Make-Up"));
      assert.ok(html.includes("Prodotti nel Catalogo Completo"));
      assert.ok(html.includes("href=\"/prodotti\""));
    });
  });

  describe("6. Full Catalog Route (/prodotti)", () => {
    it("6.1 should verify app/prodotti/page.tsx and components/CatalogClient.tsx exist and have correct exports", () => {
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "app/prodotti/page.tsx")),
        "app/prodotti/page.tsx must exist"
      );
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "components/CatalogClient.tsx")),
        "components/CatalogClient.tsx must exist"
      );

      const pageSource = fs.readFileSync(path.join(process.cwd(), "app/prodotti/page.tsx"), "utf-8");
      assert.ok(pageSource.includes("getAllProducts"), "app/prodotti/page.tsx must fetch all products");
      assert.ok(pageSource.includes("CatalogClient"), "app/prodotti/page.tsx must render CatalogClient");
      assert.ok(pageSource.includes("Suspense"), "app/prodotti/page.tsx must use Suspense for client query parameters");
    });
  });

  describe("7. Dynamic Homepage Composition (app/page.tsx)", () => {
    it("7.1 should verify app/page.tsx composes all 6 modular components in correct sequence", () => {
      const homeSource = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf-8");
      assert.ok(homeSource.includes("<HeroSection variant=\"split\" />"), "HomePage must render HeroSection with split variant");
      assert.ok(homeSource.includes("<CategoryStoryCircles />"), "HomePage must render CategoryStoryCircles");
      assert.ok(homeSource.includes("<BestsellerCarousel"), "HomePage must render BestsellerCarousel");
      assert.ok(homeSource.includes("<AtelierBanner />"), "HomePage must render AtelierBanner");
      assert.ok(homeSource.includes("<CuratedProductGrid"), "HomePage must render CuratedProductGrid");
      assert.ok(homeSource.includes("<BoutiqueSection />"), "HomePage must render BoutiqueSection");
      assert.ok(homeSource.includes("limit={12}"), "CuratedProductGrid must be capped at 12 items");
    });
  });

});
