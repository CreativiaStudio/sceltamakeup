"use client";

import Image from "next/image";
import {
  Check,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  Store,
  Truck,
} from "lucide-react";
import { getCourierTrackingUrl } from "@/lib/trackingUtils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  getOrderProgress,
  ORDER_STATUS_LABELS,
  type PublicOrder,
} from "@/lib/orderTracking";
import type { PacklinkTracking } from "@/lib/packlink";
import { resolveProductImageUrl } from "@/lib/r2";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function formatDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

interface OrderStepperProps {
  steps: { key: string; label: string }[];
  currentIndex: number;
}

export function OrderStepper({ steps, currentIndex }: OrderStepperProps) {
  return (
    <ol className="grid gap-4 sm:gap-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const isLast = index === steps.length - 1;
        const reached = done || (active && isLast);
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {index > 0 && (
              <span
                aria-hidden
                className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${
                  index <= currentIndex ? "bg-[#7A3293]" : "bg-[#D8C2E7]/60"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                reached
                  ? "border-[#5E1788] bg-[#5E1788] text-white"
                  : active
                    ? "border-[#D462A6] bg-white text-[#D462A6] ring-4 ring-[#D462A6]/20"
                    : "border-[#D8C2E7] bg-white text-[#D8C2E7]"
              }`}
            >
              {reached ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span
              className={`mt-2 px-1 text-[11px] leading-tight sm:text-xs ${
                done || active ? "font-semibold text-[#1F1B24]" : "text-neutral-400"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface OrderTrackingCardProps {
  order: PublicOrder;
  tracking?: PacklinkTracking | null;
}

export default function OrderTrackingCard({ order, tracking }: OrderTrackingCardProps) {
  const isPickup = order.fulfillmentType === "store_pickup";
  const cancelled = order.status === "cancelled";
  const statusBadge = ORDER_STATUS_LABELS[order.status];
  const { steps, currentIndex } = getOrderProgress(order, tracking?.status);

  const hasCarrierCode = Boolean(order.trackingCode) && order.trackingCode !== order.packlinkReference;
  const carrierCode = tracking?.trackingNumber || (hasCarrierCode ? order.trackingCode : "");
  const courier = order.courierName || tracking?.carrier || "";
  const trackingUrl = carrierCode ? getCourierTrackingUrl(courier, carrierCode) : "";

  return (
    <article className="space-y-6">
      {/* Header ordine */}
      <header className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A3293]">
              Ordine
            </p>
            <h2 className="mt-1 font-serif text-3xl font-semibold text-[#5E1788]">{order.id}</h2>
            <p className="mt-1 text-sm text-neutral-500">Effettuato il {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
            <p className="font-serif text-2xl font-semibold text-[#1F1B24]">{euro.format(order.total)}</p>
          </div>
        </div>

        {!cancelled && (
          <div className="mt-8">
            <OrderStepper steps={steps} currentIndex={currentIndex} />
          </div>
        )}
      </header>

      {/* Corriere & tracking live */}
      {!isPickup && (
        <section className="rounded-3xl border border-[#D8C2E7]/60 bg-[#FAF7FC] p-6 sm:p-8">
          <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
            <Truck className="h-5 w-5" />
            Corriere &amp; Tracciamento
          </h3>

          {!courier && !order.packlinkReference ? (
            <p className="mt-3 text-sm text-neutral-600">
              Il tuo ordine è in preparazione. Riceverai il codice di tracciamento appena il pacco
              verrà affidato al corriere.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Corriere incaricato
                </p>
                <p className="mt-1 text-base font-semibold text-[#1F1B24]">{courier || "Corriere Espresso"}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  {carrierCode ? "Codice tracking" : "Riferimento spedizione"}
                </p>
                {trackingUrl ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 font-mono text-base font-semibold text-[#5E1788] underline-offset-4 hover:underline"
                  >
                    {carrierCode}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-1 font-mono text-base font-semibold text-[#1F1B24]">
                    {order.packlinkReference || order.trackingCode}
                  </p>
                )}
              </div>
            </div>
          )}

          {tracking && tracking.events.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Ultimi aggiornamenti
              </p>
              <ul className="space-y-4 border-l-2 border-[#D8C2E7] pl-5">
                {tracking.events.slice(0, 8).map((event, i) => (
                  <li key={`${event.date}-${i}`} className="relative">
                    <span
                      className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                        i === 0 ? "bg-[#D462A6]" : "bg-[#7A3293]"
                      }`}
                    />
                    <p className="text-sm font-medium text-[#1F1B24]">{event.description}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(event.date, true)}
                      {event.city ? ` · ${event.city}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Ritiro in atelier */}
      {isPickup && (
        <section className="rounded-3xl border border-[#D8C2E7]/60 bg-[#FAF7FC] p-6 sm:p-8">
          <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
            <Store className="h-5 w-5" />
            Ritiro in Atelier
          </h3>
          <div className="mt-3 space-y-1 text-sm text-neutral-700">
            <p className="flex items-start gap-2 font-medium text-[#1F1B24]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D462A6]" />
              Via Pellegrini 28/29, 80134 Napoli
            </p>
            <p className="pl-6">Lunedì – Sabato: 9:30 – 13:30 / 16:30 – 20:00</p>
            <p className="pl-6 text-neutral-500">
              Ti avviseremo non appena il tuo ordine sarà pronto. Porta con te il numero ordine.
            </p>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Scelta Makeup Via Pellegrini 28 Napoli")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5E1788] underline-offset-4 hover:underline"
          >
            Indicazioni stradali <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      )}

      {/* Prodotti */}
      <section className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
          <Package className="h-5 w-5" />
          Prodotti acquistati
        </h3>
        <ul className="mt-4 divide-y divide-[#D8C2E7]/40">
          {order.items.map((item, i) => (
            <li key={`${item.productId}-${i}`} className="flex items-center gap-4 py-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#FAF7FC]">
                {item.image ? (
                  <Image src={resolveProductImageUrl(item.image)} alt={item.productTitle} fill sizes="64px" className="object-cover" unoptimized />
                ) : (
                  <Package className="absolute inset-0 m-auto h-6 w-6 text-[#D8C2E7]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1F1B24]">{item.productTitle}</p>
                {item.variantName && (
                  <p className="text-xs text-neutral-500">Tonalità: {item.variantName}</p>
                )}
                <p className="text-xs text-neutral-500">
                  Quantità: {item.quantity} × {euro.format(item.price)}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#1F1B24]">{euro.format(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t border-[#D8C2E7]/40 pt-4 text-sm">
          <span className="text-neutral-500">Totale ordine</span>
          <span className="font-serif text-lg font-semibold text-[#5E1788]">{euro.format(order.total)}</span>
        </div>
      </section>

      {/* Indirizzo */}
      {!isPickup && order.shippingAddress && (
        <section className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
            <MapPin className="h-5 w-5" />
            Indirizzo di spedizione
          </h3>
          <address className="mt-3 text-sm not-italic leading-relaxed text-neutral-700">
            <span className="font-semibold text-[#1F1B24]">{order.customerName}</span>
            <br />
            {order.shippingAddress.street}
            <br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            {order.shippingAddress.province ? ` (${order.shippingAddress.province})` : ""}
            <br />
            Italia
          </address>
        </section>
      )}

      {/* Assistenza */}
      <a
        href={buildWhatsAppUrl(`Ciao Federica, vorrei informazioni sul mio ordine ${order.id}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
      >
        <MessageCircle className="h-4 w-4" />
        Assistenza dedicata dell&apos;Atelier su WhatsApp
      </a>
    </article>
  );
}
