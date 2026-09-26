"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Barcode,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Save,
  Tag,
  CreditCard,
  Banknote,
  Printer,
  ShoppingBag,
  Loader2,
  Coins,
  Unlock,
  Camera,
  Pencil,
  Check,
  BadgePercent,
  Link as LinkIcon,
  Sparkles,
  Receipt,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import rawCatalog from "@/data/catalog.json";
import { Product, ProductCategory } from "@/types/product";
import {
  getAdminStoreState,
  updateProductDetails,
  createAdminOrder,
} from "@/lib/adminStore";
import { logAdminActivity, logAdminError } from "@/lib/auditLogger";
import { resolveProductImageUrl } from "@/lib/r2";

interface QuickScanBarcodeModalProps {
  onOpenManualOrderWithItem?: (item: {
    productId: string;
    variantId: string;
    productName: string;
    variantName?: string;
    sku: string;
    price: number;
    image: string;
  }) => void;
}

const ALL_PRODUCTS = rawCatalog as Product[];

const DEFAULT_IMAGE = "/brand/logo.png";

/**
 * Returns a valid, non-empty image source or the brand logo fallback.
 * Guards against `undefined`, `null` and whitespace-only strings.
 */
function safeImageSrc(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return resolveProductImageUrl(candidate.trim());
    }
  }
  return DEFAULT_IMAGE;
}

/**
 * Clamps an arbitrary index inside `product.variants` so it can never point
 * outside the array (which would create a sparse array hole -> JSON `null`
 * -> `TypeError: Cannot read properties of null (reading 'id')`).
 */
function resolveVariantIndex(product: Product | null | undefined, rawIndex: number): number {
  const variants = product?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return 0;
  if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex >= variants.length) return 0;
  return rawIndex;
}

/**
 * Maps a shade (tonalità) to the index of its matching variant. The historical
 * bug used the shade index directly as a variant index: for products with one
 * variant and many shades this produced out-of-bounds writes and array holes.
 * Resolution order: exact variant id -> EAN/SKU code -> matching name -> clamp.
 */
function resolveShadeVariantIndex(product: Product, shadeIndex: number): number {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const shade = product.shades?.[shadeIndex];

  if (shade && variants.length > 0) {
    const byId = variants.findIndex((v) => v?.id && shade.id && v.id === shade.id);
    if (byId !== -1) return byId;

    const shadeCode = shade.code?.trim().toUpperCase();
    if (shadeCode) {
      const byCode = variants.findIndex(
        (v) =>
          (v?.ean && v.ean.trim().toUpperCase() === shadeCode) ||
          (v?.sku && v.sku.trim().toUpperCase() === shadeCode)
      );
      if (byCode !== -1) return byCode;
    }

    const shadeName = shade.name?.trim().toLowerCase();
    if (shadeName) {
      const byName = variants.findIndex(
        (v) => v?.name && v.name.trim().toLowerCase() === shadeName
      );
      if (byName !== -1) return byName;
    }
  }

  return resolveVariantIndex(product, shadeIndex);
}

type DiscountMode = "none" | "percent" | "amount";

type ToastType = "success" | "error" | "info";

interface ScanToast {
  type: ToastType;
  message: string;
}

/** Crea un messaggio toast tipizzato (default: success). */
function makeToast(message: string, type: ToastType = "success"): ScanToast {
  return { type, message };
}

/** Classi Tailwind del contenitore toast in base al tipo (success/info/error). */
function toastContainerClass(type: ToastType): string {
  if (type === "error") return "bg-rose-50 border-rose-300 text-rose-800";
  if (type === "info") return "bg-blue-50 border-blue-200 text-blue-800";
  return "bg-emerald-50 border-emerald-200 text-emerald-800";
}

/** Icona coerente con il tipo di toast. */
function ToastIcon({ type }: { type: ToastType }) {
  if (type === "error") return <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />;
  if (type === "info") return <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
}

export interface MultiCartItem {
  id: string;
  productId: string;
  variantIndex: number;
  productName: string;
  variantName?: string;
  brand: string;
  sku: string;
  ean?: string;
  image: string;
  originalUnitPrice: number;
  unitPrice: number;
  discountMode: DiscountMode;
  discountPercent: number;
  discountAmount: number;
  finalUnitPrice: number;
  quantity: number;
}

/**
 * Generates an instant synthetic pos audio beep using the Web Audio API
 */
function playPosBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio errors silently
  }
}

/**
 * Computes the absolute discount amount (in €) to subtract from a base price,
 * clamped to the base price itself so the final total never goes negative.
 */
function computeDiscountAmount(
  basePrice: number,
  mode: DiscountMode,
  percent: number,
  amount: number
): number {
  if (!basePrice || basePrice <= 0 || mode === "none") return 0;
  let d = 0;
  if (mode === "percent") d = basePrice * ((percent || 0) / 100);
  else if (mode === "amount") d = amount || 0;
  if (!isFinite(d) || d < 0) d = 0;
  return Math.min(d, basePrice);
}

/**
 * Reads an image File and returns a resized base64 data URL (max edge = maxSize),
 * keeping localStorage / cloud payloads small and safe for the QuotaExceeded limit.
 */
function fileToResizedDataUrl(file: File, maxSize = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser non disponibile"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lettura del file non riuscita"));
    reader.onload = () => {
      const rawSrc = reader.result as string;
      const img = new window.Image();
      img.onerror = () => reject(new Error("Formato immagine non valido"));
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (!width || !height) {
            resolve(rawSrc);
            return;
          }
          if (width > maxSize || height > maxSize) {
            if (width >= height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawSrc);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(rawSrc);
        }
      };
      img.src = rawSrc;
    };
    reader.readAsDataURL(file);
  });
}

export default function QuickScanBarcodeModal({}: QuickScanBarcodeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const [activeScreen, setActiveScreen] = useState<"scan" | "multi_receipt">("scan");
  const activeScreenRef = useRef<"scan" | "multi_receipt">("scan");
  const handleCloseModalRef = useRef<() => void>(() => {});

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);

  // Multi-item cart state with localStorage persistence
  const [multiCartItems, setMultiCartItems] = useState<MultiCartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("scelta_makeup_multi_receipt_cart_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage & window event in sync
  useEffect(() => {
    try {
      localStorage.setItem("scelta_makeup_multi_receipt_cart_v1", JSON.stringify(multiCartItems));
      window.dispatchEvent(
        new CustomEvent("multi_receipt_cart_updated", { detail: multiCartItems.length })
      );
    } catch (e) {
      console.warn("Error saving multi-receipt cart", e);
    }
  }, [multiCartItems]);

  // Inline editing state for items in multi-receipt cart
  const [editingMultiItemId, setEditingMultiItemId] = useState<string | null>(null);
  const [editingMultiField, setEditingMultiField] = useState<"title" | "price" | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>("");

  const handleStartEditMultiItem = (item: MultiCartItem, field: "title" | "price") => {
    setEditingMultiItemId(item.id);
    setEditingMultiField(field);
    setTempEditValue(field === "title" ? item.productName : item.unitPrice.toFixed(2));
  };

  const handleCommitEditMultiItem = () => {
    if (!editingMultiItemId || !editingMultiField) return;
    if (editingMultiField === "title") {
      const trimmed = tempEditValue.trim();
      if (trimmed) {
        setMultiCartItems((prev) =>
          prev.map((it) => (it.id === editingMultiItemId ? { ...it, productName: trimmed } : it))
        );
      }
    } else if (editingMultiField === "price") {
      const num = parseFloat(tempEditValue.replace(",", "."));
      if (!isNaN(num) && num >= 0) {
        const safePrice = Math.round(num * 100) / 100;
        setMultiCartItems((prev) =>
          prev.map((it) =>
            it.id === editingMultiItemId
              ? {
                  ...it,
                  unitPrice: safePrice,
                  originalUnitPrice: safePrice,
                  finalUnitPrice: safePrice,
                }
              : it
          )
        );
      }
    }
    setEditingMultiItemId(null);
    setEditingMultiField(null);
    setTempEditValue("");
  };

  const handleCancelEditMultiItem = () => {
    setEditingMultiItemId(null);
    setEditingMultiField(null);
    setTempEditValue("");
  };

  // Multi-receipt Global Discount State
  const [multiDiscountMode, setMultiDiscountMode] = useState<"none" | "percent" | "amount" | "custom_final">("none");
  const [multiDiscountPercent, setMultiDiscountPercent] = useState<number>(0);
  const [multiDiscountAmount, setMultiDiscountAmount] = useState<number>(0);
  const [multiCustomFinal, setMultiCustomFinal] = useState<string>("");

  const multiGrossTotal = useMemo(() => {
    return multiCartItems.reduce((sum, item) => sum + (item.unitPrice || item.finalUnitPrice) * item.quantity, 0);
  }, [multiCartItems]);

  const multiDiscountTotal = useMemo(() => {
    if (multiDiscountMode === "none" || multiGrossTotal <= 0) return 0;
    if (multiDiscountMode === "percent") {
      return Math.min(multiGrossTotal, (multiGrossTotal * multiDiscountPercent) / 100);
    }
    if (multiDiscountMode === "amount") {
      return Math.min(multiGrossTotal, multiDiscountAmount);
    }
    if (multiDiscountMode === "custom_final") {
      const finalNum = parseFloat(multiCustomFinal.replace(",", ".")) || multiGrossTotal;
      return Math.max(0, Math.min(multiGrossTotal, multiGrossTotal - finalNum));
    }
    return 0;
  }, [multiDiscountMode, multiGrossTotal, multiDiscountPercent, multiDiscountAmount, multiCustomFinal]);

  const multiTotal = useMemo(() => {
    return Math.max(0, Math.round((multiGrossTotal - multiDiscountTotal) * 100) / 100);
  }, [multiGrossTotal, multiDiscountTotal]);

  const multiItemsCount = useMemo(() => {
    return multiCartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [multiCartItems]);

  // Scaled items with proportional discount distributed to each item
  const multiItemsWithDiscount = useMemo(() => {
    if (multiCartItems.length === 0) return [];
    if (multiDiscountTotal <= 0 || multiGrossTotal <= 0) {
      return multiCartItems.map((it) => ({
        ...it,
        finalUnitPrice: it.unitPrice || it.finalUnitPrice,
      }));
    }
    const ratio = 1 - multiDiscountTotal / multiGrossTotal;
    let runningTotal = 0;
    return multiCartItems.map((it, idx) => {
      const baseP = it.unitPrice || it.finalUnitPrice;
      let discountedUnitPrice = Math.max(0, Math.round(baseP * ratio * 100) / 100);
      if (idx === multiCartItems.length - 1 && it.quantity > 0) {
        const neededTotal = multiTotal - runningTotal;
        discountedUnitPrice = Math.max(0, Math.round((neededTotal / it.quantity) * 100) / 100);
      } else {
        runningTotal += discountedUnitPrice * it.quantity;
      }
      return {
        ...it,
        finalUnitPrice: discountedUnitPrice,
      };
    });
  }, [multiCartItems, multiDiscountTotal, multiGrossTotal, multiTotal]);

  const [multiPaymentMethod, setMultiPaymentMethod] = useState<"card" | "cash">("cash");
  const [multiCashTendered, setMultiCashTendered] = useState<string>("");
  const [isMultiCheckingOut, setIsMultiCheckingOut] = useState(false);

  useEffect(() => {
    // Sincronizza il contante proposto quando cambia il totale dello scontrino.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (multiTotal > 0 && (!multiCashTendered || parseFloat(multiCashTendered) < multiTotal)) {
      setMultiCashTendered(multiTotal.toFixed(2));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [multiTotal, multiCashTendered]);

  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [matchedVariantIndex, setMatchedVariantIndex] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [isStockUpdating, setIsStockUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState<ScanToast | null>(null);

  // In-Store Fast Checkout State (Single item)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"card" | "cash">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Quick Registration Form for Unrecognized Barcode
  const [newProdName, setNewProdName] = useState("");
  const [newProdBrand, setNewProdBrand] = useState("Eveline Cosmetics");
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>("Skincare & Dermo");
  const [newProdPrice, setNewProdPrice] = useState("11.90");
  const [newProdStock, setNewProdStock] = useState("3");
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [manualSearchInput, setManualSearchInput] = useState("");

  // Photo Editing (product / variant image)
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");

  // Live Cloud Synchronization Status
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
  const cloudSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const markCloudSaved = useCallback(() => {
    setCloudSyncStatus("saved");
    if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    cloudSyncTimerRef.current = setTimeout(() => {
      setCloudSyncStatus("idle");
    }, 2800);
  }, []);

  // Title Editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");

  // Base List Price Direct Editing & Instant Cloud Auto-Sync
  const [priceEditValue, setPriceEditValue] = useState("");
  const [, setIsUpdatingPrice] = useState(false);
  const priceDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estemporaneous Counter Discount (current sale only)
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customPercent, setCustomPercent] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customFinal, setCustomFinal] = useState("");

  // Lookup function for barcode in catalog and store overrides
  // Lookup function for barcode in catalog and store overrides
  const findProductByBarcode = useCallback((barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return null;
    const cleanUpper = clean.toUpperCase();

    const state = getAdminStoreState();
    const overrides = state.productOverrides || {};

    // Multi-candidate scanner tolerance (12-digit UPC, leading 0, or leading 8 on Italian barcodes)
    const candidates = [cleanUpper];
    if (/^\d{12}$/.test(cleanUpper)) {
      candidates.push("0" + cleanUpper);
      candidates.push("8" + cleanUpper);
    } else if (/^\d{13}$/.test(cleanUpper)) {
      candidates.push(cleanUpper.slice(1));
    }

    for (const code of candidates) {
      // 1. Search in product overrides (including quick-registered products)
      for (const [prodId, override] of Object.entries(overrides)) {
        if (override.variants) {
          const vIdx = override.variants.findIndex(
            (v) =>
              (v?.ean && v.ean.trim().toUpperCase() === code) ||
              (v?.sku && v.sku.trim().toUpperCase() === code)
          );
          if (vIdx !== -1) {
            const baseProd = ALL_PRODUCTS.find((p) => p.id === prodId);
            if (baseProd) {
              const merged = { ...baseProd, ...override };
              return { product: merged, variantIndex: resolveVariantIndex(merged, vIdx) };
            }
            if (override.name && override.variants) {
              const merged = override as Product;
              return { product: merged, variantIndex: resolveVariantIndex(merged, vIdx) };
            }
          }
        }
      }

      // 2. Search in raw catalog variants & shades
      for (const product of ALL_PRODUCTS) {
        if (product.variants) {
          const vIdx = product.variants.findIndex(
            (v) =>
              (v?.ean && v.ean.trim().toUpperCase() === code) ||
              (v?.sku && v.sku.trim().toUpperCase() === code)
          );
          if (vIdx !== -1) {
            const override = overrides[product.id];
            const merged = override ? { ...product, ...override } : product;
            return {
              product: merged,
              variantIndex: resolveVariantIndex(merged, vIdx),
            };
          }
        }

        if (product.shades) {
          const sIdx = product.shades.findIndex(
            (s) => s?.code && s.code.trim().toUpperCase() === code
          );
          if (sIdx !== -1) {
            const override = overrides[product.id];
            const merged = override ? { ...product, ...override } : product;
            // NEVER use the shade index directly: map it to a real variant index.
            return {
              product: merged,
              variantIndex: resolveShadeVariantIndex(merged, sIdx),
            };
          }
        }
      }

      // 3. Search in synchronized variantStocks
      for (const vStock of Object.values(state.variantStocks || {})) {
        if (
          (vStock.ean && vStock.ean.trim().toUpperCase() === code) ||
          (vStock.sku && vStock.sku.trim().toUpperCase() === code)
        ) {
          const prod = ALL_PRODUCTS.find((p) => p.id === vStock.productId);
          if (prod) {
            const merged = overrides[prod.id] ? { ...prod, ...overrides[prod.id] } : prod;
            const vIdx = (merged.variants || []).findIndex((v) => v?.id === vStock.variantId);
            return {
              product: merged,
              variantIndex: resolveVariantIndex(merged, vIdx),
            };
          }
          const ovProd = overrides[vStock.productId];
          if (ovProd && ovProd.name) {
            const merged = ovProd as Product;
            const vIdx = (merged.variants || []).findIndex((v) => v?.id === vStock.variantId);
            return {
              product: merged,
              variantIndex: resolveVariantIndex(merged, vIdx),
            };
          }
        }
      }
    }

    // 4. Direct match in overrides by product ID or slug
    for (const [prodId, override] of Object.entries(overrides)) {
      if (prodId.toUpperCase() === cleanUpper || (override.slug && override.slug.toUpperCase() === cleanUpper)) {
        return { product: override as Product, variantIndex: 0 };
      }
    }

    // 5. Direct match in raw catalog by product ID or slug
    const directProd = ALL_PRODUCTS.find(
      (p) => p.id.toUpperCase() === cleanUpper || p.slug.toUpperCase() === cleanUpper
    );
    if (directProd) {
      const override = overrides[directProd.id];
      return {
        product: override ? { ...directProd, ...override } : directProd,
        variantIndex: 0,
      };
    }

    return null;
  }, []);

  // Sync current stock, price edit value & title when matched product/variant changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (matchedProduct) {
      if (matchedProduct.variants) {
        const v = matchedProduct.variants[matchedVariantIndex];
        if (v) {
          const state = getAdminStoreState();
          const vStock = state.variantStocks[v.id];
          setCurrentStock(vStock ? vStock.stockQuantity : (v.stock ?? 0));
        }
      }
      const v = matchedProduct.variants?.[matchedVariantIndex];
      const p = (v?.price ?? matchedProduct.price) || 0;
      setPriceEditValue(p > 0 ? p.toFixed(2) : "");
      setTitleEditValue(matchedProduct.name);
      setIsEditingTitle(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [matchedProduct, matchedVariantIndex]);

  // Handle Barcode Scan from any hardware reader or manual trigger
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode || cleanCode.length < 3) return;

      setScannedBarcode(cleanCode);
      const match = findProductByBarcode(cleanCode);

      // ONLY if Federica is ALREADY ON the multi-receipt screen, add item directly to cart
      const isCurrentlyInMultiReceipt = isOpenRef.current && activeScreenRef.current === "multi_receipt";

      if (match) {
        playPosBeep();
        if (isCurrentlyInMultiReceipt) {
          const v = match.product.variants?.[match.variantIndex];
          const itemPrice = (v?.price ?? match.product.price) || 1.0;
          const itemId = `${match.product.id}-${match.variantIndex}-${itemPrice.toFixed(2)}`;

          setMultiCartItems((prev) => {
            const idx = prev.findIndex((it) => it.id === itemId);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
              return next;
            }
            return [
              ...prev,
              {
                id: itemId,
                productId: match.product.id,
                variantIndex: match.variantIndex,
                productName: match.product.name,
                variantName: v?.name && v.name !== "Standard" ? v.name : undefined,
                brand: match.product.brand,
                sku: v?.sku || match.product.id,
                ean: v?.ean,
                image: safeImageSrc(v?.image, match.product.images?.[0]),
                originalUnitPrice: itemPrice,
                unitPrice: itemPrice,
                discountMode: "none",
                discountPercent: 0,
                discountAmount: 0,
                finalUnitPrice: itemPrice,
                quantity: 1,
              },
            ];
          });
          setSuccessToast(makeToast(`➕ "${match.product.name.slice(0, 24)}..." aggiunto allo scontrino multiplo!`));
          setTimeout(() => setSuccessToast(null), 2500);
          setIsOpen(true);
          isOpenRef.current = true;
          return;
        }

        // Federica is anywhere else in the gestionale or modal was closed: ALWAYS open single product popup!
        setActiveScreen("scan");
        activeScreenRef.current = "scan";
        setMatchedProduct(match.product);
        setMatchedVariantIndex(match.variantIndex);
        const itemPrice = (match.product.variants?.[match.variantIndex]?.price ?? match.product.price) || 1.0;
        setCashTendered(itemPrice.toFixed(2));
        setPriceEditValue(itemPrice.toFixed(2));
        setTitleEditValue(match.product.name);

        logAdminActivity({
          category: "barcode",
          action: "scan_success",
          title: "Scansione Barcode",
          description: `Codice ${cleanCode} riconosciuto → "${match.product.name}"${
            match.product.variants?.[match.variantIndex]?.name &&
            match.product.variants[match.variantIndex].name !== "Standard"
              ? ` (${match.product.variants[match.variantIndex].name})`
              : ""
          } — €${itemPrice.toFixed(2)}`,
          details: {
            barcode: cleanCode,
            productId: match.product.id,
            productName: match.product.name,
            brand: match.product.brand,
            variantIndex: match.variantIndex,
            variantName: match.product.variants?.[match.variantIndex]?.name,
            sku: match.product.variants?.[match.variantIndex]?.sku,
            ean: match.product.variants?.[match.variantIndex]?.ean,
            price: itemPrice,
          },
        });
      } else {
        // Barcode non riconosciuto: apri sempre la schermata di registrazione rapido
        setActiveScreen("scan");
        activeScreenRef.current = "scan";
        setMatchedProduct(null);
        setMatchedVariantIndex(0);
        setNewProdName("");
        setNewProdPrice("11.90");
        setNewProdStock("3");
        setCashTendered("11.90");
        setPriceEditValue("11.90");
        setTitleEditValue("");

        logAdminActivity({
          category: "barcode",
          action: "scan_not_found",
          title: "Barcode Non Riconosciuto",
          description: `Letto codice ${cleanCode}: nessun prodotto associato nel catalogo (aperta registrazione)`,
          details: { barcode: cleanCode },
        });
      }

      // Reset any in-progress photo / price / discount editing for the new scan
      setIsEditingTitle(false);
      setShowUrlInput(false);
      setImageUrlInput("");
      setDiscountMode("none");
      setDiscountPercent(0);
      setDiscountAmount(0);
      setCustomPercent("");
      setCustomAmount("");
      setCustomFinal("");

      setIsOpen(true);
      isOpenRef.current = true;
      setSuccessToast(null);
    },
    [findProductByBarcode]
  );

  // Add current active product to Multi-Receipt cart
  const handleAddToMultiReceipt = useCallback(() => {
    if (!matchedProduct) return;
    const v = matchedProduct.variants?.[matchedVariantIndex];
    const basePrice = (v?.price ?? matchedProduct.price) || 0;
    const discountApplied = computeDiscountAmount(basePrice, discountMode, discountPercent, discountAmount);
    const finalPrice = Math.max(0, Math.round((basePrice - discountApplied) * 100) / 100);

    const itemId = `${matchedProduct.id}-${matchedVariantIndex}-${finalPrice.toFixed(2)}`;

    setMultiCartItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.id === itemId);
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        };
        return next;
      }

      const newItem: MultiCartItem = {
        id: itemId,
        productId: matchedProduct.id,
        variantIndex: matchedVariantIndex,
        productName: matchedProduct.name,
        variantName: v?.name && v.name !== "Standard" ? v.name : undefined,
        brand: matchedProduct.brand,
        sku: v?.sku || matchedProduct.id,
        ean: v?.ean,
        image: safeImageSrc(v?.image, matchedProduct.images?.[0]),
        originalUnitPrice: basePrice,
        unitPrice: basePrice,
        discountMode,
        discountPercent,
        discountAmount,
        finalUnitPrice: finalPrice,
        quantity: 1,
      };
      return [...prev, newItem];
    });

    playPosBeep();
    setSuccessToast(makeToast(`➕ "${matchedProduct.name.slice(0, 24)}..." aggiunto allo scontrino multiplo!`));
    setTimeout(() => {
      setSuccessToast(null);
    }, 2500);
  }, [matchedProduct, matchedVariantIndex, discountMode, discountPercent, discountAmount]);

  const handleUpdateMultiItemQty = (itemId: string, delta: number) => {
    setMultiCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as MultiCartItem[];
    });
  };

  const handleRemoveMultiItem = (itemId: string) => {
    setMultiCartItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleClearMultiReceipt = () => {
    if (confirm("Vuoi davvero svuotare tutti i prodotti dallo scontrino multiplo?")) {
      setMultiCartItems([]);
      setMultiDiscountMode("none");
      setMultiDiscountPercent(0);
      setMultiDiscountAmount(0);
      setMultiCustomFinal("");
      localStorage.removeItem("scelta_makeup_multi_receipt_cart_v1");
      setSuccessToast(makeToast("Scontrino multiplo svuotato."));
      setTimeout(() => setSuccessToast(null), 1800);
    }
  };

  // Checkout and emit fiscal receipt with ALL items in multi-receipt cart
  const handleMultiReceiptCheckout = async () => {
    if (multiCartItems.length === 0) return;
    setIsMultiCheckingOut(true);

    try {
      const cashNum = parseFloat(multiCashTendered.replace(",", ".")) || multiTotal;
      const effectivePayment = multiPaymentMethod === "cash" && cashNum >= multiTotal ? cashNum : multiTotal;
      const change = Math.max(0, effectivePayment - multiTotal);

      // 1. Decrement stock for all items
      const state = getAdminStoreState();
      const overrides = state.productOverrides || {};

      for (const item of multiCartItems) {
        const prod = ALL_PRODUCTS.find((p) => p.id === item.productId);
        const currentProd = overrides[item.productId] ? { ...prod, ...overrides[item.productId] } : prod;
        if (currentProd && currentProd.variants) {
          const updatedVariants = [...currentProd.variants];
          const v = updatedVariants[item.variantIndex];
          if (v) {
            const currentQty = v.stock ?? 0;
            const newQty = Math.max(0, currentQty - item.quantity);
            updatedVariants[item.variantIndex] = {
              ...v,
              stock: newQty,
              inStock: newQty > 0,
            };
            updateProductDetails(item.productId, {
              variants: updatedVariants,
              stock: updatedVariants.reduce((sum, it) => sum + (it?.stock || 0), 0),
              inStock: updatedVariants.some((it) => (it?.stock || 0) > 0),
            });
          }
        }
      }

      // 2. Emit SOAP XML to Cassa RT (Epson FP-81II RT on 192.168.68.63)
      const itemsXml = multiItemsWithDiscount
        .map((item) => {
          const rawDesc = (
            item.productName +
            (item.variantName && item.variantName !== "Standard" ? ` ${item.variantName}` : "")
          ).slice(0, 22);
          const cleanDesc = rawDesc
            .replace(/&/g, " e ")
            .replace(/[<>"']/g, "");
          const priceFormatted = item.finalUnitPrice.toFixed(2);
          return `<printRecItem operator="1" description="${cleanDesc}" quantity="${item.quantity}" unitPrice="${priceFormatted}" department="1" />`;
        })
        .join("\n      ");

      const paymentFormatted = effectivePayment.toFixed(2);
      const fiscalReceiptXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerFiscalReceipt>
      <beginFiscalReceipt operator="1" />
      ${itemsXml}
      <printRecTotal operator="1" description="${multiPaymentMethod === "card" ? "CARTA" : "CONTANTI"}" payment="${paymentFormatted}" paymentType="${multiPaymentMethod === "card" ? "1" : "0"}" />
      <endFiscalReceipt operator="1" />
    </printerFiscalReceipt>
  </soapenv:Body>
</soapenv:Envelope>`;

      try {
        await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=10000", {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=utf-8" },
          body: fiscalReceiptXml,
        });

        if (multiPaymentMethod === "cash") {
          const drawerKickXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <openDrawer />
  </soapenv:Body>
</soapenv:Envelope>`;
          try {
            await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=5000", {
              method: "POST",
              headers: { "Content-Type": "text/xml; charset=utf-8" },
              body: drawerKickXml,
            });
          } catch (dErr) {
            console.warn("[Cassa RT] Trigger apertura cassetto:", dErr);
          }
        }
      } catch (hardwareErr) {
        console.warn("[Cassa RT] Stampa hardware:", hardwareErr);
      }

      // 3. Record verified in-store order with cloud synchronization
      createAdminOrder({
        customerName: "Cliente al Banco",
        customerEmail: "banco@sceltamakeup.it",
        customerPhone: "Vendita Diretta Salone (Cassa RT)",
        total: multiTotal,
        status: "completed",
        fulfillmentType: "pos_receipt",
        paymentMethod: multiPaymentMethod,
        change: multiPaymentMethod === "cash" && change > 0 ? change : undefined,
        items: multiItemsWithDiscount.map((item) => ({
          productId: item.productId,
          productTitle: item.productName,
          variantName: item.variantName && item.variantName !== "Standard" ? item.variantName : undefined,
          quantity: item.quantity,
          price: item.finalUnitPrice,
          image: item.image,
        })),
      });

      logAdminActivity({
        category: "cassa_rt",
        action: "fiscal_receipt_multi",
        title: "Emissione Scontrino Multiplo RT",
        description: `Scontrino fiscale multiplo RT: ${multiItemsCount} ${
          multiItemsCount === 1 ? "articolo" : "articoli"
        } — totale €${multiTotal.toFixed(2)} (${
          multiPaymentMethod === "card" ? "Carta POS" : "Contanti"
        })${multiDiscountTotal > 0.001 ? ` — sconto applicato €${multiDiscountTotal.toFixed(2)}` : ""}${
          multiPaymentMethod === "cash" && change > 0 ? ` — resto €${change.toFixed(2)}` : ""
        }`,
        details: {
          total: multiTotal,
          grossTotal: multiGrossTotal,
          discount: multiDiscountTotal,
          paymentMethod: multiPaymentMethod,
          itemsCount: multiItemsCount,
          linesCount: multiCartItems.length,
          change,
          tipoScontrino: "Fiscale (RT)",
          items: multiItemsWithDiscount.map((it) => ({
            productId: it.productId,
            name: it.productName,
            variant: it.variantName,
            quantity: it.quantity,
            unitPrice: it.finalUnitPrice,
          })),
        },
      });

      setMultiCartItems([]);
      setMultiDiscountMode("none");
      setMultiDiscountPercent(0);
      setMultiDiscountAmount(0);
      setMultiCustomFinal("");
      localStorage.removeItem("scelta_makeup_multi_receipt_cart_v1");

      setSuccessToast(
        makeToast(
          multiPaymentMethod === "cash" && change > 0
            ? `🎉 Incassato €${effectivePayment.toFixed(2)} — RESTO DA DARE: €${change.toFixed(2)} (Cassetto Aperto)`
            : `🎉 Scontrino multiplo emesso con successo! (${multiPaymentMethod === "card" ? "myPOS Carta" : "Contanti - Cassetto Aperto"}).`
        )
      );

      setTimeout(() => {
        setIsOpen(false);
        isOpenRef.current = false;
        setActiveScreen("scan");
        activeScreenRef.current = "scan";
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore";
      logAdminError({
        action: "fiscal_receipt_multi_failed",
        title: "Errore Emissione Scontrino Multiplo RT",
        description: `Emissione dello scontrino multiplo non riuscita: ${msg}`,
        error: err,
        details: {
          paymentMethod: multiPaymentMethod,
          total: multiTotal,
          grossTotal: multiGrossTotal,
          discount: multiDiscountTotal,
          itemsCount: multiItemsCount,
          linesCount: multiCartItems.length,
          barcodes: multiCartItems.map((it) => it.ean).filter(Boolean),
          items: multiCartItems.map((it) => ({
            productId: it.productId,
            name: it.productName,
            sku: it.sku,
            ean: it.ean,
            quantity: it.quantity,
            unitPrice: it.finalUnitPrice,
          })),
          printer: "Epson FP-81II RT (192.168.68.63)",
        },
      });
      alert("Errore durante l'emissione dello scontrino multiplo: " + msg);
    } finally {
      setIsMultiCheckingOut(false);
    }
  };

  // Dedicated 1-Click Physical Drawer Kick
  const handleOpenCashDrawerOnly = useCallback(async () => {
    const drawerKickXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <openDrawer />
  </soapenv:Body>
</soapenv:Envelope>`;
    try {
      await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=5000", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        body: drawerKickXml,
      });
      logAdminActivity({
        category: "cassa_rt",
        action: "cash_drawer_open",
        title: "Apertura Cassetto Contanti",
        description:
          "Comando di apertura cassetto rendiresto inviato alla stampante fiscale Epson FP-81II RT (192.168.68.63)",
        details: { printer: "Epson FP-81II RT", address: "192.168.68.63", command: "openDrawer" },
      });
      setSuccessToast(makeToast("🔓 Cassetto portamonete aperto con successo!"));
    } catch (err) {
      console.warn("[Cassa RT] Apertura cassetto:", err);
      setSuccessToast(makeToast("Comando apertura inviato alla cassa RT.", "info"));
    }
  }, []);

  // Custom Event Listener to trigger drawer opening from anywhere
  useEffect(() => {
    const handleDrawerEvent = () => {
      handleOpenCashDrawerOnly();
    };
    window.addEventListener("open_cash_drawer", handleDrawerEvent);
    return () => {
      window.removeEventListener("open_cash_drawer", handleDrawerEvent);
    };
  }, [handleOpenCashDrawerOnly]);

  // Custom Event Listener to trigger modal from admin header or buttons
  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const customEv = e as CustomEvent<string>;
      const code = customEv?.detail;
      setActiveScreen("scan");
      activeScreenRef.current = "scan";
      if (code) {
        handleBarcodeScanned(code);
      } else {
        setIsOpen(true);
        isOpenRef.current = true;
      }
    };

    const handleMultiOpen = () => {
      setActiveScreen("multi_receipt");
      activeScreenRef.current = "multi_receipt";
      setIsOpen(true);
      isOpenRef.current = true;
    };

    window.addEventListener("open_quick_scan_modal", handleCustomOpen);
    window.addEventListener("open_multi_receipt_modal", handleMultiOpen);
    return () => {
      window.removeEventListener("open_quick_scan_modal", handleCustomOpen);
      window.removeEventListener("open_multi_receipt_modal", handleMultiOpen);
    };
  }, [handleBarcodeScanned]);

  // Global Keydown Listener for Hardware Barcode Scanners & Keyboard Shortcuts
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Direct Keyboard Shortcuts: F2 or Ctrl+B opens barcode scanner cockpit
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "b")) {
        e.preventDefault();
        setActiveScreen("scan");
        activeScreenRef.current = "scan";
        setIsOpen(true);
        isOpenRef.current = true;
        return;
      }

      // F4 or Ctrl+M opens Multi-Receipt popup
      if (e.key === "F4" || (e.ctrlKey && e.key.toLowerCase() === "m")) {
        e.preventDefault();
        setActiveScreen("multi_receipt");
        activeScreenRef.current = "multi_receipt";
        setIsOpen(true);
        isOpenRef.current = true;
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isInput) return; // Don't intercept when user is typing in form inputs

      // Escape closes modal cleanly if open
      if (e.key === "Escape" && isOpenRef.current) {
        e.preventDefault();
        handleCloseModalRef.current();
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Allow both hardware scanners (< 60ms) and human keyboard typing (< 600ms)
      if (timeDiff > 600 && buffer.length > 0) {
        buffer = "";
      }

      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          // Hardware scanner or typed code detected!
          e.preventDefault();
          e.stopPropagation();
          const scanned = buffer;
          buffer = "";
          handleBarcodeScanned(scanned);
        } else {
          buffer = "";
        }
        return;
      }

      // Printable single characters
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleBarcodeScanned]);

  // Quick Stock Adjustment (+1 / -1) directly from the popup
  const handleAdjustStock = (delta: number) => {
    if (!matchedProduct || !matchedProduct.variants) return;
    const v = matchedProduct.variants[matchedVariantIndex];
    if (!v) return;

    setIsStockUpdating(true);
    const newQty = Math.max(0, currentStock + delta);
    setCurrentStock(newQty);

    const updatedVariants = [...matchedProduct.variants];
    updatedVariants[matchedVariantIndex] = {
      ...v,
      stock: newQty,
      inStock: newQty > 0,
    };

    setCloudSyncStatus("saving");
    updateProductDetails(matchedProduct.id, {
      variants: updatedVariants,
      stock: updatedVariants.reduce((sum, item) => sum + (item?.stock || 0), 0),
      inStock: newQty > 0,
    });
    markCloudSaved();

    logAdminActivity({
      category: "giacenza",
      action: "stock_adjust",
      title: "Rettifica Rapida Giacenza",
      description: `"${matchedProduct.name}" (${v.name || "Standard"}): scorta da ${currentStock} a ${newQty} (${delta > 0 ? "+" + delta : delta})`,
      details: { productId: matchedProduct.id, variantId: v.id, oldStock: currentStock, newStock: newQty, delta },
    });

    setSuccessToast(makeToast(`Giacenza aggiornata: ${newQty} pz (sincronizzata nel cloud)`));
    setTimeout(() => {
      setIsStockUpdating(false);
      setSuccessToast(null);
    }, 1800);
  };

  // 1-Click Fast In-Store Checkout & Fiscal Receipt Print to Cassa RT
  const handleInstantCheckout = async () => {
    if (!matchedProduct || !matchedProduct.variants) return;
    const v = matchedProduct.variants[matchedVariantIndex];
    if (!v) return; // Never write at an out-of-bounds index (sparse array -> null -> crash)
    const basePrice = v?.price ?? matchedProduct.price;
    // The final unit price is the net amount actually paid after the counter discount
    const discountApplied = computeDiscountAmount(basePrice, discountMode, discountPercent, discountAmount);
    const price = Math.max(0, Math.round((basePrice - discountApplied) * 100) / 100);
    const itemDesc = (matchedProduct.name + (v?.name && v.name !== "Standard" ? ` ${v.name}` : "")).slice(0, 22);

    const cashNum = parseFloat(cashTendered.replace(",", ".")) || price;
    const effectivePayment = checkoutPaymentMethod === "cash" && cashNum >= price ? cashNum : price;
    const change = Math.max(0, effectivePayment - price);

    setIsCheckingOut(true);

    try {
      // 1. Decrement stock
      const newQty = Math.max(0, currentStock - 1);
      setCurrentStock(newQty);
      const updatedVariants = [...matchedProduct.variants];
      updatedVariants[matchedVariantIndex] = {
        ...v,
        stock: newQty,
        inStock: newQty > 0,
      };

      updateProductDetails(matchedProduct.id, {
        variants: updatedVariants,
        stock: updatedVariants.reduce((sum, item) => sum + (item?.stock || 0), 0),
        inStock: newQty > 0,
      });

      // 2. Emit SOAP XML to Cassa RT (Epson FP-81II RT on 192.168.68.63)
      // When effectivePayment > price, Epson RT automatically computes and prints RESTO!
      const priceFormatted = price.toFixed(2);
      const paymentFormatted = effectivePayment.toFixed(2);
      const fiscalReceiptXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerFiscalReceipt>
      <beginFiscalReceipt operator="1" />
      <printRecItem operator="1" description="${itemDesc}" quantity="1" unitPrice="${priceFormatted}" department="1" />
      <printRecTotal operator="1" description="${checkoutPaymentMethod === "card" ? "CARTA" : "CONTANTI"}" payment="${paymentFormatted}" paymentType="${checkoutPaymentMethod === "card" ? "1" : "0"}" />
      <endFiscalReceipt operator="1" />
    </printerFiscalReceipt>
  </soapenv:Body>
</soapenv:Envelope>`;

      try {
        await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=10000", {
          method: "POST",
          headers: { "Content-Type": "text/xml; charset=utf-8" },
          body: fiscalReceiptXml,
        });

        // 3. For cash payments, trigger physical cash drawer opening
        if (checkoutPaymentMethod === "cash") {
          const drawerKickXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <openDrawer />
  </soapenv:Body>
</soapenv:Envelope>`;
          try {
            await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=5000", {
              method: "POST",
              headers: { "Content-Type": "text/xml; charset=utf-8" },
              body: drawerKickXml,
            });
          } catch (dErr) {
            console.warn("[Cassa RT] Trigger apertura cassetto:", dErr);
          }
        }
      } catch (hardwareErr) {
        console.warn("[Cassa RT] Stampa hardware:", hardwareErr);
      }

      // 4. Record verified in-store order with cloud synchronization
      createAdminOrder({
        customerName: "Cliente al Banco",
        customerEmail: "banco@sceltamakeup.it",
        customerPhone: "Vendita Diretta Salone (Cassa RT)",
        total: price,
        status: "completed",
        fulfillmentType: "pos_receipt",
        paymentMethod: checkoutPaymentMethod,
        change: checkoutPaymentMethod === "cash" && change > 0 ? change : undefined,
        items: [
          {
            productId: matchedProduct.id,
            productTitle: matchedProduct.name,
            variantName: v?.name !== "Standard" ? v?.name : undefined,
            quantity: 1,
            price: price,
            image: safeImageSrc(v?.image, matchedProduct.images?.[0]),
          },
        ],
      });

      logAdminActivity({
        category: "cassa_rt",
        action: "fiscal_receipt_single",
        title: "Emissione Scontrino Cassa RT",
        description: `Scontrino fiscale RT emesso: "${itemDesc}" - €${price.toFixed(2)} (${
          checkoutPaymentMethod === "card" ? "Carta POS" : "Contanti"
        }${checkoutPaymentMethod === "cash" && change > 0 ? `, Resto €${change.toFixed(2)}` : ""})`,
        details: {
          productId: matchedProduct.id,
          productName: matchedProduct.name,
          variantName: v?.name,
          sku: v?.sku,
          ean: v?.ean,
          barcode: scannedBarcode,
          importo: price,
          listino: basePrice,
          scontoApplicato: discountApplied,
          paymentMethod: checkoutPaymentMethod,
          contantiRicevuti: checkoutPaymentMethod === "cash" ? effectivePayment : undefined,
          resto: change,
          tipoScontrino: "Fiscale (RT)",
        },
      });

      setSuccessToast(
        makeToast(
          checkoutPaymentMethod === "cash" && change > 0
            ? `🎉 Incassato €${effectivePayment.toFixed(2)} — RESTO DA DARE: €${change.toFixed(2)} (Cassetto Aperto)`
            : `🎉 Vendita completata! Scontrino RT emesso (${checkoutPaymentMethod === "card" ? "myPOS Carta" : "Contanti - Cassetto Aperto"}).`
        )
      );
      setTimeout(() => {
        setIsOpen(false);
        isOpenRef.current = false;
        setActiveScreen("scan");
        activeScreenRef.current = "scan";
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore";
      logAdminError({
        action: "fiscal_receipt_single_failed",
        title: "Errore Emissione Scontrino RT",
        description: `Emissione dello scontrino singolo non riuscita: ${msg}`,
        error: err,
        details: {
          productId: matchedProduct?.id,
          productName: matchedProduct?.name,
          variantName: v?.name,
          sku: v?.sku,
          ean: v?.ean,
          barcode: scannedBarcode,
          paymentMethod: checkoutPaymentMethod,
          unitPrice: price,
          printer: "Epson FP-81II RT (192.168.68.63)",
        },
      });
      alert("Errore durante la vendita: " + msg);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Void / Cancel any open stuck receipt on the physical Epson RT
  const handleVoidOpenReceipt = async () => {
    setIsCheckingOut(true);
    const voidXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerFiscalReceipt>
      <printRecVoid operator="1" />
      <endFiscalReceipt operator="1" />
    </printerFiscalReceipt>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=10000", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        body: voidXml,
      });
      setSuccessToast(makeToast("✅ Comando inviato! La cassa ha annullato lo scontrino aperto."));
    } catch (err) {
      console.warn("[Cassa RT] Annullamento scontrino:", err);
      logAdminError({
        action: "fiscal_receipt_void_failed",
        title: "Errore Annullamento Scontrino Aperto RT",
        description:
          "Annullamento dello scontrino aperto non riuscito: la stampante fiscale non ha risposto al comando printRecVoid.",
        error: err,
        details: {
          printer: "Epson FP-81II RT",
          address: "192.168.68.63",
          command: "printRecVoid",
        },
      });
      setSuccessToast(
        makeToast(
          "Annullamento non riuscito. Se la cassa non risponde, premi ANNULLA/STORNO sulla tastiera della cassa.",
          "error"
        )
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Quick Registration of an Unrecognized Barcode
  const handleQuickRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    setIsSavingNew(true);
    const priceNum = parseFloat(newProdPrice.replace(",", ".")) || 11.9;
    const stockNum = parseInt(newProdStock, 10) || 3;
    const newId = `quick-${Date.now()}`;
    const slug = newProdName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const newProduct: Product = {
      id: newId,
      slug: `${slug}-${newId.slice(-4)}`,
      name: newProdName.trim(),
      brand: newProdBrand.trim(),
      category: newProdCategory,
      description: `Prodotto registrato al banco salone con codice a barre ${scannedBarcode}.`,
      shortDescription: newProdName.trim(),
      price: priceNum,
      originalWholesalePrice: Math.round(priceNum * 0.4 * 100) / 100,
      badge: "Novità",
      badges: ["cruelty_free"],
      formulaBenefits: "Formula professionale dermatologicamente testata.",
      howToUse: "Applicare secondo le indicazioni del prodotto.",
      inci: "Formula dermatologicamente testata.",
      features: ["Prodotto professionale salone", "Testato dermatologicamente"],
      images: ["https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/products/eveline-cosmetics-packshot.jpg"],
      shades: [
        {
          id: `var-${scannedBarcode}`,
          name: "Standard",
          code: scannedBarcode,
          hex: "#FAF7FC",
          image: "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/products/eveline-cosmetics-packshot.jpg",
          price: priceNum,
          inStock: stockNum > 0,
          stock: stockNum,
        },
      ],
      variants: [
        {
          id: `var-${scannedBarcode}`,
          name: "Standard",
          sku: scannedBarcode,
          ean: scannedBarcode,
          colorHex: null,
          image: "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev/products/eveline-cosmetics-packshot.jpg",
          inStock: stockNum > 0,
          price: priceNum,
          stock: stockNum,
        },
      ],
      stock: stockNum,
      inStock: stockNum > 0,
    };

    updateProductDetails(newId, newProduct);

    logAdminActivity({
      category: "prodotto",
      action: "quick_register",
      title: "Nuovo Prodotto Registrato al Banco",
      description: `Registrato "${newProdName}" (${newProdBrand}) al prezzo di €${priceNum.toFixed(2)} con barcode ${scannedBarcode}`,
      details: { id: newId, name: newProdName, brand: newProdBrand, price: priceNum, barcode: scannedBarcode, stock: stockNum },
    });

    setMatchedProduct(newProduct);
    setMatchedVariantIndex(0);
    setCurrentStock(stockNum);
    setIsSavingNew(false);
    setSuccessToast(makeToast("✅ Prodotto registrato e associato al codice a barre!"));
  };

  const currentVariant = matchedProduct?.variants?.[matchedVariantIndex];
  // Original catalog list price (before any counter discount)
  const baseListPrice = (currentVariant?.price ?? matchedProduct?.price) || 1.0;
  const discountAmountValue = computeDiscountAmount(
    baseListPrice,
    discountMode,
    discountPercent,
    discountAmount
  );
  // Final discounted total that drives the whole cash-drawer logic below
  const finalTotal = Math.max(0, Math.round((baseListPrice - discountAmountValue) * 100) / 100);
  const hasDiscount = discountAmountValue > 0.001;
  const effectiveDiscountPercent = baseListPrice > 0 ? (discountAmountValue / baseListPrice) * 100 : 0;
  const cashNum = parseFloat(cashTendered.replace(",", ".")) || finalTotal;
  const changeDue = Math.max(0, cashNum - finalTotal);
  const thumbSrc = safeImageSrc(currentVariant?.image, matchedProduct?.images?.[0]);
  const thumbIsExternal = thumbSrc.startsWith("data:") || thumbSrc.startsWith("http");

  // ---------------------------------------------------------------------------
  // 1. Photo editing handlers
  // ---------------------------------------------------------------------------
  const applyNewImage = (imgSrc: string) => {
    if (!matchedProduct || !imgSrc) return;
    setCloudSyncStatus("saving");

    const updatedVariants = matchedProduct.variants ? [...matchedProduct.variants] : [];
    if (updatedVariants[matchedVariantIndex]) {
      updatedVariants[matchedVariantIndex] = {
        ...updatedVariants[matchedVariantIndex],
        image: imgSrc,
      };
    }

    const updatedImages = [...(matchedProduct.images || [])];
    if (updatedImages.length === 0) {
      updatedImages.push(imgSrc);
    } else if (matchedVariantIndex === 0 || updatedVariants.length <= 1) {
      updatedImages[0] = imgSrc;
    }

    const result = updateProductDetails(matchedProduct.id, {
      ...(updatedVariants.length ? { variants: updatedVariants } : {}),
      images: updatedImages,
    });

    if (result && (result as { error?: string }).error) {
      setSuccessToast(makeToast((result as { error?: string }).error || "Errore durante il salvataggio della foto.", "error"));
      setCloudSyncStatus("idle");
      return;
    }

    setMatchedProduct({
      ...matchedProduct,
      variants: updatedVariants.length ? updatedVariants : matchedProduct.variants,
      images: updatedImages,
    });
    markCloudSaved();

    logAdminActivity({
      category: "prodotto",
      action: "image_update",
      title: "Aggiornata Foto Prodotto",
      description: `Foto aggiornata per "${matchedProduct.name}"${
        currentVariant?.name && currentVariant.name !== "Standard" ? ` (${currentVariant.name})` : ""
      }`,
      details: {
        productId: matchedProduct.id,
        variantId: currentVariant?.id,
        variantName: currentVariant?.name,
        imageType: imgSrc.startsWith("data:") ? "upload_locale" : "url_esterno",
        imageUrl: imgSrc.startsWith("data:") ? undefined : imgSrc.slice(0, 300),
      },
    });

    setSuccessToast(makeToast("Foto aggiornata e sincronizzata nel cloud!"));
    setTimeout(() => setSuccessToast(null), 2400);
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !matchedProduct) return;
    setIsUpdatingPhoto(true);
    try {
      setSuccessToast(makeToast("Compressione e caricamento su Cloud Storage...", "info"));
      const compressedDataUrl = await fileToResizedDataUrl(file, 800);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compressedDataUrl,
          productId: matchedProduct.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || "Errore durante l'upload su Cloud Storage");
      }
      applyNewImage(data.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      logAdminError({
        action: "image_upload_failed",
        title: "Errore Caricamento Foto Prodotto",
        description: `Caricamento della foto non riuscito per "${matchedProduct.name}"${
          currentVariant?.name && currentVariant.name !== "Standard" ? ` (${currentVariant.name})` : ""
        }: ${msg}`,
        error: err,
        details: {
          productId: matchedProduct.id,
          productName: matchedProduct.name,
          variantId: currentVariant?.id,
          variantName: currentVariant?.name,
          sku: currentVariant?.sku,
          ean: currentVariant?.ean,
          fileName: file.name,
          fileType: file.type || "sconosciuto",
          fileSizeKb: Math.round(file.size / 1024),
        },
      });
      setSuccessToast(makeToast("Impossibile caricare l'immagine: " + msg, "error"));
    } finally {
      setIsUpdatingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleSaveImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    applyNewImage(url);
    setImageUrlInput("");
    setShowUrlInput(false);
  };

  // ---------------------------------------------------------------------------
  // 2. Base list price & title editing handlers (Instant Auto-Sync)
  // ---------------------------------------------------------------------------
  const commitTitleChange = useCallback(
    (customTitle?: string) => {
      if (!matchedProduct) return;
      const clean = (customTitle !== undefined ? customTitle : titleEditValue).trim();
      if (!clean || clean === matchedProduct.name) {
        setIsEditingTitle(false);
        return;
      }

      setCloudSyncStatus("saving");
      const result = updateProductDetails(matchedProduct.id, { name: clean });
      if (result && (result as { error?: string }).error) {
        setSuccessToast(makeToast((result as { error?: string }).error || "Errore salvataggio titolo.", "error"));
        setCloudSyncStatus("idle");
        setIsEditingTitle(false);
        return;
      }

      logAdminActivity({
        category: "prodotto",
        action: "title_edit",
        title: "Modifica Nome Prodotto",
        description: `Rinominato da "${matchedProduct.name}" a "${clean}"`,
        details: { productId: matchedProduct.id, oldName: matchedProduct.name, newName: clean },
      });

      setMatchedProduct((prev) => (prev ? { ...prev, name: clean } : null));
      setIsEditingTitle(false);
      markCloudSaved();
      setSuccessToast(makeToast("Nome prodotto aggiornato e sincronizzato!"));
      setTimeout(() => setSuccessToast(null), 2400);
    },
    [matchedProduct, titleEditValue, markCloudSaved]
  );

  const commitPriceChange = useCallback(
    (customVal?: string) => {
      if (!matchedProduct) return;
      const raw = customVal !== undefined ? customVal : priceEditValue;
      if (!raw || !raw.trim()) return;
      const newPrice = parseFloat(raw.replace(",", "."));
      if (isNaN(newPrice) || newPrice < 0) return;
      const rounded = Math.round(newPrice * 100) / 100;

      const currentPrice =
        (matchedProduct.variants?.[matchedVariantIndex]?.price ?? matchedProduct.price) || 0;
      if (Math.abs(rounded - currentPrice) < 0.001) return;

      setCloudSyncStatus("saving");
      setIsUpdatingPrice(true);

      const updatedVariants = matchedProduct.variants ? [...matchedProduct.variants] : [];
      const updates: Partial<Product> = { price: rounded };
      if (updatedVariants[matchedVariantIndex]) {
        updatedVariants[matchedVariantIndex] = {
          ...updatedVariants[matchedVariantIndex],
          price: rounded,
        };
        updates.variants = updatedVariants;
      }

      const result = updateProductDetails(matchedProduct.id, updates);
      if (result && (result as { error?: string }).error) {
        setSuccessToast(makeToast((result as { error?: string }).error || "Errore durante il salvataggio del prezzo.", "error"));
        setIsUpdatingPrice(false);
        setCloudSyncStatus("idle");
        return;
      }

      setMatchedProduct((prev) =>
        prev
          ? {
              ...prev,
              price: rounded,
              variants: updatedVariants.length ? updatedVariants : prev.variants,
            }
          : null
      );

      if (discountMode === "none") {
        setCashTendered(rounded.toFixed(2));
      }

      setIsUpdatingPrice(false);
      markCloudSaved();

      logAdminActivity({
        category: "prezzo",
        action: "price_change",
        title: "Variazione Prezzo Listino",
        description: `"${matchedProduct.name}": prezzo aggiornato da €${currentPrice.toFixed(2)} a €${rounded.toFixed(2)}`,
        details: { productId: matchedProduct.id, oldPrice: currentPrice, newPrice: rounded },
      });

      setSuccessToast(makeToast(`Prezzo di listino sincronizzato: €${rounded.toFixed(2)}`));
      setTimeout(() => setSuccessToast(null), 2500);
    },
    [matchedProduct, matchedVariantIndex, priceEditValue, discountMode, markCloudSaved]
  );

  const handlePriceInputChange = (val: string) => {
    setPriceEditValue(val);
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
    }
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n >= 0) {
      setCloudSyncStatus("saving");
      priceDebounceTimerRef.current = setTimeout(() => {
        commitPriceChange(val);
      }, 700);
    }
  };

  const handleCloseModal = useCallback(() => {
    // 1. Flush in-flight price auto-save
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
      priceDebounceTimerRef.current = null;
    }
    if (priceEditValue && matchedProduct) {
      const rawNum = parseFloat(priceEditValue.replace(",", "."));
      if (!isNaN(rawNum) && rawNum >= 0) {
        commitPriceChange(priceEditValue);
      }
    }

    // 2. Flush in-flight title auto-save
    if (isEditingTitle && titleEditValue.trim() && matchedProduct) {
      commitTitleChange(titleEditValue);
    }

    // 3. Close modal & reset screen cleanly to single product scan
    setIsOpen(false);
    isOpenRef.current = false;
    setActiveScreen("scan");
    activeScreenRef.current = "scan";
  }, [priceEditValue, matchedProduct, commitPriceChange, isEditingTitle, titleEditValue, commitTitleChange]);

  useEffect(() => {
    handleCloseModalRef.current = handleCloseModal;
  }, [handleCloseModal]);

  // ---------------------------------------------------------------------------
  // 3. Counter discount handlers
  // ---------------------------------------------------------------------------
  const applyDiscount = (mode: DiscountMode, percent: number, amount: number) => {
    setDiscountMode(mode);
    setDiscountPercent(percent);
    setDiscountAmount(amount);
    const d = computeDiscountAmount(baseListPrice, mode, percent, amount);
    const newTotal = Math.max(0, Math.round((baseListPrice - d) * 100) / 100);
    setCashTendered(newTotal.toFixed(2));
  };

  const setPillDiscount = (pct: number) => {
    if (pct <= 0) {
      setCustomPercent("");
      setCustomAmount("");
      setCustomFinal("");
      applyDiscount("none", 0, 0);
    } else {
      setCustomPercent(String(pct));
      setCustomAmount("");
      setCustomFinal("");
      applyDiscount("percent", pct, 0);
    }
  };

  const onCustomPercent = (val: string) => {
    setCustomPercent(val);
    setCustomAmount("");
    setCustomFinal("");
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) applyDiscount("percent", Math.min(100, n), 0);
    else applyDiscount("none", 0, 0);
  };

  const onCustomAmount = (val: string) => {
    setCustomAmount(val);
    setCustomPercent("");
    setCustomFinal("");
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n > 0) applyDiscount("amount", 0, n);
    else applyDiscount("none", 0, 0);
  };

  const onCustomFinal = (val: string) => {
    setCustomFinal(val);
    setCustomPercent("");
    setCustomAmount("");
    const n = parseFloat(val.replace(",", "."));
    if (!isNaN(n) && n >= 0) {
      const amt = Math.max(0, Math.round((baseListPrice - n) * 100) / 100);
      applyDiscount("amount", 0, amt);
    } else {
      applyDiscount("none", 0, 0);
    }
  };

  const clearDiscount = () => {
    setCustomPercent("");
    setCustomAmount("");
    setCustomFinal("");
    applyDiscount("none", 0, 0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleCloseModal}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-[#D8C2E7]/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header (Compact) */}
        <div className="bg-gradient-to-r from-[#1F1B24] via-[#352542] to-[#5E1788] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              {activeScreen === "multi_receipt" ? (
                <Receipt className="w-4 h-4 text-emerald-300" />
              ) : (
                <Barcode className="w-4 h-4 text-[#D462A6]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-300">
                  {activeScreen === "multi_receipt" ? "Cassa RT • Scontrino Multiplo" : "Scansione Barcode Cassa"}
                </span>
              </div>
              <h3 className="font-mono text-sm sm:text-base font-bold text-white tracking-wider leading-none">
                {activeScreen === "multi_receipt"
                  ? `${multiItemsCount} ${multiItemsCount === 1 ? "Articolo" : "Articoli"} nello Scontrino`
                  : scannedBarcode || "Attesa scansione..."}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {multiItemsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveScreen((s) => (s === "scan" ? "multi_receipt" : "scan"))}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold transition-all shadow-xs cursor-pointer animate-pulse"
                title="Passa allo Scontrino Multiplo con tutti i prodotti aggiunti"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {activeScreen === "multi_receipt" ? "← Spara altri prodotti" : `Scontrino Multiplo (${multiItemsCount}) →`}
                </span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              {cloudSyncStatus === "saving" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                  <span className="text-[11px] font-semibold text-amber-200">Sincronizzo Cloud...</span>
                </>
              ) : cloudSyncStatus === "saved" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span className="text-[11px] font-semibold text-emerald-200">Salvato nel Cloud</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-200">Auto-Sync Cloud Attivo</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleCloseModal}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Chiudi finestra (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeScreen === "multi_receipt" ? (
          /* ========================================================= */
          /* SCREEN 2: SCONTRINO FISCALE MULTIPLO                      */
          /* ========================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {successToast && (
              <div
                className={`mx-5 mt-3 p-2.5 border rounded-xl text-xs font-semibold flex items-center gap-2 ${toastContainerClass(
                  successToast.type
                )}`}
              >
                <ToastIcon type={successToast.type} />
                <span>{successToast.message}</span>
              </div>
            )}

            {multiCartItems.length === 0 ? (
              <div className="p-8 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-[#5E1788]">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#1F1B24]">
                  Nessun prodotto nello scontrino multiplo
                </h4>
                <p className="text-xs text-gray-500 max-w-sm">
                  Spara i prodotti con la pistola barcode e clicca &quot;Aggiungi a scontrino multiplo&quot; per accumularli qui ed emettere un unico scontrino fiscale.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveScreen("scan")}
                  className="px-4 py-2 rounded-xl bg-[#5E1788] hover:bg-[#4D1270] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer mt-2"
                >
                  <Barcode className="w-4 h-4" />
                  <span>Torna allo scanner barcode</span>
                </button>
              </div>
            ) : (
              <div className="p-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* COLONNA SINISTRA: ELENCO PRODOTTI NELLO SCONTRINO (7/12) */}
                  <div className="lg:col-span-7 space-y-2.5">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-[#5E1788]" />
                        <span>Prodotti da stampare ({multiItemsCount} pezzi totali)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearMultiReceipt}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Svuota scontrino</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                      {multiCartItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-[#FAF7FC] rounded-2xl border border-[#D8C2E7]/70 flex items-center gap-3 transition-all hover:border-[#5E1788]/40 shadow-2xs"
                        >
                          <div className="relative w-12 h-12 rounded-xl bg-white border border-[#D8C2E7]/60 overflow-hidden shrink-0 flex items-center justify-center p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#5E1788] bg-purple-100 px-1.5 py-0.2 rounded">
                                {item.brand}
                              </span>
                              {item.variantName && item.variantName !== "Standard" && (
                                <span className="text-[10px] font-semibold text-[#D462A6] truncate">
                                  {item.variantName}
                                </span>
                              )}
                            </div>
                            {/* Titolo Prodotto Modificabile */}
                            {editingMultiItemId === item.id && editingMultiField === "title" ? (
                              <div className="flex items-center gap-1 mt-1">
                                <input
                                  type="text"
                                  value={tempEditValue}
                                  onChange={(e) => setTempEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCommitEditMultiItem();
                                    if (e.key === "Escape") handleCancelEditMultiItem();
                                  }}
                                  autoFocus
                                  className="w-full text-xs font-bold px-2 py-0.5 rounded-lg border-2 border-[#5E1788] bg-white focus:outline-none shadow-xs"
                                />
                                <button
                                  type="button"
                                  onClick={handleCommitEditMultiItem}
                                  className="p-1 rounded-lg bg-[#5E1788] text-white hover:bg-[#7A3293] shrink-0 cursor-pointer shadow-2xs"
                                  title="Conferma titolo"
                                >
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditMultiItem}
                                  className="p-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 shrink-0 cursor-pointer"
                                  title="Annulla"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <h4
                                onClick={() => handleStartEditMultiItem(item, "title")}
                                className="font-serif font-bold text-xs text-[#1F1B24] truncate mt-0.5 flex items-center gap-1.5 cursor-pointer group hover:text-[#5E1788] transition-colors"
                                title="Clicca per modificare il titolo"
                              >
                                <span className="truncate">{item.productName}</span>
                                <Pencil className="w-2.5 h-2.5 opacity-30 group-hover:opacity-100 text-gray-400 group-hover:text-[#5E1788] shrink-0 transition-opacity" />
                              </h4>
                            )}

                            {/* Prezzo Unitario Modificabile */}
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              {editingMultiItemId === item.id && editingMultiField === "price" ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-[#5E1788]">€</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={tempEditValue}
                                    onChange={(e) => setTempEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCommitEditMultiItem();
                                      if (e.key === "Escape") handleCancelEditMultiItem();
                                    }}
                                    autoFocus
                                    className="w-18 text-xs font-mono font-bold px-1.5 py-0.5 rounded-lg border-2 border-[#5E1788] bg-white focus:outline-none shadow-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCommitEditMultiItem}
                                    className="p-1 rounded-lg bg-[#5E1788] text-white hover:bg-[#7A3293] shrink-0 cursor-pointer shadow-2xs"
                                    title="Conferma prezzo"
                                  >
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditMultiItem}
                                    className="p-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 shrink-0 cursor-pointer"
                                    title="Annulla"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMultiItem(item, "price")}
                                  className="font-mono font-bold text-[#5E1788] hover:bg-purple-100/70 px-1 py-0.2 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Clicca per modificare il prezzo unitario"
                                >
                                  <span>€{item.finalUnitPrice.toFixed(2)} cad.</span>
                                  <Pencil className="w-2.5 h-2.5 opacity-30 hover:opacity-100 text-gray-400 hover:text-[#5E1788] shrink-0 transition-opacity" />
                                </button>
                              )}

                              {multiDiscountTotal > 0 && (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-200">
                                  Sconto applicato
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quantità: [-] [qty] [+] */}
                          <div className="flex items-center gap-1 bg-white rounded-xl border border-[#D8C2E7]/70 p-1 shrink-0 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateMultiItemQty(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-rose-50 hover:text-rose-700 text-gray-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                              title="Diminuisci quantità"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-mono font-extrabold text-xs text-[#1F1B24]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateMultiItemQty(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                              title="Aumenta quantità"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Subtotale riga */}
                          <div className="text-right shrink-0 min-w-[65px]">
                            <span className="block font-mono font-extrabold text-sm text-[#1F1B24]">
                              €{(item.finalUnitPrice * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          {/* Tasto Rimuovi */}
                          <button
                            type="button"
                            onClick={() => handleRemoveMultiItem(item.id)}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            title="Rimuovi prodotto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COLONNA DESTRA: INCASSO SCONTRINO MULTIPLO & STAMPA (5/12) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 p-4 rounded-2xl border border-[#D8C2E7]/80 space-y-3 shadow-xs">
                      {/* Metodo di pagamento */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-[#5E1788]" />
                          Incasso Scontrino
                        </span>

                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D8C2E7]/60 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setMultiPaymentMethod("card")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              multiPaymentMethod === "card"
                                ? "bg-[#5E1788] text-white shadow-xs"
                                : "text-gray-600 hover:text-[#5E1788]"
                            }`}
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Carta</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMultiPaymentMethod("cash")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              multiPaymentMethod === "cash"
                                ? "bg-[#1F1B24] text-white shadow-xs"
                                : "text-gray-600 hover:text-[#1F1B24]"
                            }`}
                          >
                            <Banknote className="w-3 h-3" />
                            <span>Contanti</span>
                          </button>
                        </div>
                      </div>

                      {/* SCONTO SCONTRINO MULTIPLO */}
                      <div className="p-3 bg-white rounded-xl border border-[#D8C2E7]/80 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#1F1B24] flex items-center gap-1.5">
                            <BadgePercent className="w-3.5 h-3.5 text-[#D462A6]" />
                            <span>Sconto Scontrino</span>
                          </span>
                          {multiDiscountMode !== "none" && (
                            <button
                              type="button"
                              onClick={() => {
                                setMultiDiscountMode("none");
                                setMultiDiscountPercent(0);
                                setMultiDiscountAmount(0);
                                setMultiCustomFinal("");
                              }}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                            >
                              Azzera sconto
                            </button>
                          )}
                        </div>

                        {/* Modalità sconto */}
                        <div className="grid grid-cols-4 gap-1 p-0.5 bg-gray-100 rounded-lg text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setMultiDiscountMode("none")}
                            className={`py-1 rounded-md transition-all cursor-pointer ${
                              multiDiscountMode === "none"
                                ? "bg-white text-[#5E1788] shadow-2xs font-extrabold"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            Nessuno
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMultiDiscountMode("percent");
                              if (multiDiscountPercent === 0) setMultiDiscountPercent(10);
                            }}
                            className={`py-1 rounded-md transition-all cursor-pointer ${
                              multiDiscountMode === "percent"
                                ? "bg-[#5E1788] text-white shadow-2xs font-extrabold"
                                : "text-gray-600 hover:text-[#5E1788]"
                            }`}
                          >
                            % Sconto
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMultiDiscountMode("amount");
                              if (multiDiscountAmount === 0) setMultiDiscountAmount(5);
                            }}
                            className={`py-1 rounded-md transition-all cursor-pointer ${
                              multiDiscountMode === "amount"
                                ? "bg-[#5E1788] text-white shadow-2xs font-extrabold"
                                : "text-gray-600 hover:text-[#5E1788]"
                            }`}
                          >
                            € Fisso
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMultiDiscountMode("custom_final");
                              if (!multiCustomFinal) setMultiCustomFinal(Math.floor(multiGrossTotal).toFixed(2));
                            }}
                            className={`py-1 rounded-md transition-all cursor-pointer ${
                              multiDiscountMode === "custom_final"
                                ? "bg-[#5E1788] text-white shadow-2xs font-extrabold"
                                : "text-gray-600 hover:text-[#5E1788]"
                            }`}
                          >
                            Tot. Netto
                          </button>
                        </div>

                        {/* Controlli specifici per modalità */}
                        {multiDiscountMode === "percent" && (
                          <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-150">
                            <div className="flex flex-wrap gap-1">
                              {[5, 10, 15, 20, 30].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setMultiDiscountPercent(pct)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                    multiDiscountPercent === pct
                                      ? "bg-[#5E1788] text-white border-[#5E1788] shadow-2xs"
                                      : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                                  }`}
                                >
                                  -{pct}%
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">% Personalizzata:</span>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={multiDiscountPercent || ""}
                                  onChange={(e) =>
                                    setMultiDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))
                                  }
                                  placeholder="es. 12"
                                  className="w-full px-2 py-1 bg-gray-50 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#5E1788]"
                                />
                                <span className="absolute right-2 top-1 text-xs text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {multiDiscountMode === "amount" && (
                          <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-150">
                            <div className="flex flex-wrap gap-1">
                              {[2, 5, 10, 15, 20].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setMultiDiscountAmount(amt)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                    multiDiscountAmount === amt
                                      ? "bg-[#5E1788] text-white border-[#5E1788] shadow-2xs"
                                      : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                                  }`}
                                >
                                  -{amt}€
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">€ Personalizzato:</span>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max={multiGrossTotal}
                                  value={multiDiscountAmount || ""}
                                  onChange={(e) => setMultiDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                  placeholder="es. 7.50"
                                  className="w-full pl-5 pr-2 py-1 bg-gray-50 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#5E1788]"
                                />
                                <span className="absolute left-2 top-1 text-xs text-gray-400 font-bold">€</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {multiDiscountMode === "custom_final" && (
                          <div className="space-y-1 pt-0.5 animate-in fade-in duration-150">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">Totale concordato (€):</span>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.10"
                                  min="0"
                                  max={multiGrossTotal}
                                  value={multiCustomFinal}
                                  onChange={(e) => setMultiCustomFinal(e.target.value)}
                                  placeholder={multiGrossTotal.toFixed(2)}
                                  className="w-full pl-5 pr-2 py-1 bg-gray-50 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#5E1788]"
                                />
                                <span className="absolute left-2 top-1 text-xs text-gray-400 font-bold">€</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-gray-400">
                              Lordo: €{multiGrossTotal.toFixed(2)} → digita la cifra tonda concordata (es. €{Math.floor(multiGrossTotal)}).
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Display Totale */}
                      <div className="p-3 bg-white rounded-xl border border-[#D8C2E7]/70 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                              Totale Complessivo
                            </span>
                            <span className="text-xs font-semibold text-gray-700">
                              {multiItemsCount} {multiItemsCount === 1 ? "articolo" : "articoli"}
                            </span>
                          </div>
                          <div className="text-right">
                            {multiDiscountTotal > 0 && (
                              <span className="block text-xs text-gray-400 line-through font-mono">
                                €{multiGrossTotal.toFixed(2)}
                              </span>
                            )}
                            <span className="text-2xl font-mono font-extrabold text-[#5E1788]">
                              €{multiTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {multiDiscountTotal > 0 && (
                          <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-200 text-[11px]">
                            <span className="font-semibold text-rose-600 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#D462A6]" />
                              Sconto applicato:
                            </span>
                            <span className="font-mono font-bold text-rose-600">
                              - €{multiDiscountTotal.toFixed(2)} ({((multiDiscountTotal / multiGrossTotal) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Se Contanti: Calcolo Resto */}
                      {multiPaymentMethod === "cash" && (
                        <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Calcolo Resto</span>
                            </span>
                          </div>

                          {/* Presets */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-semibold text-emerald-900 mr-0.5">Tagli:</span>
                            {[
                              { label: `Esatto (€${multiTotal.toFixed(2)})`, val: multiTotal },
                              { label: "€10", val: 10 },
                              { label: "€20", val: 20 },
                              { label: "€50", val: 50 },
                              { label: "€100", val: 100 },
                            ]
                              .filter((p) => p.val >= multiTotal || p.val === multiTotal)
                              .slice(0, 4)
                              .map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => setMultiCashTendered(preset.val.toFixed(2))}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    parseFloat(multiCashTendered) === preset.val
                                      ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs scale-105"
                                      : "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2 items-center pt-0.5">
                            <div>
                              <label className="block text-[10px] font-bold text-emerald-950 mb-0.5">
                                Ricevuto (€)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={multiCashTendered}
                                  onChange={(e) => setMultiCashTendered(e.target.value)}
                                  placeholder={multiTotal.toFixed(2)}
                                  className="w-full pl-6 pr-2 py-1.5 bg-white rounded-lg border border-emerald-300 text-xs font-bold text-emerald-950 focus:outline-none focus:border-emerald-600 shadow-2xs"
                                />
                                <span className="absolute left-2 top-1.5 text-xs font-bold text-emerald-700">€</span>
                              </div>
                            </div>

                            {(() => {
                              const cashVal = parseFloat(multiCashTendered.replace(",", ".")) || multiTotal;
                              const isUnder = cashVal < multiTotal;
                              const diff = isUnder ? multiTotal - cashVal : cashVal - multiTotal;
                              return (
                                <div
                                  className={`p-1.5 rounded-lg border flex flex-col justify-center text-center ${
                                    isUnder
                                      ? "bg-rose-50 border-rose-200 text-rose-800"
                                      : "bg-white border-emerald-300 text-emerald-900 shadow-2xs"
                                  }`}
                                >
                                  <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">
                                    {isUnder ? "Mancano" : "Resto"}
                                  </span>
                                  <span
                                    className={`text-lg font-mono font-extrabold ${
                                      isUnder ? "text-rose-600" : "text-emerald-700"
                                    }`}
                                  >
                                    {isUnder ? `- €${diff.toFixed(2)}` : `€${diff.toFixed(2)}`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Tasto Principale: Incassa e Stampa Scontrino */}
                      <button
                        type="button"
                        onClick={handleMultiReceiptCheckout}
                        disabled={
                          isMultiCheckingOut ||
                          multiCartItems.length === 0 ||
                          (multiPaymentMethod === "cash" &&
                            (parseFloat(multiCashTendered.replace(",", ".")) || 0) < multiTotal)
                        }
                        className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98 ${
                          multiPaymentMethod === "cash"
                            ? "bg-gradient-to-r from-emerald-600 to-[#5E1788] hover:from-emerald-700 hover:to-[#4D1270] text-white"
                            : "bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#4D1270] hover:to-[#5E1788] text-white"
                        }`}
                      >
                        {isMultiCheckingOut ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Stampa scontrino in corso...</span>
                          </>
                        ) : (
                          <>
                            <Printer className="w-4 h-4" />
                            <span>
                              Incassa €{multiTotal.toFixed(2)} e Stampa Scontrino
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Azioni secondarie in griglia 2x2 */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveScreen("scan")}
                        className="w-full px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5E1788] border border-purple-200 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        <span>Spara altri prodotti</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCashDrawerOnly}
                        className="w-full px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Apri cassetto</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearMultiReceipt}
                        className="w-full px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Svuota scontrino</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <X className="w-3.5 h-3.5 text-gray-500" />
                        <span>Esci</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* SCREEN 1: SCANSIONE BARCODE / CASSA STANDARD */
          <>
            {/* Top Controls: Toast & Search bar (Compact shrink-0) */}
        <div className="px-5 pt-3 pb-1 shrink-0 space-y-2">
          {successToast && (
            <div
              className={`p-2 border rounded-xl text-xs font-semibold flex items-center gap-2 ${toastContainerClass(
                successToast.type
              )}`}
            >
              <ToastIcon type={successToast.type} />
              <span>{successToast.message}</span>
            </div>
          )}

          {/* Quick Barcode / SKU Switcher or Manual Typing */}
          <div className="flex items-center gap-2 bg-[#FAF7FC] p-1.5 rounded-xl border border-[#D8C2E7]/70">
            <input
              type="text"
              value={manualSearchInput}
              onChange={(e) => setManualSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (manualSearchInput.trim()) {
                    handleBarcodeScanned(manualSearchInput.trim());
                  }
                }
              }}
              placeholder="Digita o cerca per codice a barre (EAN / SKU)..."
              className="flex-1 px-3 py-1 text-xs bg-white rounded-lg border border-[#D8C2E7]/60 text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:border-[#5E1788]"
            />
            <button
              type="button"
              onClick={() => {
                if (manualSearchInput.trim()) {
                  handleBarcodeScanned(manualSearchInput.trim());
                }
              }}
              className="px-3 py-1 bg-[#5E1788] text-white text-xs font-bold rounded-lg hover:bg-[#4D1270] transition-colors shrink-0 cursor-pointer"
            >
              Cerca
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-5 pb-5 pt-1 flex-1 overflow-y-auto">
          {matchedProduct ? (
            /* FOUND PRODUCT: TWO-COLUMN COCKPIT GRID ON DESKTOP */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
              {/* ========================================================= */}
              {/* COLONNA SINISTRA: Prodotto, Foto, Giacenza & Sconto (7/12) */}
              {/* ========================================================= */}
              <div className="lg:col-span-7 space-y-3">
                {/* 1. Scheda Prodotto Compatta */}
                <div className="bg-[#FAF7FC] p-3.5 rounded-2xl border border-[#D8C2E7]/70 space-y-2.5">
                  <div className="flex gap-3.5 items-start">
                    {/* Thumbnail + Photo Editing */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-white border border-[#D8C2E7]/60 overflow-hidden shadow-2xs flex items-center justify-center">
                        {thumbIsExternal ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={thumbSrc}
                            alt={matchedProduct.name}
                            className="w-full h-full object-contain p-1.5"
                          />
                        ) : (
                          <Image
                            src={thumbSrc}
                            alt={matchedProduct.name}
                            fill
                            sizes="88px"
                            className="object-contain p-1.5"
                          />
                        )}

                        {isUpdatingPhoto && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-[#5E1788]" />
                          </div>
                        )}

                        {/* Camera Overlay */}
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isUpdatingPhoto}
                          className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#5E1788]/95 hover:bg-[#4D1270] text-white flex items-center justify-center shadow-xs transition-all border border-white disabled:opacity-50 cursor-pointer"
                          title="Carica foto dal PC/dispositivo"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Photo triggers */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isUpdatingPhoto}
                          className="px-1.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 hover:bg-purple-100 text-[#5E1788] text-[9px] font-bold transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          title="Carica foto dal PC"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUrlInput((s) => !s)}
                          className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                            showUrlInput
                              ? "bg-[#D462A6] border-[#D462A6] text-white"
                              : "bg-white border-[#D8C2E7] hover:bg-pink-50 text-[#D462A6]"
                          }`}
                          title="Inserisci URL immagine"
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>URL</span>
                        </button>
                      </div>

                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileSelected}
                      />
                    </div>

                    {/* Titles, Brand, Price */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5E1788] text-[9px] font-bold uppercase tracking-wider">
                          {matchedProduct.brand}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[9px] font-semibold">
                          {matchedProduct.category}
                        </span>

                        {/* 1-Click E-Commerce Visibility Toggle (Online vs Solo Negozio) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!matchedProduct) return;
                            const nextState = !matchedProduct.isLocalOnly;
                            setMatchedProduct({ ...matchedProduct, isLocalOnly: nextState });
                            updateProductDetails(matchedProduct.id, { isLocalOnly: nextState });
                            logAdminActivity({
                              category: "canale",
                              action: "channel_toggle",
                              title: "Modifica Canale Vendita",
                              description: `"${matchedProduct.name}" impostato su ${nextState ? "SOLO NEGOZIO (nascosto dall'e-commerce)" : "ONLINE (visibile su e-commerce)"} dalla cassa`,
                              details: { productId: matchedProduct.id, isLocalOnly: nextState },
                            });
                            setSuccessToast(
                              makeToast(
                                nextState
                                  ? "🏬 Prodotto impostato su: SOLO NEGOZIO (Nascosto dall'e-commerce pubblico)"
                                  : "🌐 Prodotto reso: VISIBILE SULL'E-COMMERCE E IN NEGOZIO"
                              )
                            );
                            setTimeout(() => setSuccessToast(null), 2500);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                            matchedProduct.isLocalOnly
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                          title={
                            matchedProduct.isLocalOnly
                              ? "Attualmente: SOLO NEGOZIO FISICO (Nascosto dall'e-commerce). Clicca per pubblicarlo online!"
                              : "Attualmente: ONLINE SU E-COMMERCE. Clicca per renderlo Solo Locale (nascosto dall'e-commerce)!"
                          }
                        >
                          {matchedProduct.isLocalOnly ? (
                            <>
                              <EyeOff className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>Solo Negozio (Nascosto Online)</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>Online E-commerce</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Product Name (Inline Editable) */}
                      {isEditingTitle ? (
                        <div className="flex items-center gap-1.5 my-1">
                          <input
                            type="text"
                            value={titleEditValue}
                            onChange={(e) => setTitleEditValue(e.target.value)}
                            onBlur={() => commitTitleChange()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitTitleChange();
                              } else if (e.key === "Escape") {
                                setIsEditingTitle(false);
                                setTitleEditValue(matchedProduct.name);
                              }
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 text-xs sm:text-sm font-serif font-bold text-[#1F1B24] bg-white rounded-lg border border-[#5E1788] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => commitTitleChange()}
                            className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 cursor-pointer"
                            title="Salva nome"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="group flex items-start gap-1">
                          <h2 className="font-serif text-sm sm:text-base font-bold text-[#1F1B24] leading-snug line-clamp-2">
                            {matchedProduct.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => {
                              setTitleEditValue(matchedProduct.name);
                              setIsEditingTitle(true);
                            }}
                            className="opacity-60 hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-[#5E1788] hover:bg-purple-100 transition-colors shrink-0 cursor-pointer"
                            title="Modifica titolo prodotto"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      {currentVariant && currentVariant.name && currentVariant.name !== "Standard" && (
                        <div className="text-[11px] font-semibold text-[#D462A6] flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span className="truncate">Formato: {currentVariant.name}</span>
                        </div>
                      )}

                      {/* Base Price Card with Direct Instant Edit & Auto-Sync */}
                      <div className="mt-1 p-2 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#5E1788]">
                              Prezzo Listino
                            </span>
                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                              Auto-Sync
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-base font-mono font-extrabold text-[#5E1788]">€</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={priceEditValue}
                              onChange={(e) => handlePriceInputChange(e.target.value)}
                              onBlur={() => commitPriceChange()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitPriceChange();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-20 px-1.5 py-0.5 bg-white rounded-lg border-2 border-purple-300 font-mono font-extrabold text-sm text-[#1F1B24] focus:outline-none focus:border-[#5E1788] focus:ring-1 focus:ring-[#5E1788]"
                              title="Modifica il prezzo: si sincronizza automaticamente nel cloud!"
                            />
                            {matchedProduct.originalPrice && (
                              <span className="text-xs line-through text-gray-400 font-mono ml-1">
                                €{matchedProduct.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status salvataggio live */}
                        <div className="flex items-center gap-1">
                          {cloudSyncStatus === "saving" ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold animate-pulse">
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                              <span>Salvo...</span>
                            </div>
                          ) : cloudSyncStatus === "saved" ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold animate-in fade-in">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Salvato</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1" title="Modifichi, chiudi ed è salvato">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Salvato
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optional Image URL input */}
                  {showUrlInput && (
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-[#D8C2E7] animate-in fade-in duration-150">
                      <LinkIcon className="w-3 h-3 text-[#D462A6] shrink-0 ml-1" />
                      <input
                        type="text"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveImageUrl();
                          }
                        }}
                        placeholder="Incolla URL immagine (https://...)"
                        className="flex-1 px-2 py-1 text-xs bg-gray-50 rounded-lg border border-gray-200 text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:border-[#D462A6]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveImageUrl}
                        disabled={!imageUrlInput.trim() || isUpdatingPhoto}
                        className="px-2.5 py-1 bg-[#D462A6] text-white text-[10px] font-bold rounded-lg hover:bg-[#C15294] transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        Applica
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center shrink-0 cursor-pointer"
                        title="Chiudi"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Giacenza Bar (Ultra Compact) */}
                <div className="bg-[#FAF7FC] px-3.5 py-2 rounded-2xl border border-[#D8C2E7]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#1F1B24]/60 uppercase tracking-wider">
                      Giacenza Salone:
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        currentStock > 4
                          ? "bg-emerald-500"
                          : currentStock > 0
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-sm font-mono font-bold text-[#1F1B24]">
                      {currentStock} {currentStock === 1 ? "pezzo" : "pezzi"}
                    </span>
                    <span className="text-[10px] text-gray-500 hidden sm:inline">
                      ({currentStock > 4 ? "Disponibile" : currentStock > 0 ? "Scorta Bassa" : "Esaurito"})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-gray-500">Regola:</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(-1)}
                      disabled={currentStock <= 0 || isStockUpdating}
                      className="w-7 h-7 rounded-lg bg-white border border-[#D8C2E7] hover:bg-rose-50 text-rose-700 font-bold flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                      title="Diminuisci giacenza (-1)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(+1)}
                      disabled={isStockUpdating}
                      className="w-7 h-7 rounded-lg bg-white border border-[#D8C2E7] hover:bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Aumenta giacenza (+1)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 3. Sconto al Banco (Estemporaneo) */}
                <div className="bg-gradient-to-r from-[#FAF7FC] via-white to-[#F7EFFA] p-3.5 rounded-2xl border border-[#D8C2E7]/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5 text-[#D462A6]" />
                      Sconto al Banco
                      <span className="text-[10px] font-semibold text-gray-400 hidden sm:inline">
                        (solo vendita corrente)
                      </span>
                    </span>
                    {hasDiscount && (
                      <button
                        type="button"
                        onClick={clearDiscount}
                        className="text-[10px] font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Azzera lo sconto"
                      >
                        <X className="w-3 h-3" />
                        <span>Azzera</span>
                      </button>
                    )}
                  </div>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-1">
                    {[0, 5, 10, 15, 20, 30, 50].map((pct) => {
                      const active =
                        pct === 0
                          ? discountMode === "none"
                          : discountMode === "percent" && Math.round(discountPercent) === pct;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPillDiscount(pct)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            active
                              ? "bg-[#5E1788] text-white border-[#5E1788] shadow-2xs scale-105"
                              : "bg-white text-[#5E1788] border-[#D8C2E7] hover:bg-purple-50"
                          }`}
                        >
                          {pct === 0 ? "Nessuno" : `-${pct}%`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom discount inputs */}
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                        Sconto %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={customPercent}
                        onChange={(e) => onCustomPercent(e.target.value)}
                        placeholder="es. 25"
                        className="w-full px-2 py-1 rounded-lg border border-[#D8C2E7] text-xs font-mono font-bold text-[#5E1788] focus:outline-none focus:border-[#5E1788] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                        Sconto €
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customAmount}
                        onChange={(e) => onCustomAmount(e.target.value)}
                        placeholder="es. 2.00"
                        className="w-full px-2 py-1 rounded-lg border border-[#D8C2E7] text-xs font-mono font-bold text-[#5E1788] focus:outline-none focus:border-[#5E1788] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                        Prezzo finale €
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customFinal}
                        onChange={(e) => onCustomFinal(e.target.value)}
                        placeholder={baseListPrice.toFixed(2)}
                        className="w-full px-2 py-1 rounded-lg border border-[#D8C2E7] text-xs font-mono font-bold text-[#5E1788] focus:outline-none focus:border-[#5E1788] bg-white"
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="px-3 py-2 rounded-xl bg-white border border-[#D8C2E7]/70 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-500">
                        Prezzo listino:{" "}
                        <span className={hasDiscount ? "line-through text-gray-400" : "font-bold text-[#1F1B24]"}>
                          €{baseListPrice.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span className="font-bold text-rose-600 ml-1.5">
                            -€{discountAmountValue.toFixed(2)} (-{effectiveDiscountPercent.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#1F1B24] uppercase tracking-wide">
                        Totale Netto:
                      </span>
                    </div>
                    <span className="text-xl font-mono font-extrabold text-[#5E1788]">
                      €{finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLONNA DESTRA: Incasso, Resto, Scontrino & Azioni (5/12) */}
              {/* ========================================================= */}
              <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
                {/* 1-Click Fast In-Store Checkout & Fiscal Print */}
                <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 p-3.5 rounded-2xl border border-[#D8C2E7]/80 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-[#5E1788]" />
                      Incasso Diretto
                    </span>

                    {/* Payment Method Selector */}
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D8C2E7]/60 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setCheckoutPaymentMethod("card")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          checkoutPaymentMethod === "card"
                            ? "bg-[#5E1788] text-white shadow-xs"
                            : "text-gray-600 hover:text-[#5E1788]"
                        }`}
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Carta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutPaymentMethod("cash")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          checkoutPaymentMethod === "cash"
                            ? "bg-[#1F1B24] text-white shadow-xs"
                            : "text-gray-600 hover:text-[#1F1B24]"
                        }`}
                      >
                        <Banknote className="w-3 h-3" />
                        <span>Contanti</span>
                      </button>
                    </div>
                  </div>

                  {/* Cash & Change Calculator Section */}
                  {checkoutPaymentMethod === "cash" && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Calcolo Resto</span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-800">
                          Totale: <strong>€{finalTotal.toFixed(2)}</strong>
                        </span>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold text-emerald-900 mr-0.5">Tagli:</span>
                        {[
                          { label: `Esatto (€${finalTotal.toFixed(2)})`, val: finalTotal },
                          { label: "€5", val: 5 },
                          { label: "€10", val: 10 },
                          { label: "€20", val: 20 },
                          { label: "€50", val: 50 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setCashTendered(preset.val.toFixed(2))}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              cashNum === preset.val
                                ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs scale-105"
                                : "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Input & Live Change */}
                      <div className="grid grid-cols-2 gap-2 items-center pt-0.5">
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-950 mb-0.5">
                            Ricevuto (€)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={cashTendered}
                              onChange={(e) => setCashTendered(e.target.value)}
                              placeholder="10.00"
                              className="w-full pl-6 pr-2 py-1.5 bg-white rounded-lg border border-emerald-300 text-xs font-bold text-emerald-950 focus:outline-none focus:border-emerald-600 shadow-2xs"
                            />
                            <span className="absolute left-2 top-1.5 text-xs font-bold text-emerald-700">€</span>
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg border flex flex-col justify-center text-center ${
                            cashNum < finalTotal
                              ? "bg-rose-50 border-rose-200 text-rose-800"
                              : "bg-white border-emerald-300 text-emerald-900 shadow-2xs"
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">
                            {cashNum < finalTotal ? "Mancano" : "Resto"}
                          </span>
                          <span
                            className={`text-lg font-mono font-extrabold ${
                              cashNum < finalTotal ? "text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {cashNum < finalTotal
                              ? `- €${(finalTotal - cashNum).toFixed(2)}`
                              : `€${changeDue.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasto 1: Incassa e apri cassetto / Incassa e stampa scontrino */}
                  <button
                    type="button"
                    onClick={handleInstantCheckout}
                    disabled={isCheckingOut || currentStock <= 0}
                    className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98 ${
                      checkoutPaymentMethod === "cash"
                        ? "bg-gradient-to-r from-emerald-600 to-[#5E1788] hover:from-emerald-700 hover:to-[#4D1270] text-white"
                        : "bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#4D1270] hover:to-[#5E1788] text-white"
                    }`}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Stampa scontrino in corso...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>
                          {checkoutPaymentMethod === "cash"
                            ? cashNum > finalTotal
                              ? `Incassa €${cashNum.toFixed(2)} (Resto: €${changeDue.toFixed(2)}) & Apri Cassetto`
                              : `Incassa €${finalTotal.toFixed(2)} & Apri Cassetto`
                            : `Incassa €${finalTotal.toFixed(2)} & Stampa Scontrino`}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Tasto 2: Aggiungi a scontrino multiplo */}
                  <button
                    type="button"
                    onClick={handleAddToMultiReceipt}
                    disabled={currentStock <= 0}
                    className="w-full py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-purple-100 hover:bg-purple-200 text-[#5E1788] border border-purple-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
                    title="Aggiungi questo articolo allo scontrino multiplo"
                  >
                    <Plus className="w-4 h-4 text-[#5E1788]" />
                    <span>
                      Aggiungi a scontrino multiplo
                      {multiItemsCount > 0 ? ` (${multiItemsCount} presenti)` : ""}
                    </span>
                  </button>

                  {/* Scorciatoia diretta per visualizzare lo scontrino multiplo se ci sono articoli */}
                  {multiItemsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveScreen("multi_receipt")}
                      className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all flex items-center justify-between cursor-pointer"
                      title="Apri il secondo popup per rivedere tutti i prodotti ed emettere lo scontrino unico"
                    >
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Scontrino Multiplo ({multiItemsCount} pz)</span>
                      </div>
                      <span className="font-mono font-extrabold text-[#5E1788]">
                        Totale €{multiTotal.toFixed(2)} →
                      </span>
                    </button>
                  )}
                </div>

                {/* Pulsanti di servizio su 2 righe e 2 colonne */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Riga 1: Apri cassetto | Sblocco cassa */}
                  <button
                    type="button"
                    onClick={handleOpenCashDrawerOnly}
                    className="w-full px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5E1788] border border-purple-200 text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    title="Apri cassetto Epson"
                  >
                    <Unlock className="w-3.5 h-3.5 text-[#5E1788]" />
                    <span>Apri cassetto</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVoidOpenReceipt}
                    disabled={isCheckingOut}
                    className="w-full px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    title="Annulla scontrino rimasto aperto sulla cassa fisica"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sblocco cassa</span>
                  </button>

                  {/* Riga 2: Salva e chiudi | Esci */}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    title="Salva tutte le modifiche e chiudi"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salva e chiudi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    title="Esci dalla finestra"
                  >
                    <X className="w-3.5 h-3.5 text-gray-500" />
                    <span>Esci</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5 px-1">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-sync cloud attivo: modifichi, chiudi ed è salvato.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* UNRECOGNIZED BARCODE: FAST 1-CLICK REGISTRATION */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="block font-bold mb-0.5">
                    Codice a barre non ancora censito a magazzino
                  </strong>
                  Il barcode <strong>{scannedBarcode}</strong> è stato sparato con successo ma non è associato ad alcun articolo. Puoi registrarlo al volo qui sotto in 5 secondi!
                </div>
              </div>

              <form onSubmit={handleQuickRegister} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#1F1B24] mb-1">
                    Nome Prodotto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="es. Eveline BioHyaluron Crema Riparatrice 40+ 50ml"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D8C2E7] text-xs font-medium text-[#1F1B24] focus:outline-none focus:border-[#5E1788] shadow-xs"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1F1B24] mb-1">
                      Brand / Marchio
                    </label>
                    <input
                      type="text"
                      value={newProdBrand}
                      onChange={(e) => setNewProdBrand(e.target.value)}
                      placeholder="es. Eveline Cosmetics"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8C2E7] text-xs font-medium text-[#1F1B24] focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F1B24] mb-1">
                      Categoria
                    </label>
                    <select
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value as ProductCategory)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8C2E7] text-xs font-medium text-[#1F1B24] bg-white focus:outline-none focus:border-[#5E1788]"
                    >
                      <option value="Skincare & Dermo">Skincare & Dermo</option>
                      <option value="Viso">Viso</option>
                      <option value="Occhi">Occhi</option>
                      <option value="Labbra">Labbra</option>
                      <option value="Beauty & Accessori">Beauty & Accessori</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1F1B24] mb-1">
                      Prezzo Vendita al Pubblico (€) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      placeholder="11.90"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8C2E7] text-xs font-mono font-bold text-[#5E1788] focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F1B24] mb-1">
                      Giacenza Iniziale (Pezzi) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D8C2E7] text-xs font-mono font-bold text-[#1F1B24] focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl border border-[#D8C2E7] text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingNew}
                    className="px-5 py-2.5 rounded-xl bg-brand-royal text-white text-xs font-bold hover:bg-[#7A3293] transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingNew ? "Salvataggio..." : "Salva nel Catalogo"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
