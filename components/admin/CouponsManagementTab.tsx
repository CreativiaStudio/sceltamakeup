"use client";

/**
 * Scelta Makeup — Cockpit Gestione Coupon, Smart Link & Locandine QR
 * Module: components/admin/CouponsManagementTab.tsx
 *
 * Tab amministrativa completa per Federica:
 * - Creazione coupon con sconto % o fisso
 * - Selezione prodotti con Pistola Barcode per Locandine
 * - Generazione e Download QR Code alta risoluzione per stampe grafiche
 * - Sincronizzazione Real-Time Cloud Supabase
 */

import React, { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Calendar,
  Sparkles,
  Barcode,
  Trash2,
  Pencil,
  Power,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
} from "lucide-react";
import { PromoCoupon } from "@/types/coupon";
import { useCouponsSync, saveClientCoupon, deleteClientCoupon } from "@/lib/couponStore";
import CouponEditorModal from "./CouponEditorModal";
import QrCodeLocandinaModal from "./QrCodeLocandinaModal";

export default function CouponsManagementTab() {
  const { coupons, isLoading, refresh } = useCouponsSync();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "products" | "brand" | "inactive">("all");

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<PromoCoupon | null>(null);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrCoupon, setSelectedQrCoupon] = useState<PromoCoupon | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // KPIs
  const activeCount = useMemo(() => coupons.filter((c) => c.active).length, [coupons]);
  const totalUses = useMemo(() => coupons.reduce((sum, c) => sum + (c.currentUses || 0), 0), [coupons]);
  const productsFlyersCount = useMemo(
    () => coupons.filter((c) => c.scope === "products" && c.targetProductIds?.length).length,
    [coupons]
  );

  // Filtered list
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.targetBrand && c.targetBrand.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === "active") return c.active;
      if (filterType === "inactive") return !c.active;
      if (filterType === "products") return c.scope === "products";
      if (filterType === "brand") return c.scope === "brand";

      return true;
    });
  }, [coupons, searchQuery, filterType]);

  const handleOpenCreate = () => {
    setCouponToEdit(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (c: PromoCoupon) => {
    setCouponToEdit(c);
    setIsEditorOpen(true);
  };

  const handleOpenQr = (c: PromoCoupon) => {
    setSelectedQrCoupon(c);
    setIsQrModalOpen(true);
  };

  const handleToggleActive = async (c: PromoCoupon) => {
    const updated: PromoCoupon = {
      ...c,
      active: !c.active,
      updatedAt: new Date().toISOString(),
    };
    await saveClientCoupon(updated);
    refresh();
  };

  const handleDelete = async (c: PromoCoupon) => {
    if (confirm(`Sei sicura di voler eliminare definitivamente il coupon "${c.code}"?`)) {
      await deleteClientCoupon(c.id);
      refresh();
    }
  };

  const handleCopySmartLink = (c: PromoCoupon) => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://www.sceltamakeup.it";
    const link =
      c.scope === "products" || c.slug
        ? `${base}/promo/${c.slug || c.code.toLowerCase()}`
        : `${base}/?coupon=${c.code}`;

    navigator.clipboard.writeText(link);
    setCopiedCode(c.code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleWhatsAppShare = (c: PromoCoupon) => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://www.sceltamakeup.it";
    const link =
      c.scope === "products" || c.slug
        ? `${base}/promo/${c.slug || c.code.toLowerCase()}`
        : `${base}/?coupon=${c.code}`;

    const text = `Ciao cara! Ecco il tuo link promozionale per "${c.name}" su Scelta Makeup:\n${link}\n\nLo sconto si attiva subito al carrello! ✨\nFederica - Scelta Makeup Napoli`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-[#D8C2E7]/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A3293]">
            <Tag className="w-4 h-4 text-[#D462A6]" />
            <span>Store & Marketing E-Commerce</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#1F1B24] mt-1">
            Coupon Promozionali & Locandine QR
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl">
            Crea sconti personalizzati, genera landing page per volantini con la pistola barcode e scarica QR code per le locandine del Salone.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-3 rounded-2xl border border-neutral-200 text-neutral-600 hover:bg-[#FAF7FC] transition-colors"
            title="Aggiorna dati dal cloud Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#5E1788]" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white text-xs font-bold hover:shadow-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuova Promo / Locandina QR</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-2xs">
          <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
            Promozioni Attive
          </span>
          <span className="text-2xl font-serif font-bold text-[#5E1788] mt-1 block">
            {activeCount}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            {coupons.length} registrate nel cloud
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-2xs">
          <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
            Utilizzi nei Carrelli
          </span>
          <span className="text-2xl font-serif font-bold text-emerald-600 mt-1 block">
            {totalUses}
          </span>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            Ordini con coupon registrati
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-2xs">
          <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
            Locandine Prodotti Curati
          </span>
          <span className="text-2xl font-serif font-bold text-[#D462A6] mt-1 block">
            {productsFlyersCount}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            Sparati con Pistola Barcode
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-2xs">
          <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
            Sincronizzazione
          </span>
          <span className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Supabase Cloud Live
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Sempre sincronizzato su tutti i PC
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "all"
                ? "bg-[#5E1788] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Tutti ({coupons.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "active"
                ? "bg-[#5E1788] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Attivi ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("products")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === "products"
                ? "bg-[#5E1788] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Locandine Prodotti ({productsFlyersCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("brand")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "brand"
                ? "bg-[#5E1788] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Per Brand
          </button>
          <button
            type="button"
            onClick={() => setFilterType("inactive")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === "inactive"
                ? "bg-[#5E1788] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Inattivi
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Cerca per codice o nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 pl-8 rounded-xl border border-neutral-200 text-xs focus:border-[#5E1788] focus:outline-none bg-[#FAF7FC]"
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
        </div>
      </div>

      {/* Coupons Grid */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 space-y-3">
          <Tag className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-neutral-700">
            Nessuna promozione trovata
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery
              ? "Nessun risultato corrispondente alla ricerca. Prova a modificare i filtri."
              : "Non hai ancora creato coupon o locandine QR. Clicca su 'Nuova Promo / Locandina QR' per iniziare!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map((c) => {
            const isExpired = c.endDate && c.endDate < new Date().toISOString().split("T")[0];
            const isExhausted = c.maxUses && c.currentUses >= c.maxUses;

            const publicUrl =
              c.scope === "products" || c.slug
                ? `https://www.sceltamakeup.it/promo/${c.slug || c.code.toLowerCase()}`
                : `https://www.sceltamakeup.it/?coupon=${c.code}`;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                  !c.active || isExpired || isExhausted
                    ? "border-neutral-200 opacity-80 bg-neutral-50/50"
                    : "border-[#D8C2E7]/80 hover:shadow-md hover:border-[#5E1788]/60"
                }`}
              >
                {/* Header & Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-[#5E1788] bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                      {c.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          Scaduto
                        </span>
                      ) : isExhausted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Esaurito
                        </span>
                      ) : c.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Attivo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Disattivato
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-serif text-base font-bold text-[#1F1B24] line-clamp-1">
                      {c.name}
                    </h4>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
                      {c.description || (c.scope === "products" ? "Landing page prodotti curati da Federica" : c.name)}
                    </p>
                  </div>

                  {/* Scope badge */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {c.scope === "products" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-[#D462A6] text-[11px] font-bold border border-pink-200">
                        <Barcode className="w-3.5 h-3.5" />
                        <span>{c.targetProductIds?.length || 0} Prodotti Curati (Locandina)</span>
                      </span>
                    ) : c.scope === "brand" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-[#5E1788] text-[11px] font-bold border border-purple-200">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Marchio: {c.targetBrand}</span>
                      </span>
                    ) : c.scope === "category" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-[#5E1788] text-[11px] font-bold border border-purple-200">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Categoria: {c.targetCategory}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-[11px] font-bold">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Tutto il Catalogo</span>
                      </span>
                    )}

                    <span className="text-[11px] font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded-lg">
                      {c.discountValue > 0
                        ? c.discountType === "percentage"
                          ? `-${c.discountValue}%`
                          : `-€${c.discountValue.toFixed(2)}`
                        : "Prezzo Speciale"}
                    </span>
                  </div>
                </div>

                {/* Validity details */}
                <div className="p-3 rounded-2xl bg-[#FAF7FC] border border-neutral-200/60 text-[11px] space-y-1 text-neutral-600">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Validità:</span>
                    <span className="font-semibold text-neutral-800">
                      {c.startDate} {c.endDate ? `→ ${c.endDate}` : "(Senza scadenza)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Utilizzi:</span>
                    <span className="font-semibold text-neutral-800">
                      {c.currentUses} {c.maxUses ? `/ ${c.maxUses} max` : "usati"}
                    </span>
                  </div>

                  {c.minSpend && (
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Minimo carrello:</span>
                      <span className="font-semibold text-neutral-800">€{c.minSpend.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* QR Code trigger */}
                    <button
                      type="button"
                      onClick={() => handleOpenQr(c)}
                      className="p-2 rounded-xl bg-purple-50 text-[#5E1788] hover:bg-purple-100 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer border border-purple-200"
                      title="Visualizza e scarica QR Code locandina"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code</span>
                    </button>

                    {/* Copy smart link */}
                    <button
                      type="button"
                      onClick={() => handleCopySmartLink(c)}
                      className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Copia link personalizzato"
                    >
                      {copiedCode === c.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiato!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Link</span>
                        </>
                      )}
                    </button>

                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(c)}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer border border-emerald-200"
                      title="Condividi su WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {/* Secondary actions: Toggle, Edit, Delete */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      className={`text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        c.active
                          ? "text-neutral-500 hover:text-amber-700"
                          : "text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{c.active ? "Disattiva" : "Attiva"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-[#5E1788] hover:bg-purple-50 transition-colors"
                        title="Modifica impostazioni"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Elimina promozione"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CouponEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        couponToEdit={couponToEdit}
        onSaved={() => refresh()}
      />

      <QrCodeLocandinaModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        coupon={selectedQrCoupon}
      />
    </div>
  );
}
