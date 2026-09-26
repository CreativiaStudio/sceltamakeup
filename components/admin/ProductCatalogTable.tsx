"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Edit,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Barcode,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import rawCatalog from "@/data/catalog.json";
import { Product, ProductCategory, ProductVariant } from "@/types/product";
import {
  getAdminVariantStocks,
  computeStockStatus,
  SceltaVariantStock,
  getProductOverrides,
  updateProductDetails,
} from "@/lib/adminStore";
import ProductEditorModal from "./ProductEditorModal";
import { logAdminActivity } from "@/lib/auditLogger";

const ALL_PRODUCTS = rawCatalog as Product[];

const DEFAULT_IMAGE = "/brand/logo.png";

/** Valid, non-empty image source or the brand logo fallback. */
function safeImageSrc(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return DEFAULT_IMAGE;
}

/** Type guard that rejects `null`, `undefined` and malformed variant rows. */
function isValidVariant(value: unknown): value is ProductVariant {
  return Boolean(value && typeof value === "object");
}

/** Returns a dense, null-free variants array (never a sparse/poisoned array). */
function getSafeVariants(product: Product | null | undefined): ProductVariant[] {
  return Array.isArray(product?.variants) ? product.variants.filter(isValidVariant) : [];
}

const BRAND_FILTERS = [
  "Tutti",
  "Diego dalla Palma",
  "Eveline Cosmetics",
  "Pierre René",
  "RVB LAB",
  "Miyo",
  "Cipria Make Up",
];

const CATEGORY_FILTERS = [
  "Tutte",
  "Viso",
  "Occhi",
  "Skincare & Dermo",
  "Labbra",
  "Beauty & Accessori",
];

export default function ProductCatalogTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("Tutti");
  const [selectedCategory, setSelectedCategory] = useState("Tutte");
  const [selectedStockStatus, setSelectedStockStatus] = useState<"all" | "available" | "low_stock" | "out_of_stock">("all");
  const [selectedChannel, setSelectedChannel] = useState<"all" | "online" | "local_only">("all");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected product for modal stock & price editing
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Variant stocks and product overrides from adminStore
  const [stocksMap, setStocksMap] = useState<Record<string, SceltaVariantStock>>(() =>
    getAdminVariantStocks()
  );
  const [overridesMap, setOverridesMap] = useState<Record<string, Partial<Product>>>(() =>
    getProductOverrides()
  );

  const refreshStocks = useCallback(() => {
    setStocksMap(getAdminVariantStocks());
    setOverridesMap(getProductOverrides());
  }, []);

  useEffect(() => {
    const handleStoreUpdate = () => refreshStocks();
    window.addEventListener("scelta_admin_store_updated", handleStoreUpdate);
    window.addEventListener("scelta_admin_store_reset", handleStoreUpdate);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", handleStoreUpdate);
      window.removeEventListener("scelta_admin_store_reset", handleStoreUpdate);
    };
  }, [refreshStocks]);

  // 1-Click Toggle E-Commerce Online vs Solo Negozio Locale
  const handleToggleLocalOnly = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextLocalOnly = !product.isLocalOnly;
    updateProductDetails(product.id, { isLocalOnly: nextLocalOnly });
    logAdminActivity({
      category: "canale",
      action: "channel_toggle",
      title: "Modifica Canale Vendita",
      description: `"${product.name}" impostato su ${nextLocalOnly ? "SOLO NEGOZIO (nascosto dall'e-commerce)" : "ONLINE (visibile su e-commerce)"} dal catalogo`,
      details: { productId: product.id, isLocalOnly: nextLocalOnly },
    });
    setActionFeedback(
      nextLocalOnly
        ? `🏬 "${product.name.slice(0, 22)}..." impostato come SOLO NEGOZIO (nascosto dall'e-commerce)`
        : `🌐 "${product.name.slice(0, 22)}..." pubblicato sull'E-COMMERCE!`
    );
    setTimeout(() => setActionFeedback(null), 2800);
  };

  // Handlers that reset pagination to page 1
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleStockStatusSelect = (status: "all" | "available" | "low_stock" | "out_of_stock") => {
    setSelectedStockStatus(status);
    setCurrentPage(1);
  };

  const handleChannelSelect = (channel: "all" | "online" | "local_only") => {
    setSelectedChannel(channel);
    setCurrentPage(1);
  };

  // Compute aggregated stock info for a product
  const getProductStockSummary = useCallback(
    (product: Product) => {
      const variants = getSafeVariants(product);
      if (variants.length === 0) {
        return { totalQty: 0, status: "out_of_stock" as const, shadesCount: 0 };
      }

      let totalQty = 0;
      let hasOutOfStock = false;
      let hasLowStock = false;

      for (const v of variants) {
        const vStock = stocksMap[v.id];
        const qty = vStock ? vStock.stockQuantity : (v.stock ?? 0);
        totalQty += qty;
        const status = computeStockStatus(qty);
        if (status === "out_of_stock") hasOutOfStock = true;
        if (status === "low_stock") hasLowStock = true;
      }

      let status: "available" | "low_stock" | "out_of_stock" = "available";
      if (totalQty === 0) {
        status = "out_of_stock";
      } else if (hasOutOfStock || hasLowStock || totalQty < 5 * variants.length) {
        status = "low_stock";
      }

      return {
        totalQty,
        status,
        shadesCount: variants.length,
      };
    },
    [stocksMap]
  );

  // Products with applied overrides from admin store (including newly created items)
  const productsWithOverrides = useMemo(() => {
    const baseList = ALL_PRODUCTS.map((product) => {
      const override = overridesMap[product.id];
      if (!override) return product;
      return {
        ...product,
        ...override,
        id: product.id,
        name: override.name || product.name || "Prodotto Senza Nome",
        brand: override.brand || product.brand || "Generico",
        category: override.category || product.category || "Viso",
        variants: override.variants ? override.variants.filter(isValidVariant) : getSafeVariants(product),
        images: (override.images || product.images || []).filter(
          (img): img is string => typeof img === "string" && img.trim().length > 0
        ),
      };
    });

    const baseIds = new Set(ALL_PRODUCTS.map((p) => p.id));
    const extraProducts: Product[] = [];

    for (const [id, override] of Object.entries(overridesMap)) {
      if (!baseIds.has(id) && override && override.name && Array.isArray(override.variants)) {
        const safeVariants = override.variants.filter(isValidVariant);
        if (safeVariants.length === 0) continue;
        extraProducts.push({
          ...(override as Partial<Product>),
          id,
          slug: override.slug || id,
          name: override.name || "Prodotto Senza Nome",
          brand: override.brand || "Generico",
          category: (override.category as ProductCategory) || "Viso",
          price: override.price || 0,
          isLocalOnly: override.isLocalOnly ?? false,
          variants: safeVariants,
          images: (override.images || []).filter(
            (img): img is string => typeof img === "string" && img.trim().length > 0
          ),
          shortDescription: override.shortDescription || "",
          description: override.description || "",
          howToUse: override.howToUse || "",
          formulaBenefits: override.formulaBenefits || "",
          inci: override.inci || "",
        } as Product);
      }
    }

    return [...baseList, ...extraProducts];
  }, [overridesMap]);

  // Aggregate catalog metrics (schede, tonalità/SKU fisici, pezzi a magazzino)
  const { totalCards, totalVariants, totalStockPieces } = useMemo(() => {
    let variants = 0;
    let pieces = 0;

    for (const product of productsWithOverrides) {
      const safeVariants = getSafeVariants(product);
      variants += safeVariants.length;
      for (const v of safeVariants) {
        const vStock = stocksMap[v.id];
        pieces += vStock ? vStock.stockQuantity : (v.stock ?? 0);
      }
    }

    return {
      totalCards: productsWithOverrides.length,
      totalVariants: variants,
      totalStockPieces: pieces,
    };
  }, [productsWithOverrides, stocksMap]);

  // Channel counts
  const onlineCount = useMemo(
    () => productsWithOverrides.filter((p) => !p.isLocalOnly).length,
    [productsWithOverrides]
  );
  const localOnlyCount = useMemo(
    () => productsWithOverrides.filter((p) => p.isLocalOnly).length,
    [productsWithOverrides]
  );

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return productsWithOverrides.filter((product) => {
      // Channel filter (online vs local only)
      if (selectedChannel === "online" && product.isLocalOnly) {
        return false;
      }
      if (selectedChannel === "local_only" && !product.isLocalOnly) {
        return false;
      }

      const pBrand = product.brand || "Generico";
      const pBrandLower = pBrand.toLowerCase();
      const pCat = product.category || "Viso";

      // Brand filter
      if (selectedBrand !== "Tutti") {
        const matchesBrand =
          pBrand === selectedBrand ||
          (selectedBrand === "Diego dalla Palma" && pBrandLower.includes("diego dalla palma")) ||
          (selectedBrand === "RVB LAB" && pBrandLower.includes("rvb lab"));
        if (!matchesBrand) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "Tutte" && pCat !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (selectedStockStatus !== "all") {
        const summary = getProductStockSummary(product);
        if (summary.status !== selectedStockStatus) {
          return false;
        }
      }

      // Search query (bulletproof against null, undefined or non-string attributes)
      if (q) {
        const nameLower = (product.name || "").toLowerCase();
        const catLower = pCat.toLowerCase();
        const mainSku = (product.variants?.[0]?.sku || "").toLowerCase();

        const matchName = nameLower.includes(q);
        const matchBrand = pBrandLower.includes(q);
        const matchCat = catLower.includes(q);
        const matchSku = mainSku.includes(q);
        const matchVariants = (product.variants || []).some((v) => {
          if (!v || typeof v !== "object") return false;
          const vName = v.name ? String(v.name).toLowerCase() : "";
          const vSku = v.sku ? String(v.sku).toLowerCase() : "";
          const vEan = v.ean ? String(v.ean).toLowerCase() : "";
          return vName.includes(q) || vSku.includes(q) || vEan.includes(q);
        });

        if (!matchName && !matchBrand && !matchCat && !matchSku && !matchVariants) {
          return false;
        }
      }

      return true;
    });
  }, [productsWithOverrides, selectedChannel, searchQuery, selectedBrand, selectedCategory, selectedStockStatus, getProductStockSummary]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Catalogo Prodotti & Giacenze
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20"
              title="Schede prodotto a catalogo (una riga per prodotto)"
            >
              {totalCards} Schede Catalogo
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200"
              title="Tonalità, varianti e SKU fisici con barcode EAN"
            >
              {totalVariants} Tonalità & Barcode EAN
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="Pezzi totali a magazzino su tutte le varianti"
            >
              {totalStockPieces.toLocaleString("it-IT")} Pezzi a Magazzino
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestione stock per singola tonalità/variante, codici EAN-13 e prezzi al pubblico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">
            Trovati: <strong className="text-[#1F1B24]">{filteredProducts.length}</strong> prodotti
          </span>
        </div>
      </div>

      {/* Search & Stock Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome prodotto, brand, categoria, SKU o barcode EAN-13..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Stock Status Selector */}
          <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => handleStockStatusSelect("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStockStatus === "all"
                  ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tutti
            </button>
            <button
              type="button"
              onClick={() => handleStockStatusSelect("available")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedStockStatus === "available"
                  ? "bg-white text-emerald-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Disponibili</span>
            </button>
            <button
              type="button"
              onClick={() => handleStockStatusSelect("low_stock")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedStockStatus === "low_stock"
                  ? "bg-white text-amber-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Qtà bassa</span>
            </button>
            <button
              type="button"
              onClick={() => handleStockStatusSelect("out_of_stock")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedStockStatus === "out_of_stock"
                  ? "bg-white text-rose-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Esauriti</span>
            </button>
          </div>

          {/* E-Commerce Channel Selector */}
          <div className="flex items-center gap-1 shrink-0 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => handleChannelSelect("all")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedChannel === "all"
                  ? "bg-white text-[#5E1788] shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tutti i canali
            </button>
            <button
              type="button"
              onClick={() => handleChannelSelect("online")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedChannel === "online"
                  ? "bg-white text-emerald-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Prodotti visibili sull'e-commerce"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online ({onlineCount})</span>
            </button>
            <button
              type="button"
              onClick={() => handleChannelSelect("local_only")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedChannel === "local_only"
                  ? "bg-white text-amber-700 shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title="Prodotti venduti solo in negozio (nascosti dall'e-commerce)"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Solo Negozio ({localOnlyCount})</span>
            </button>
          </div>
        </div>

        {/* 1-Click Action Feedback Notification */}
        {actionFeedback && (
          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-[#5E1788] flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-[#5E1788] shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Brand Filter Pills */}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-gray-500 shrink-0 uppercase tracking-wider">
            Brand:
          </span>
          {BRAND_FILTERS.map((brand) => {
            const isSelected = selectedBrand === brand;
            return (
              <button
                key={brand}
                type="button"
                onClick={() => handleBrandSelect(brand)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                  isSelected
                    ? "bg-[#5E1788] text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>

        {/* Category Filter Pills */}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-gray-500 shrink-0 uppercase tracking-wider">
            Categoria:
          </span>
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
                  isSelected
                    ? "bg-[#7A3293] text-white shadow-sm"
                    : "bg-purple-50 text-purple-900 hover:bg-purple-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                <th className="py-3 px-4">Prodotto</th>
                <th className="py-3 px-4">Brand & Categoria</th>
                <th className="py-3 px-4">Prezzo</th>
                <th className="py-3 px-4">Varianti / Tonalità</th>
                <th className="py-3 px-4">Giacenza Totale</th>
                <th className="py-3 px-4 text-center">Canale</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Nessun prodotto trovato per i filtri selezionati.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const summary = getProductStockSummary(product);
                  const safeVariants = getSafeVariants(product);

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* Product details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden relative shrink-0 p-1">
                            <Image
                              src={safeImageSrc(product.images?.[0])}
                              alt={product.name}
                              fill
                              className="object-contain"
                              sizes="48px"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#1F1B24] line-clamp-1 group-hover:text-[#5E1788] transition-colors">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              SKU: {product.variants?.[0]?.sku || product.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#5E1788]/10 text-[#5E1788]">
                            {product.brand}
                          </span>
                          <div className="text-[11px] text-gray-500">
                            {product.category}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1F1B24]">
                          {formatEuro(product.price)}
                        </div>
                        {product.originalWholesalePrice && (
                          <div className="text-[10px] text-gray-400">
                            Costo: {formatEuro(product.originalWholesalePrice)}
                          </div>
                        )}
                      </td>

                      {/* Variants & Shades */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="font-medium text-gray-700">
                            {summary.shadesCount} {summary.shadesCount === 1 ? "variante" : "tonalità"}
                          </span>
                          {/* Swatches preview */}
                          <div className="flex items-center gap-1">
                            {safeVariants.slice(0, 5).map((v) =>
                              v?.colorHex ? (
                                <span
                                  key={v.id}
                                  className="w-3.5 h-3.5 rounded-full border border-gray-300 shadow-2xs shrink-0"
                                  style={{ backgroundColor: v.colorHex }}
                                  title={v.name}
                                />
                              ) : null
                            )}
                            {safeVariants.length > 5 && (
                              <span className="text-[10px] text-gray-400">
                                +{safeVariants.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stock Level Badge */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-[#1F1B24]">
                            {summary.totalQty} pz
                          </div>
                          <div>
                            {summary.status === "available" && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Disponibile
                              </span>
                            )}
                            {summary.status === "low_stock" && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                Qtà bassa
                              </span>
                            )}
                            {summary.status === "out_of_stock" && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Esaurito
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Canale Vendita: Online vs Solo Negozio Locale (1-Click Toggle) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleLocalOnly(product, e)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                            product.isLocalOnly
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                          title={
                            product.isLocalOnly
                              ? "Attualmente: SOLO NEGOZIO FISICO (Nascosto dall'e-commerce). Clicca per renderlo visibile online con 1 click!"
                              : "Attualmente: VISIBILE SU E-COMMERCE. Clicca per toglierlo dall'e-commerce (Solo Locale) con 1 click!"
                          }
                        >
                          {product.isLocalOnly ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Solo Locale</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Online</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const firstCode =
                                product.variants?.[0]?.ean ||
                                product.variants?.[0]?.sku ||
                                product.id;
                              window.dispatchEvent(
                                new CustomEvent("open_quick_scan_modal", {
                                  detail: firstCode,
                                })
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-emerald-200"
                            title="Apri cassa e simula scansione barcode"
                          >
                            <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden xl:inline">Scansiona</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingProduct(product)}
                            className="px-3 py-1.5 rounded-lg bg-[#5E1788]/10 hover:bg-[#5E1788] text-[#5E1788] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="Modifica scheda completa, foto, testi e varianti"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Modifica</span>
                          </button>

                          <Link
                            href={`/prodotti/${product.slug}`}
                            target="_blank"
                            className={`p-1.5 rounded-lg transition-colors ${
                              product.isLocalOnly
                                ? "text-gray-300 opacity-40 cursor-not-allowed pointer-events-none"
                                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            }`}
                            title={
                              product.isLocalOnly
                                ? "Prodotto nascosto dall'e-commerce pubblico (Solo Locale)"
                                : "Vedi nello storefront pubblico"
                            }
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Pagina <strong>{currentPage}</strong> di <strong>{totalPages}</strong> ({filteredProducts.length} prodotti totali)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Pagina precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-[#5E1788] px-2">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Pagina successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Full Editor Modal */}
      <ProductEditorModal
        product={editingProduct}
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        onSaved={refreshStocks}
      />
    </div>
  );
}
