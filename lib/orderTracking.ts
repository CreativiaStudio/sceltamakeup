/**
 * Scelta Makeup — Tracciamento ordini lato cliente (condiviso server/client)
 * Module: lib/orderTracking.ts
 *
 * Sanitizzazione degli ordini esposti pubblicamente e calcolo degli step dello
 * stepper di spedizione. Nessuna dipendenza server-only.
 */

import type { SceltaAdminOrder } from "@/lib/adminStore";
import type { PacklinkNormalizedStatus } from "@/lib/packlink";

export type PublicOrder = Pick<
  SceltaAdminOrder,
  | "id"
  | "customerName"
  | "total"
  | "status"
  | "fulfillmentType"
  | "shippingAddress"
  | "trackingCode"
  | "courierName"
  | "packlinkReference"
  | "items"
  | "createdAt"
  | "updatedAt"
>;

export function normalizeEmail(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function isCustomerVisibleOrder(order: SceltaAdminOrder): boolean {
  return order.fulfillmentType !== "pos_receipt" && order.status !== "cancelled";
}

/** Rimuove i dati interni (telefono, email, pagamento, scontrino) prima dell'invio al browser. */
export function toPublicOrder(order: SceltaAdminOrder): PublicOrder {
  return {
    id: order.id,
    customerName: order.customerName,
    total: order.total,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    shippingAddress: order.shippingAddress,
    trackingCode: order.trackingCode,
    courierName: order.courierName,
    packlinkReference: order.packlinkReference,
    items: order.items.map((i) => ({
      productId: i.productId,
      productTitle: i.productTitle,
      variantName: i.variantName,
      quantity: i.quantity,
      price: i.price,
      image: i.image,
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export interface TrackingStep {
  key: string;
  label: string;
}

export const COURIER_STEPS: TrackingStep[] = [
  { key: "confirmed", label: "Confermato" },
  { key: "preparing", label: "In Preparazione in Atelier" },
  { key: "handed", label: "Affidato al corriere" },
  { key: "transit", label: "In Transito" },
  { key: "delivery", label: "In Consegna" },
  { key: "delivered", label: "Consegnato" },
];

export const PICKUP_STEPS: TrackingStep[] = [
  { key: "received", label: "Ricevuto" },
  { key: "preparing", label: "In Preparazione in Atelier" },
  { key: "ready", label: "Pronto per il Ritiro" },
  { key: "collected", label: "Ritirato con Successo" },
];

/** Restituisce gli step e l'indice dello step corrente (0-based). */
export function getOrderProgress(
  order: Pick<PublicOrder, "status" | "fulfillmentType">,
  trackingStatus?: PacklinkNormalizedStatus
): { steps: TrackingStep[]; currentIndex: number } {
  if (order.fulfillmentType === "store_pickup") {
    const currentIndex =
      order.status === "completed" ? 3 : order.status === "ready_for_pickup" ? 2 : 1;
    return { steps: PICKUP_STEPS, currentIndex };
  }

  let currentIndex = 1;
  if (order.status === "completed" || trackingStatus === "delivered") {
    currentIndex = 5;
  } else if (order.status === "shipped" || order.status === "ready_for_pickup") {
    currentIndex = 2;
    if (trackingStatus === "in_transit" || trackingStatus === "exception") currentIndex = 3;
    if (trackingStatus === "out_for_delivery") currentIndex = 4;
  }
  return { steps: COURIER_STEPS, currentIndex };
}

export const ORDER_STATUS_LABELS: Record<
  SceltaAdminOrder["status"],
  { label: string; className: string }
> = {
  processing: { label: "In Preparazione", className: "bg-amber-50 text-amber-800 border-amber-200" },
  shipped: { label: "Spedito", className: "bg-blue-50 text-blue-800 border-blue-200" },
  ready_for_pickup: { label: "Pronto per il Ritiro", className: "bg-[#D8C2E7]/30 text-[#5E1788] border-[#D8C2E7]" },
  completed: { label: "Completato", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Annullato", className: "bg-rose-50 text-rose-800 border-rose-200" },
};
