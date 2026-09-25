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
  Trash2,
  Upload,
  Image as ImageIcon,
  FileText,
  Palette,
  Star,
  Sparkles,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react";
import { Product, ProductCategory, ProductVariant, Shade } from "@/types/product";
import {
  getAdminVariantStocks,
  updateProductDetails,
  getProductOverride,
  computeStockStatus,
} from "@/lib/adminStore";

interface ProductEditorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const BRAND_OPTIONS = [
  "Diego dalla Palma",
  "RVB LAB",
  "Cipria Make Up",
  "Eveline Cosmetics",
  "Pierre René",
  "Miyo",
];

const CATEGORY_OPTIONS: ProductCategory[] = [
  "Viso",
  "Occhi",
  "Labbra",
  "Skincare & Dermo",
  "Beauty & Accessori",
];

export default function ProductEditorModal({
  product,
  isOpen,
  onClose,
  onSaved,
}: ProductEditorModalProps) {
  if (!isOpen || !product) return null;

  return (
    <ProductEditorModalDialog
      key={product.id}
      product={product}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error("File vuoto"));
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webpData = canvas.toDataURL("image/webp", 0.85);
          if (webpData.startsWith("data:image/webp")) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback
        }
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Errore nel caricamento del file immagine"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Errore nella lettura del file"));
    reader.readAsDataURL(file);
  });
}

function ProductEditorModalDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"photos" | "texts" | "variants">("photos");

  // Load initial product state with existing overrides if present
  const [formData, setFormData] = useState(() => {
    const override = getProductOverride(product.id) || {};
    const merged = { ...product, ...override };

    const currentStocks = getAdminVariantStocks();
    const variants: ProductVariant[] = (merged.variants || []).map((v) => {
      const stockItem = currentStocks[v.id];
      return {
        ...v,
        stock: stockItem ? stockItem.stockQuantity : (v.stock ?? 0),
        price: stockItem ? stockItem.price : (v.price ?? merged.price),
        sku: v.sku || (stockItem ? stockItem.sku : v.id),
        ean: v.ean || (stockItem ? stockItem.ean || "" : ""),
        colorHex: v.colorHex || (stockItem ? stockItem.colorHex || null : null),
        name: v.name || (stockItem ? stockItem.name : "Tonalità"),
      };
    });

    return {
      name: merged.name || "",
      brand: merged.brand || "Diego dalla Palma",
      category: (merged.category as ProductCategory) || "Viso",
      price: merged.price || 0,
      isLocalOnly: merged.isLocalOnly ?? false,
      shortDescription: merged.shortDescription || "",
      description: merged.description || "",
      howToUse: merged.howToUse || "",
      formulaBenefits: merged.formulaBenefits || "",
      inci: merged.inci || "",
      images: merged.images && merged.images.length > 0 ? [...merged.images] : ["/brand/logo.png"],
      variants,
    };
  });

  const [newImageUrl, setNewImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modalità di rappresentazione per variante: HEX (colore) oppure Foto (packshot).
  // Chiave = id variante. Se assente, viene dedotta dai dati (foto se l'HEX manca).
  const [variantPhotoMode, setVariantPhotoMode] = useState<Record<string, boolean>>(
    {}
  );

  // Handlers for Photos Tab
  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, trimmed],
    }));
    setNewImageUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setErrorMessage(null);
    try {
      const compressedDataUrl = await compressImage(file);
      setFormData((prev) => ({
        ...prev,
        images: [compressedDataUrl, ...prev.images],
      }));
    } catch (err) {
      console.error("Errore caricamento immagine:", err);
      setErrorMessage("Impossibile elaborare il file immagine. Prova con un formato PNG, JPG o WebP.");
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const copy = [...prev.images];
      const [selected] = copy.splice(index, 1);
      return {
        ...prev,
        images: [selected, ...copy],
      };
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const copy = prev.images.filter((_, idx) => idx !== index);
      return {
        ...prev,
        images: copy.length > 0 ? copy : ["/brand/logo.png"],
      };
    });
  };

  // Handlers for Variants Tab
  const handleVariantChange = (
    index: number,
    field: keyof ProductVariant,
    value: string | number | null
  ) => {
    setFormData((prev) => {
      const copy = [...prev.variants];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return { ...prev, variants: copy };
    });
  };

  const handleViewVariantImage = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleVariantStockStep = (index: number, delta: number) => {
    setFormData((prev) => {
      const copy = [...prev.variants];
      const current = copy[index].stock ?? 0;
      copy[index] = {
        ...copy[index],
        stock: Math.max(0, current + delta),
      };
      return { ...prev, variants: copy };
    });
  };

  const handleAddVariant = () => {
    const newId = `${product.id}-var-${Date.now().toString().slice(-4)}`;
    const newVariant: ProductVariant = {
      id: newId,
      name: `Nuova Tonalità ${formData.variants.length + 1}`,
      sku: `${product.id.toUpperCase().slice(0, 8)}-${(formData.variants.length + 1).toString().padStart(2, "0")}`,
      ean: "",
      colorHex: "#D8C2E7",
      image: formData.images[0] || "/brand/logo.png",
      inStock: true,
      stock: 10,
      price: formData.price,
    };
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  const handleRemoveVariant = (index: number) => {
    if (formData.variants.length <= 1) {
      alert("Il prodotto deve avere almeno una variante.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // Submit and save
  const handleSaveAll = () => {
    setIsSaving(true);
    setErrorMessage(null);

    // Build shades list matching variants for backward compatibility with frontend
    const updatedShades: Shade[] = formData.variants.map((v, i) => ({
      id: v.id,
      name: v.name,
      code: (i + 1).toString().padStart(2, "0"),
      hex: v.colorHex || "#CCCCCC",
      image: v.image || formData.images[0] || "/brand/logo.png",
      price: v.price ?? formData.price,
      stock: v.stock ?? 0,
      inStock: (v.stock ?? 0) > 0,
    }));

    const updates: Partial<Product> = {
      name: formData.name.trim(),
      brand: formData.brand,
      category: formData.category,
      price: formData.price,
      isLocalOnly: formData.isLocalOnly,
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim(),
      howToUse: formData.howToUse.trim(),
      formulaBenefits: formData.formulaBenefits.trim(),
      inci: formData.inci.trim(),
      images: formData.images,
      variants: formData.variants,
      shades: updatedShades,
    };

    const res = updateProductDetails(product.id, updates) as Partial<Product> & { error?: string };
    if (res && res.error) {
      setIsSaving(false);
      setErrorMessage(res.error);
      return;
    }

    setIsSaving(false);
    setSaveSuccess(true);
    if (onSaved) onSaved();

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1F1B24] via-[#2D1637] to-[#1F1B24] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 relative overflow-hidden shrink-0 flex items-center justify-center">
              <Image
                src={formData.images[0] || "/brand/logo.png"}
                alt={formData.name}
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#D462A6]/30 text-[#D8C2E7] font-semibold border border-[#D462A6]/40">
                  {formData.brand}
                </span>
                <span className="text-xs text-white/50 font-mono">ID: {product.id}</span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white truncate mt-0.5">
                {formData.name || "Modifica Prodotto"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Chiudi modale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-gray-200 bg-[#FAF7FC] px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("photos")}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "photos"
                ? "border-[#5E1788] text-[#5E1788] bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Foto Packshot & Gallery ({formData.images.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("texts")}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "texts"
                ? "border-[#5E1788] text-[#5E1788] bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Testi & Scheda Cosmetica</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("variants")}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "variants"
                ? "border-[#5E1788] text-[#5E1788] bg-white rounded-t-lg shadow-xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Varianti & Giacenze ({formData.variants.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PHOTOS & GALLERY */}
          {activeTab === "photos" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Primary Packshot Preview */}
                <div className="md:col-span-4 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Packshot Principale</span>
                  </div>
                  <div className="relative w-full aspect-square bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex items-center justify-center">
                    <Image
                      src={formData.images[0] || "/brand/logo.png"}
                      alt="Anteprima principale"
                      fill
                      sizes="240px"
                      className="object-contain p-2"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Questa è l&apos;immagine visualizzata come copertina nel catalogo e nello storefront.
                  </p>
                </div>

                {/* Upload & Add URL Controls */}
                <div className="md:col-span-8 space-y-4">
                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3">
                    <div className="text-xs font-bold text-[#5E1788] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D462A6]" />
                      <span>Carica Nuova Foto o Aggiungi da URL</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* File Upload (WebP Auto-Compressed) */}
                      <label className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${isProcessingImage ? 'border-purple-400 bg-purple-50/50' : 'border-purple-300 hover:border-[#5E1788] bg-white'} rounded-xl cursor-pointer transition-colors text-center group`}>
                        <Upload className={`w-5 h-5 ${isProcessingImage ? 'text-[#D462A6] animate-bounce' : 'text-[#5E1788] group-hover:scale-110'} transition-transform mb-1`} />
                        <span className="text-xs font-semibold text-gray-700">
                          {isProcessingImage ? "Compressione WebP..." : "Carica File Immagine"}
                        </span>
                        <span className="text-[10px] text-gray-400">WebP, PNG, JPG (Auto-ottimizzato)</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isProcessingImage}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* URL Input */}
                      <div className="flex flex-col justify-between p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <span className="text-xs font-semibold text-gray-700">Inserisci URL Immagine:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="https://..."
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#5E1788]"
                          />
                          <button
                            type="button"
                            onClick={handleAddImageUrl}
                            className="px-3 py-1.5 bg-[#5E1788] text-white text-xs font-semibold rounded-lg hover:bg-[#7A3293] transition-colors"
                          >
                            Aggiungi
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gallery Grid */}
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      Gallery Immagini Prodotto ({formData.images.length})
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {formData.images.map((img, idx) => {
                        const isPrimary = idx === 0;
                        return (
                          <div
                            key={idx}
                            className={`group relative bg-white rounded-xl border p-2 flex flex-col items-center gap-2 transition-all ${
                              isPrimary
                                ? "border-[#5E1788] ring-2 ring-[#5E1788]/20 shadow-xs"
                                : "border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                              <Image
                                src={img}
                                alt={`Foto ${idx + 1}`}
                                fill
                                sizes="100px"
                                className="object-contain p-1"
                              />
                              {isPrimary && (
                                <span className="absolute top-1 left-1 bg-[#5E1788] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  Packshot
                                </span>
                              )}
                            </div>

                            <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                              {!isPrimary ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryImage(idx)}
                                  className="text-[10px] text-gray-500 hover:text-[#5E1788] font-medium transition-colors"
                                  title="Imposta come principale"
                                >
                                  Fai principale
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-semibold">
                                  Principale
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Rimuovi immagine"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEXTS & COSMETIC SHEET */}
          {activeTab === "texts" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* E-Commerce Visibility / Solo Locale Banner Toggle */}
              <div className="p-3.5 bg-[#FAF7FC] rounded-2xl border border-purple-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {formData.isLocalOnly ? (
                      <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-[#1F1B24]">
                      {formData.isLocalOnly
                        ? "Vendita Esclusiva in Negozio Fisico (Nascosto online)"
                        : "Visibile su E-commerce e in Negozio"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {formData.isLocalOnly
                      ? "Il prodotto non compare nel catalogo pubblico e non può essere acquistato online dai clienti."
                      : "Il prodotto è normalmente acquistabile sia online sullo storefront che alla cassa del negozio."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, isLocalOnly: !prev.isLocalOnly }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                    formData.isLocalOnly
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {formData.isLocalOnly ? "Pubblica su E-commerce" : "Imposta Solo Locale"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Nome Prodotto Ufficiale:
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] font-medium"
                  />
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Marchio Ufficiale:
                  </label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] bg-white font-medium"
                  >
                    {BRAND_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Categoria di Bellezza:
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value as ProductCategory }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] bg-white font-medium"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base Retail Price */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Prezzo al Pubblico Base (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] font-bold"
                  />
                </div>

                {/* Short Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Sottotitolo / Breve Snippet:
                  </label>
                  <input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
                    }
                    placeholder="Es: Finish opaco a lunga tenuta"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788]"
                  />
                </div>
              </div>

              {/* Full Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Descrizione Editoriale Completa:
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* How to use */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Modo d&apos;Uso & Consigli della MUA:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.howToUse}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, howToUse: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] leading-relaxed"
                  />
                </div>

                {/* Formula & Benefits */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Formula, Texture & Benefici:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.formulaBenefits}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, formulaBenefits: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#5E1788] leading-relaxed"
                  />
                </div>
              </div>

              {/* INCI */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  INCI Completo (Lista Ingredienti):
                </label>
                <textarea
                  rows={2}
                  value={formData.inci}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, inci: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-[11px] font-mono text-gray-700 focus:outline-none focus:border-[#5E1788] leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: VARIANTS, CODES & STOCK */}
          {activeTab === "variants" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-800">
                    Elenco Varianti, Tonalità & Barcode
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Gestisci SKU, EAN, colore e giacenza di magazzino in tempo reale.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-3 py-1.5 bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Tonalità</span>
                </button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-gray-100 bg-white">
                {formData.variants.map((v, idx) => {
                  const qty = v.stock ?? 0;
                  const status = computeStockStatus(qty);
                  // Una variante è fotografica quando manca un HEX valido oppure
                  // quando è già associata a una foto specifica. Il toggle permette
                  // comunque di alternare manualmente tra colore e foto.
                  const hasPhoto = Boolean(v.image);
                  const hasValidHex =
                    !!v.colorHex && v.colorHex !== "#---";
                  const photoMode =
                    variantPhotoMode[v.id] ?? (!hasValidHex || hasPhoto);
                  return (
                    <div
                      key={v.id || idx}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Name & Color/Photo Picker */}
                      <div className="flex items-start gap-3 sm:w-1/3">
                        <div className="relative shrink-0 pt-0.5">
                          {photoMode ? (
                            <button
                              type="button"
                              onClick={() => handleViewVariantImage(v.image)}
                              className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[#D8C2E7] bg-[#FAF7FC] group/img"
                              title="Vedi foto variante"
                            >
                              <Image
                                src={
                                  v.image ||
                                  formData.images[0] ||
                                  "/brand/logo.png"
                                }
                                alt={v.name || "Variante"}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                              <span className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="w-3.5 h-3.5 text-white" />
                              </span>
                            </button>
                          ) : (
                            <input
                              type="color"
                              value={v.colorHex || "#D8C2E7"}
                              onChange={(e) =>
                                handleVariantChange(idx, "colorHex", e.target.value)
                              }
                              className="w-8 h-8 rounded-full border border-gray-300 p-0 cursor-pointer overflow-hidden"
                              title="Scegli colore tonalità"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) =>
                              handleVariantChange(idx, "name", e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#5E1788]"
                            placeholder="Nome tonalità"
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 font-mono">
                              ID: {v.id.slice(-8)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {photoMode
                                ? hasPhoto
                                  ? "FOTO"
                                  : "#---"
                                : v.colorHex || "#---"}
                            </span>
                          </div>

                          {/* Toggle HEX / Foto Variante */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setVariantPhotoMode((prev) => ({
                                  ...prev,
                                  [v.id]: false,
                                }))
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors ${
                                !photoMode
                                  ? "bg-[#5E1788] text-white border-[#5E1788]"
                                  : "bg-white text-gray-500 border-gray-200 hover:border-[#D8C2E7]"
                              }`}
                            >
                              Colore HEX
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setVariantPhotoMode((prev) => ({
                                  ...prev,
                                  [v.id]: true,
                                }))
                              }
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors flex items-center gap-1 ${
                                photoMode
                                  ? "bg-[#5E1788] text-white border-[#5E1788]"
                                  : "bg-white text-gray-500 border-gray-200 hover:border-[#D8C2E7]"
                              }`}
                            >
                              <Camera className="w-3 h-3" />
                              Foto
                            </button>
                          </div>

                          {/* Foto Variante: anteprima + URL immagine */}
                          {photoMode && (
                            <>
                              <input
                                type="text"
                                value={v.image || ""}
                                onChange={(e) =>
                                  handleVariantChange(idx, "image", e.target.value)
                                }
                                className="w-full mt-1.5 px-2 py-1 border border-gray-200 rounded-lg text-[10px] font-mono text-gray-600 focus:outline-none focus:border-[#5E1788]"
                                placeholder="URL immagine variante"
                              />
                              {hasPhoto && (
                                <button
                                  type="button"
                                  onClick={() => handleViewVariantImage(v.image)}
                                  className="mt-1 text-[10px] text-[#5E1788] hover:underline font-medium"
                                >
                                  Vedi foto
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* SKU & EAN */}
                      <div className="grid grid-cols-2 gap-2 sm:w-1/4">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase font-semibold">
                            SKU
                          </label>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) =>
                              handleVariantChange(idx, "sku", e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-[11px] font-mono text-gray-700 focus:outline-none focus:border-[#5E1788]"
                            placeholder="SKU"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase font-semibold">
                            EAN-13
                          </label>
                          <input
                            type="text"
                            value={v.ean || ""}
                            onChange={(e) =>
                              handleVariantChange(idx, "ean", e.target.value)
                            }
                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-[11px] font-mono text-gray-700 focus:outline-none focus:border-[#5E1788]"
                            placeholder="EAN"
                          />
                        </div>
                      </div>

                      {/* Price (€) */}
                      <div className="sm:w-20">
                        <label className="block text-[10px] text-gray-400 uppercase font-semibold">
                          Prezzo (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.price ?? formData.price}
                          onChange={(e) =>
                            handleVariantChange(idx, "price", parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-[#5E1788]"
                        />
                      </div>

                      {/* Stock Stepper & Status Badge */}
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 uppercase font-semibold">
                            Giacenza
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleVariantStockStep(idx, -1)}
                              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              onChange={(e) =>
                                handleVariantChange(
                                  idx,
                                  "stock",
                                  Math.max(0, parseInt(e.target.value, 10) || 0)
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center border border-gray-200 rounded-lg text-xs font-bold text-gray-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleVariantStockStep(idx, 1)}
                              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="pt-3">
                          {status === "available" && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Disponibile
                            </span>
                          )}
                          {status === "low_stock" && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              Qtà bassa
                            </span>
                          )}
                          {status === "out_of_stock" && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Esaurito
                            </span>
                          )}
                        </div>

                        {/* Remove variant */}
                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Elimina variante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            {errorMessage ? (
              <span className="text-red-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                {errorMessage}
              </span>
            ) : saveSuccess ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Modifiche salvate con successo!
              </span>
            ) : (
              <span>Le modifiche si riflettono all&apos;istante sia in admin che sul frontend.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
            >
              Annulla
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] hover:shadow-md text-white text-xs font-semibold transition-all flex items-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Salvato!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salva Tutte le Modifiche</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
