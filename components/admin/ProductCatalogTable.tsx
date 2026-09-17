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
} from "lucide-react";
import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";
import {
  getAdminVariantStocks,
  computeStockStatus,
  SceltaVariantStock,
  getProductOverrides,
} from "@/lib/adminStore";
import ProductEditorModal from "./ProductEditorModal";

const ALL_PRODUCTS = rawCatalog as Product[];

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

  // Compute aggregated stock info for a product
  const getProductStockSummary = useCallback(
    (product: Product) => {
      if (!product.variants || product.variants.length === 0) {
        return { totalQty: 0, status: "out_of_stock" as const, shadesCount: 0 };
      }

      let totalQty = 0;
      let hasOutOfStock = false;
      let hasLowStock = false;

      for (const v of product.variants) {
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
      } else if (hasOutOfStock || hasLowStock || totalQty < 5 * product.variants.length) {
        status = "low_stock";
      }

      return {
        totalQty,
        status,
        shadesCount: product.variants.length,
      };
    },
    [stocksMap]
  );

  // Products with applied overrides from admin store
  const productsWithOverrides = useMemo(() => {
    return ALL_PRODUCTS.map((product) => {
      const override = overridesMap[product.id];
      if (!override) return product;
      return {
        ...product,
        ...override,
        variants: override.variants || product.variants,
        images: override.images || product.images,
      };
    });
  }, [overridesMap]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return productsWithOverrides.filter((product) => {
      // Brand filter
      if (selectedBrand !== "Tutti" && product.brand !== selectedBrand) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "Tutte" && product.category !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (selectedStockStatus !== "all") {
        const summary = getProductStockSummary(product);
        if (summary.status !== selectedStockStatus) {
          return false;
        }
      }

      // Search query
      if (q) {
        const matchName = product.name.toLowerCase().includes(q);
        const matchBrand = product.brand.toLowerCase().includes(q);
        const matchCat = product.category.toLowerCase().includes(q);
        const mainSku = product.variants?.[0]?.sku || "";
        const matchSku = mainSku.toLowerCase().includes(q);
        const matchVariants = product.variants?.some(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.sku.toLowerCase().includes(q) ||
            (v.ean && v.ean.includes(q))
        );

        if (!matchName && !matchBrand && !matchCat && !matchSku && !matchVariants) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedBrand, selectedCategory, selectedStockStatus, getProductStockSummary]);

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
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Catalogo Prodotti & Giacenze
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20">
              341 Prodotti Totali
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
              <span>Scorte Basse</span>
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
        </div>

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
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Nessun prodotto trovato per i filtri selezionati.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const summary = getProductStockSummary(product);

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
                              src={product.images?.[0] || "/brand/logo.png"}
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
                            {product.variants?.slice(0, 5).map((v) =>
                              v.colorHex ? (
                                <span
                                  key={v.id}
                                  className="w-3.5 h-3.5 rounded-full border border-gray-300 shadow-2xs shrink-0"
                                  style={{ backgroundColor: v.colorHex }}
                                  title={v.name}
                                />
                              ) : null
                            )}
                            {product.variants && product.variants.length > 5 && (
                              <span className="text-[10px] text-gray-400">
                                +{product.variants.length - 5}
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
                                Scorte Basse
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

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(product)}
                            className="px-3 py-1.5 rounded-lg bg-[#5E1788]/10 hover:bg-[#5E1788] text-[#5E1788] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                            title="Modifica scheda completa, foto, testi e varianti"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Modifica Prodotto</span>
                          </button>

                          <Link
                            href={`/prodotti/${product.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Vedi nello storefront pubblico"
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
