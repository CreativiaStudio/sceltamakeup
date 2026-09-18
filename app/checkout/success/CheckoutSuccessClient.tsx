"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { createOrder, getPendingOrder, clearPendingOrder } from "@/lib/orderService";
import { enqueueWhatsAppMessage } from "@/lib/whatsappQueueService";
import { sendOrderPlacedEmail } from "@/lib/resendService";
import { Order } from "@/types/order";

type VerifyStatus = "loading" | "paid" | "error";

export default function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<VerifyStatus>(sessionId ? "loading" : "error");
  const [order, setOrder] = useState<Order | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId!)}`
        );
        const data = await res.json();

        if (!res.ok || data.payment_status !== "paid") {
          if (!cancelled) setStatus("error");
          return;
        }

        const draft = getPendingOrder();
        if (draft) {
          const created = createOrder(draft);
          clearPendingOrder();
          clearCart();

          if (!cancelled) setOrder(created);

          try {
            const itemsListFormatted = created.items
              .map((i) => `• ${i.name}${i.shade ? ` (${i.shade.name})` : ""} x${i.quantity}`)
              .join("\n");

            enqueueWhatsAppMessage({
              recipientPhone: created.customer.telefono,
              recipientName: `${created.customer.nome} ${created.customer.cognome}`,
              templateType: "order_placed",
              context: {
                customerName: `${created.customer.nome} ${created.customer.cognome}`,
                orderNumber: created.orderNumber,
                deliveryMethod: created.deliveryMethod,
                itemsListFormatted,
                orderTotal: created.total,
                shippingAddress: created.customer.indirizzo || "",
                shippingCity: created.customer.citta || "",
                shippingCap: created.customer.cap || "",
              },
            });

            sendOrderPlacedEmail(created).catch((emailErr) => {
              console.warn("Failed to dispatch order placed email:", emailErr);
            });
          } catch (notifErr) {
            console.warn("Failed to enqueue notifications for order:", notifErr);
          }
        }

        if (!cancelled) setStatus("paid");
      } catch (error) {
        console.error("Order verification error:", error);
        if (!cancelled) setStatus("error");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [sessionId, clearCart]);

  if (status === "loading") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#FAF7FC] py-16 px-4 gap-4">
        <Loader2 className="h-10 w-10 text-[#5E1788] animate-spin" />
        <p className="text-sm text-neutral-600">Stiamo verificando il tuo pagamento...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7FC] py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-5 border border-[#D8C2E7]/60 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
            Pagamento non confermato
          </h1>
          <p className="text-sm text-neutral-600">
            Non siamo riusciti a verificare il pagamento. Se ritieni si tratti di un errore,
            contattaci via email o riprova a completare l&apos;ordine.
          </p>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna al Checkout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7FC] py-16 px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-[#D8C2E7]/60 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#7A3293]">
            {order ? order.orderNumber : "Ordine Confermato"}
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1F1B24]">
            Grazie per il tuo acquisto
          </h1>
          <p className="text-sm text-neutral-600 font-light">
            Il pagamento è andato a buon fine. Ti invieremo un&apos;email di riepilogo con i dettagli
            per la spedizione o per il ritiro nel nostro Salone di Napoli.
          </p>
        </div>

        {order && (
          <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-neutral-200 text-left text-xs space-y-1.5 text-neutral-600">
            <p>
              <strong>Metodo di consegna:</strong>{" "}
              {order.deliveryMethod === "boutique"
                ? "Ritiro in Salone (Via dei Pellegrini 28/29, Napoli)"
                : "Corriere Espresso Tracciato 24/48h"}
            </p>
            <p>
              <strong>Totale pagato:</strong> €{order.total.toFixed(2)}
            </p>
            <p>
              <strong>Campioncini inclusi:</strong> 2 Campioncini di alta gamma omaggio
            </p>
          </div>
        )}

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-4 rounded-xl bg-[#5E1788] text-white font-medium text-xs tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Torna allo Shop
        </Link>
      </div>
    </div>
  );
}
