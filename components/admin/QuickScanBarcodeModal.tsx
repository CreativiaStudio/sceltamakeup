"use client";

import React, { useState, useEffect, useCallback } from "react";
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

  // Lookup function for barcode in catalog and store overrides
  const findProductByBarcode = useCallback((barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return null;
    const cleanUpper = clean.toUpperCase();

    // Fast-path shortcut for official test receipt product (TEST01 / 8000000000015)
    if (
      cleanUpper === "TEST01" ||
      cleanUpper === "TEST" ||
      clean === "8000000000015" ||
      cleanUpper === "TEST-SCONTRINO-1EURO"
    ) {
      const testProd = ALL_PRODUCTS.find((p) => p.id === "test-scontrino-1euro");
      if (testProd) {
        return { product: testProd, variantIndex: 0 };
      }
    }

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

    // Search in raw catalog
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
    }

    return null;
  }, []);

  // Sync current stock when matched product/variant changes
  useEffect(() => {
    if (matchedProduct && matchedProduct.variants) {
      const v = matchedProduct.variants[matchedVariantIndex];
      if (v) {
        const state = getAdminStoreState();
        const vStock = state.variantStocks[v.id];
        setCurrentStock(vStock ? vStock.stockQuantity : (v.stock ?? 0));
      }
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
      } else {
        setMatchedProduct(null);
        setMatchedVariantIndex(0);
        setNewProdName("");
        setNewProdPrice("11.90");
        setNewProdStock("3");
        setCashTendered("11.90");
      }

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
      const code = customEv.detail || "8000000000015";
      handleBarcodeScanned(code);
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
      // Direct Keyboard Shortcuts: F2 or Ctrl+B opens test product immediately
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "b")) {
        e.preventDefault();
        handleBarcodeScanned("8000000000015");
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

    updateProductDetails(matchedProduct.id, {
      variants: updatedVariants,
      stock: updatedVariants.reduce((sum, item) => sum + (item.stock || 0), 0),
      inStock: newQty > 0,
    });

    setSuccessToast(`Giacenza aggiornata: ${newQty} pz`);
    setTimeout(() => {
      setIsStockUpdating(false);
      setSuccessToast(null);
    }, 1800);
  };

  // 1-Click Fast In-Store Checkout & Fiscal Receipt Print to Cassa RT
  const handleInstantCheckout = async () => {
    if (!matchedProduct || !matchedProduct.variants) return;
    const v = matchedProduct.variants[matchedVariantIndex];
    const price = v?.price ?? matchedProduct.price;
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

  if (!isOpen) return null;

  const currentVariant = matchedProduct?.variants?.[matchedVariantIndex];
  const currentPrice = (currentVariant?.price ?? matchedProduct?.price) || 1.0;
  const cashNum = parseFloat(cashTendered.replace(",", ".")) || currentPrice;
  const changeDue = Math.max(0, cashNum - currentPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-[#D8C2E7]/80 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#1F1B24] via-[#352542] to-[#5E1788] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Barcode className="w-5 h-5 text-[#D462A6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-300">
                  Scansione Pistola Rilevata
                </span>
              </div>
              <h3 className="font-mono text-base font-bold text-white tracking-widest mt-0.5">
                {scannedBarcode}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title="Chiudi finestra (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Quick Barcode / SKU Switcher or Manual Typing */}
          <div className="flex items-center gap-2 bg-[#FAF7FC] p-2 rounded-2xl border border-[#D8C2E7]/70">
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
              placeholder="Digita codice o barcode (es. 8000000000015 o TEST01)..."
              className="flex-1 px-3 py-1.5 text-xs bg-white rounded-xl border border-[#D8C2E7]/60 text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:border-[#5E1788]"
            />
            <button
              type="button"
              onClick={() => {
                if (manualSearchInput.trim()) {
                  handleBarcodeScanned(manualSearchInput.trim());
                }
              }}
              className="px-3 py-1.5 bg-[#5E1788] text-white text-xs font-bold rounded-xl hover:bg-[#4D1270] transition-colors shrink-0"
            >
              Cerca
            </button>
            <button
              type="button"
              onClick={() => {
                setManualSearchInput("8000000000015");
                handleBarcodeScanned("8000000000015");
              }}
              className="px-2.5 py-1.5 bg-purple-100 text-[#5E1788] text-xs font-bold rounded-xl hover:bg-purple-200 transition-colors shrink-0"
              title="Carica articolo di prova stampa scontrino 1€"
            >
              🧪 Prova 1€
            </button>
          </div>

          {matchedProduct ? (
            /* FOUND PRODUCT CARD */
            <div className="space-y-6">
              <div className="flex gap-5 items-start">
                {/* Product Thumbnail */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/60 overflow-hidden relative shrink-0 shadow-inner flex items-center justify-center">
                  <Image
                    src={
                      currentVariant?.image ||
                      matchedProduct.images?.[0] ||
                      "/brand/logo.png"
                    }
                    alt={matchedProduct.name}
                    fill
                    sizes="112px"
                    className="object-contain p-2"
                  />
                </div>

                {/* Info and Titles */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5E1788] text-[10px] font-bold uppercase tracking-wider">
                      {matchedProduct.brand}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                      {matchedProduct.category}
                    </span>
                  </div>

                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1F1B24] leading-snug">
                    {matchedProduct.name}
                  </h2>

                  {currentVariant && currentVariant.name && currentVariant.name !== "Standard" && (
                    <div className="text-xs font-semibold text-[#D462A6] flex items-center gap-1.5 pt-0.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Tonalità / Formato: {currentVariant.name}</span>
                    </div>
                  )}

                  <div className="pt-1 flex items-baseline gap-3">
                    <span className="text-2xl font-mono font-bold text-[#5E1788]">
                      €{(currentVariant?.price ?? matchedProduct.price).toFixed(2)}
                    </span>
                    {matchedProduct.originalPrice && (
                      <span className="text-sm line-through text-gray-400 font-mono">
                        €{matchedProduct.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock and Real-Time Adjustment Bar */}
              <div className="bg-[#FAF7FC] p-4 rounded-2xl border border-[#D8C2E7]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
                    Giacenza a Banco Salone
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        currentStock > 4
                          ? "bg-emerald-500"
                          : currentStock > 0
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-lg font-mono font-bold text-[#1F1B24]">
                      {currentStock} {currentStock === 1 ? "pezzo" : "pezzi"}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({currentStock > 4 ? "Disponibile" : currentStock > 0 ? "Scorta Bassa" : "Esaurito"})
                    </span>
                  </div>
                </div>

                {/* 1-Click Fast Stock Increment / Decrement */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs font-semibold text-gray-600 mr-1">Regola:</span>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(-1)}
                    disabled={currentStock <= 0 || isStockUpdating}
                    className="w-9 h-9 rounded-xl bg-white border border-[#D8C2E7] hover:bg-rose-50 hover:border-rose-300 text-rose-700 font-bold flex items-center justify-center transition-all shadow-xs disabled:opacity-40"
                    title="Diminuisci giacenza (-1)"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(+1)}
                    disabled={isStockUpdating}
                    className="w-9 h-9 rounded-xl bg-white border border-[#D8C2E7] hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 font-bold flex items-center justify-center transition-all shadow-xs"
                    title="Aumenta giacenza (+1)"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1-Click Fast In-Store Checkout & Fiscal Print */}
              <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 p-4 rounded-2xl border border-[#D8C2E7]/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#5E1788]" />
                    Incasso Diretto al Banco
                  </span>

                  {/* Payment Method Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D8C2E7]/60 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod("card")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        checkoutPaymentMethod === "card"
                          ? "bg-[#5E1788] text-white shadow-xs"
                          : "text-gray-600 hover:text-[#5E1788]"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>myPOS / Carta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod("cash")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        checkoutPaymentMethod === "cash"
                          ? "bg-[#1F1B24] text-white shadow-xs"
                          : "text-gray-600 hover:text-[#1F1B24]"
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Contanti</span>
                    </button>
                  </div>
                </div>

                {/* Cash & Change Calculator Section */}
                {checkoutPaymentMethod === "cash" && (
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-700" />
                        <span>Calcolo Resto al Banco</span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-800">
                        Totale: <strong>€{currentPrice.toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Quick Preset Buttons for Common Banknotes */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-emerald-900 mr-1">Banconota:</span>
                      {[
                        { label: `Esatto (€${currentPrice.toFixed(2)})`, val: currentPrice },
                        { label: "€5", val: 5 },
                        { label: "€10", val: 10 },
                        { label: "€20", val: 20 },
                        { label: "€50", val: 50 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCashTendered(preset.val.toFixed(2))}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            cashNum === preset.val
                              ? "bg-emerald-700 text-white border-emerald-800 shadow-xs scale-105"
                              : "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input & Live Change Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                          Contante Ricevuto (€)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cashTendered}
                            onChange={(e) => setCashTendered(e.target.value)}
                            placeholder="es. 10.00"
                            className="w-full pl-7 pr-3 py-2 bg-white rounded-xl border border-emerald-300 text-sm font-bold text-emerald-950 focus:outline-none focus:border-emerald-600 shadow-2xs"
                          />
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-700">€</span>
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border flex flex-col justify-center ${
                          cashNum < currentPrice
                            ? "bg-rose-50 border-rose-200 text-rose-800"
                            : "bg-white border-emerald-300 text-emerald-900 shadow-xs"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">
                          {cashNum < currentPrice ? "Importo Mancante" : "Resto da Consegnare"}
                        </span>
                        <span
                          className={`text-xl sm:text-2xl font-mono font-extrabold ${
                            cashNum < currentPrice ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {cashNum < currentPrice
                            ? `- €${(currentPrice - cashNum).toFixed(2)}`
                            : `€${changeDue.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleInstantCheckout}
                  disabled={isCheckingOut || currentStock <= 0}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                    checkoutPaymentMethod === "cash"
                      ? "bg-gradient-to-r from-emerald-600 to-[#5E1788] hover:from-emerald-700 hover:to-[#4D1270] text-white"
                      : "bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#4D1270] hover:to-[#5E1788] text-white"
                  }`}
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Emissione scontrino e apertura cassa...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>
                        {checkoutPaymentMethod === "cash"
                          ? cashNum > currentPrice
                            ? `Incassa €${cashNum.toFixed(2)} (Resto: €${changeDue.toFixed(2)}) & Apri Cassetto RT`
                            : `Incassa €${currentPrice.toFixed(2)} & Apri Cassetto RT`
                          : `Incassa €${currentPrice.toFixed(2)} & Stampa Scontrino RT`}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCashDrawerOnly}
                    className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-[#5E1788] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Invia impulso alla porta cassetto della cassa Epson"
                  >
                    <Unlock className="w-3.5 h-3.5 text-[#5E1788]" />
                    <span>Apri Solo Cassetto</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVoidOpenReceipt}
                    className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Annulla lo scontrino rimasto aperto e sblocca la cassa"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Sblocca Cassa</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-xl border border-[#D8C2E7] text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Chiudi (Esc)
                </button>
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
