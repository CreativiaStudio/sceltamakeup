"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";

interface BestsellerCarouselProps {
  products: Product[];
}

export default function BestsellerCarousel({ products }: BestsellerCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [products]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section id="bestseller" className="py-16 sm:py-20 bg-white border-b border-[#D8C2E7]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/70 text-[#5E1788] text-xs font-semibold tracking-wider uppercase mb-3 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
              <span>Icone di Bellezza & Tendenze</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1F1B24] tracking-tight">
              I Bestseller della Maison
            </h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-xl font-light">
              Le formulazioni più richieste e iconiche di Diego dalla Palma, Cipria Makeup ed RVB LAB, selezionate per esaltare ogni incarnato.
            </p>
          </div>

          {/* Controls: Prev/Next Chevron Buttons & All Link */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              href="/prodotti"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E1788] hover:text-[#7A3293] transition-colors mr-2"
            >
              <span>Vedi tutti ({products.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scorri a sinistra"
              className={`p-2.5 rounded-full border transition-all ${
                canScrollLeft
                  ? "bg-white border-[#D8C2E7] text-[#5E1788] hover:bg-[#FAF7FC] hover:scale-105 shadow-sm active:scale-95"
                  : "bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Scorri a destra"
              className={`p-2.5 rounded-full border transition-all ${
                canScrollRight
                  ? "bg-[#5E1788] border-[#5E1788] text-white hover:bg-[#7A3293] hover:scale-105 shadow-md shadow-purple-950/20 active:scale-95"
                  : "bg-neutral-100 border-neutral-200 text-neutral-300 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Carousel Track */}
        <div
          ref={scrollContainerRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[280px] sm:w-[320px] shrink-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
