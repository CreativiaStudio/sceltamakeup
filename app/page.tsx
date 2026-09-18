import { Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import CategoryStoryCircles from "@/components/CategoryStoryCircles";
import BestsellerCarousel from "@/components/BestsellerCarousel";
import AtelierBanner from "@/components/AtelierBanner";
import CuratedProductGrid from "@/components/CuratedProductGrid";
import BoutiqueSection from "@/components/BoutiqueSection";
import { getAllProducts } from "@/lib/catalog";

export const revalidate = 3600;

export default async function HomePage() {
  const products = await getAllProducts();

  // Extract featured and bestseller products for horizontal carousel
  const bestsellerProducts = products.filter(
    (p) =>
      p.badge === "Bestseller" ||
      p.badges?.includes("bestseller") ||
      p.isFeatured
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Modular Hero Section: Split Editorial Glamour with Reversible Fullwidth Fallback */}
      <HeroSection variant="split" />

      {/* 2. Category Story Circles: 6 Macro-Categories & Atelier Booking Circle */}
      <CategoryStoryCircles />

      {/* 3. Horizontal Bestseller & Trends Carousel */}
      <BestsellerCarousel products={bestsellerProducts} />

      {/* 4. Atelier & Cabina Trucco Experiential Banner (-10% Online Booking) */}
      <AtelierBanner />

      {/* 5. Curated Showcase Grid: Capped at 12 Items + CTA to Full 341-Product Catalog */}
      <Suspense
        fallback={
          <div className="py-20 text-center text-neutral-400">
            Caricamento selezione esclusiva...
          </div>
        }
      >
        <CuratedProductGrid initialProducts={products} limit={12} />
      </Suspense>

      {/* 6. Physical Boutique Photo Gallery: Via dei Pellegrini 28/29, Napoli */}
      <BoutiqueSection />
    </div>
  );
}
