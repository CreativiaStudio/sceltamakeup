import type { SceltaAdminOrder } from "./adminStore";

/**
 * Checks whether a tracking string is actually an internal Packlink PRO
 * shipment reference (e.g. `IT2026PRO0008029618`) rather than a native
 * courier tracking code.
 */
export function isPacklinkReference(code?: string | null): boolean {
  return /^[A-Z]{2}\d{4}PRO\d+$/i.test((code || "").trim());
}

/**
 * Normalizes and builds direct clickable tracking URLs for official carrier portals:
 * - Poste Italiane / SDA / Crono
 * - BRT (Bartolini)
 * - GLS Italy
 * - DHL Express
 * - UPS, InPost, FedEx, TNT
 */
export function getCourierTrackingUrl(courier: string = "", trackingCode: string = ""): string {
  const cleanCode = trackingCode.trim().replace(/\s+/g, "");
  if (!cleanCode) return "";

  const c = courier.trim().toLowerCase();

  if (c.includes("brt") || c.includes("bartolini")) {
    return `https://www.brt.it/it/tracking?codiceSpedizione=${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("gls")) {
    return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni.html?match=${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("dhl")) {
    return `https://www.dhl.com/it-it/home/tracciamento.html?tracking-id=${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("poste") || c.includes("sda") || c.includes("crono")) {
    return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("ups")) {
    return `https://www.ups.com/track?loc=it_IT&tracknum=${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("inpost")) {
    return `https://inpost.it/trova-il-tuo-pacco?number=${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleanCode)}`;
  }

  if (c.includes("tnt")) {
    return `https://www.tnt.it/tracking/Tracking.do?codice=${encodeURIComponent(cleanCode)}`;
  }

  // Default fallback when carrier is unspecified or unrecognized
  return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(cleanCode)}`;
}

/**
 * Resolves the real courier tracking code for an order, ignoring Packlink
 * internal references (`IT2026PRO...`) so carrier links always receive a valid
 * courier tracking code.
 */
export function resolveCarrierTrackingCode(
  order: { trackingCode?: string; packlinkReference?: string },
  liveTrackingNumber?: string
): string {
  const live = (liveTrackingNumber || "").trim();
  if (live && !isPacklinkReference(live)) {
    return live;
  }

  const stored = (order.trackingCode || "").trim();
  if (stored && stored !== order.packlinkReference && !isPacklinkReference(stored)) {
    return stored;
  }

  return "";
}

/**
 * Builds precompiled WhatsApp transactional message text with tracking link.
 */
export function getWhatsAppTrackingMessage(
  order: SceltaAdminOrder,
  trackingCode?: string,
  courierName?: string
): string {
  const code = (trackingCode || order.trackingCode || "").trim();
  const courier = courierName || order.courierName || "BRT Express";
  const trackingUrl = getCourierTrackingUrl(courier, code);

  return `Ciao ${order.customerName}! 💄 Il tuo ordine #${order.id} da Scelta Makeup è stato affidato a ${courier}. Puoi seguire la spedizione in tempo reale a questo link: ${trackingUrl} . Per qualsiasi informazione siamo sempre a tua disposizione. A presto, Federica Cesiano - Scelta Makeup Salone Napoli`;
}

/**
 * Formats a phone number for wa.me URL (removes spaces, symbols, ensures country code).
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("3") && cleaned.length === 10) {
    cleaned = `39${cleaned}`;
  }
  return cleaned;
}

/**
 * Generates direct wa.me link with encoded message.
 */
export function getWhatsAppDirectUrl(phone: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
