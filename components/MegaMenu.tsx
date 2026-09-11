"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Product, CategoryKey } from "@/types/product";
import {
  MEGAMENU_CATEGORIES,
  MegaMenuCategoryConfig,
} from "@/lib/megamenu-data";

interface MegaMenuProps {
  products: Product[];
  activeCategory: CategoryKey | null;
  onClose: () => void;
  onCategoryChange: (key: CategoryKey) => void;
  /** Anchor element position reference for proper alignment */
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

export default function MegaMenu({
  products,
  activeCategory,
  onClose,
  onCategoryChange,
}: MegaMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current config
  const config: MegaMenuCategoryConfig | undefined = MEGAMENU_CATEGORIES.find(
    (c) => c.key === activeCategory
  );

  // Get brands for current category from actual product data
  const brandsForCategory = (() => {
    if (!activeCategory) return [];
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.category === activeCategory) brands.add(p.brand);
    });
    return Array.from(brands);
  })();

  // Get product count for current category
  const categoryCount = products.filter(
    (p) => p.category === activeCategory
  ).length;

  // Featured product
  const featuredProduct = config?.featuredProductSlug
    ? products.find((p) => p.slug === config.featuredProductSlug)
    : null;

  // Animate in on mount
  useEffect(() => {
    if (activeCategory) {
      // Small delay for enter animation
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, [activeCategory]);

  // Close animation
  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    setIsVisible(false);
    setTimeout(() => {
      setIsAnimatingOut(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Mouse leave with grace period
  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      handleClose();
    }, 300);
  }, [handleClose]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const handleSubcategoryClick = (searchTerm: string) => {
    handleClose();
    router.push(`/?cerca=${encodeURIComponent(searchTerm)}#catalogo`);
  };

  const handleBrandClick = (brand: string) => {
    handleClose();
    router.push(`/?cerca=${encodeURIComponent(brand)}#catalogo`);
  };

  const handleCategoryViewAll = () => {
    if (!activeCategory) return;
    handleClose();
    router.push(
      `/?categoria=${encodeURIComponent(activeCategory)}#catalogo`
    );
  };

  const handleProductClick = (slug: string) => {
    handleClose();
    router.push(`/prodotti/${slug}`);
  };

  const handleCategoryHover = (key: CategoryKey) => {
    onCategoryChange(key);
  };

  if (!activeCategory && !isAnimatingOut) return null;

  return (
    <>
      {/* Backdrop — below category bar (z-50) but above page content */}
      <div
        className={`fixed inset-0 z-[45] transition-opacity duration-250 ${
          isVisible && !isAnimatingOut
            ? "bg-black/15 backdrop-blur-[2px]"
            : "bg-transparent"
        }`}
        onClick={handleClose}
      />

      {/* Menu Panel — above backdrop (z-[45]) but below pills row (z-[52]) */}
      <div
        ref={menuRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`absolute left-0 right-0 z-[51] transition-all duration-250 ease-out ${
          isVisible && !isAnimatingOut
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="bg-white border-t-2 border-[#5E1788] shadow-2xl shadow-purple-950/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex">
              {/* Left: Category Tabs (vertical) */}
              <div className="w-48 border-r border-[#D8C2E7]/30 py-5 px-2 flex flex-col gap-0.5 bg-[#FDFCFE]">
                {MEGAMENU_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onMouseEnter={() => handleCategoryHover(cat.key)}
                      onClick={() => {
                        handleClose();
                        router.push(
                          `/?categoria=${encodeURIComponent(cat.key)}#catalogo`
                        );
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#5E1788] text-white shadow-md shadow-purple-900/20"
                          : "text-[#1F1B24]/70 hover:bg-[#FAF7FC] hover:text-[#5E1788]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Center + Right: Content Area */}
              {config && (
                <div className="flex-1 grid grid-cols-3 gap-0 min-h-[340px]">
                  {/* Column 1: Subcategories */}
                  <div className="py-5 px-6 border-r border-[#D8C2E7]/20">
                    <h3 className="font-serif text-lg font-bold text-[#1F1B24] mb-1">
                      {config.label}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-light mb-4">
                      {categoryCount} prodotti • {config.description}
                    </p>
                    <div className="space-y-0.5">
                      {config.subcategories.map((sub) => (
                        <button
                          key={sub.searchTerm}
                          type="button"
                          onClick={() =>
                            handleSubcategoryClick(sub.searchTerm)
                          }
                          className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-[#FAF7FC] hover:text-[#5E1788] transition-all duration-150 group"
                        >
                          <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                            {sub.label}
                          </span>
                          <ArrowRight className="h-3 w-3 text-neutral-300 opacity-0 group-hover:opacity-100 group-hover:text-[#5E1788] transition-all duration-150" />
                        </button>
                      ))}
                    </div>
                    {/* View all CTA */}
                    <button
                      type="button"
                      onClick={handleCategoryViewAll}
                      className="mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF7FC] border border-[#D8C2E7]/40 text-[#5E1788] text-xs font-semibold hover:bg-[#5E1788] hover:text-white hover:border-transparent transition-all duration-200"
                    >
                      Vedi tutti • {config.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Column 2: Brands */}
                  <div className="py-5 px-6 border-r border-[#D8C2E7]/20">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                      Brand
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {brandsForCategory.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => handleBrandClick(brand)}
                          className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#FAF7FC] border border-[#D8C2E7]/30 text-[#1F1B24] hover:bg-[#5E1788] hover:text-white hover:border-transparent transition-all duration-200 hover:shadow-md hover:shadow-purple-900/10"
                        >
                          {brand}
                        </button>
                      ))}
                    </div>

                    {/* Quick access links */}
                    <div className="mt-8">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
                        Link Rapidi
                      </p>
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            router.push("/servizi");
                          }}
                          className="flex items-center gap-2 text-sm text-[#7A3293] hover:text-[#5E1788] font-medium transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
                          Atelier Make-Up (-10%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            router.push("/prenota");
                          }}
                          className="flex items-center gap-2 text-sm text-[#7A3293] hover:text-[#5E1788] font-medium transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
                          Prenota Appuntamento
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Featured Product */}
                  <div className="py-5 px-6 bg-gradient-to-br from-[#FDFCFE] to-[#FAF7FC]">
                    <p className="text-[11px] font-bold text-[#D462A6] uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      In Evidenza
                    </p>
                    {featuredProduct ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleProductClick(featuredProduct.slug)
                        }
                        className="w-full text-left group"
                      >
                        <div className="relative aspect-square w-full max-w-[200px] mx-auto mb-4 rounded-2xl bg-white border border-[#D8C2E7]/30 overflow-hidden shadow-sm group-hover:shadow-lg group-hover:shadow-purple-900/10 transition-shadow duration-300">
                          <Image
                            src={
                              featuredProduct.images[0] || "/placeholder.jpg"
                            }
                            alt={featuredProduct.name}
                            fill
                            className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                            sizes="200px"
                          />
                          {featuredProduct.badge && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#5E1788] text-white text-[10px] font-bold uppercase tracking-wider">
                              {featuredProduct.badge}
                            </span>
                          )}
                        </div>
                        <p className="font-serif text-base font-bold text-[#1F1B24] group-hover:text-[#5E1788] transition-colors line-clamp-2">
                          {featuredProduct.name}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {featuredProduct.brand}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold text-[#5E1788]">
                            €{featuredProduct.price.toFixed(2)}
                          </span>
                          <span className="text-xs font-semibold text-[#D462A6] group-hover:text-[#5E1788] flex items-center gap-1 transition-colors">
                            Scopri
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="text-center py-8 text-neutral-400 text-sm">
                        Nessun prodotto in evidenza
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
