import { SceltaAdminOrder } from "./adminStore";

/**
 * Normalizes and builds direct clickable tracking URLs for official carrier portals:
 * - BRT (Bartolini)
 * - GLS Italy
 * - DHL Express
 * - Poste Italiane / SDA
 */
export function getCourierTrackingUrl(courier: string = "", trackingCode: string = ""): string {
  const code = trackingCode.trim();
  if (!code) return "";

  const c = courier.trim().toLowerCase();

  if (c.includes("brt") || c.includes("bartolini")) {
    return `https://www.brt.it/it/tracking?codiceSpedizione=${encodeURIComponent(code)}`;
  }

  if (c.includes("gls")) {
    return `https://gls-group.com/IT/it/servizi-online/ricerca-spedizioni.html?match=${encodeURIComponent(code)}`;
  }

  if (c.includes("dhl")) {
    return `https://www.dhl.com/it-it/home/tracciamento.html?tracking-id=${encodeURIComponent(code)}`;
  }

  if (c.includes("poste") || c.includes("sda")) {
    return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${encodeURIComponent(code)}`;
  }

  // Default fallback if carrier is unspecified
  return `https://www.brt.it/it/tracking?codiceSpedizione=${encodeURIComponent(code)}`;
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

  return `Ciao ${order.customerName}! 💄 Il tuo ordine #${order.id} da Scelta Makeup è stato affidato a ${courier}. Puoi seguire la spedizione in tempo reale a questo link: ${trackingUrl} . Per qualsiasi informazione siamo sempre a tua disposizione. A presto, Federica Cesiano - Scelta Makeup Atelier Napoli`;
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
