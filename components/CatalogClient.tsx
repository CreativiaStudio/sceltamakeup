"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Sparkles, 
  Search, 
  X, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Home,
  ChevronRight as BreadcrumbArrow
} from "lucide-react";
import { Product, CategoryKey } from "@/types/product";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/catalog";

interface CatalogClientProps {
  initialProducts: Product[];
}

const ITEMS_PER_PAGE = 24;

export default function CatalogClient({ initialProducts }: CatalogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filter state directly from URL query parameters (single source of truth)
  const urlCategory = searchParams.get("categoria") as CategoryKey | null;
  const activeCategory: CategoryKey =
    urlCategory && CATEGORIES.includes(urlCategory) ? urlCategory : "Tutti";
  const activeBrand = searchParams.get("brand") || "Tutti";
  const urlSearch = searchParams.get("cerca") || "";
  const activeSort = searchParams.get("ordina") || "default";

  // Local state for search query input and pagination
  const [searchQuery, setSearchQuery] = useState<string>(urlSearch);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Unique brands present in the catalog
  const brands = useMemo(() => {
    const list = Array.from(new Set(initialProducts.map((p) => p.brand))).sort();
    return ["Tutti", ...list];
  }, [initialProducts]);

  // Update URL helper (shallow replace)
  const updateUrl = useCallback(
    (newCat: CategoryKey, newBrand: string, newSearch: string, newSort: string) => {
      const params = new URLSearchParams();
      if (newCat !== "Tutti") params.set("categoria", newCat);
      if (newBrand !== "Tutti") params.set("brand", newBrand);
      if (newSearch.trim()) params.set("cerca", newSearch.trim());
      if (newSort !== "default") params.set("ordina", newSort);

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
      setCurrentPage(1);
    },
    [pathname, router]
  );

  const handleCategoryChange = (cat: CategoryKey) => {
    updateUrl(cat, activeBrand, searchQuery, activeSort);
  };

  const handleBrandChange = (brand: string) => {
    updateUrl(activeCategory, brand, searchQuery, activeSort);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrl(activeCategory, activeBrand, val, activeSort);
  };

  const handleSortChange = (val: string) => {
    updateUrl(activeCategory, activeBrand, searchQuery, val);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setCurrentPage(1);
    router.replace(pathname, { scroll: false });
  };

  // Filtered and sorted products (computed directly for 341 products)
  const effectiveSearch = searchQuery.trim() || urlSearch.trim();
  const filteredAndSortedProducts = initialProducts.filter((product) => {
    // Category filter
    if (activeCategory !== "Tutti" && product.category !== activeCategory) {
      return false;
    }
    // Brand filter
    if (activeBrand !== "Tutti" && product.brand !== activeBrand) {
      return false;
    }
    // Search query (checks local search query or url query)
    if (effectiveSearch !== "") {
      const q = effectiveSearch.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(q);
      const matchesBrand = product.brand.toLowerCase().includes(q);
      const matchesDesc = product.shortDescription?.toLowerCase().includes(q);
      const matchesShades = product.shades?.some((s) =>
        s.name.toLowerCase().includes(q)
      );
      if (!matchesName && !matchesBrand && !matchesDesc && !matchesShades) {
        return false;
      }
    }
    return true;
  });

  // Sorting
  if (activeSort === "price-asc") {
    filteredAndSortedProducts.sort((a, b) => a.price - b.price);
  } else if (activeSort === "price-desc") {
    filteredAndSortedProducts.sort((a, b) => b.price - a.price);
  } else if (activeSort === "name-asc") {
    filteredAndSortedProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Pagination calculation
  const totalItems = filteredAndSortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredAndSortedProducts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const hasActiveFilters =
    activeCategory !== "Tutti" ||
    activeBrand !== "Tutti" ||
    searchQuery.trim() !== "" ||
    urlSearch.trim() !== "" ||
    activeSort !== "default";

  return (
    <div className="min-h-screen bg-[#FAF7FC]/30 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-[#5E1788] flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
          <BreadcrumbArrow className="h-3 w-3 text-neutral-400" />
          <Link href="/prodotti" className="hover:text-[#5E1788] font-medium text-neutral-700">
            Catalogo
          </Link>
          {activeCategory !== "Tutti" && (
            <>
              <BreadcrumbArrow className="h-3 w-3 text-neutral-400" />
              <span className="text-[#5E1788] font-semibold">{activeCategory}</span>
            </>
          )}
        </nav>

        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[#D8C2E7]/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-wider uppercase mb-3 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
              <span>Catalogo Ufficiale • Scelta Makeup Napoli</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1F1B24] tracking-tight">
              Tutte le Creazioni ({initialProducts.length})
            </h1>
            <p className="mt-2 text-sm sm:text-base text-neutral-600 font-light max-w-2xl">
              Esplora l&apos;intero catalogo di cosmesi d&apos;alta gamma: Diego dalla Palma, Cipria Makeup, RVB LAB, Pierre René ed Eveline Cosmetics.
            </p>
          </div>

          {/* Quick Counter */}
          <div className="text-xs sm:text-sm text-neutral-600 bg-white px-4 py-2.5 rounded-2xl border border-[#D8C2E7]/60 shadow-xs self-start sm:self-auto">
            <span>Mostrando </span>
            <strong className="text-[#5E1788] font-bold">{totalItems}</strong>
            <span> di {initialProducts.length} creazioni</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-[#E2E8F0] mb-8 space-y-6">
          
          {/* Top Row: Search & Sort */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cerca per nome, brand, sfumatura o codice..."
                className="w-full pl-11 pr-10 py-3 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/60 text-sm text-[#1F1B24] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
                  aria-label="Cancella ricerca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <SlidersHorizontal className="h-4 w-4 text-neutral-500 shrink-0 hidden sm:block" />
              <select
                value={activeSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full md:w-56 py-3 px-4 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/60 text-xs font-semibold uppercase tracking-wider text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788] cursor-pointer"
              >
                <option value="default">Ordina: Predefinito</option>
                <option value="price-asc">Prezzo: dal più basso</option>
                <option value="price-desc">Prezzo: dal più alto</option>
                <option value="name-asc">Nome: A - Z</option>
              </select>
            </div>

          </div>

          {/* Middle Row: Category Pills */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block mb-2.5">
              Categoria:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-[#5E1788] text-white shadow-md shadow-purple-950/20 ring-2 ring-[#5E1788]/20"
                        : "bg-[#FAF7FC] text-neutral-700 hover:text-[#5E1788] hover:bg-purple-50/60 border border-[#E2E8F0]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Brand Pills & Reset Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0]/70">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-1">
                Marchio:
              </span>
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBrandChange(b)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeBrand === b
                      ? "bg-[#1F1B24] text-white font-medium shadow-xs"
                      : "bg-[#FAF7FC] text-neutral-600 hover:bg-neutral-200/80 border border-neutral-200/60"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A3293] hover:text-[#5E1788] transition-colors cursor-pointer ml-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Resetta filtri</span>
              </button>
            )}
          </div>

        </div>

        {/* Products Grid */}
        {paginatedProducts.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-14 pt-8 border-t border-[#D8C2E7]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-neutral-500">
                  Mostrando da <strong>{startIndex + 1}</strong> a{" "}
                  <strong>{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</strong> di{" "}
                  <strong>{totalItems}</strong> prodotti (Pagina {currentPage} di {totalPages})
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Pagina precedente"
                    className={`p-2.5 rounded-xl border transition-all ${
                      currentPage > 1
                        ? "bg-white border-[#D8C2E7] text-[#5E1788] hover:bg-[#FAF7FC] cursor-pointer"
                        : "bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        // Display first, last, and current +/- 2
                        return (
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 2
                        );
                      })
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-2 text-xs text-neutral-400">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => goToPage(p)}
                              className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                currentPage === p
                                  ? "bg-[#5E1788] text-white shadow-sm"
                                  : "bg-white text-neutral-700 hover:bg-[#FAF7FC] border border-[#E2E8F0]"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Pagina successiva"
                    className={`p-2.5 rounded-xl border transition-all ${
                      currentPage < totalPages
                        ? "bg-white border-[#D8C2E7] text-[#5E1788] hover:bg-[#FAF7FC] cursor-pointer"
                        : "bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center rounded-3xl bg-white border border-dashed border-[#D8C2E7] p-8 max-w-xl mx-auto shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-[#5E1788] mb-4">
              <Sparkles className="h-6 w-6 text-[#7A3293]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Nessun prodotto trovato
            </h3>
            <p className="text-neutral-500 text-sm mt-2">
              Non abbiamo trovato creazioni corrispondenti ai filtri impostati. Prova a reimpostare i parametri di ricerca o esplorare un&apos;altra categoria.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors shadow-md cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Mostra Tutti i 341 Prodotti</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
