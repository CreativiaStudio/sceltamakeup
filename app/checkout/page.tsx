"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Truck,
  Store,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

import { useIsMounted } from "@/lib/useIsMounted";
import { Order, OrderItem, PaymentMethod } from "@/types/order";
import { createOrder, savePendingOrder } from "@/lib/orderService";
import { enqueueWhatsAppMessage } from "@/lib/whatsappQueueService";
import { sendOrderPlacedEmail } from "@/lib/resendService";
import PaymentMethodSelector from "@/components/checkout/PaymentMethodSelector";

export default function CheckoutPage() {
  const mounted = useIsMounted();
  const items = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const getShippingProgress = useCartStore((state) => state.getShippingProgress);
  const clearCart = useCartStore((state) => state.clearCart);

  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "boutique">("shipping");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    indirizzo: "",
    citta: "",
    cap: "",
    note: "",
  });

  if (!mounted) return null;

  const subtotal = getTotalPrice();
  const shippingInfo = getShippingProgress();
  const shippingCost =
    deliveryMethod === "boutique" || shippingInfo.isFree || items.length === 0
      ? 0
      : 4.90;
  const total = subtotal + shippingCost;

  const buildOrderInput = () => {
    const orderItems: OrderItem[] = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      price: item.price,
      quantity: item.quantity,
      shade: item.shade,
      image: item.image,
    }));

    return {
      customer: {
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        telefono: formData.telefono,
        indirizzo: formData.indirizzo,
        citta: formData.citta,
        cap: formData.cap,
        note: formData.note,
      },
      items: orderItems,
      deliveryMethod,
      paymentMethod,
      subtotal,
      shippingCost,
      total,
      sampleIncluded: true,
    };
  };

  const notifyOrder = (order: Order) => {
    try {
      const itemsListFormatted = order.items
        .map((i) => `• ${i.name}${i.shade ? ` (${i.shade.name})` : ""} x${i.quantity}`)
        .join("\n");

      enqueueWhatsAppMessage({
        recipientPhone: order.customer.telefono,
        recipientName: `${order.customer.nome} ${order.customer.cognome}`,
        templateType: "order_placed",
        context: {
          customerName: `${order.customer.nome} ${order.customer.cognome}`,
          orderNumber: order.orderNumber,
          deliveryMethod: order.deliveryMethod,
          itemsListFormatted,
          orderTotal: order.total,
          shippingAddress: order.customer.indirizzo || "",
          shippingCity: order.customer.citta || "",
          shippingCap: order.customer.cap || "",
        },
      });

      sendOrderPlacedEmail(order).catch((emailErr) => {
        console.warn("Failed to dispatch order placed email:", emailErr);
      });
    } catch (notifErr) {
      console.warn("Failed to enqueue notifications for order:", notifErr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const orderInput = buildOrderInput();

    if (paymentMethod === "boutique") {
      try {
        const createdOrder = createOrder(orderInput);
        setConfirmedOrder(createdOrder);
        notifyOrder(createdOrder);
        setIsSuccess(true);
        clearCart();
      } catch (orderErr) {
        console.error("Failed to create order:", orderErr);
        alert("Errore durante la creazione dell'ordine. Riprova.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      savePendingOrder(orderInput);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderInput.items.map((i) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
            shade: i.shade?.name,
          })),
          customer: orderInput.customer,
          deliveryMethod: orderInput.deliveryMethod,
          paymentMethod: orderInput.paymentMethod,
          shippingCost: orderInput.shippingCost,
          total: orderInput.total,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Impossibile avviare il pagamento");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      alert("Errore durante l'avvio del pagamento: " + message);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7FC] py-16 px-4">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-[#D8C2E7]/60 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#7A3293]">
              {confirmedOrder ? confirmedOrder.orderNumber : "Ordine Confermato"}
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1F1B24]">
              Grazie per il tuo acquisto
            </h1>
            <p className="text-sm text-neutral-600 font-light">
              Il tuo ordine è stato registrato con successo. Ti invieremo un&apos;email di riepilogo con i dettagli per la spedizione o per il ritiro nel nostro Salone di Napoli.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-neutral-200 text-left text-xs space-y-1.5 text-neutral-600">
            <p>
              <strong>Metodo di consegna:</strong>{" "}
              {deliveryMethod === "boutique"
                ? "Ritiro in Salone (Via dei Pellegrini 28/29, Napoli)"
                : "Corriere Espresso Tracciato 24/48h"}
            </p>
            <p>
              <strong>Totale pagato:</strong> €{(confirmedOrder ? confirmedOrder.total : total).toFixed(2)}
            </p>
            <p>
              <strong>Packaging:</strong> Confezione protetta con cura artigianale
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-4 rounded-xl bg-[#5E1788] text-white font-medium text-xs tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
          >
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white py-16 px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="w-14 h-14 rounded-full bg-purple-100 text-[#5E1788] flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
            Nessun articolo nel carrello
          </h1>
          <p className="text-sm text-neutral-500">
            Per procedere al checkout seleziona prima le tue creazioni preferite dal nostro catalogo.
          </p>
          <Link
            href="/#catalogo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
          >
            Esplora il Catalogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7FC] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#7A3293] hover:text-[#5E1788]"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna allo shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Form & Details */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Delivery Choice */}
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1F1B24] mb-3">
                  1. Modalità di Consegna
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("shipping")}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      deliveryMethod === "shipping"
                        ? "border-[#5E1788] bg-purple-50/50 ring-2 ring-[#5E1788]/20"
                        : "border-neutral-200 hover:border-purple-200"
                    }`}
                  >
                    <Truck className="h-5 w-5 text-[#5E1788] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-[#1F1B24]">
                        Corriere Espresso
                      </p>
                      <p className="text-xs text-neutral-500">
                        {shippingInfo.isFree ? "Gratuita" : "€4.90"} • Consegna in 24/48h
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("boutique")}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      deliveryMethod === "boutique"
                        ? "border-[#5E1788] bg-purple-50/50 ring-2 ring-[#5E1788]/20"
                        : "border-neutral-200 hover:border-purple-200"
                    }`}
                  >
                    <Store className="h-5 w-5 text-[#5E1788] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-[#1F1B24]">
                        Ritiro in Salone Napoli
                      </p>
                      <p className="text-xs text-emerald-600 font-semibold">
                        Sempre Gratuito • Via dei Pellegrini
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Personal & Shipping Details */}
              <div>
                <h2 className="font-serif text-xl font-bold text-[#1F1B24] mb-4">
                  2. Dati di Contatto & Spedizione
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                      Cognome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cognome}
                      onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                      Telefono / Cellulare *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                    />
                  </div>

                  {deliveryMethod === "shipping" && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                          Indirizzo di Consegna (Via, Civico) *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.indirizzo}
                          onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                          Città *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.citta}
                          onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                          CAP *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.cap}
                          onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#5E1788]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <PaymentMethodSelector
                selectedMethod={paymentMethod}
                onSelectMethod={setPaymentMethod}
                deliveryMethod={deliveryMethod}
                total={total}
              />

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#5E1788] text-white font-medium text-sm tracking-wider uppercase shadow-lg shadow-purple-900/20 hover:shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-70 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? "Elaborazione ordine..."
                    : paymentMethod === "boutique"
                    ? `Conferma Ordine • €${total.toFixed(2)}`
                    : `Paga Ora • €${total.toFixed(2)}`}
                </span>
              </button>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] space-y-6">
            <h2 className="font-serif text-xl font-bold text-[#1F1B24] border-b border-neutral-100 pb-3">
              Riepilogo Ordine
            </h2>

            <div className="divide-y divide-neutral-100 max-h-96 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex gap-3 items-center">
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-[#FAF7FC] border border-neutral-200 shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-[#1F1B24] truncate">
                      {item.name}
                    </p>
                    {item.shade && (
                      <p className="text-neutral-500 text-[11px] truncate">
                        Shade: {item.shade.name}
                      </p>
                    )}
                    <p className="text-neutral-400">Qtà: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-xs text-[#1F1B24]">
                    €{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-100 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotale</span>
                <span className="font-medium text-neutral-900">
                  €{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Spedizione</span>
                <span className="font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-emerald-600 font-semibold">
                      Gratuita
                    </span>
                  ) : (
                    `€${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="pt-3 border-t border-neutral-200 flex justify-between text-base font-bold text-[#1F1B24]">
                <span>Totale</span>
                <span className="text-[#5E1788]">€{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/40 space-y-2 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Garanzia Ufficiale e Reso Facile entro 14 giorni</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#D462A6] shrink-0" />
                <span>Packaging curato con sigillo di autenticità</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
