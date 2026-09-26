"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Barcode,
  Loader2,
} from "lucide-react";
import { Product, ProductVariant } from "@/types/product";
import {
  getAdminVariantStocks,
  batchUpdateProductVariants,
  computeStockStatus,
} from "@/lib/adminStore";
import { logAdminActivity } from "@/lib/auditLogger";

interface ProductStockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface VariantEditState {
  variantId: string;
  name: string;
  sku: string;
  ean?: string;
  colorHex?: string | null;
  stockQuantity: number;
  price: number;
}

function ProductStockModalDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [variantStates, setVariantStates] = useState<VariantEditState[]>(() => {
    const currentStocks = getAdminVariantStocks();
    return (product.variants || [])
      .filter((v): v is ProductVariant => Boolean(v && typeof v === "object"))
      .map((v) => {
        const stockItem = currentStocks[v.id];
        return {
          variantId: v.id,
          name: v.name,
          sku: v.sku,
          ean: v.ean,
          colorHex: v.colorHex,
          stockQuantity: stockItem ? stockItem.stockQuantity : (v.stock ?? 0),
          price: stockItem ? stockItem.price : (v.price ?? product.price),
        };
      });
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuantityChange = (variantId: string, newQty: number) => {
    const clamped = Math.max(0, Math.floor(newQty));
    setVariantStates((prev) =>
      prev.map((v) => (v.variantId === variantId ? { ...v, stockQuantity: clamped } : v))
    );
  };

  const handlePriceChange = (variantId: string, newPrice: number) => {
    const clamped = Math.max(0, Math.round(newPrice * 100) / 100);
    setVariantStates((prev) =>
      prev.map((v) => (v.variantId === variantId ? { ...v, price: clamped } : v))
    );
  };

  // One atomic local pass + ONE awaited cloud request for the whole product
  // (instead of 2×N uncoordinated HTTP calls that saturated the salon network).
  const handleSaveAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    const success = await batchUpdateProductVariants(
      product.id,
      variantStates.map((v) => ({
        variantId: v.variantId,
        stockQuantity: v.stockQuantity,
        price: v.price,
      }))
    );

    if (!success) {
      // Local data is preserved; surface the issue without closing the modal.
      setIsSaving(false);
      setErrorMessage("Salvataggio cloud non riuscito. Le giacenze restano salvate in locale: riprova.");
      return;
    }

    logAdminActivity({
      category: "giacenza",
      action: "batch_stock_edit",
      title: "Aggiornamento Stock & Prezzi Varianti",
      description: `Aggiornate ${variantStates.length} varianti per "${product.name}" (${variantStates.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)} pezzi totali)`,
      details: {
        productId: product.id,
        productName: product.name,
        variants: variantStates.map((v) => ({
          variantId: v.variantId,
          name: v.name,
          qty: v.stockQuantity,
          price: v.price,
        })),
      },
    });

    setIsSaving(false);
    setSaveSuccess(true);
    if (onSaved) onSaved();

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F1B24]/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-pink-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 overflow-hidden relative shrink-0 p-1">
              <Image
                src={product.images?.[0] || "/brand/logo.png"}
                alt={product.name}
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#5E1788]/10 text-[#5E1788]">
                  {product.brand}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  SKU: {product.variants?.[0]?.sku || product.id}
                </span>
              </div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-[#1F1B24] line-clamp-1">
                {product.name}
              </h2>
            </div>
          </div>

          <button
            disabled={isSaving}
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Chiudi modale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Variants List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Gestione Giacenze per Tonalità / Variante ({variantStates.length})</span>
            <span>Listino di Base: {formatEuro(product.price)}</span>
          </div>

          <div className="space-y-3">
            {variantStates.map((variant) => {
              const status = computeStockStatus(variant.stockQuantity);

              return (
                <div
                  key={variant.variantId}
                  className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-[#5E1788]/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {variant.colorHex ? (
                        <span
                          className="w-5 h-5 rounded-full border border-gray-300 shadow-sm shrink-0"
                          style={{ backgroundColor: variant.colorHex }}
                          title={`Hex: ${variant.colorHex}`}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-purple-100 text-[#5E1788] flex items-center justify-center text-[10px] font-bold shrink-0">
                          •
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-[#1F1B24]">
                          {variant.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                          <span>SKU: {variant.sku}</span>
                          {variant.ean && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Barcode className="w-3 h-3" />
                              {variant.ean}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div>
                      {status === "available" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          Disponibile
                        </span>
                      )}
                      {status === "low_stock" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Qtà bassa
                        </span>
                      )}
                      {status === "out_of_stock" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                          Esaurito
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Price Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    {/* Quantity Control */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Quantità Giacenza (Pezzi)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(variant.variantId, variant.stockQuantity - 1)}
                          className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center transition-colors shrink-0"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={variant.stockQuantity}
                          onChange={(e) =>
                            handleQuantityChange(variant.variantId, parseInt(e.target.value) || 0)
                          }
                          className="w-full text-center px-2 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-[#1F1B24] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(variant.variantId, variant.stockQuantity + 1)}
                          className="w-8 h-8 rounded-lg bg-[#5E1788]/10 text-[#5E1788] hover:bg-[#5E1788]/20 flex items-center justify-center transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price Control */}
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        Prezzo al Pubblico (€)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                          €
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={variant.price}
                          onChange={(e) =>
                            handlePriceChange(variant.variantId, parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-6 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-[#1F1B24] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="text-xs">
            {isSaving ? (
              <span className="text-[#5E1788] font-semibold flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvataggio in corso...
              </span>
            ) : errorMessage ? (
              <span className="text-red-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                {errorMessage}
              </span>
            ) : saveSuccess ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Giacenze salvate con successo!
              </span>
            ) : (
              <span className="text-gray-500 text-[11px]">
                Salvataggio atomico locale + sincronizzazione cloud in un&apos;unica richiesta
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvataggio in corso...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Modifiche</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductStockModal({
  product,
  isOpen,
  onClose,
  onSaved,
}: ProductStockModalProps) {
  if (!isOpen || !product) return null;
  return (
    <ProductStockModalDialog
      key={product.id}
      product={product}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
