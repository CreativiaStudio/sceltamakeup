"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  MessageSquare,
  Sparkles,
  Calendar,
  ShoppingCart,
  Edit,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  X,
  Trash2,
  Heart,
  Palette,
  Tag,
  Check,
} from "lucide-react";
import {
  createAdminCustomer,
  deleteAdminCustomer,
  getAdminCustomers,
  updateAdminCustomer,
  SceltaCrmCustomer,
} from "@/lib/adminStore";

// ------------------------------------------------------------------------------
// Beauty profiling presets (allineati al banco di Federica)
// ------------------------------------------------------------------------------

const SKIN_TYPES = ["Mista", "Secca", "Grassa", "Sensibile", "Matura", "Normale"] as const;

const COLOR_PRESETS = [
  "Rosa / Malva",
  "Nude Caldo",
  "Rosso Classico",
  "Toni della Terra / Bronzo",
  "Corallo / Pesca",
  "Bordeaux / Prugna",
  "Luminoso / Glow",
] as const;

const INTEREST_PRESETS = [
  "Trucco Occhi",
  "Labbra",
  "Base Viso & Fondotinta",
  "Skincare Idratante",
  "Trattamenti Anti-Age",
  "Trucco Sposa & Cerimonia",
] as const;

const BRAND_PRESETS = [
  "RVB LAB",
  "Diego dalla Palma",
  "Pierre René",
  "Eveline Cosmetics",
  "Cipria Milano",
  "Miyo",
] as const;

const UNDERTONES = ["Freddo", "Caldo", "Neutro"] as const;
const SEASONS = ["Inverno", "Estate", "Autunno", "Primavera"] as const;

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  skinType: string;
  favoriteColors: string[];
  beautyInterests: string[];
  preferredBrands: string[];
  undertone: string;
  colorSeason: string;
  purchasedProductsNotes: string;
  notes: string;
}

const EMPTY_FORM: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  skinType: "",
  favoriteColors: [],
  beautyInterests: [],
  preferredBrands: [],
  undertone: "",
  colorSeason: "",
  purchasedProductsNotes: "",
  notes: "",
};

type CustomerModalMode = "create" | "edit";

/** Palette chip table-side: ogni nuance ha il suo colore pastello. */
const COLOR_CHIP_CLASSES: Record<string, string> = {
  "Rosa / Malva": "bg-pink-50 text-pink-700 border-pink-200",
  "Nude Caldo": "bg-amber-50 text-amber-800 border-amber-200",
  "Rosso Classico": "bg-red-50 text-red-700 border-red-200",
  "Toni della Terra / Bronzo": "bg-orange-50 text-orange-800 border-orange-200",
  "Corallo / Pesca": "bg-rose-50 text-rose-700 border-rose-200",
  "Bordeaux / Prugna": "bg-purple-100 text-purple-800 border-purple-200",
  "Luminoso / Glow": "bg-yellow-50 text-yellow-800 border-yellow-200",
};

function colorChipClass(color: string): string {
  return COLOR_CHIP_CLASSES[color] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function customerFirstName(name: string): string {
  const trimmed = name.trim();
  return trimmed.split(/\s+/)[0] || trimmed;
}

/** Toni/trucchi citati nei template WhatsApp (con fallback elegante). */
function customerToneLabel(customer: SceltaCrmCustomer): string {
  if (customer.favoriteColors && customer.favoriteColors.length > 0) {
    return customer.favoriteColors.slice(0, 2).join(" e ").toLowerCase();
  }
  if (customer.beautyInterests && customer.beautyInterests.length > 0) {
    return customer.beautyInterests[0].toLowerCase();
  }
  return "rosa, nude e malva";
}

function buildWhatsAppTemplate(templateId: 1 | 2 | 3, customer: SceltaCrmCustomer): string {
  const firstName = customerFirstName(customer.name);

  if (templateId === 2) {
    return `Ciao ${firstName}! Sono Federica di Scelta Makeup. Come ti stai trovando con i cosmetici che abbiamo scelto insieme in salone? Se hai qualsiasi dubbio sull'applicazione o vuoi qualche consiglio per la tua routine, sono qui per te!`;
  }

  if (templateId === 3) {
    return `Ciao ${firstName}! Ti andrebbe di fare una seduta trucco personalizzata o passare a trovarci in Via dei Pellegrini 28/29? Ho qualche chicca perfetta per te!`;
  }

  return `Ciao ${firstName}! Sono Federica di Scelta Makeup 💕 Ho pensato a te perché sono appena arrivate delle novità sui toni ${customerToneLabel(
    customer
  )} che ami tanto! Ti andrebbe di vederle o passare in Atelier a Napoli a provarle?`;
}

function buildWhatsAppUrl(
  customer: SceltaCrmCustomer,
  message: string,
  target: "web" | "app"
): string {
  const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
  if (!cleanPhone) return "";
  const fullPhone = cleanPhone.startsWith("39") ? cleanPhone : "39" + cleanPhone;
  const base = target === "web" ? "https://web.whatsapp.com/send" : "https://wa.me/";
  if (target === "web") {
    return `${base}?phone=${fullPhone}&text=${encodeURIComponent(message)}`;
  }
  return `${base}${fullPhone}?text=${encodeURIComponent(message)}`;
}

// ------------------------------------------------------------------------------
// Pill toggle riutilizzabile (selectable chips del beauty profiling)
// ------------------------------------------------------------------------------

function PillToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${
        active
          ? "bg-[#5E1788] border-[#5E1788] text-white shadow-sm"
          : "bg-white border-gray-200 text-gray-600 hover:border-[#D8C2E7] hover:text-[#5E1788] hover:bg-purple-50/60"
      }`}
    >
      {active && <Check className="w-3 h-3" />}
      <span>{label}</span>
    </button>
  );
}

export default function CrmTable() {
  const [customers, setCustomers] = useState<SceltaCrmCustomer[]>(() => getAdminCustomers());
  const [searchQuery, setSearchQuery] = useState("");

  // Customer modal (create + edit)
  const [customerModalMode, setCustomerModalMode] = useState<CustomerModalMode | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<SceltaCrmCustomer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // WhatsApp Concierge modal
  const [whatsappCustomer, setWhatsappCustomer] = useState<SceltaCrmCustomer | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<1 | 2 | 3 | null>(1);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SceltaCrmCustomer | null>(null);

  // Timer di chiusura del modal dopo il feedback di salvataggio.
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleStoreUpdate = () => setCustomers(getAdminCustomers());
    window.addEventListener("scelta_admin_store_updated", handleStoreUpdate);
    window.addEventListener("scelta_admin_store_reset", handleStoreUpdate);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", handleStoreUpdate);
      window.removeEventListener("scelta_admin_store_reset", handleStoreUpdate);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Customer modal handlers
  // ---------------------------------------------------------------------------

  const openCreateModal = () => {
    clearCloseTimer();
    setCustomerModalMode("create");
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSaveSuccess(false);
  };

  const openEditModal = (customer: SceltaCrmCustomer) => {
    clearCloseTimer();
    setCustomerModalMode("edit");
    setEditingCustomer(customer);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      skinType: customer.skinType || "",
      favoriteColors: [...(customer.favoriteColors || [])],
      beautyInterests: [...(customer.beautyInterests || [])],
      preferredBrands: [...(customer.preferredBrands || [])],
      undertone: customer.undertone || "",
      colorSeason: customer.colorSeason || "",
      purchasedProductsNotes: customer.purchasedProductsNotes || "",
      notes: customer.notes || "",
    });
    setFormError(null);
    setSaveSuccess(false);
  };

  const closeCustomerModal = () => {
    clearCloseTimer();
    setCustomerModalMode(null);
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSaveSuccess(false);
  };

  const handleSaveCustomer = () => {
    const cleanName = form.name.trim();
    if (!cleanName) {
      setFormError("Il nome e cognome della cliente è obbligatorio.");
      return;
    }

    const payload = {
      name: cleanName,
      phone: form.phone.trim(),
      email: form.email.trim(),
      skinType: form.skinType || "Normale",
      preferredBrands: form.preferredBrands,
      beautyInterests: form.beautyInterests,
      favoriteColors: form.favoriteColors,
      purchasedProductsNotes: form.purchasedProductsNotes.trim(),
      colorSeason: form.colorSeason,
      undertone: form.undertone,
      notes: form.notes.trim(),
    };

    try {
      if (customerModalMode === "edit" && editingCustomer) {
        updateAdminCustomer(editingCustomer.id, payload);
      } else {
        createAdminCustomer({
          ...payload,
          totalSpend: 0,
          ordersCount: 0,
          appointmentsCount: 0,
        });
      }

      setCustomers(getAdminCustomers());
      setFormError(null);
      setSaveSuccess(true);
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        setSaveSuccess(false);
        setCustomerModalMode(null);
        setEditingCustomer(null);
        setForm(EMPTY_FORM);
      }, 750);
    } catch (err) {
      console.error("Errore salvataggio scheda cliente:", err);
      setFormError("Salvataggio non riuscito. Riprova.");
    }
  };

  // ---------------------------------------------------------------------------
  // WhatsApp Concierge handlers
  // ---------------------------------------------------------------------------

  const openWhatsAppModal = (customer: SceltaCrmCustomer) => {
    setWhatsappCustomer(customer);
    setSelectedTemplate(1);
    setWhatsappMessage(buildWhatsAppTemplate(1, customer));
  };

  const closeWhatsAppModal = () => {
    setWhatsappCustomer(null);
    setWhatsappMessage("");
    setSelectedTemplate(null);
  };

  const applyTemplate = (templateId: 1 | 2 | 3) => {
    if (!whatsappCustomer) return;
    setSelectedTemplate(templateId);
    setWhatsappMessage(buildWhatsAppTemplate(templateId, whatsappCustomer));
  };

  const handleOpenWhatsApp = (target: "web" | "app") => {
    if (!whatsappCustomer) return;
    const url = buildWhatsAppUrl(whatsappCustomer, whatsappMessage, target);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---------------------------------------------------------------------------
  // Delete handler
  // ---------------------------------------------------------------------------

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const removed = deleteAdminCustomer(deleteTarget.id);
    if (removed) {
      setCustomers(getAdminCustomers());
      if (whatsappCustomer?.id === deleteTarget.id) closeWhatsAppModal();
    }
    setDeleteTarget(null);
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(q) || false;
      const matchEmail = c.email?.toLowerCase().includes(q) || false;
      const matchPhone = c.phone?.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) || false;
      const matchSkin = c.skinType?.toLowerCase().includes(q) || false;
      const matchNotes = c.notes?.toLowerCase().includes(q) || false;
      const matchBrands = c.preferredBrands?.some((b) => b.toLowerCase().includes(q)) || false;
      const matchColors = c.favoriteColors?.some((color) => color.toLowerCase().includes(q)) || false;
      const matchInterests = c.beautyInterests?.some((interest) => interest.toLowerCase().includes(q)) || false;
      const matchPurchases = c.purchasedProductsNotes?.toLowerCase().includes(q) || false;
      const matchSeason = c.colorSeason?.toLowerCase().includes(q) || false;
      const matchUndertone = c.undertone?.toLowerCase().includes(q) || false;

      return (
        matchName ||
        matchEmail ||
        matchPhone ||
        matchSkin ||
        matchNotes ||
        matchBrands ||
        matchColors ||
        matchInterests ||
        matchPurchases ||
        matchSeason ||
        matchUndertone
      );
    });
  }, [customers, searchQuery]);

  const totalSpendAll = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);
  const avgSpend = customers.length > 0 ? totalSpendAll / customers.length : 0;
  const salonClientsCount = customers.filter((c) => c.appointmentsCount > 0).length;

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const isEditing = customerModalMode === "edit" && Boolean(editingCustomer);
  const whatsappUrl =
    whatsappCustomer && whatsappCustomer.phone.replace(/[^0-9]/g, "")
      ? buildWhatsAppUrl(whatsappCustomer, whatsappMessage, "web")
      : "";
  const whatsappAppUrl =
    whatsappCustomer && whatsappCustomer.phone.replace(/[^0-9]/g, "")
      ? buildWhatsAppUrl(whatsappCustomer, whatsappMessage, "app")
      : "";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Clienti & Beauty CRM
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20">
              {customers.length} Anagrafiche
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Anagrafiche, beauty profiling e proposte su misura inviate su WhatsApp direttamente dal PC.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-xs text-gray-500 font-medium">
            Trovati: <strong className="text-[#1F1B24]">{filteredCustomers.length}</strong> clienti
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#5E1788] via-[#6B1F91] to-[#7A3293] hover:from-[#7A3293] hover:to-[#5E1788] text-white text-xs font-semibold shadow-lg shadow-[#5E1788]/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>➕ Nuovo Cliente CRM</span>
          </button>
        </div>
      </div>

      {/* CRM Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Valore Totale Portafoglio</div>
            <div className="text-lg font-bold text-[#1F1B24]">{formatEuro(totalSpendAll)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#D462A6] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Spesa Media per Cliente (LTV)</div>
            <div className="text-lg font-bold text-[#1F1B24]">{formatEuro(avgSpend)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7A3293] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Clienti Cabina & Salone</div>
            <div className="text-lg font-bold text-[#1F1B24]">
              {salonClientsCount} <span className="text-xs font-normal text-gray-500">su {customers.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, telefono, colore amato (es. 'rosa'), interesse beauty, pelle, brand o cosmetici acquistati..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Cancella ricerca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Palette className="w-3 h-3" /> Colori preferiti
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3 h-3" /> Interessi beauty
          </span>
          <span className="inline-flex items-center gap-1">
            <Tag className="w-3 h-3" /> Brand amati
          </span>
        </div>
      </div>

      {/* Customers Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] uppercase tracking-wider font-semibold text-gray-500">
                <th className="py-3 px-4">Cliente & Contatti</th>
                <th className="py-3 px-4">Profilo Bellezza</th>
                <th className="py-3 px-4">Storico Omnichannel</th>
                <th className="py-3 px-4">Spesa Totale (LTV)</th>
                <th className="py-3 px-4">Ultima Attività</th>
                <th className="py-3 px-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    {customers.length === 0 ? (
                      <div className="space-y-3">
                        <p>Nessuna cliente registrata nel CRM.</p>
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-semibold"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Registra la prima cliente
                        </button>
                      </div>
                    ) : (
                      "Nessun cliente trovato per la ricerca effettuata."
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const hasBeautyProfile =
                    Boolean(customer.skinType) ||
                    (customer.favoriteColors?.length ?? 0) > 0 ||
                    (customer.beautyInterests?.length ?? 0) > 0 ||
                    Boolean(customer.purchasedProductsNotes) ||
                    (customer.preferredBrands?.length ?? 0) > 0;

                  return (
                    <tr key={customer.id} className="hover:bg-purple-50/30 transition-colors align-top">
                      {/* Customer Name & Contacts */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#1F1B24] text-sm">
                            {customer.name}
                          </div>
                          {customer.email && (
                            <div className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="break-all">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Beauty Profile */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="space-y-1.5">
                          {customer.skinType && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-[#D462A6] border border-pink-200">
                              Pelle: {customer.skinType}
                            </span>
                          )}

                          {(customer.favoriteColors?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <Palette className="w-3 h-3 text-[#D462A6] shrink-0" />
                              {customer.favoriteColors!.map((color) => (
                                <span
                                  key={color}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${colorChipClass(color)}`}
                                >
                                  {color}
                                </span>
                              ))}
                            </div>
                          )}

                          {(customer.beautyInterests?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <Heart className="w-3 h-3 text-[#7A3293] shrink-0" />
                              {customer.beautyInterests!.map((interest) => (
                                <span
                                  key={interest}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#D8C2E7]/35 text-[#5E1788] border border-[#D8C2E7] font-semibold"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}

                          {customer.purchasedProductsNotes && (
                            <p className="text-[10px] text-gray-600 line-clamp-2 break-words bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                              💄 <strong className="font-semibold">Acquistati:</strong>{" "}
                              {customer.purchasedProductsNotes}
                            </p>
                          )}

                          {(customer.preferredBrands?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                              {customer.preferredBrands!.map((brand) => (
                                <span
                                  key={brand}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium"
                                >
                                  {brand}
                                </span>
                              ))}
                            </div>
                          )}

                          {customer.notes && (
                            <p className="text-[11px] text-gray-500 line-clamp-2 italic">
                              &quot;{customer.notes}&quot;
                            </p>
                          )}

                          {!hasBeautyProfile && (
                            <span className="inline-block text-[10px] text-gray-400 italic">
                              Profilo beauty da completare
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Omnichannel History */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <ShoppingCart className="w-3.5 h-3.5 text-[#5E1788]" />
                            <span>
                              <strong>{customer.ordersCount}</strong> {customer.ordersCount === 1 ? "ordine" : "ordini"} e-comm
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-[#D462A6]" />
                            <span>
                              <strong>{customer.appointmentsCount}</strong> {customer.appointmentsCount === 1 ? "seduta" : "sedute"} salone
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Total Spend */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-[#1F1B24]">
                          {formatEuro(customer.totalSpend)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          Spesa aggregata
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-[11px] text-gray-500">
                        {formatDate(customer.lastActive)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#5E1788] hover:bg-purple-50 transition-colors"
                            title="Modifica anagrafica e profilo beauty"
                            aria-label={`Modifica scheda di ${customer.name}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openWhatsAppModal(customer)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                            title="WhatsApp Concierge: proposta su misura"
                            aria-label={`Apri WhatsApp Concierge per ${customer.name}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(customer)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Elimina scheda cliente"
                            aria-label={`Elimina scheda di ${customer.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Modal 1 — Scheda Cliente & Beauty Profiling (create + edit)          */}
      {/* ==================================================================== */}
      {customerModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-[#1F1B24]/60 backdrop-blur-sm"
            onClick={closeCustomerModal}
          />

          <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#5E1788] via-[#6B1F91] to-[#7A3293]">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D8C2E7]" />
                  {isEditing
                    ? `Scheda Bellezza: ${editingCustomer?.name}`
                    : "Nuova Anagrafica Cliente"}
                </h3>
                <p className="text-[11px] text-[#D8C2E7] mt-0.5">
                  {isEditing
                    ? "Aggiorna gusti, colori e cosmetici per proposte WhatsApp sempre più precise."
                    : "Registra la cliente e costruisci il suo profilo beauty per consigli su misura."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCustomerModal}
                aria-label="Chiudi"
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1 — Anagrafica */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center text-[11px] font-bold">
                    1
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5E1788]">
                    Dati Anagrafici & Contatti
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="crm-name"
                      className="block text-[11px] font-semibold text-gray-700 mb-1"
                    >
                      Nome e Cognome <span className="text-[#D462A6]">*</span>
                    </label>
                    <input
                      id="crm-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Es: Giulia Esposito"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="crm-phone"
                      className="block text-[11px] font-semibold text-gray-700 mb-1"
                    >
                      Telefono / Cellulare
                    </label>
                    <input
                      id="crm-phone"
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+39 333 1234567"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="crm-email"
                      className="block text-[11px] font-semibold text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="crm-email"
                      type="text"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="nome@email.it"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                    />
                  </div>
                </div>
              </section>

              {/* Section 2 — Beauty profiling */}
              <section className="space-y-4 rounded-2xl border border-[#D8C2E7]/70 bg-[#D8C2E7]/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#D462A6]/15 text-[#D462A6] flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5E1788]">
                    Profilo Bellezza & Gusti Cosmetici
                  </h4>
                </div>

                {/* Skin type */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-700 mb-1.5">
                    Tipo di Pelle
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TYPES.map((skin) => (
                      <PillToggle
                        key={skin}
                        label={skin}
                        active={form.skinType === skin}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            skinType: prev.skinType === skin ? "" : skin,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Favorite colors */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#D462A6]" />
                    Colori & Nuance Preferite
                    <span className="text-[10px] font-normal text-gray-400">(selezione multipla)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((color) => (
                      <PillToggle
                        key={color}
                        label={color}
                        active={form.favoriteColors.includes(color)}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            favoriteColors: toggleInList(prev.favoriteColors, color),
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Beauty interests */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#7A3293]" />
                    Interessi Beauty
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_PRESETS.map((interest) => (
                      <PillToggle
                        key={interest}
                        label={interest}
                        active={form.beautyInterests.includes(interest)}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            beautyInterests: toggleInList(prev.beautyInterests, interest),
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#5E1788]" />
                    Brand Preferiti
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BRAND_PRESETS.map((brand) => (
                      <PillToggle
                        key={brand}
                        label={brand}
                        active={form.preferredBrands.includes(brand)}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            preferredBrands: toggleInList(prev.preferredBrands, brand),
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Armocromia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-semibold text-gray-700 mb-1.5">
                      Sottotono
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {UNDERTONES.map((undertone) => (
                        <PillToggle
                          key={undertone}
                          label={undertone}
                          active={form.undertone === undertone}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              undertone: prev.undertone === undertone ? "" : undertone,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-gray-700 mb-1.5">
                      Stagione Armocromatica
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SEASONS.map((season) => (
                        <PillToggle
                          key={season}
                          label={season}
                          active={form.colorSeason === season}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              colorSeason: prev.colorSeason === season ? "" : season,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Purchased products */}
                <div>
                  <label
                    htmlFor="crm-purchased"
                    className="block text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-[#5E1788]" />
                    Trucchi e Cosmetici Acquistati o Provati in Atelier
                  </label>
                  <textarea
                    id="crm-purchased"
                    rows={3}
                    value={form.purchasedProductsNotes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, purchasedProductsNotes: e.target.value }))
                    }
                    placeholder="Es: Ha preso il rossetto rosa malva, siero HA Hero e pennello blush. Preferisce finish satinato."
                    className="w-full p-3 rounded-xl border border-gray-300 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                  />
                </div>

                {/* General notes */}
                <div>
                  <label
                    htmlFor="crm-notes"
                    className="block text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
                    Note Generali & Desideri Futuri
                  </label>
                  <textarea
                    id="crm-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Es: Appassionata di trucco labbra, proporre le nuove matite contorno labbra malva appena arrivano."
                    className="w-full p-3 rounded-xl border border-gray-300 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                  />
                </div>
              </section>

              {isEditing && editingCustomer && (
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#5E1788]" />
                    <span>Dati Omnichannel Aggregati:</span>
                  </div>
                  <div>
                    LTV Complessivo: <strong>{formatEuro(editingCustomer.totalSpend)}</strong>
                  </div>
                  <div>
                    Ordini Online: <strong>{editingCustomer.ordersCount}</strong> | Sedute Salone:{" "}
                    <strong>{editingCustomer.appointmentsCount}</strong>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
              {saveSuccess ? (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditing ? "Scheda cliente aggiornata!" : "Cliente registrata con successo!"}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  <span className="text-[#D462A6]">*</span> Campo obbligatorio · Salvataggio atomico locale
                </span>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={closeCustomerModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  disabled={saveSuccess}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#5E1788] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-70"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Salva Modifiche" : "Salva Cliente"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal 2 — WhatsApp Concierge Diretto sul PC                          */}
      {/* ==================================================================== */}
      {whatsappCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-[#1F1B24]/60 backdrop-blur-sm"
            onClick={closeWhatsAppModal}
          />

          <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-emerald-500">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-100" />
                  WhatsApp Concierge
                </h3>
                <p className="text-[11px] text-emerald-50 mt-0.5">
                  Proposta su misura per {whatsappCustomer.name}, inviata dal PC in un click.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWhatsAppModal}
                aria-label="Chiudi"
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Customer summary */}
              <div className="rounded-2xl border border-[#D8C2E7]/70 bg-[#D8C2E7]/10 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className="font-semibold text-sm text-[#1F1B24]">{whatsappCustomer.name}</div>
                  {whatsappCustomer.phone && (
                    <div className="text-[11px] text-gray-600 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {whatsappCustomer.phone}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {whatsappCustomer.favoriteColors?.map((color) => (
                    <span
                      key={color}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${colorChipClass(color)}`}
                    >
                      Ama il {color}
                    </span>
                  ))}
                  {whatsappCustomer.skinType && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-[#D462A6] border border-pink-200 font-semibold">
                      Pelle {whatsappCustomer.skinType}
                    </span>
                  )}
                  {whatsappCustomer.beautyInterests?.map((interest) => (
                    <span
                      key={interest}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#5E1788] border border-[#D8C2E7] font-semibold"
                    >
                      {interest}
                    </span>
                  ))}
                  {whatsappCustomer.undertone && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200 font-medium">
                      Sottotono {whatsappCustomer.undertone}
                    </span>
                  )}
                  {whatsappCustomer.colorSeason && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200 font-medium">
                      Stagione {whatsappCustomer.colorSeason}
                    </span>
                  )}
                </div>

                {whatsappCustomer.purchasedProductsNotes && (
                  <p className="text-[11px] text-gray-600 line-clamp-2">
                    💄 <strong className="font-semibold">Acquistati:</strong>{" "}
                    {whatsappCustomer.purchasedProductsNotes}
                  </p>
                )}
              </div>

              {/* Templates */}
              <div>
                <div className="text-[11px] font-semibold text-gray-700 mb-2">
                  Template intelligenti (1 click)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate(1)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selectedTemplate === 1
                        ? "border-[#5E1788] bg-[#5E1788]/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-[#D8C2E7] hover:bg-purple-50/40"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#5E1788] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
                      Novità & Colori
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Nuovi arrivi sulle sue nuance preferite
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTemplate(2)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selectedTemplate === 2
                        ? "border-[#5E1788] bg-[#5E1788]/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-[#D8C2E7] hover:bg-purple-50/40"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#5E1788] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Follow-up Acquisto
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Come si trova con i cosmetici scelti
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTemplate(3)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      selectedTemplate === 3
                        ? "border-[#5E1788] bg-[#5E1788]/5 shadow-sm"
                        : "border-gray-200 bg-white hover:border-[#D8C2E7] hover:bg-purple-50/40"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#5E1788] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#7A3293]" />
                      Invito Trattamento
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Seduta trucco personalizzata in Atelier
                    </div>
                  </button>
                </div>
              </div>

              {/* Editable message */}
              <div>
                <label
                  htmlFor="crm-wa-message"
                  className="block text-[11px] font-semibold text-gray-700 mb-1.5"
                >
                  Messaggio WhatsApp (modificabile o testo libero)
                </label>
                <textarea
                  id="crm-wa-message"
                  rows={6}
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Scrivi qui il messaggio personalizzato per la cliente..."
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs leading-relaxed text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="mt-1 text-right text-[10px] text-gray-400">
                  {whatsappMessage.length} caratteri
                </div>
              </div>

              {!whatsappCustomer.phone.replace(/[^0-9]/g, "") && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
                  Questa cliente non ha un numero di telefono: aggiungilo dalla scheda per aprire WhatsApp.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <a
                href={whatsappAppUrl || undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!whatsappAppUrl}
                className={`text-[11px] font-medium underline-offset-2 hover:underline ${
                  whatsappAppUrl ? "text-gray-500 hover:text-emerald-700" : "text-gray-300 pointer-events-none"
                }`}
              >
                Apri su WhatsApp App (wa.me)
              </a>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeWhatsAppModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp("web")}
                  disabled={!whatsappUrl || !whatsappMessage.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Apri WhatsApp su PC</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Delete confirmation                                                  */}
      {/* ==================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-[#1F1B24]/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />

          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#1F1B24]">
                  Eliminare la scheda cliente?
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Stai per rimuovere <strong className="text-[#1F1B24]">{deleteTarget.name}</strong> dal CRM.
                  L&apos;operazione non può essere annullata.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina Scheda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
