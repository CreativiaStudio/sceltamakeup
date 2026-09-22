"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Product, CategoryKey } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/catalog";
import { Filter, Sparkles, RefreshCw } from "lucide-react";

interface ProductGridProps {
  initialProducts: Product[];
}

export default function ProductGrid({ initialProducts }: ProductGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCategory = (searchParams.get("categoria") as CategoryKey) || "Tutti";
  const urlSearch = searchParams.get("cerca") || "";

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("Tutti");
  const [localSearch, setLocalSearch] = useState<string | null>(null);

  // Derived state avoiding setState in effects/memos
  const activeCategory =
    selectedCategory ?? (CATEGORIES.includes(urlCategory) ? urlCategory : "Tutti");
  const activeSearch = localSearch ?? urlSearch;

  // Extract unique brands
  const brands = useMemo(() => {
    const list = Array.from(new Set(initialProducts.map((p) => p.brand)));
    return ["Tutti", ...list];
  }, [initialProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Category filter
      if (activeCategory !== "Tutti" && product.category !== activeCategory) {
        return false;
      }
      // Brand filter
      if (selectedBrand !== "Tutti") {
        const matchesBrand =
          product.brand === selectedBrand ||
          (selectedBrand === "Diego dalla Palma" && product.brand.toLowerCase().includes("diego dalla palma")) ||
          (selectedBrand === "RVB LAB" && product.brand.toLowerCase().includes("rvb lab"));
        if (!matchesBrand) {
          return false;
        }
      }
      // Search term filter
      if (activeSearch.trim() !== "") {
        const query = activeSearch.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesBrand = product.brand.toLowerCase().includes(query);
        const matchesDesc = product.shortDescription.toLowerCase().includes(query);
        const matchesShades = product.shades.some((s) =>
          s.name.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesBrand && !matchesDesc && !matchesShades) {
          return false;
        }
      }
      return true;
    });
  }, [initialProducts, activeCategory, selectedBrand, activeSearch]);

  const resetFilters = () => {
    setSelectedCategory("Tutti");
    setSelectedBrand("Tutti");
    setLocalSearch("");
    if (urlCategory !== "Tutti" || urlSearch !== "") {
      router.push("/#catalogo", { scroll: false });
    }
  };

  return (
    <section id="catalogo" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Editorial Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/60 text-[#7A3293] text-xs font-semibold tracking-widest uppercase mb-3">
            <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
            <span>Collezione Alta Cosmesi</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1F1B24] tracking-tight">
            I Capolavori del Make-Up
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-500 font-light">
            Formulazioni esclusive italiane, pigmenti ad altissima purezza e texture sensoriali per esaltare ogni incarnato.
          </p>
        </div>

        {/* Category Pills & Filters */}
        <div className="flex flex-col gap-6 mb-10">
          
          {/* Main Category Bar */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
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

          {/* Secondary Sub-filters: Brand pills & Item counter */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-100">
            {/* Brand Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Brand:
              </span>
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBrand(b)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    selectedBrand === b
                      ? "bg-[#1F1B24] text-white font-medium"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Product Counter & Reset */}
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span>
                Mostrando <strong className="text-neutral-900">{filteredProducts.length}</strong> creazioni
              </span>
              {(activeCategory !== "Tutti" || selectedBrand !== "Tutti" || activeSearch) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[#7A3293] hover:text-[#5E1788] font-medium inline-flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Resetta filtri
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center rounded-3xl bg-[#FAF7FC] border border-dashed border-[#D8C2E7] p-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-[#5E1788] mb-4">
              <Sparkles className="h-6 w-6 text-[#7A3293]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#1F1B24]">
              Nessun prodotto trovato
            </h3>
            <p className="text-neutral-500 text-sm mt-1.5 max-w-md mx-auto">
              Non abbiamo trovato creazioni corrispondenti ai filtri impostati. Prova a modificare i criteri o reimposta la ricerca.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
            >
              Mostra tutte le creazioni
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
