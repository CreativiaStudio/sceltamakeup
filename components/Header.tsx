"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ShoppingBag,
  Search,
  MapPin,
  Phone,
  Sparkles,
  X,
  Menu,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import SearchOverlay from "@/components/SearchOverlay";
import MegaMenu from "@/components/MegaMenu";
import { useCartStore } from "@/store/useCartStore";
import { useWhatsAppModalStore } from "@/store/useWhatsAppModalStore";
import { CategoryKey } from "@/types/product";
import { useIsMounted } from "@/lib/useIsMounted";
import { catalog } from "@/lib/catalog";

const NAV_CATEGORIES: { label: string; key: CategoryKey }[] = [
  { label: "Tutti", key: "Tutti" },
  { label: "Viso", key: "Viso" },
  { label: "Occhi", key: "Occhi" },
  { label: "Labbra", key: "Labbra" },
  { label: "Skincare & Dermo", key: "Skincare & Dermo" },
  { label: "Beauty & Accessori", key: "Beauty & Accessori" },
];

function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("categoria") || "Tutti";

  const totalItems = useCartStore((state) => state.getTotalItems());
  const openCart = useCartStore((state) => state.openCart);
  const openWhatsAppModal = useWhatsAppModalStore((state) => state.openModal);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaMenuCategory, setMegaMenuCategory] = useState<CategoryKey | null>(
    null
  );
  const isMounted = useIsMounted();

  const categoryBarRef = useRef<HTMLDivElement>(null);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setIsScrolled((prev) => {
            // Hysteresis deadband: enters slim mode after 80px, only exits when returned near top (<= 15px)
            if (!prev && y > 80) return true;
            if (prev && y <= 15) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track previous searchParams to detect route changes and close mega menu
  const prevSearchParamsRef = useRef(searchParams.toString());
  useEffect(() => {
    const current = searchParams.toString();
    if (current !== prevSearchParamsRef.current) {
      prevSearchParamsRef.current = current;
      setMegaMenuCategory(null);
    }
  }, [searchParams]);

  const handleCategoryClick = (categoryKey: CategoryKey) => {
    if (categoryKey === "Tutti") {
      router.push("/#catalogo");
    } else {
      router.push(`/?categoria=${encodeURIComponent(categoryKey)}#catalogo`);
    }
    setIsMobileMenuOpen(false);
    setMegaMenuCategory(null);
  };

  // Open search overlay (desktop: click on input; mobile: click search icon)
  const handleSearchFocus = () => {
    setIsSearchOpen(true);
  };

  // Mega Menu hover handlers with grace period
  const handleCategoryMouseEnter = useCallback((key: CategoryKey) => {
    if (key === "Tutti") {
      // "Tutti" doesn't have a mega menu
      return;
    }
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
      megaMenuTimeoutRef.current = null;
    }
    setMegaMenuCategory(key);
  }, []);

  const handleCategoryBarMouseLeave = useCallback(() => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuCategory(null);
    }, 300);
  }, []);

  const handleMegaMenuClose = useCallback(() => {
    setMegaMenuCategory(null);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* Top Announcement Bar (Scrolls with page naturally, zero dynamic height shifts) */}
      <div className="bg-brand-royal text-white px-4 text-center text-xs tracking-wider flex items-center justify-center gap-2 sm:gap-4 font-light py-1.5 border-b border-purple-900/30">
        <span className="font-normal flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 inline animate-pulse text-[#D462A6]" />
          Spedizione Gratuita da <strong>€49</strong>
        </span>
        <span className="opacity-40">|</span>
        <button
          type="button"
          onClick={() => openWhatsAppModal("Salve, vorrei informazioni sui prodotti o assistenza per un ordine")}
          className="hidden md:inline-flex items-center gap-1.5 hover:text-[#D8C2E7] transition-colors cursor-pointer"
        >
          <Phone className="h-3 w-3" />
          <span>Assistenza WhatsApp</span>
        </button>
        <span className="opacity-40 hidden md:inline">|</span>
        <a
          href="#boutique"
          className="inline-flex items-center gap-1 text-[#D8C2E7] hover:underline"
        >
          <MapPin className="h-3 w-3" />
          Salone Napoli: Via dei Pellegrini 28/29
        </a>
      </div>

      {/* Main Sticky Navigation Bar (Pins cleanly at top: 0, slims to h-14 when scrolled) */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#D8C2E7]/40"
            : "glass-header shadow-xs"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between gap-4 transition-all duration-300 ${
              isScrolled ? "h-14" : "h-20"
            }`}
          >
            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-full text-[#1F1B24] hover:text-[#5E1788] hover:bg-[#FAF7FC] transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Brand Logo & Claim (Pass compact when scrolled) */}
            <div className="flex-1 lg:flex-initial flex items-center justify-center lg:justify-start">
              <BrandLogo variant="header" compact={isScrolled} />
            </div>

            {/* Desktop Center: Search Bar (click opens SearchOverlay) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={handleSearchFocus}
                  className={`w-full pl-9 pr-8 rounded-full text-left text-xs sm:text-sm bg-white/70 border border-[#D8C2E7]/60 text-neutral-400 focus:outline-none hover:border-[#5E1788]/40 hover:bg-white transition-all shadow-inner cursor-text ${
                    isScrolled ? "py-1.5" : "py-2"
                  }`}
                >
                  Cerca rossetti, fondotinta, mascara o brand...
                </button>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7A3293] pointer-events-none" />
              </div>
            </div>

            {/* Right Action Icons: Search (mobile), Wishlist/Boutique, Cart Trigger */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Search Icon Toggle */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="lg:hidden p-2 rounded-full text-[#1F1B24] hover:text-[#5E1788] hover:bg-[#FAF7FC] transition-colors"
                aria-label="Cerca"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Prenota Make-Up Button */}
              <Link
                href="/prenota"
                className={`hidden md:flex items-center gap-1.5 font-bold text-white bg-gradient-to-r from-[#7A3293] to-[#D462A6] hover:opacity-95 rounded-full shadow-xs shadow-[#7A3293]/20 transition-all ${
                  isScrolled
                    ? "px-3 py-1.5 text-xs"
                    : "px-3.5 py-1.5 text-xs"
                }`}
              >
                <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                <span>Prenota (-10%)</span>
              </Link>

              {/* Boutique Quick Link */}
              <Link
                href="#boutique"
                className={`hidden sm:flex items-center gap-1.5 font-medium text-[#7A3293] hover:text-[#5E1788] rounded-full border border-[#D8C2E7]/60 hover:bg-[#FAF7FC] transition-colors ${
                  isScrolled
                    ? "px-2.5 py-1 text-xs"
                    : "px-3 py-1.5 text-xs"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-[#D462A6]" />
                <span className="hidden md:inline">Salone</span> Napoli
              </Link>

              {/* Reactive Cart Button */}
              <button
                type="button"
                onClick={openCart}
                className={`relative flex items-center gap-2 bg-[#5E1788] text-white hover:bg-[#7A3293] rounded-full font-medium shadow-md hover:shadow-lg transition-all active:scale-95 group ${
                  isScrolled
                    ? "px-3 py-1.5 text-xs"
                    : "px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm"
                }`}
                aria-label="Apri Carrello"
              >
                <ShoppingBag className={`transition-transform group-hover:scale-110 ${isScrolled ? "h-4 w-4" : "h-4 w-4 sm:h-5 sm:w-5"}`} />
                <span className="hidden sm:inline tracking-wider uppercase text-xs font-semibold">
                  Carrello
                </span>
                {isMounted && totalItems > 0 && (
                  <span className="inline-flex items-center justify-center bg-[#D462A6] text-white text-xs font-bold w-5 h-5 rounded-full ring-2 ring-white animate-pulse">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar Dropdown */}
          {/* Removed: now handled by SearchOverlay */}

        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#D8C2E7]/40 bg-white/95 backdrop-blur-md px-6 py-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-neutral-600 tracking-wider uppercase mb-2">
                Macro-Categorie
              </p>
              {NAV_CATEGORIES.map(({ label, key }) => {
                const isActive = currentCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCategoryClick(key)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium tracking-wide flex items-center justify-between transition-colors ${
                      isActive
                        ? "bg-[#5E1788] text-white font-semibold"
                        : "text-[#1F1B24] hover:bg-[#FAF7FC] hover:text-[#5E1788]"
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && <span className="text-xs">●</span>}
                  </button>
                );
              })}
            </div>

            {/* Services & Booking mobile buttons */}
            <div className="pt-2 pb-2 space-y-2">
              <Link
                href="/prenota"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] text-white font-bold text-sm shadow-md"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Prenota Make-Up (-10% Online)</span>
              </Link>
              <Link
                href="/servizi"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FAF7FC] border border-[#D8C2E7]/60 text-[#5E1788] font-bold text-xs hover:bg-[#D8C2E7]/20"
              >
                <span>Scopri Tutti i Servizi Atelier</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <Link
                href="#boutique"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 text-sm text-[#7A3293] font-medium p-2 rounded-lg hover:bg-[#FAF7FC]"
              >
                <MapPin className="h-4 w-4 text-[#D462A6]" />
                <span>Salone Napoli: Via dei Pellegrini 28/29</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openWhatsAppModal("Salve, vorrei assistenza dal team Scelta Makeup");
                }}
                className="w-full flex items-center gap-3 text-sm text-neutral-700 font-medium p-2 rounded-lg hover:bg-[#FAF7FC] text-left cursor-pointer"
              >
                <Phone className="h-4 w-4 text-[#5E1788]" />
                <span>Assistenza WhatsApp (Demo)</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Category Navigation Bar (Pills) with Mega Menu */}
      <div
        ref={categoryBarRef}
        className="hidden lg:block relative z-50 bg-white/70 backdrop-blur-xs border-b border-[#D8C2E7]/30"
        onMouseLeave={handleCategoryBarMouseLeave}
      >
        {/* Category Pills Row — always on top and interactive */}
        <div className="relative z-[52] flex items-center justify-center gap-2 py-2 bg-white/70 backdrop-blur-xs">
          {NAV_CATEGORIES.map(({ label, key }) => {
            const isActive = currentCategory === key;
            const isMegaActive = megaMenuCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryClick(key)}
                onMouseEnter={() => handleCategoryMouseEnter(key)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isMegaActive
                    ? "bg-[#5E1788] text-white shadow-xs ring-2 ring-[#5E1788]/20 font-semibold"
                    : isActive
                      ? "bg-[#5E1788] text-white shadow-xs ring-2 ring-[#5E1788]/20 font-semibold"
                      : "text-[#1F1B24]/80 hover:text-[#5E1788] hover:bg-[#FAF7FC]"
                }`}
              >
                {label}
              </button>
            );
          })}
          <Link
            href="/servizi"
            className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer bg-[#D462A6]/15 text-[#5E1788] hover:bg-[#5E1788] hover:text-white flex items-center gap-1 border border-[#D462A6]/30"
          >
            <Sparkles className="w-3 h-3 text-[#D462A6]" />
            Atelier Make-Up (-10%)
          </Link>
        </div>

        {/* Mega Menu Portal — renders below the pills */}
        {megaMenuCategory && (
          <MegaMenu
            products={catalog}
            activeCategory={megaMenuCategory}
            onClose={handleMegaMenuClose}
            onCategoryChange={setMegaMenuCategory}
            anchorRef={categoryBarRef}
          />
        )}
      </div>

      {/* Search Overlay (both desktop + mobile) */}
      <SearchOverlay
        products={catalog}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

export default function Header() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <Suspense fallback={<header className="sticky top-0 z-40 w-full bg-white/88 h-20 border-b border-[#D8C2E7]/45" />}>
      <HeaderContent />
    </Suspense>
  );
}
