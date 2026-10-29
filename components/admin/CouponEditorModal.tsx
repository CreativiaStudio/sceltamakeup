"use client";

/**
 * Scelta Makeup — Modal Creazione & Modifica Coupon / Locandine QR
 * Module: components/admin/CouponEditorModal.tsx
 *
 * Include la modalità esclusiva "Pistola Barcode": Federica spara i prodotti fisici
 * dal banco/scaffale e questi si aggiungono automaticamente alla selezione promozionale
 * per la Landing Page e per il QR Code della locandina!
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Save,
  Barcode,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Search,
  Calendar,
  Tag,
  QrCode,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
} from "lucide-react";
import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";
import { PromoCoupon, DiscountScope, DiscountType } from "@/types/coupon";
import { saveClientCoupon } from "@/lib/couponStore";
import { getAdminStoreState } from "@/lib/adminStore";
import { safeImageSrc } from "@/lib/r2";

interface CouponEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: PromoCoupon | null;
  onSaved?: (savedCoupon: PromoCoupon) => void;
}

const ALL_PRODUCTS = rawCatalog as Product[];

const REAL_BRANDS = [
  "Diego dalla Palma",
  "RVB LAB",
  "Cipria Make Up",
  "Eveline Cosmetics",
  "Pierre René",
  "Miyo",
];

const REAL_CATEGORIES = [
  "Skincare & Dermo",
  "Viso",
  "Occhi",
  "Labbra",
  "Beauty & Accessori",
];

/** Foto del Salone selezionabili per l'hero della landing page promozionale */
const SALON_HERO_OPTIONS = [
  {
    src: "/boutique/salone-postazioni-makeup-frontale.webp",
    label: "Postazioni Make-Up & Trattamenti",
  },
  {
    src: "/boutique/salone-area-diego-dalla-palma-rvb.webp",
    label: "Corner Diego dalla Palma & RVB",
  },
  {
    src: "/boutique/salone-postazioni-trucco-specchi.webp",
    label: "Specchiere d'Autore",
  },
  {
    src: "/boutique/salone-salottino-attesa-panoramico.webp",
    label: "Salottino Relax Lounge",
  },
  {
    src: "/boutique/salone-panoramica-boutique-completa.webp",
    label: "Panoramica Salone",
  },
];

const DEFAULT_HERO_IMAGE = SALON_HERO_OPTIONS[0].src;

function playPosBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1300, ctx.currentTime);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

export default function CouponEditorModal({
  isOpen,
  onClose,
  couponToEdit,
  onSaved,
}: CouponEditorModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [scope, setScope] = useState<DiscountScope>("products");
  const [targetBrand, setTargetBrand] = useState("Diego dalla Palma");
  const [targetCategory, setTargetCategory] = useState("Viso");
  const [targetProductIds, setTargetProductIds] = useState<string[]>([]);

  // Landing page copy
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [badgeText, setBadgeText] = useState("Offerta Esclusiva Salone");
  const [heroImage, setHeroImage] = useState<string>(DEFAULT_HERO_IMAGE);

  // Restrictions
  const [minSpend, setMinSpend] = useState<string>("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [active, setActive] = useState(true);
  const [bannerText, setBannerText] = useState("");

  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{
    text: string;
    type: "success" | "warning" | "error";
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (couponToEdit) {
      setCode(couponToEdit.code);
      setName(couponToEdit.name);
      setSlug(couponToEdit.slug || couponToEdit.code.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));
      setDiscountType(couponToEdit.discountType);
      setDiscountValue(couponToEdit.discountValue);
      setScope(couponToEdit.scope);
      setTargetBrand(couponToEdit.targetBrand || "Diego dalla Palma");
      setTargetCategory(couponToEdit.targetCategory || "Viso");
      setTargetProductIds(couponToEdit.targetProductIds || []);
      setHeadline(couponToEdit.headline || "");
      setDescription(couponToEdit.description || "");
      setBadgeText(couponToEdit.badgeText || "Offerta Esclusiva Salone");
      setHeroImage(couponToEdit.heroImage || DEFAULT_HERO_IMAGE);
      setMinSpend(couponToEdit.minSpend ? String(couponToEdit.minSpend) : "");
      setStartDate(couponToEdit.startDate);
      setEndDate(couponToEdit.endDate || "");
      setMaxUses(couponToEdit.maxUses ? String(couponToEdit.maxUses) : "");
      setActive(couponToEdit.active !== false);
      setBannerText(couponToEdit.bannerText || "");
    } else {
      setCode("");
      setName("");
      setSlug("");
      setDiscountType("percentage");
      setDiscountValue(10);
      setScope("products");
      setTargetBrand("Diego dalla Palma");
      setTargetCategory("Viso");
      setTargetProductIds([]);
      setHeadline("");
      setDescription("");
      setBadgeText("Offerta Esclusiva Salone");
      setHeroImage(DEFAULT_HERO_IMAGE);
      setMinSpend("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setMaxUses("");
      setActive(true);
      setBannerText("");
    }
    setScanFeedback(null);
  }, [couponToEdit, isOpen]);

  // Auto-slugify code or name if slug is empty
  const handleNameChange = (val: string) => {
    setName(val);
    if (!couponToEdit && !slug) {
      setSlug(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  };

  const handleCodeChange = (val: string) => {
    const upper = val.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    setCode(upper);
    if (!couponToEdit && (!slug || slug === code.toLowerCase())) {
      setSlug(upper.toLowerCase());
    }
  };

  // Find product helper with overrides
  const findProductByCode = useCallback((scannedCode: string): Product | null => {
    const clean = scannedCode.trim().toUpperCase();
    if (!clean) return null;

    const state = getAdminStoreState();
    const overrides = (state.productOverrides || {}) as Record<string, Partial<Product>>;

    // 1. Search in ALL_PRODUCTS by EAN or SKU in variants / shades
    for (const prod of ALL_PRODUCTS) {
      if (prod.variants) {
        const hasMatch = prod.variants.some(
          (v) =>
            (v?.ean && v.ean.trim().toUpperCase() === clean) ||
            (v?.sku && v.sku.trim().toUpperCase() === clean)
        );
        if (hasMatch) {
          return overrides[prod.id] ? { ...prod, ...overrides[prod.id] } : prod;
        }
      }
      if (prod.shades) {
        const hasShade = prod.shades.some(
          (s) => s?.code && s.code.trim().toUpperCase() === clean
        );
        if (hasShade) {
          return overrides[prod.id] ? { ...prod, ...overrides[prod.id] } : prod;
        }
      }
      if (prod.id.toUpperCase() === clean || prod.slug.toUpperCase() === clean) {
        return overrides[prod.id] ? { ...prod, ...overrides[prod.id] } : prod;
      }
    }

    // 2. Direct match in overrides
    for (const [id, ov] of Object.entries(overrides)) {
      if (id.toUpperCase() === clean || (ov.slug && ov.slug.toUpperCase() === clean)) {
        return ov as Product;
      }
    }

    return null;
  }, []);

  // Barcode Gun listener when Modal is open
  useEffect(() => {
    if (!isOpen) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular text fields unless it's a very fast scanner sequence (< 50ms)
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (diff > 500 && buffer.length > 0) {
        buffer = "";
      }

      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          // Detected scanner or quick enter code
          e.preventDefault();
          e.stopPropagation();
          const scanned = buffer.trim();
          buffer = "";

          const matched = findProductByCode(scanned);
          if (matched) {
            playPosBeep();
            setTargetProductIds((prev) => {
              if (prev.includes(matched.id)) {
                setScanFeedback({
                  text: `⚠️ "${matched.name}" è già nella lista!`,
                  type: "warning",
                });
                return prev;
              }
              setScanFeedback({
                text: `✅ Sparato con successo: "${matched.name}" (${matched.brand})`,
                type: "success",
              });
              return [...prev, matched.id];
            });
          } else {
            setScanFeedback({
              text: `❌ Nessun prodotto trovato per il codice "${scanned}".`,
              type: "error",
            });
          }
        } else {
          buffer = "";
        }
        return;
      }

      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If user is focused on a text input, only accumulate if typing is scanner-fast (<60ms)
        if (isInput && diff > 70) {
          buffer = "";
          return;
        }
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, findProductByCode]);

  // Selected products resolution
  const selectedProducts = useMemo(() => {
    const state = getAdminStoreState();
    const overrides = (state.productOverrides || {}) as Record<string, Partial<Product>>;
    return targetProductIds
      .map((id) => {
        const prod = ALL_PRODUCTS.find((p) => p.id === id);
        if (prod) {
          return overrides[prod.id] ? { ...prod, ...overrides[prod.id] } : prod;
        }
        return overrides[id] as Product | undefined;
      })
      .filter(Boolean) as Product[];
  }, [targetProductIds]);

  // Filter products for manual search
  const manualSearchMatches = useMemo(() => {
    const q = manualSearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return ALL_PRODUCTS.filter(
      (p) =>
        (p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)) &&
        !targetProductIds.includes(p.id)
    ).slice(0, 6);
  }, [manualSearchQuery, targetProductIds]);

  const handleAddManualProduct = (prodId: string) => {
    if (!targetProductIds.includes(prodId)) {
      setTargetProductIds((prev) => [...prev, prodId]);
      setManualSearchQuery("");
      setScanFeedback({
        text: `✅ Prodotto aggiunto alla selezione.`,
        type: "success",
      });
    }
  };

  const handleRemoveProduct = (prodId: string) => {
    setTargetProductIds((prev) => prev.filter((id) => id !== prodId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert("Inserisci un codice promozionale (es. DIEGO10 o HALLOWEEN35).");
      return;
    }
    if (!name.trim()) {
      alert("Inserisci un nome descrittivo per la promozione.");
      return;
    }
    if (scope === "products" && targetProductIds.length === 0) {
      alert("Hai selezionato 'Prodotti Selezionati' ma non hai ancora sparato o aggiunto alcun prodotto!");
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const cleanSlug = (slug || code.toLowerCase()).trim().replace(/[^a-z0-9_-]/g, "-");

      const payload: PromoCoupon = {
        id: couponToEdit ? couponToEdit.id : `cpn-${Date.now()}`,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        slug: cleanSlug,
        discountType,
        discountValue: Number(discountValue) || 0,
        scope,
        targetBrand: scope === "brand" ? targetBrand : undefined,
        targetCategory: scope === "category" ? targetCategory : undefined,
        targetProductIds: scope === "products" ? targetProductIds : undefined,
        headline: headline.trim() || name.trim(),
        description: description.trim() || undefined,
        badgeText: badgeText.trim() || "Offerta Esclusiva Salone",
        heroImage: heroImage || DEFAULT_HERO_IMAGE,
        minSpend: minSpend ? parseFloat(minSpend) : undefined,
        startDate: startDate || nowIso.split("T")[0],
        endDate: endDate ? endDate : undefined,
        maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
        currentUses: couponToEdit ? couponToEdit.currentUses : 0,
        active,
        autoApplyOnLink: true,
        bannerText:
          bannerText.trim() ||
          `🎉 Offerta ${name.trim()} applicata con successo!`,
        createdAt: couponToEdit ? couponToEdit.createdAt : nowIso,
        updatedAt: nowIso,
      };

      const success = await saveClientCoupon(payload);
      if (success) {
        if (onSaved) onSaved(payload);
        onClose();
      } else {
        alert("Errore durante il salvataggio sul cloud Supabase. Riprova.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore";
      alert("Errore: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#D8C2E7]/70 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center font-bold">
              <QrCode className="w-6 h-6 text-[#5E1788]" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1F1B24]">
                {couponToEdit ? "Modifica Promo & Locandina" : "Nuova Promo, Smart Link & Locandina QR"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Crea sconti automatici, genera landing page e spara i prodotti con la pistola barcode
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Codice Coupon (Maiuscolo) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="es. HALLOWEEN35, DIEGO10"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-mono font-bold uppercase focus:border-[#5E1788] focus:outline-none bg-[#FAF7FC]"
                />
                <Tag className="absolute right-3.5 top-3 w-4 h-4 text-[#5E1788]/50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Nome Promozione *
              </label>
              <input
                type="text"
                required
                placeholder="es. Speciale Halloween Glow, Diego dalla Palma 10%"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold focus:border-[#5E1788] focus:outline-none"
              />
            </div>
          </div>

          {/* Discount Settings */}
          <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/40 space-y-4">
            <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider block">
              Configurazione Sconto
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Tipo Sconto
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold focus:border-[#5E1788] focus:outline-none bg-white"
                >
                  <option value="percentage">% Percentuale</option>
                  <option value="fixed">€ Importo Fisso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Valore Sconto
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold focus:border-[#5E1788] focus:outline-none bg-white"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-neutral-400">
                    {discountType === "percentage" ? "%" : "€"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Spesa Minima (Opzionale)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="Nessuna"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:border-[#5E1788] focus:outline-none bg-white"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-neutral-400">
                    €
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Ambito di Applicazione & Selezione Prodotti
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setScope("products")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  scope === "products"
                    ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-[#5E1788]/50"
                }`}
              >
                <Barcode className="w-5 h-5" />
                <span>Pistola / Prodotti</span>
              </button>

              <button
                type="button"
                onClick={() => setScope("brand")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  scope === "brand"
                    ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-[#5E1788]/50"
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span>Singolo Brand</span>
              </button>

              <button
                type="button"
                onClick={() => setScope("category")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  scope === "category"
                    ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-[#5E1788]/50"
                }`}
              >
                <Tag className="w-5 h-5" />
                <span>Categoria</span>
              </button>

              <button
                type="button"
                onClick={() => setScope("all")}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  scope === "all"
                    ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-[#5E1788]/50"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Tutto il Catalogo</span>
              </button>
            </div>
          </div>

          {/* Conditional Scope Target */}
          {scope === "brand" && (
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200">
              <label className="block text-xs font-bold text-[#5E1788] uppercase mb-1.5">
                Seleziona Marchio
              </label>
              <select
                value={targetBrand}
                onChange={(e) => setTargetBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold focus:border-[#5E1788] focus:outline-none bg-white"
              >
                {REAL_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === "category" && (
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200">
              <label className="block text-xs font-bold text-[#5E1788] uppercase mb-1.5">
                Seleziona Categoria
              </label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold focus:border-[#5E1788] focus:outline-none bg-white"
              >
                {REAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* BARCODE GUN INTERACTIVE TARGET ZONE */}
          {scope === "products" && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50/30 to-purple-50 border-2 border-dashed border-[#5E1788]/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider">
                    Modalità Pistola Barcode ATTIVA
                  </span>
                </div>
                <span className="text-xs font-bold text-[#7A3293] bg-white px-3 py-1 rounded-full border border-purple-200">
                  {targetProductIds.length}{" "}
                  {targetProductIds.length === 1 ? "prodotto inserito" : "prodotti inseriti"}
                </span>
              </div>

              <p className="text-xs text-neutral-600">
                Punta la pistola barcode sui prodotti fisici (scatola o codice a barre) e premi il grilletto:
                i prodotti emetteranno il classico beep e compariranno all&apos;istante qui sotto nella locandina!
              </p>

              {/* Scan Toast feedback */}
              {scanFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                    scanFeedback.type === "success"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : scanFeedback.type === "warning"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  <span>{scanFeedback.text}</span>
                  <button
                    type="button"
                    onClick={() => setScanFeedback(null)}
                    className="text-neutral-500 hover:text-neutral-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Manual search fallback */}
              <div className="space-y-1.5 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Oppure cerca prodotto a mano per nome o brand..."
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl border border-neutral-300 text-xs focus:border-[#5E1788] focus:outline-none bg-white shadow-2xs"
                  />
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                </div>

                {manualSearchMatches.length > 0 && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-lg divide-y divide-neutral-100 overflow-hidden">
                    {manualSearchMatches.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddManualProduct(p.id)}
                        className="p-2.5 flex items-center justify-between hover:bg-purple-50/50 cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                            <Image
                              src={safeImageSrc(p.images?.[0])}
                              alt={p.name}
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-900 block truncate max-w-xs">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-neutral-500">{p.brand}</span>
                          </div>
                        </div>
                        <span className="font-bold text-[#5E1788]">
                          + Aggiungi (€{(p.price || 0).toFixed(2)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid of added products */}
              {selectedProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 max-h-60 overflow-y-auto pr-1">
                  {selectedProducts.map((p) => {
                    const baseP = p.price || 0;
                    const discountedP =
                      discountType === "percentage"
                        ? Math.max(0, baseP * (1 - discountValue / 100))
                        : Math.max(0, baseP - discountValue);

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl p-2.5 border border-purple-200/80 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                            <Image
                              src={safeImageSrc(p.images?.[0])}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-neutral-900 block truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-neutral-500 block">
                              {p.brand}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {discountValue > 0 && (
                                <span className="text-[11px] text-neutral-400 line-through">
                                  €{baseP.toFixed(2)}
                                </span>
                              )}
                              <span className="text-xs font-bold text-[#5E1788]">
                                €{discountedP.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(p.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Rimuovi prodotto dalla locandina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-white/60 rounded-2xl border border-neutral-200 text-neutral-400 text-xs">
                  Nessun prodotto ancora aggiunto. Spara un codice a barre o cercalo sopra!
                </div>
              )}
            </div>
          )}

          {/* Landing Page & Flyer Settings */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-4">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
              Testi per Landing Page & Locandina
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Titolo Landing (Hero Headline)
                </label>
                <input
                  type="text"
                  placeholder={name || "es. La Selezione Esclusiva di Federica"}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:border-[#5E1788] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">
                  Badge In Alto (Esclusiva Salone)
                </label>
                <input
                  type="text"
                  placeholder="es. Offerta Esclusiva Salone"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:border-[#5E1788] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Descrizione Persuasiva Landing (Opzionale)
              </label>
              <textarea
                rows={2}
                placeholder="es. I prodotti essenziali per una base perfetta e a lunga tenuta, selezionati personalmente nel Salone Scelta Makeup."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:border-[#5E1788] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Foto del Salone nell&apos;Hero della Landing
              </label>
              <p className="text-[11px] text-neutral-500 mb-2">
                Scegli l&apos;immagine che accompagna il titolo. Il contrasto viola royal e lilla valorizza gli ambienti
                del Salone.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SALON_HERO_OPTIONS.map((option) => {
                  const isSelected = (heroImage || DEFAULT_HERO_IMAGE) === option.src;
                  return (
                    <button
                      key={option.src}
                      type="button"
                      onClick={() => setHeroImage(option.src)}
                      className={`relative overflow-hidden rounded-2xl border text-left transition-all cursor-pointer group ${
                        isSelected
                          ? "border-[#5E1788] ring-2 ring-[#5E1788]/40 shadow-md"
                          : "border-neutral-200 hover:border-[#7A3293]/60"
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
                        <Image
                          src={option.src}
                          alt={option.label}
                          fill
                          sizes="(max-width: 640px) 50vw, 200px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#5E1788] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`px-2.5 py-2 text-[10px] font-bold leading-tight ${
                          isSelected ? "bg-[#5E1788] text-white" : "bg-white text-neutral-700"
                        }`}
                      >
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Slug Personalizzato URL (es. /promo/{slug || "slug-promo"})
              </label>
              <input
                type="text"
                placeholder="es. halloween-glow"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono focus:border-[#5E1788] focus:outline-none bg-[#FAF7FC]"
              />
            </div>
          </div>

          {/* Dates & Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Data Inizio *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:border-[#5E1788] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Data Scadenza (Opzionale)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:border-[#5E1788] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">
                Max Utilizzi (Opzionale)
              </label>
              <input
                type="number"
                min="1"
                placeholder="Illimitati"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold focus:border-[#5E1788] focus:outline-none"
              />
            </div>
          </div>

          {/* Active switch */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="activeToggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#5E1788] focus:ring-[#5E1788] cursor-pointer"
            />
            <label htmlFor="activeToggle" className="text-xs font-bold text-neutral-800 cursor-pointer">
              Attiva subito questa promozione e la relativa Landing Page
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] text-white text-xs font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Salvataggio..." : "Salva Promozione & Landing"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
