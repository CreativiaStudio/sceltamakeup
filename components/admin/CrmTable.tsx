"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
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
} from "lucide-react";
import {
  getAdminCustomers,
  updateCustomerNotes,
  SceltaCrmCustomer,
} from "@/lib/adminStore";

export default function CrmTable() {
  const [customers, setCustomers] = useState<SceltaCrmCustomer[]>(() => getAdminCustomers());
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<SceltaCrmCustomer | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const handleStoreUpdate = () => setCustomers(getAdminCustomers());
    window.addEventListener("scelta_admin_store_updated", handleStoreUpdate);
    window.addEventListener("scelta_admin_store_reset", handleStoreUpdate);
    return () => {
      window.removeEventListener("scelta_admin_store_updated", handleStoreUpdate);
      window.removeEventListener("scelta_admin_store_reset", handleStoreUpdate);
    };
  }, []);

  const handleOpenEdit = (customer: SceltaCrmCustomer) => {
    setEditingCustomer(customer);
    setNotesInput(customer.notes || "");
    setSaveSuccess(false);
  };

  const handleSaveNotes = () => {
    if (!editingCustomer) return;
    try {
      updateCustomerNotes(editingCustomer.id, notesInput);
      setCustomers(getAdminCustomers());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditingCustomer(null);
      }, 700);
    } catch (err) {
      console.error("Errore salvataggio note cliente:", err);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q);
      const matchSkin = c.skinType?.toLowerCase().includes(q) || false;
      const matchNotes = c.notes?.toLowerCase().includes(q) || false;
      const matchBrands = c.preferredBrands?.some((b) => b.toLowerCase().includes(q)) || false;

      return matchName || matchEmail || matchPhone || matchSkin || matchNotes || matchBrands;
    });
  }, [customers, searchQuery]);

  const totalSpendAll = customers.reduce((sum, c) => sum + c.totalSpend, 0);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
              Clienti & CRM Omnichannel
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#5E1788]/10 text-[#5E1788] border border-[#5E1788]/20">
              {customers.length} Anagrafiche
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Valore del cliente unificato tra acquisti cosmesi online e sedute make-up/trattamenti in cabina a Napoli.
          </p>
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Trovati: <strong className="text-[#1F1B24]">{filteredCustomers.length}</strong> clienti
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
            placeholder="Cerca cliente per nome, email, telefono, tipo di pelle o note beauty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1F1B24] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 font-bold"
            >
              ×
            </button>
          )}
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
                    Nessun cliente trovato per la ricerca effettuata.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      {/* Customer Name & Contacts */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#1F1B24] text-sm">
                            {customer.name}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Beauty Profile & Skin Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1.5">
                          {customer.skinType && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-[#D462A6] border border-pink-200">
                              Pelle: {customer.skinType}
                            </span>
                          )}
                          <p className="text-[11px] text-gray-600 line-clamp-2 italic">
                            &quot;{customer.notes || "Nessuna nota beauty inserita."}&quot;
                          </p>
                          {customer.preferredBrands && customer.preferredBrands.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {customer.preferredBrands.map((b) => (
                                <span
                                  key={b}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#5E1788] hover:bg-purple-50 transition-colors"
                            title="Modifica scheda bellezza e note"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <a
                            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Ciao ${customer.name}! Ti scriviamo dal salone Scelta Makeup di Napoli (Via dei Pellegrini 28/29).`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                            title="Apri chat WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
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

      {/* Edit Customer Notes Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-[#1F1B24]/60 backdrop-blur-sm"
            onClick={() => setEditingCustomer(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1F1B24]">
                  Scheda Bellezza: {editingCustomer.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Note riservate di Federica Cesiano per consulenze personalizzate
                </p>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Note Tecniche, Tipologia di Pelle & Preferenze:
                </label>
                <textarea
                  rows={4}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Es: Pelle mista disidratata, preferisce primer opacizzante e tonalità rossetto nude caldo..."
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs text-[#1F1B24] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788]"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#5E1788]" />
                  <span>Dati Omnichannel Aggregati:</span>
                </div>
                <div>LTV Complessivo: <strong>{formatEuro(editingCustomer.totalSpend)}</strong></div>
                <div>Ordini Online: <strong>{editingCustomer.ordersCount}</strong> | Sedute Salone: <strong>{editingCustomer.appointmentsCount}</strong></div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              {saveSuccess ? (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Note salvate con successo!
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">Salvataggio atomico locale</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-5 py-2 rounded-xl bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
