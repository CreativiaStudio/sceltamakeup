"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Product, CategoryKey } from "@/types/product";

interface SearchOverlayProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

// Group results by category, max per group
const MAX_PER_GROUP = 3;
const MAX_TOTAL = 12;

const CATEGORY_ORDER: CategoryKey[] = [
  "Viso",
  "Occhi",
  "Labbra",
  "Skincare & Dermo",
  "Beauty & Accessori",
];

const TRENDING_SEARCHES = [
  "fondotinta",
  "mascara",
  "rossetto",
  "correttore",
  "siero",
  "matita occhi",
];

export default function SearchOverlay({
  products,
  isOpen,
  onClose,
  initialQuery = "",
}: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsAnimatingOut(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus input when opening
  useEffect(() => {
    if (isOpen) {
      // Small delay to wait for animation start
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    // Small delay so the opening click doesn't immediately close
    const t = setTimeout(
      () => document.addEventListener("mousedown", handleClick),
      50
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, handleClose]);

  // Search logic — client-side filtering
  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    const matched = products.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shades.some((s) => s.name.toLowerCase().includes(q)) ||
        p.variants.some(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            v.ean.includes(q) ||
            v.name.toLowerCase().includes(q)
        )
      );
    });

    // Group by category
    const grouped: Record<string, Product[]> = {};
    let total = 0;

    for (const cat of CATEGORY_ORDER) {
      if (total >= MAX_TOTAL) break;
      const catProducts = matched.filter((p) => p.category === cat);
      if (catProducts.length > 0) {
        const slice = catProducts.slice(
          0,
          Math.min(MAX_PER_GROUP, MAX_TOTAL - total)
        );
        grouped[cat] = slice;
        total += slice.length;
      }
    }

    return { grouped, totalMatches: matched.length };
  }, [products, debouncedQuery]);

  const handleNavigate = (slug: string) => {
    handleClose();
    router.push(`/prodotti/${slug}`);
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
  };

  const handleSubmitAll = () => {
    if (!debouncedQuery.trim()) return;
    handleClose();
    router.push(
      `/?cerca=${encodeURIComponent(debouncedQuery.trim())}#catalogo`
    );
  };

  if (!isOpen && !isAnimatingOut) return null;

  const hasQuery = debouncedQuery.trim().length >= 2;
  const hasResults = results && Object.keys(results.grouped).length > 0;
  const noResults = hasQuery && results && results.totalMatches === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimatingOut ? "opacity-0" : "opacity-100 animate-in fade-in"
        }`}
      />

      {/* Search Panel */}
      <div
        ref={overlayRef}
        className={`fixed inset-x-0 top-0 z-[61] max-h-[85vh] overflow-y-auto transition-all duration-300 ${
          isAnimatingOut
            ? "opacity-0 -translate-y-3"
            : "opacity-100 translate-y-0 animate-in fade-in slide-in-from-top-3"
        }`}
      >
        <div className="bg-white shadow-2xl border-b-2 border-[#5E1788]/20">
          {/* Search Input Area */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7A3293]" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Cerca rossetti, fondotinta, mascara, brand..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitAll();
                }}
                className="w-full pl-12 pr-12 py-4 text-base sm:text-lg bg-[#FAF7FC] border border-[#D8C2E7]/60 rounded-2xl text-[#1F1B24] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/30 focus:border-[#5E1788] transition-all font-light"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setDebouncedQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 sm:right-6 p-2 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              aria-label="Chiudi ricerca"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Results Area */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6">
            {/* Trending searches — shown when no query */}
            {!hasQuery && (
              <div className="py-4">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Ricerche Popolari
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleTrendingClick(term)}
                      className="px-4 py-2 rounded-full text-sm bg-[#FAF7FC] border border-[#D8C2E7]/40 text-[#5E1788] hover:bg-[#5E1788] hover:text-white transition-all duration-200 font-medium capitalize"
                    >
                      {term}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 mt-4 font-light">
                  Cerca tra {products.length} creazioni di alta cosmesi...
                </p>
              </div>
            )}

            {/* No Results */}
            {noResults && (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[#FAF7FC] flex items-center justify-center mx-auto mb-3">
                  <Search className="h-5 w-5 text-[#D8C2E7]" />
                </div>
                <p className="text-neutral-600 font-medium">
                  Nessun risultato per &ldquo;
                  <span className="text-[#5E1788] font-semibold">
                    {debouncedQuery}
                  </span>
                  &rdquo;
                </p>
                <p className="text-neutral-400 text-sm mt-1">
                  Prova con un altro termine o esplora le categorie dal menu
                </p>
              </div>
            )}

            {/* Grouped Results */}
            {hasResults && (
              <div className="space-y-5">
                {CATEGORY_ORDER.map((cat) => {
                  const group = results.grouped[cat];
                  if (!group || group.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-[11px] font-bold text-[#7A3293] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-[#D462A6]" />
                        {cat}
                      </p>
                      <div className="space-y-1">
                        {group.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleNavigate(product.slug)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#FAF7FC] transition-colors group text-left"
                          >
                            {/* Product thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-[#FAF7FC] border border-[#D8C2E7]/30 overflow-hidden flex-shrink-0 relative">
                              <Image
                                src={product.images[0] || "/placeholder.jpg"}
                                alt={product.name}
                                fill
                                className="object-contain p-0.5"
                                sizes="48px"
                              />
                            </div>
                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1F1B24] truncate group-hover:text-[#5E1788] transition-colors">
                                {product.name}
                              </p>
                              <p className="text-xs text-neutral-400 truncate">
                                {product.brand}
                              </p>
                            </div>
                            {/* Price */}
                            <span className="text-sm font-bold text-[#5E1788] flex-shrink-0">
                              €{product.price.toFixed(2)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-[#5E1788] transition-colors flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* "See all results" button */}
                {results.totalMatches > MAX_TOTAL && (
                  <div className="pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={handleSubmitAll}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FAF7FC] hover:bg-[#5E1788] hover:text-white text-[#5E1788] font-semibold text-sm transition-all duration-200 border border-[#D8C2E7]/40 hover:border-transparent"
                    >
                      Vedi tutti i {results.totalMatches} risultati
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
