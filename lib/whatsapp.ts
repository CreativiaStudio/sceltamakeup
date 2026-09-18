export const WHATSAPP_NUMBER = "393793370322";
export const WHATSAPP_DISPLAY_NUMBER = "+39 379 337 0322";
export const WHATSAPP_OWNER = "Federica";

export const WHATSAPP_DEFAULT_MESSAGE =
  "Salve Federica, vorrei assistenza su Scelta Makeup";

export function buildWhatsAppUrl(message?: string): string {
  const text = message && message.trim() ? message : WHATSAPP_DEFAULT_MESSAGE;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
