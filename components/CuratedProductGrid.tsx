"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Layers } from "lucide-react";
import { Product, CategoryKey } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/catalog";

interface CuratedProductGridProps {
  initialProducts: Product[];
  limit?: number;
}

export default function CuratedProductGrid({
  initialProducts,
  limit = 12,
}: CuratedProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("Tutti");

  // Filter products by selected category, then cap at limit
  const displayedProducts = useMemo(() => {
    let filtered = initialProducts;
    if (selectedCategory !== "Tutti") {
      filtered = initialProducts.filter((p) => p.category === selectedCategory);
    }
    return filtered.slice(0, limit);
  }, [initialProducts, selectedCategory, limit]);

  const totalCatalogCount = initialProducts.length;

  return (
    <section id="catalogo" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-wider uppercase mb-3 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
            <span>Selezione Esclusiva Maison</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1F1B24] tracking-tight">
            I Capolavori del Make-Up
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-600 font-light">
            Formulazioni professionali italiane, pigmenti purissimi e texture sensoriali per valorizzare ogni incarnato.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#5E1788] text-white shadow-md shadow-purple-950/15 ring-2 ring-[#5E1788]/20"
                    : "bg-[#FAF7FC] text-neutral-700 hover:text-[#5E1788] hover:bg-purple-50/60 border border-[#E2E8F0]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Curated Grid (Max 12 Cards) */}
        {displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-2xl bg-[#FAF7FC] border border-dashed border-[#D8C2E7]/70 p-8">
            <p className="text-sm text-neutral-600 font-light">
              Nessun prodotto trovato in questa categoria nella selezione in evidenza.
            </p>
          </div>
        )}

        {/* Bottom Call to Action Block */}
        <div className="mt-14 pt-8 border-t border-[#D8C2E7]/40 text-center flex flex-col items-center justify-center space-y-4">
          <p className="text-xs sm:text-sm text-neutral-500 font-light">
            Mostrando una selezione curata di creazioni esclusive ({displayedProducts.length} in evidenza di {totalCatalogCount} totali)
          </p>
          
          <Link
            href={
              selectedCategory !== "Tutti"
                ? `/prodotti?categoria=${encodeURIComponent(selectedCategory)}`
                : "/prodotti"
            }
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-purple-900/20 hover:shadow-xl hover:scale-[1.02] active:scale-98 transition-all group"
          >
            <Layers className="h-4 w-4" />
            <span>Sfoglia Tutti i {totalCatalogCount} Prodotti nel Catalogo Completo</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

      </div>
    </section>
  );
}
