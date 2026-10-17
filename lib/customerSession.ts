/**
 * Scelta Makeup — Sessione cliente lato browser (client-safe)
 * Module: lib/customerSession.ts
 *
 * Persistenza dell'accesso all'Area Personale in localStorage con la chiave
 * `scelta_customer_session_v1`. Nessuna dipendenza server: tutte le funzioni
 * sono difensive rispetto a storage assente o contenuto corrotto.
 */

export interface ShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  province: string;
}

export interface CustomerSession {
  email: string;
  name: string;
  savedAddress?: ShippingAddress;
}

export const CUSTOMER_SESSION_STORAGE_KEY = "scelta_customer_session_v1";

export const EMPTY_SHIPPING_ADDRESS: ShippingAddress = {
  street: "",
  city: "",
  postalCode: "",
  province: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeAddress(value: unknown): ShippingAddress | undefined {
  if (!isRecord(value)) return undefined;
  const street = typeof value.street === "string" ? value.street.trim() : "";
  const city = typeof value.city === "string" ? value.city.trim() : "";
  const postalCode = typeof value.postalCode === "string" ? value.postalCode.trim() : "";
  const province = typeof value.province === "string" ? value.province.trim() : "";
  if (!street && !city && !postalCode && !province) return undefined;
  return { street, city, postalCode, province };
}

/** True quando l'indirizzo ha almeno via e città valorizzate. */
export function isUsableAddress(address?: ShippingAddress | null): boolean {
  return Boolean(address && address.street.trim() && address.city.trim());
}

/** Legge la sessione cliente persistita, oppure `null` se assente/non valida. */
export function readCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    if (!email) return null;
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    return {
      email,
      name,
      savedAddress: sanitizeAddress(parsed.savedAddress),
    };
  } catch {
    return null;
  }
}

/** Salva (o sovrascrive) la sessione cliente in localStorage. */
export function saveCustomerSession(session: CustomerSession): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CustomerSession = {
      email: session.email.trim().toLowerCase(),
      name: session.name.trim(),
      savedAddress: sanitizeAddress(session.savedAddress),
    };
    window.localStorage.setItem(CUSTOMER_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage pieno o non disponibile: la sessione resta solo in memoria.
  }
}

/** Rimuove la sessione cliente da localStorage. */
export function clearCustomerSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Ricava un nome visualizzabile dalla parte locale dell'email
 * (es. "mario.rossi@x.it" -> "Mario Rossi"). Ritorna "" se non è possibile.
 */
export function guessNameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "").replace(/\+.*$/, "");
  const words = local
    .split(/[._\-\s]+/)
    .map((part) => part.replace(/[^a-zA-ZÀ-ÿ']/g, ""))
    .filter((part) => part.length > 0);
  if (words.length === 0) return "";
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
