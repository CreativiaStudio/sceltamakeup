export const FREE_SHIPPING_THRESHOLD = 70.0;
export const STANDARD_SHIPPING_COST = 4.9;

export type ShippingDeliveryMethod =
  | "shipping"
  | "boutique"
  | "courier"
  | "store_pickup";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isFreeShippingEligible(netSubtotal: number): boolean {
  return roundMoney(netSubtotal) >= FREE_SHIPPING_THRESHOLD;
}

export function calculateShippingCost(
  netSubtotal: number,
  deliveryMethod: ShippingDeliveryMethod = "shipping",
  hasItems = true
): number {
  if (
    !hasItems ||
    deliveryMethod === "boutique" ||
    deliveryMethod === "store_pickup" ||
    isFreeShippingEligible(netSubtotal)
  ) {
    return 0;
  }
  return STANDARD_SHIPPING_COST;
}

export function getFreeShippingProgress(netSubtotal: number) {
  const normalized = Math.max(0, roundMoney(netSubtotal));
  const remaining = Math.max(0, roundMoney(FREE_SHIPPING_THRESHOLD - normalized));
  const isFree = normalized >= FREE_SHIPPING_THRESHOLD;
  const percentage = Math.min(
    100,
    Math.round((normalized / FREE_SHIPPING_THRESHOLD) * 100)
  );

  return {
    threshold: FREE_SHIPPING_THRESHOLD,
    current: normalized,
    remaining,
    isFree,
    percentage,
  };
}
