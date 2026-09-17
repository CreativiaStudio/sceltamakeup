"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ChevronDown,
  ShieldCheck,
  Truck,
  Sparkles,
  Check,
  Plus,
  Minus,
  Store,
  ArrowLeft,
} from "lucide-react";
import { Product, Shade } from "@/types/product";
import { useCartStore } from "@/store/useCartStore";
import ProductCard from "@/components/ProductCard";
import { getProductOverride } from "@/lib/adminStore";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailClient({
  product: initialProduct,
  relatedProducts,
}: ProductDetailClientProps) {
  const [product, setProduct] = useState<Product>(() => {
    const override = getProductOverride(initialProduct.id);
    if (!override) return initialProduct;
    return {
      ...initialProduct,
      ...override,
      variants: override.variants || initialProduct.variants,
      shades: override.shades || initialProduct.shades,
      images: override.images || initialProduct.images,
    };
  });

  useEffect(() => {
    const applyOverride = () => {
      const override = getProductOverride(initialProduct.id);
      if (override) {
        setProduct((prev) => ({
          ...prev,
          ...override,
          variants: override.variants || prev.variants,
          shades: override.shades || prev.shades,
          images: override.images || prev.images,
        }));
      } else {
        setProduct(initialProduct);
      }
    };

    applyOverride();
    window.addEventListener("scelta_admin_store_updated", applyOverride);
    window.addEventListener("scelta_admin_store_reset", applyOverride);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", applyOverride);
      window.removeEventListener("scelta_admin_store_reset", applyOverride);
    };
  }, [initialProduct]);
  const [selectedShade, setSelectedShade] = useState<Shade | null>(
    product.shades && product.shades.length > 0 ? product.shades[0] : null
  );

  const [activeImage, setActiveImage] = useState<string>(
    selectedShade?.image || product.images[0] || "/brand/logo.png"
  );

  const [viewMode, setViewMode] = useState<"packshot" | "texture">("packshot");
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Real verified stock from supplier invoices
  const currentStock = (selectedShade?.stock !== undefined ? selectedShade.stock : product.stock) ?? 0;
  const isAvailable = currentStock > 0;

  // Accordion open states
  const [openSection, setOpenSection] = useState<string | null>("formula");

  const addItem = useCartStore((state) => state.addItem);

  // Update shade selection
  const handleShadeSelect = (shade: Shade) => {
    setSelectedShade(shade);
    if (viewMode === "texture" && shade.textureImage) {
      setActiveImage(shade.textureImage);
    } else if (shade.image) {
      setActiveImage(shade.image);
      setViewMode("packshot");
    }
  };

  const handleToggleViewMode = (mode: "packshot" | "texture") => {
    setViewMode(mode);
    if (mode === "texture" && selectedShade?.textureImage) {
      setActiveImage(selectedShade.textureImage);
    } else if (selectedShade?.image) {
      setActiveImage(selectedShade.image);
    } else if (product.images[0]) {
      setActiveImage(product.images[0]);
    }
  };

  const handleThumbnailClick = (img: string) => {
    setActiveImage(img);
    // If thumbnail matches current shade's textureImage, set viewMode to texture
    if (selectedShade?.textureImage && img === selectedShade.textureImage) {
      setViewMode("texture");
      return;
    }
    // Check if thumbnail belongs to another shade
    if (product.shades) {
      const matchingShade = product.shades.find(
        (s) => s.image === img || s.textureImage === img
      );
      if (matchingShade) {
        setSelectedShade(matchingShade);
        if (img === matchingShade.textureImage) {
          setViewMode("texture");
        } else {
          setViewMode("packshot");
        }
        return;
      }
    }
    setViewMode("packshot");
  };

  const handleImageError = (imgSrc: string) => {
    setFailedImages((prev) => ({ ...prev, [imgSrc]: true }));
  };

  const currentPrice = selectedShade?.price ?? product.price;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: currentPrice,
      quantity: quantity,
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
    setTimeout(() => setIsAdded(false), 2000);
  };

  const toggleAccordion = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Build unique, deduplicated gallery images:
  // 1. Current shade packshot
  // 2. Current shade texture swatch (if available)
  // 3. Other product images (excluding duplicate paths)
  const currentShadePackshot = selectedShade?.image || product.images[0];
  const currentShadeTexture = selectedShade?.textureImage;

  const rawGalleryList = [
    ...(currentShadePackshot ? [currentShadePackshot] : []),
    ...(currentShadeTexture ? [currentShadeTexture] : []),
    ...(product.images || []),
    ...(product.shades || []).map((s) => s.image).filter(Boolean),
  ];

  // Strictly deduplicate by URL path and filter out known broken images
  const allGalleryImages = Array.from(new Set(rawGalleryList)).filter(
    (img) => !failedImages[img]
  );

  return (
    <div className="bg-white">
      {/* Breadcrumb & Top Bar */}
      <div className="bg-[#FAF7FC] border-b border-[#D8C2E7]/40 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-neutral-500">
          <nav className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#5E1788] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/?categoria=${encodeURIComponent(product.category)}#catalogo`}
              className="hover:text-[#5E1788] transition-colors"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-neutral-800 font-medium truncate max-w-[200px] sm:max-w-none">
              {product.name}
            </span>
          </nav>

          <Link
            href="/#catalogo"
            className="inline-flex items-center gap-1 text-[#7A3293] hover:text-[#5E1788] font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Torna al catalogo</span>
          </Link>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails */}
            {allGalleryImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:max-h-[600px] pb-2 sm:pb-0 scrollbar-none shrink-0">
                {allGalleryImages.map((img, idx) => {
                  const isSelected = activeImage === img;
                  const isTexture =
                    selectedShade?.textureImage === img ||
                    (product.shades || []).some((s) => s.textureImage === img);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleThumbnailClick(img)}
                      className={`relative h-18 w-18 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-all group ${
                        isSelected
                          ? "border-[#5E1788] shadow-md ring-2 ring-[#5E1788]/20"
                          : "border-neutral-200 hover:border-purple-300 opacity-75 hover:opacity-100"
                      }`}
                      aria-label={`Visualizza immagine ${idx + 1}`}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} preview ${idx + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                        onError={() => handleImageError(img)}
                      />
                      {isTexture && (
                        <span className="absolute bottom-1 right-1 bg-white/90 text-[#5E1788] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-tighter">
                          Texture
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Stage Packshot */}
            <div className="relative flex-1 aspect-square rounded-3xl overflow-hidden bg-[#FAF7FC] border border-[#E2E8F0] shadow-sm flex items-center justify-center">
              {!failedImages[activeImage] ? (
                <Image
                  src={activeImage}
                  alt={`${product.name} - ${selectedShade ? selectedShade.name : ""}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover object-center transition-all duration-500"
                  onError={() => handleImageError(activeImage)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-[#5E1788] font-serif font-bold text-2xl mb-2">
                    S
                  </div>
                  <span className="text-sm font-medium text-neutral-600">
                    {product.name}
                  </span>
                  <span className="text-xs text-neutral-400 mt-1">
                    {selectedShade?.name}
                  </span>
                </div>
              )}

              {/* Badges on packshot */}
              {product.badge && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#1F1B24]/90 text-white shadow-md backdrop-blur-xs">
                    {product.badge}
                  </span>
                </div>
              )}

              {/* Packshot vs Texture View Switcher Toggle (if texture available) */}
              {selectedShade?.textureImage && (
                <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md p-1 rounded-full border border-purple-200/80 shadow-md flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode("packshot")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      viewMode === "packshot"
                        ? "bg-[#5E1788] text-white shadow-xs"
                        : "text-neutral-600 hover:text-[#5E1788]"
                    }`}
                  >
                    Flacone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode("texture")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                      viewMode === "texture"
                        ? "bg-[#5E1788] text-white shadow-xs"
                        : "text-neutral-600 hover:text-[#5E1788]"
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-[#D462A6]" />
                    <span>Texture HD</span>
                  </button>
                </div>
              )}

              {/* Shade active indicator floating pill */}
              {selectedShade && (
                <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/80 shadow-md flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full border border-neutral-300 shrink-0 ring-1 ring-black/10 shadow-inner"
                    style={{ backgroundColor: selectedShade.hex }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#1F1B24] leading-tight">
                      {selectedShade.name}
                    </span>
                    {selectedShade.code && (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Cod. {selectedShade.code}
                      </span>
                    )}
                  </div>
                  {selectedShade.textureImage && (
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleViewMode(
                          viewMode === "texture" ? "packshot" : "texture"
                        )
                      }
                      className="ml-1 text-[11px] font-semibold text-[#5E1788] bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full border border-[#D8C2E7]/60 transition-colors"
                    >
                      {viewMode === "texture" ? "Vedi Flacone" : "Vedi Texture"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Information, Swatches, Accordion & Buy */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Brand & Category */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#7A3293]">
                {product.brand}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5E1788] font-medium">
                {product.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1F1B24] font-bold mt-2 leading-tight">
              {product.name}
            </h1>

            {/* Authentic Boutique Quality & Origin Badge */}
            <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                100% Originale Garantito
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-600 font-medium">Salone Ufficiale Napoli</span>
            </div>

            {/* Price Box & Verified Invoice Stock Status */}
            <div className="mt-5">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl font-bold text-[#1F1B24]">
                  €{currentPrice.toFixed(2)}
                </span>
                {product.originalPrice && product.originalPrice > currentPrice && (
                  <span className="text-base text-neutral-400 line-through">
                    €{product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-[11px] text-neutral-500 font-normal">
                  IVA inclusa
                </span>
              </div>

              {/* Real Stock Status from Invoices */}
              <div className="mt-2.5 flex items-center gap-2">
                {isAvailable ? (
                  currentStock < 5 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Ultime {currentStock} unità disponibili in Salone
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Disponibile in Salone ({currentStock} pz)
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Momentaneamente esaurito
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm text-neutral-600 font-light leading-relaxed">
              {product.description}
            </p>

            {/* Interactive Shade Selector */}
            {product.shades && product.shades.length > 0 && (
              <div className="mt-6 pt-6 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Tonalità:
                    </span>
                    <strong className="text-xs text-[#5E1788]">
                      {selectedShade?.name}
                    </strong>
                  </div>
                  {selectedShade?.code && (
                    <span className="text-[11px] font-mono text-neutral-400">
                      Cod. {selectedShade.code}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {product.shades.map((shade) => {
                    const isSelected = selectedShade?.id === shade.id;
                    const shadeOutOfStock = shade.stock !== undefined && shade.stock <= 0;
                    return (
                      <button
                        key={shade.id}
                        type="button"
                        onClick={() => handleShadeSelect(shade)}
                        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          shadeOutOfStock ? "opacity-50 line-through border-dashed" : ""
                        } ${
                          isSelected
                            ? "border-[#5E1788] bg-purple-50 ring-2 ring-[#5E1788]/25 shadow-xs"
                            : "border-neutral-200 hover:border-[#D8C2E7] hover:bg-neutral-50/80 bg-white"
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded-full border shrink-0 transition-transform ${
                            isSelected
                              ? "scale-110 border-white ring-2 ring-[#5E1788]"
                              : "border-neutral-300 group-hover:scale-105"
                          }`}
                          style={{ backgroundColor: shade.hex }}
                        />
                        <span
                          className={`text-xs truncate max-w-[130px] ${
                            isSelected
                              ? "font-semibold text-[#5E1788]"
                              : "font-medium text-neutral-700"
                          }`}
                        >
                          {shade.name}
                        </span>
                        {shade.textureImage && (
                          <span
                            title="Texture HD disponibile"
                            className="text-[10px] text-[#D462A6]"
                          >
                            ✦
                          </span>
                        )}
                        {shade.stock !== undefined && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            ({shade.stock})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add to Cart Actions */}
            <div className="mt-8 pt-6 border-t border-neutral-100 space-y-4">
              <div className="flex items-center gap-4">
                {/* Quantity Control */}
                <div className="flex items-center border border-[#E2E8F0] rounded-xl bg-white p-1">
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-colors"
                    aria-label="Diminuisci quantità"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 text-sm font-semibold text-[#1F1B24]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={!isAvailable || quantity >= currentStock}
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    className="p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-colors"
                    aria-label="Aumenta quantità"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Main CTA */}
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 px-6 rounded-xl font-medium text-sm tracking-wider uppercase shadow-lg flex items-center justify-center gap-2 transition-all ${
                    !isAvailable
                      ? "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                      : isAdded
                      ? "bg-emerald-600 text-white shadow-emerald-700/20 active:scale-98"
                      : "bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] hover:shadow-xl hover:shadow-purple-900/25 text-white active:scale-98"
                  }`}
                >
                  {!isAvailable ? (
                    <span>Momentaneamente Esaurito</span>
                  ) : isAdded ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Aggiunto al Carrello!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>Aggiungi al Carrello • €{(currentPrice * quantity).toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Boutique Pickup & Trust Guarantee Box */}
              <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#5E1788] font-medium">
                  <Store className="h-4 w-4 text-[#D462A6]" />
                  <span>Disponibile anche per il ritiro gratuito in Salone a Napoli</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-[11px] pt-1 border-t border-purple-100">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-[#5E1788]" />
                    Consegna Express 24/48h
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
                    2 Campioncini Omaggio
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    100% Autentico
                  </span>
                </div>
              </div>
            </div>

            {/* Accordion: Formula & Benefici, Modo d'uso, INCI Completo */}
            <div className="mt-8 border-t border-neutral-200 divide-y divide-neutral-200">
              
              {/* Formula & Benefici */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleAccordion("formula")}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#1F1B24] hover:text-[#5E1788] transition-colors"
                >
                  <span>Formula & Benefici Straordinari</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openSection === "formula" ? "rotate-180 text-[#5E1788]" : "text-neutral-400"
                    }`}
                  />
                </button>
                {openSection === "formula" && (
                  <div className="mt-3 text-xs sm:text-sm text-neutral-600 font-light leading-relaxed animate-in fade-in duration-200">
                    <p>{product.formulaBenefits}</p>
                    {product.texture && (
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="font-semibold text-neutral-800">Texture:</span>
                        <span className="text-neutral-600">{product.texture}</span>
                      </div>
                    )}
                    {product.finish && (
                      <div className="mt-1 flex items-center gap-4 text-xs">
                        <span className="font-semibold text-neutral-800">Finish:</span>
                        <span className="text-neutral-600">{product.finish}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modo d'uso */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleAccordion("usage")}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#1F1B24] hover:text-[#5E1788] transition-colors"
                >
                  <span>Modo d&apos;Uso & Consigli del Make-Up Artist</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openSection === "usage" ? "rotate-180 text-[#5E1788]" : "text-neutral-400"
                    }`}
                  />
                </button>
                {openSection === "usage" && (
                  <div className="mt-3 text-xs sm:text-sm text-neutral-600 font-light leading-relaxed animate-in fade-in duration-200">
                    <p>{product.howToUse}</p>
                  </div>
                )}
              </div>

              {/* INCI Completo */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => toggleAccordion("inci")}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#1F1B24] hover:text-[#5E1788] transition-colors"
                >
                  <span>INCI Completo (Lista Ingredienti)</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openSection === "inci" ? "rotate-180 text-[#5E1788]" : "text-neutral-400"
                    }`}
                  />
                </button>
                {openSection === "inci" && (
                  <div className="mt-3 text-[11px] font-mono text-neutral-500 leading-relaxed bg-[#FAF7FC] p-3.5 rounded-xl border border-neutral-200/60 animate-in fade-in duration-200">
                    <p>{product.inci}</p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* Cross-Sell / Related Products Section */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="mt-20 pt-16 border-t border-[#D8C2E7]/40">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#7A3293]">
                Armonia di Bellezza
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1B24] mt-1">
                Completa il Tuo Look
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {relatedProducts.slice(0, 3).map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
