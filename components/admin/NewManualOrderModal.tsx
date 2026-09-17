"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  User,
  Truck,
  Store,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";
import {
  createAdminOrder,
  SceltaAdminOrder,
  getAdminVariantStocks,
} from "@/lib/adminStore";

interface NewManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: SceltaAdminOrder) => void;
}

interface SelectedItem {
  productId: string;
  productTitle: string;
  variantId?: string;
  variantName?: string;
  price: number;
  quantity: number;
  image: string;
}

const ALL_PRODUCTS = rawCatalog as Product[];

export default function NewManualOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: NewManualOrderModalProps) {
  const [originChannel, setOriginChannel] = useState<"banco" | "telefono" | "whatsapp">("banco");
  const [fulfillmentType, setFulfillmentType] = useState<"store_pickup" | "courier">("store_pickup");

  // Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+39 ");

  // Shipping form
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Napoli");
  const [postalCode, setPostalCode] = useState("80121");
  const [province, setProvince] = useState("NA");
  const [courierName, setCourierName] = useState("BRT Express");

  // Items in order
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Product catalog search for adding items
  const [searchCatalogQuery, setSearchCatalogQuery] = useState("");
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<SceltaAdminOrder | null>(null);

  // Catalog search filtering
  const matchingProducts = useMemo(() => {
    const q = searchCatalogQuery.trim().toLowerCase();
    if (!q) return ALL_PRODUCTS.slice(0, 8);

    return ALL_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.variants?.some(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          (v.ean && v.ean.includes(q))
      )
    ).slice(0, 10);
  }, [searchCatalogQuery]);

  const handleAddItem = (product: Product, variantIndex: number = 0) => {
    const v = product.variants?.[variantIndex];
    const itemPrice = v?.price !== undefined ? v.price : product.price;
    const itemVariantName = v?.name || product.shades?.[variantIndex]?.name || undefined;
    const itemImage = v?.image || product.images?.[0] || "/brand/logo.png";

    const existingIndex = selectedItems.findIndex(
      (item) => item.productId === product.id && item.variantId === (v?.id || "default")
    );

    if (existingIndex > -1) {
      setSelectedItems((prev) => {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      });
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productTitle: product.name,
          variantId: v?.id || "default",
          variantName: itemVariantName,
          price: itemPrice,
          quantity: 1,
          image: itemImage,
        },
      ]);
    }
  };

  const handleItemQuantity = (index: number, delta: number) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial calculations
  const itemsSubtotal = selectedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const shippingFee = fulfillmentType === "store_pickup" || itemsSubtotal >= 49 || itemsSubtotal === 0 ? 0 : 5.90;
  const orderTotal = Math.round((itemsSubtotal + shippingFee) * 100) / 100;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Inserisci il nome e cognome del cliente.");
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg("Aggiungi almeno un articolo cosmetico all'ordine.");
      return;
    }
    if (fulfillmentType === "courier" && (!street.trim() || !city.trim() || !postalCode.trim())) {
      setErrorMsg("Inserisci l'indirizzo di spedizione completo.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newOrder = createAdminOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || `${customerName.toLowerCase().replace(/\s+/g, ".")}@cliente.sceltamakeup.it`,
        customerPhone: customerPhone.trim(),
        total: orderTotal,
        status: fulfillmentType === "store_pickup" ? "processing" : "processing",
        fulfillmentType,
        courierName: fulfillmentType === "courier" ? courierName : undefined,
        shippingAddress:
          fulfillmentType === "courier"
            ? {
                street: street.trim(),
                city: city.trim(),
                postalCode: postalCode.trim(),
                province: province.trim().toUpperCase(),
              }
            : undefined,
        items: selectedItems.map((it) => ({
          productId: it.productId,
          productTitle: it.productTitle,
          variantName: it.variantName,
          quantity: it.quantity,
          price: it.price,
          image: it.image,
        })),
      });

      setIsSubmitting(false);
      setSuccessOrder(newOrder);
      if (onOrderCreated) onOrderCreated(newOrder);

      setTimeout(() => {
        setSuccessOrder(null);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Errore durante la creazione dell'ordine");
    }
  };

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(val);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-purple-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#1F1B24] via-[#2D1637] to-[#1F1B24] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5E1788] border border-white/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold">
                Nuovo Ordine Manuale
              </h2>
              <p className="text-xs text-[#D8C2E7]">
                Registrazione rapida per vendite al banco, ordini telefonici o via WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Channel Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Canale di Acquisizione Ordine:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setOriginChannel("banco");
                  setFulfillmentType("store_pickup");
                }}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  originChannel === "banco"
                    ? "border-[#5E1788] bg-purple-50 text-[#5E1788] ring-2 ring-[#5E1788]/20 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Vendita da Banco</span>
              </button>

              <button
                type="button"
                onClick={() => setOriginChannel("telefono")}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  originChannel === "telefono"
                    ? "border-[#5E1788] bg-purple-50 text-[#5E1788] ring-2 ring-[#5E1788]/20 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Ordine Telefonico</span>
              </button>

              <button
                type="button"
                onClick={() => setOriginChannel("whatsapp")}
                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  originChannel === "whatsapp"
                    ? "border-[#5E1788] bg-purple-50 text-[#5E1788] ring-2 ring-[#5E1788]/20 shadow-xs"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Ordine WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Customer and Delivery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-4 h-4 text-[#5E1788]" />
                <span>Dati Cliente</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Nome e Cognome *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es: Maria Rossi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#5E1788]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Cellulare / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#5E1788]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="maria.rossi@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#5E1788]"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Mode & Shipping Address */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Truck className="w-4 h-4 text-[#D462A6]" />
                <span>Modalità di Consegna</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("store_pickup")}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    fulfillmentType === "store_pickup"
                      ? "border-[#5E1788] bg-white text-[#5E1788] shadow-xs"
                      : "border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Ritiro in Salone (0€)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType("courier")}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    fulfillmentType === "courier"
                      ? "border-[#5E1788] bg-white text-[#5E1788] shadow-xs"
                      : "border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Corriere Espresso</span>
                </button>
              </div>

              {fulfillmentType === "courier" ? (
                <div className="space-y-2 pt-1">
                  <div>
                    <input
                      type="text"
                      placeholder="Indirizzo (Via / Piazza e N. Civico)"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Città"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#5E1788]"
                    />
                    <input
                      type="text"
                      placeholder="CAP"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#5E1788]"
                    />
                    <input
                      type="text"
                      placeholder="Provincia"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-[11px] text-purple-900">
                  Ritiro concordato presso l&apos;Atelier Scelta Makeup in Via dei Pellegrini 28/29, Napoli.
                </div>
              )}
            </div>
          </div>

          {/* Product Catalog Picker & Selected Items */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Articoli nel Carrello ({selectedItems.length})
              </div>

              {/* Quick Search Catalog Input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cerca nei 341 prodotti..."
                  value={searchCatalogQuery}
                  onChange={(e) => setSearchCatalogQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#5E1788]"
                />
              </div>
            </div>

            {/* Matching Products Quick Bar */}
            {searchCatalogQuery && (
              <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-2">
                <div className="text-[11px] font-semibold text-[#5E1788]">
                  Risultati Ricerca Catalogo ({matchingProducts.length}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {matchingProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-2 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-gray-800 truncate">{prod.name}</div>
                        <div className="text-[10px] text-gray-400">{prod.brand} • {formatEuro(prod.price)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItem(prod, 0)}
                        className="px-2 py-1 bg-[#5E1788] hover:bg-[#7A3293] text-white text-[11px] font-semibold rounded-lg shrink-0"
                      >
                        + Aggiungi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Items Table */}
            {selectedItems.length > 0 ? (
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 relative overflow-hidden shrink-0">
                        <Image
                          src={item.image || "/brand/logo.png"}
                          alt={item.productTitle}
                          fill
                          className="object-contain p-0.5"
                          sizes="40px"
                        />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-gray-900 truncate">
                          {item.productTitle}
                        </div>
                        {item.variantName && (
                          <div className="text-[11px] text-gray-500">
                            Tonalità: {item.variantName}
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-gray-400">
                          {formatEuro(item.price)} cad.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemQuantity(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleItemQuantity(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-20 text-right font-bold text-xs font-mono text-gray-900">
                        {formatEuro(item.price * item.quantity)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-gray-400 hover:text-rose-600 p-1"
                        title="Rimuovi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center space-y-2">
                <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500">
                  Nessun articolo selezionato. Cerca un prodotto nella barra sopra e clicca &quot;+ Aggiungi&quot;.
                </p>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span>Subtotale Cosmetici:</span>
              <span className="font-mono font-semibold">{formatEuro(itemsSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>Spese Spedizione:</span>
              <span className="font-mono font-semibold">
                {shippingFee === 0 ? "Gratuita (0,00 €)" : formatEuro(shippingFee)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-sm font-bold text-[#1F1B24]">
              <span>Totale da Incassare:</span>
              <span className="font-serif text-lg text-[#5E1788]">{formatEuro(orderTotal)}</span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
            >
              Annulla
            </button>

            <button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] hover:shadow-md text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {successOrder ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Ordine Registrato!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Crea & Salva Ordine ({formatEuro(orderTotal)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
