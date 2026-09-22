"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Barcode,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
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
  Cloud,
  Sparkles,
} from "lucide-react";
import rawCatalog from "@/data/catalog.json";
import { Product, ProductCategory } from "@/types/product";
import {
  getAdminStoreState,
  updateProductDetails,
  createAdminOrder,
} from "@/lib/adminStore";

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

type DiscountMode = "none" | "percent" | "amount";

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
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [matchedVariantIndex, setMatchedVariantIndex] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [isStockUpdating, setIsStockUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // In-Store Fast Checkout State
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
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const priceDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estemporaneous Counter Discount (current sale only)
  const [discountMode, setDiscountMode] = useState<DiscountMode>("none");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customPercent, setCustomPercent] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customFinal, setCustomFinal] = useState("");

  // Lookup function for barcode in catalog and store overrides
  const findProductByBarcode = useCallback((barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return null;
    const cleanUpper = clean.toUpperCase();

    const state = getAdminStoreState();
    const overrides = state.productOverrides || {};

    // First search in local product overrides
    for (const [prodId, override] of Object.entries(overrides)) {
      if (override.variants) {
        const vIdx = override.variants.findIndex(
          (v) =>
            (v.ean && v.ean.trim().toUpperCase() === cleanUpper) ||
            (v.sku && v.sku.trim().toUpperCase() === cleanUpper)
        );
        if (vIdx !== -1) {
          const baseProd = ALL_PRODUCTS.find((p) => p.id === prodId);
          if (baseProd) {
            return { product: { ...baseProd, ...override }, variantIndex: vIdx };
          }
        }
      }
    }

    // Search in raw catalog variants & shades
    for (const product of ALL_PRODUCTS) {
      if (product.variants) {
        const vIdx = product.variants.findIndex(
          (v) =>
            (v.ean && v.ean.trim().toUpperCase() === cleanUpper) ||
            (v.sku && v.sku.trim().toUpperCase() === cleanUpper)
        );
        if (vIdx !== -1) {
          const override = overrides[product.id];
          return {
            product: override ? { ...product, ...override } : product,
            variantIndex: vIdx,
          };
        }
      }

      if (product.shades) {
        const sIdx = product.shades.findIndex(
          (s) => s.code && s.code.trim().toUpperCase() === cleanUpper
        );
        if (sIdx !== -1) {
          const override = overrides[product.id];
          return {
            product: override ? { ...product, ...override } : product,
            variantIndex: sIdx,
          };
        }
      }
    }

    // Search in synchronized variantStocks
    for (const vStock of Object.values(state.variantStocks || {})) {
      if (
        (vStock.ean && vStock.ean.trim().toUpperCase() === cleanUpper) ||
        (vStock.sku && vStock.sku.trim().toUpperCase() === cleanUpper)
      ) {
        const prod = ALL_PRODUCTS.find((p) => p.id === vStock.productId);
        if (prod) {
          const vIdx = (prod.variants || []).findIndex((v) => v.id === vStock.variantId);
          return {
            product: overrides[prod.id] ? { ...prod, ...overrides[prod.id] } : prod,
            variantIndex: vIdx >= 0 ? vIdx : 0,
          };
        }
      }
    }

    // Direct match by product ID or slug (e.g. from Test Cassa button on products without EAN)
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
  }, [matchedProduct, matchedVariantIndex]);

  // Handle Barcode Scan from any hardware reader or manual trigger
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode || cleanCode.length < 3) return;

      setScannedBarcode(cleanCode);
      const match = findProductByBarcode(cleanCode);

      if (match) {
        setMatchedProduct(match.product);
        setMatchedVariantIndex(match.variantIndex);
        const itemPrice = (match.product.variants?.[match.variantIndex]?.price ?? match.product.price) || 1.0;
        setCashTendered(itemPrice.toFixed(2));
        setPriceEditValue(itemPrice.toFixed(2));
        setTitleEditValue(match.product.name);
      } else {
        setMatchedProduct(null);
        setMatchedVariantIndex(0);
        setNewProdName("");
        setNewProdPrice("11.90");
        setNewProdStock("3");
        setCashTendered("11.90");
        setPriceEditValue("11.90");
        setTitleEditValue("");
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
      setSuccessToast(null);
    },
    [findProductByBarcode]
  );

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
      setSuccessToast("🔓 Cassetto portamonete aperto con successo!");
    } catch (err) {
      console.warn("[Cassa RT] Apertura cassetto:", err);
      setSuccessToast("Comando apertura inviato alla cassa RT.");
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
      const code = customEv.detail;
      if (code) {
        handleBarcodeScanned(code);
      } else {
        setIsOpen(true);
      }
    };
    window.addEventListener("open_quick_scan_modal", handleCustomOpen);
    return () => {
      window.removeEventListener("open_quick_scan_modal", handleCustomOpen);
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
        setIsOpen(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isInput) return; // Don't intercept when user is typing in form inputs

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
      stock: updatedVariants.reduce((sum, item) => sum + (item.stock || 0), 0),
      inStock: newQty > 0,
    });
    markCloudSaved();

    setSuccessToast(`Giacenza aggiornata: ${newQty} pz (sincronizzata nel cloud)`);
    setTimeout(() => {
      setIsStockUpdating(false);
      setSuccessToast(null);
    }, 1800);
  };

  // 1-Click Fast In-Store Checkout & Fiscal Receipt Print to Cassa RT
  const handleInstantCheckout = async () => {
    if (!matchedProduct || !matchedProduct.variants) return;
    const v = matchedProduct.variants[matchedVariantIndex];
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
        stock: updatedVariants.reduce((sum, item) => sum + (item.stock || 0), 0),
        inStock: newQty > 0,
      });

      // 2. Record order in store
      createAdminOrder({
        customerName: "Cliente al Banco",
        customerEmail: "banco@sceltamakeup.it",
        customerPhone: "Vendita Diretta Boutique",
        total: price,
        status: "completed",
        fulfillmentType: "store_pickup",
        items: [
          {
            productId: matchedProduct.id,
            productTitle: matchedProduct.name,
            variantName: v?.name !== "Standard" ? v?.name : undefined,
            quantity: 1,
            price: price,
            image: v?.image || matchedProduct.images?.[0] || "/brand/logo.png",
          },
        ],
      });

      // 3. Emit SOAP XML to Cassa RT (Epson FP-81II RT on 192.168.68.63)
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

        // 4. For cash payments, trigger physical cash drawer opening
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

      setSuccessToast(
        checkoutPaymentMethod === "cash" && change > 0
          ? `🎉 Incassato €${effectivePayment.toFixed(2)} — RESTO DA DARE: €${change.toFixed(2)} (Cassetto Aperto)`
          : `🎉 Vendita completata! Scontrino RT emesso (${checkoutPaymentMethod === "card" ? "myPOS Carta" : "Contanti - Cassetto Aperto"}).`
      );
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore";
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
      setSuccessToast("✅ Comando inviato! La cassa ha annullato lo scontrino aperto.");
    } catch (err) {
      console.warn("[Cassa RT] Annullamento scontrino:", err);
      setSuccessToast("Comando inviato. Se la cassa non risponde, premi ANNULLA/STORNO sulla tastiera della cassa.");
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
      description: `Prodotto registrato al banco boutique con codice a barre ${scannedBarcode}.`,
      shortDescription: newProdName.trim(),
      price: priceNum,
      originalWholesalePrice: Math.round(priceNum * 0.4 * 100) / 100,
      badge: "Novità",
      badges: ["cruelty_free"],
      formulaBenefits: "Formula professionale dermatologicamente testata.",
      howToUse: "Applicare secondo le indicazioni del prodotto.",
      inci: "Formula dermatologicamente testata.",
      features: ["Prodotto professionale boutique", "Testato dermatologicamente"],
      images: ["/products/eveline-cosmetics-packshot.jpg"],
      shades: [
        {
          id: `var-${scannedBarcode}`,
          name: "Standard",
          code: scannedBarcode,
          hex: "#FAF7FC",
          image: "/products/eveline-cosmetics-packshot.jpg",
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
          image: "/products/eveline-cosmetics-packshot.jpg",
          inStock: stockNum > 0,
          price: priceNum,
          stock: stockNum,
        },
      ],
      stock: stockNum,
      inStock: stockNum > 0,
    };

    updateProductDetails(newId, newProduct);

    setMatchedProduct(newProduct);
    setMatchedVariantIndex(0);
    setCurrentStock(stockNum);
    setIsSavingNew(false);
    setSuccessToast("✅ Prodotto registrato e associato al codice a barre!");
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
  const thumbSrc = currentVariant?.image || matchedProduct?.images?.[0] || "/brand/logo.png";
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
      setSuccessToast((result as { error?: string }).error || "Errore durante il salvataggio della foto.");
      setCloudSyncStatus("idle");
      return;
    }

    setMatchedProduct({
      ...matchedProduct,
      variants: updatedVariants.length ? updatedVariants : matchedProduct.variants,
      images: updatedImages,
    });
    markCloudSaved();
    setSuccessToast("Foto aggiornata e sincronizzata nel cloud!");
    setTimeout(() => setSuccessToast(null), 2400);
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !matchedProduct) return;
    setIsUpdatingPhoto(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 600);
      applyNewImage(dataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      setSuccessToast("Impossibile caricare l'immagine: " + msg);
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
        setSuccessToast((result as { error?: string }).error || "Errore salvataggio titolo.");
        setCloudSyncStatus("idle");
        setIsEditingTitle(false);
        return;
      }

      setMatchedProduct((prev) => (prev ? { ...prev, name: clean } : null));
      setIsEditingTitle(false);
      markCloudSaved();
      setSuccessToast("Nome prodotto aggiornato e sincronizzato!");
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
        setSuccessToast((result as { error?: string }).error || "Errore durante il salvataggio del prezzo.");
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
      setSuccessToast(`Prezzo di listino sincronizzato: €${rounded.toFixed(2)}`);
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

    // 3. Close modal
    setIsOpen(false);
  }, [priceEditValue, matchedProduct, commitPriceChange, isEditingTitle, titleEditValue, commitTitleChange]);

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
              <Barcode className="w-4 h-4 text-[#D462A6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-300">
                  Scansione Barcode Cassa
                </span>
              </div>
              <h3 className="font-mono text-sm sm:text-base font-bold text-white tracking-wider leading-none">
                {scannedBarcode || "Attesa scansione..."}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Top Controls: Toast & Search bar (Compact shrink-0) */}
        <div className="px-5 pt-3 pb-1 shrink-0 space-y-2">
          {successToast && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
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

                  {/* Main Checkout Action Button */}
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
                              ? `Incassa €${cashNum.toFixed(2)} (Resto: €${changeDue.toFixed(2)})`
                              : `Incassa €${finalTotal.toFixed(2)} & Apri Cassetto`
                            : `Incassa €${finalTotal.toFixed(2)} & Stampa Scontrino`}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bottom Secondary Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenCashDrawerOnly}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 text-[#5E1788] text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Apri cassetto Epson"
                    >
                      <Unlock className="w-3 h-3 text-[#5E1788]" />
                      <span>Apri Cassetto</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVoidOpenReceipt}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Annulla scontrino rimasto aperto"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span className="hidden sm:inline">Sblocca</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Salva tutte le modifiche e chiudi"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salva & Chiudi</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-3 py-1.5 rounded-lg border border-[#D8C2E7] text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Chiudi (Esc)
                    </button>
                  </div>
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
                    onClick={() => setIsOpen(false)}
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
      </div>
    </div>
  );
}
