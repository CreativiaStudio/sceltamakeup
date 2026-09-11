import { Suspense } from "react";
import HeroSection from "@/components/HeroSection";
import ProductGrid from "@/components/ProductGrid";
import BoutiqueSection from "@/components/BoutiqueSection";
import { getAllProducts } from "@/lib/catalog";

export const revalidate = 3600;

export default async function HomePage() {
  const products = await getAllProducts();

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      
      <Suspense
        fallback={
          <div className="py-20 text-center text-neutral-400">
            Caricamento capolavori...
          </div>
        }
      >
        <ProductGrid initialProducts={products} />
      </Suspense>

      <BoutiqueSection />
    </div>
  );
}
