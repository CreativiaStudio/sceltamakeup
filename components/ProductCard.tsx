"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check } from "lucide-react";
import { Product, Shade } from "@/types/product";
import { useCartStore } from "@/store/useCartStore";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [selectedShade, setSelectedShade] = useState<Shade | null>(
    product.shades && product.shades.length > 0 ? product.shades[0] : null
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  // Active image: if shade has specific image, or fallback to product images
  const activeImage =
    selectedShade?.image || product.images[0] || "/brand/logo.png";

  // Price (can vary per shade if specified)
  const currentPrice = selectedShade?.price ?? product.price;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: currentPrice,
      quantity: 1,
      shade: selectedShade
        ? {
            id: selectedShade.id,
            name: selectedShade.name,
            code: selectedShade.code,
            hex: selectedShade.hex,
            image: selectedShade.image,
          }
        : undefined,
      image: activeImage,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  return (
    <div
      onClick={() => router.push(`/prodotti/${product.slug}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#D8C2E7]/80 cursor-pointer"
    >
      {/* Visual Header / Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#FAF7FC]">
        <Link href={`/prodotti/${product.slug}`} className="block h-full w-full">
          <Image
            src={imageError ? "/brand/logo.png" : activeImage}
            alt={`${product.name} - ${selectedShade ? selectedShade.name : ""}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        </Link>

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#1F1B24]/90 text-white backdrop-blur-xs shadow-xs">
              {product.badge}
            </span>
          </div>
        )}

        {/* Brand Tag */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wider uppercase bg-white/95 text-[#5E1788] border border-[#D8C2E7]/60 shadow-xs">
            {product.brand}
          </span>
        </div>

        {/* Quick Add Overlay on Hover for Desktop */}
        <div
          className={`absolute bottom-3 left-3 right-3 z-10 transition-all duration-300 ${
            isHovered
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none lg:opacity-0"
          } hidden sm:block`}
        >
          <button
            type="button"
            onClick={handleQuickAdd}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all ${
              isAdded
                ? "bg-emerald-600 text-white"
                : "bg-[#5E1788] hover:bg-[#7A3293] text-white active:scale-95"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Aggiunto!
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                Aggiungi Rapido
              </>
            )}
          </button>
        </div>
      </div>

      {/* Product Content & Swatches */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Category & Stock Status */}
        <div className="flex items-center justify-between text-xs text-neutral-600 mb-1.5">
          <span className="tracking-wider uppercase text-xs font-semibold text-[#7A3293]">
            {product.category}
          </span>
          {product.stock !== undefined && (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                product.stock <= 0
                  ? "bg-rose-50 text-rose-700 font-semibold"
                  : product.stock < 5
                  ? "bg-amber-50 text-amber-800 font-semibold"
                  : "bg-emerald-50 text-emerald-800 font-semibold"
              }`}
            >
              {product.stock <= 0 ? "Esaurito" : product.stock < 5 ? `Ultime ${product.stock} pz` : "Disponibile"}
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="font-serif text-base sm:text-lg font-bold text-[#1F1B24] line-clamp-1 group-hover:text-[#5E1788] transition-colors">
          <Link href={`/prodotti/${product.slug}`}>{product.name}</Link>
        </h3>

        {/* Short description */}
        <p className="text-xs text-neutral-500 line-clamp-2 mt-1 font-light leading-relaxed">
          {product.shortDescription}
        </p>

        {/* Shade Swatches (if multiple shades available) */}
        {product.shades && product.shades.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-neutral-700 font-medium truncate max-w-[170px]">
                {selectedShade ? selectedShade.name : `${product.shades.length} tonalità`}
              </span>
              <span className="text-xs text-neutral-600 font-mono">
                {product.shades.length} {product.shades.length === 1 ? "shade" : "shades"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {product.shades.slice(0, 6).map((shade) => {
                const isSelected = selectedShade?.id === shade.id;
                return (
                  <button
                    key={shade.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedShade(shade);
                      setImageError(false);
                    }}
                    title={shade.name}
                    aria-label={shade.name}
                    className={`h-5 w-5 rounded-full transition-transform border ${
                      isSelected
                        ? "ring-2 ring-[#5E1788] ring-offset-1 scale-110 border-white"
                        : "border-neutral-300 hover:scale-105"
                    }`}
                    style={{ backgroundColor: shade.hex }}
                  />
                );
              })}
              {product.shades.length > 6 && (
                <span className="text-xs text-neutral-600 font-medium ml-1">
                  +{product.shades.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Price & Mobile Add Button */}
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-[#1F1B24]">
              €{currentPrice.toFixed(2)}
            </span>
            {product.originalPrice && product.originalPrice > currentPrice && (
              <span className="text-xs text-neutral-400 line-through">
                €{product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Mobile Quick Add Button */}
          <button
            type="button"
            onClick={handleQuickAdd}
            className={`sm:hidden p-2 rounded-full text-white transition-all ${
              isAdded ? "bg-emerald-600" : "bg-[#5E1788] active:scale-95"
            }`}
            aria-label="Aggiungi al carrello"
          >
            {isAdded ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
