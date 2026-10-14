/**
 * Scelta Makeup — Packlink PRO Integration (Server-Only)
 * Module: lib/packlink.ts
 *
 * - createPacklinkShipment(order): crea la spedizione su Packlink PRO
 *   (selezione automatica del servizio più economico per la tratta).
 * - getPacklinkTracking(reference): cronologia eventi + stato normalizzato.
 *
 * Fuori dalla produzione, se la rete o l'API Packlink non rispondono, entrambe
 * le funzioni degradano a un mock marcato `mock: true`. In produzione la
 * creazione fallisce in modo esplicito per non esporre ai clienti tracking
 * inventati.
 */

import type { SceltaAdminOrder } from "@/lib/adminStore";

const PACKLINK_BASE_URL = "https://api.packlink.com/v1";
const DEFAULT_API_KEY = "7f329f20d56dda42c12280853411658b0c702976507285a2762ff3f29b5de24c";
const REQUEST_TIMEOUT_MS = 12000;

const SENDER = {
  name: "Federica",
  surname: "Cesiano",
  company: "Scelta Makeup",
  email: "info@sceltamakeup.it",
  phone: "+393793370322",
  street1: "Via Pellegrini 28/29",
  zip_code: "80134",
  city: "Napoli",
  country: "IT",
} as const;

const PACKAGE = { weight: 0.5, width: 15, height: 10, length: 20 } as const;
const CONTENT_DESCRIPTION = "Cosmetici e prodotti make-up professionali";

export type PacklinkNormalizedStatus =
  | "created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "unknown";

export interface PacklinkTrackingEvent {
  date: string;
  description: string;
  city?: string;
}

export interface PacklinkTracking {
  reference: string;
  status: PacklinkNormalizedStatus;
  events: PacklinkTrackingEvent[];
  carrier?: string;
  trackingNumber?: string;
  mock: boolean;
}

export interface PacklinkShipmentResult {
  reference: string;
  carrier: string;
  service?: string;
  trackingCode: string;
  mock: boolean;
}

export class PacklinkError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "PacklinkError";
  }
}

function getApiKey(): string {
  return process.env.PACKLINK_API_KEY || DEFAULT_API_KEY;
}

function allowMock(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.PACKLINK_ALLOW_MOCK === "true";
}

async function packlinkFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${PACKLINK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: getApiKey(),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!res.ok) {
      const detail =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message: unknown }).message)
          : res.statusText;
      throw new PacklinkError(`Packlink HTTP ${res.status}: ${detail}`, res.status);
    }
    return payload as T;
  } catch (err) {
    if (err instanceof PacklinkError) throw err;
    const reason = err instanceof Error ? err.message : "errore di rete";
    throw new PacklinkError(`Packlink non raggiungibile: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

function splitName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { name: parts[0] || "Cliente", surname: "-" };
  return { name: parts[0], surname: parts.slice(1).join(" ") };
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("39") && cleaned.length >= 11) return `+${cleaned}`;
  return cleaned ? `+39${cleaned}` : "";
}

function nextBusinessDay(): string {
  const d = new Date();
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}/${mm}/${dd}`;
}

function buildMockReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0");
  return `IT${year}PRO${suffix}`;
}

interface PacklinkService {
  id: number | string;
  carrier_name?: string;
  name?: string;
  service_name?: string;
  base_price?: number;
  price?: number | { total_price?: number; base_price?: number };
  total_price?: number;
}

function servicePrice(service: PacklinkService): number {
  if (typeof service.total_price === "number") return service.total_price;
  if (typeof service.base_price === "number") return service.base_price;
  if (typeof service.price === "number") return service.price;
  if (service.price && typeof service.price === "object") {
    return service.price.total_price ?? service.price.base_price ?? Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

async function pickCheapestService(zipTo: string): Promise<PacklinkService> {
  const qs = new URLSearchParams({
    "from[country]": SENDER.country,
    "from[zip]": SENDER.zip_code,
    "to[country]": "IT",
    "to[zip]": zipTo,
    "packages[0][weight]": String(PACKAGE.weight),
    "packages[0][width]": String(PACKAGE.width),
    "packages[0][height]": String(PACKAGE.height),
    "packages[0][length]": String(PACKAGE.length),
    sortBy: "totalPrice",
  });
  const services = await packlinkFetch<PacklinkService[]>(`/services?${qs.toString()}`);
  if (!Array.isArray(services) || services.length === 0) {
    throw new PacklinkError("Nessun servizio Packlink disponibile per questa tratta");
  }
  return [...services].sort((a, b) => servicePrice(a) - servicePrice(b))[0];
}

// ------------------------------------------------------------------------------
// Shipment creation
// ------------------------------------------------------------------------------

export async function createPacklinkShipment(
  order: SceltaAdminOrder
): Promise<PacklinkShipmentResult> {
  const address = order.shippingAddress;
  if (!address?.street || !address.postalCode || !address.city) {
    throw new PacklinkError("Indirizzo di spedizione incompleto: impossibile creare la spedizione");
  }

  const { name, surname } = splitName(order.customerName);
  const recipient = {
    name,
    surname,
    email: order.customerEmail,
    phone: normalizePhone(order.customerPhone),
    street1: address.street,
    zip_code: address.postalCode,
    city: address.city,
    country: "IT",
  };

  try {
    const service = await pickCheapestService(address.postalCode);
    const carrier = service.carrier_name || service.name || "Packlink";

    const result = await packlinkFetch<{ reference?: string }>("/shipments", {
      method: "POST",
      body: JSON.stringify({
        service_id: service.id,
        from: SENDER,
        to: recipient,
        packages: [{ ...PACKAGE }],
        content: CONTENT_DESCRIPTION,
        contentvalue: order.total,
        shipment_custom_reference: order.id,
        collection_date: nextBusinessDay(),
      }),
    });

    if (!result?.reference) {
      throw new PacklinkError("Packlink non ha restituito un riferimento di spedizione");
    }

    return {
      reference: result.reference,
      carrier,
      service: service.service_name || service.name,
      trackingCode: result.reference,
      mock: false,
    };
  } catch (err) {
    const isConnectivityOrServerIssue =
      err instanceof PacklinkError && (err.status === undefined || err.status >= 500);
    if (isConnectivityOrServerIssue && allowMock()) {
      console.warn("[packlink] API non disponibile, uso mock:", (err as Error).message);
      const reference = buildMockReference();
      return { reference, carrier: "BRT Express", trackingCode: reference, mock: true };
    }
    throw err;
  }
}

// ------------------------------------------------------------------------------
// Tracking
// ------------------------------------------------------------------------------

interface RawTrackEvent {
  city?: string;
  description?: string;
  timestamp?: number | string;
  date?: string;
}

interface RawTrackResponse {
  history?: RawTrackEvent[];
  events?: RawTrackEvent[];
  carrier?: string;
  tracking_number?: string;
  trackingNumber?: string;
}

function toIsoDate(value: number | string | undefined): string {
  if (value === undefined || value === "") return new Date().toISOString();
  const asNumber = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(asNumber)
    ? new Date(asNumber < 1e12 ? asNumber * 1000 : asNumber)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function normalizeTrackingStatus(events: PacklinkTrackingEvent[]): PacklinkNormalizedStatus {
  if (events.length === 0) return "created";
  const latest = [...events].sort((a, b) => b.date.localeCompare(a.date))[0].description.toLowerCase();

  if (/(consegnat|delivered|consegna effettuata|ritirat)/.test(latest)) return "delivered";
  if (/(in consegna|out for delivery|presa in carico per la consegna|in distribuzione|with courier)/.test(latest)) {
    return "out_for_delivery";
  }
  if (/(giacenza|mancata|failed|exception|undeliverable|eccezione|rifiutat|danneggiat|returned|reso)/.test(latest)) {
    return "exception";
  }
  if (/(transit|transito|partit|arrivat|hub|sede|depot|smistamento|departed|arrived|ritirato dal corriere|picked up)/.test(latest)) {
    return "in_transit";
  }
  return "in_transit";
}

function buildMockTracking(reference: string): PacklinkTracking {
  return { reference, status: "created", events: [], mock: true };
}

export async function getPacklinkTracking(reference: string): Promise<PacklinkTracking> {
  const ref = reference.trim();
  if (!ref) throw new PacklinkError("Riferimento Packlink mancante");

  try {
    const raw = await packlinkFetch<RawTrackResponse>(
      `/shipments/${encodeURIComponent(ref)}/track`
    );
    const source = Array.isArray(raw?.history) ? raw.history : Array.isArray(raw?.events) ? raw.events : [];
    const events: PacklinkTrackingEvent[] = source
      .map((e) => ({
        date: toIsoDate(e.timestamp ?? e.date),
        description: (e.description || "").trim(),
        city: e.city?.trim() || undefined,
      }))
      .filter((e) => e.description)
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      reference: ref,
      status: normalizeTrackingStatus(events),
      events,
      carrier: raw?.carrier,
      trackingNumber: raw?.tracking_number ?? raw?.trackingNumber,
      mock: false,
    };
  } catch (err) {
    // Spedizione appena creata o non ancora tracciabile: stato "created" senza eventi
    if (err instanceof PacklinkError && (err.status === 404 || err.status === 204)) {
      return { reference: ref, status: "created", events: [], mock: false };
    }
    console.warn("[packlink] Tracking non disponibile:", (err as Error).message);
    return buildMockTracking(ref);
  }
}
