/**
 * Scelta Makeup — Centralized Services Store (Server-Only)
 * Module: lib/serverServicesStore.ts
 *
 * Fonte di verità unica per il listino servizi del Salone, condivisa da tutti
 * i dispositivi (admin remoto di Mario + postazione in negozio).
 *
 * Persistenza: singleton `id = 'singleton'` nella tabella
 * `scelta_catalog_overrides`, campo JSONB `data` con chiave `services`.
 * Le altre chiavi già presenti in `data` vengono preservate (nessuna
 * sovrascrittura distruttiva di eventuali dati storici).
 *
 * Accesso al database dedicato via REST PostgREST con service role key:
 * nessuna dipendenza aggiuntiva, stesso pattern di lib/serverCatalogStore.ts.
 */

import { SERVICES } from "@/data/services";
import type { Service } from "@/types/booking";

// ------------------------------------------------------------------------------
// Backend configuration
// ------------------------------------------------------------------------------

// Resilienza produzione (pattern identico a lib/serverCatalogStore.ts): se le
// variabili non sono ancora configurate nel pannello Vercel, l'app continua a
// usare il progetto Supabase dedicato `zsycaulbamdxqhcukrvn`.
const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEFAULT_DEDICATED_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_DEDICATED_SERVICE_KEY;

const OVERRIDES_TABLE = "scelta_catalog_overrides";
const SINGLETON_ID = "singleton";
const SERVICES_KEY = "services";

/** Micro-cache SOLO per le letture (vetrina pubblica). Mai usata come base di una scrittura. */
const READ_CACHE_TTL_MS = 3000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Percentuale di acconto applicata quando il servizio non la specifica. */
const DEPOSIT_RATE = 0.2;

let readCache: Service[] | null = null;
let readCacheAt = 0;
let pendingRead: Promise<Service[]> | null = null;

// ------------------------------------------------------------------------------
// Generic helpers
// ------------------------------------------------------------------------------

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: DEDICATED_SERVICE_KEY,
    Authorization: `Bearer ${DEDICATED_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

function assertConfigured(): void {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) {
    throw new Error(
      "Configurazione Supabase dedicata mancante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ------------------------------------------------------------------------------
// Service normalization
// ------------------------------------------------------------------------------

function cloneService(service: Service): Service {
  return {
    ...service,
    benefits: Array.isArray(service.benefits) ? [...service.benefits] : [],
    includes: Array.isArray(service.includes) ? [...service.includes] : [],
  };
}

/** Elenco predefinito da data/services.ts (sempre clonato, mai condiviso per referenza). */
function defaultServices(): Service[] {
  return SERVICES.map(cloneService);
}

/**
 * Normalizza un servizio ricevuto dal client o letto dal database.
 *
 * Regole di prezzo richieste dal listino:
 *  - priceOnline    = max(0, priceList - discountOnline)
 *  - depositPercent = 0.20
 *  - depositAmount  = priceOnline * 0.20 (arrotondato ai centesimi)
 *  - balanceAmount  = priceOnline - depositAmount
 *
 * I valori esplicitamente forniti (e validi) vengono rispettati; quelli
 * mancanti vengono calcolati secondo le formule sopra.
 */
function buildService(raw: unknown, base?: Service): Service | null {
  if (!isRecord(raw)) return null;

  const id = text(raw.id) || base?.id || "";
  const name = text(raw.name) || base?.name || "";
  const priceListValue = toFiniteNumber(raw.priceList) ?? base?.priceList ?? null;
  if (!id || !name || priceListValue === null || priceListValue < 0) return null;

  const priceList = roundMoney(priceListValue);

  const channel: Service["channel"] =
    raw.channel === "makeup" || raw.channel === "beauty"
      ? raw.channel
      : base?.channel ?? "makeup";

  const discountValue = toFiniteNumber(raw.discountOnline);
  const discountOnline =
    discountValue !== null && discountValue >= 0
      ? roundMoney(discountValue)
      : base?.discountOnline ?? 0;

  const priceOnlineValue = toFiniteNumber(raw.priceOnline);
  const priceOnline =
    priceOnlineValue !== null && priceOnlineValue >= 0
      ? roundMoney(priceOnlineValue)
      : roundMoney(Math.max(0, priceList - discountOnline));

  const depositPercentValue = toFiniteNumber(raw.depositPercent);
  const depositPercent =
    depositPercentValue !== null && depositPercentValue >= 0 && depositPercentValue <= 1
      ? depositPercentValue
      : base?.depositPercent ?? DEPOSIT_RATE;

  const depositAmountValue = toFiniteNumber(raw.depositAmount);
  const depositAmount =
    depositAmountValue !== null && depositAmountValue >= 0
      ? roundMoney(depositAmountValue)
      : roundMoney(priceOnline * DEPOSIT_RATE);

  const balanceAmountValue = toFiniteNumber(raw.balanceAmount);
  const balanceAmount =
    balanceAmountValue !== null && balanceAmountValue >= 0
      ? roundMoney(balanceAmountValue)
      : roundMoney(Math.max(0, priceOnline - depositAmount));

  const durationValue = toFiniteNumber(raw.durationMinutes);
  const durationMinutes =
    durationValue !== null && durationValue >= 0
      ? Math.round(durationValue)
      : base?.durationMinutes ?? 60;

  const benefits = stringList(raw.benefits) ?? (base ? [...base.benefits] : []);
  const includes = stringList(raw.includes) ?? (base ? [...base.includes] : []);

  return {
    id,
    slug: text(raw.slug) || base?.slug || slugify(name) || id,
    name,
    channel,
    description: text(raw.description) || base?.description || "",
    durationMinutes,
    priceList,
    priceOnline,
    discountOnline,
    depositPercent,
    depositAmount,
    balanceAmount,
    active: typeof raw.active === "boolean" ? raw.active : base?.active ?? true,
    image: text(raw.image) || base?.image || "",
    benefits,
    includes,
    recommendedFor: text(raw.recommendedFor) || base?.recommendedFor || "",
  };
}

/** Validazione dei campi obbligatori per il salvataggio. Restituisce l'id normalizzato. */
function assertSavable(service: Service): string {
  if (!isRecord(service)) {
    throw new Error("Servizio non valido: payload assente o non oggetto.");
  }
  const id = typeof service.id === "string" ? service.id.trim() : "";
  const name = typeof service.name === "string" ? service.name.trim() : "";
  const priceList = toFiniteNumber((service as unknown as Record<string, unknown>).priceList);

  if (!id) throw new Error("Servizio non valido: campo 'id' obbligatorio.");
  if (!name) throw new Error("Servizio non valido: campo 'name' obbligatorio.");
  if (priceList === null || priceList < 0) {
    throw new Error("Servizio non valido: campo 'priceList' obbligatorio e non negativo.");
  }
  return id;
}

function extractServices(data: Record<string, unknown> | null): Service[] {
  if (!data) return [];
  const raw = data[SERVICES_KEY];
  if (!Array.isArray(raw)) return [];

  const out: Service[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const service = buildService(item);
    if (!service || seen.has(service.id)) continue;
    seen.add(service.id);
    out.push(service);
  }
  return out;
}

// ------------------------------------------------------------------------------
// Supabase persistence (singleton JSONB)
// ------------------------------------------------------------------------------

async function fetchSingletonData(): Promise<Record<string, unknown> | null> {
  assertConfigured();
  const res = await fetch(
    `${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?id=eq.${encodeURIComponent(
      SINGLETON_ID
    )}&select=id,data&limit=1`,
    {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Lettura servizi centralizzati fallita (HTTP ${res.status}) ${detail.slice(0, 200)}`
    );
  }

  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const row = rows[0];
  if (!isRecord(row)) return null;
  return isRecord(row.data) ? row.data : null;
}

async function writeServices(
  services: Service[],
  currentData: Record<string, unknown> | null
): Promise<void> {
  assertConfigured();

  // Preserva eventuali altre chiavi già presenti nel singleton (es. dati storici catalogo).
  const data: Record<string, unknown> = {
    ...asRecord(currentData),
    [SERVICES_KEY]: services.map(cloneService),
  };

  const res = await fetch(
    `${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?on_conflict=id`,
    {
      method: "POST",
      headers: authHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        id: SINGLETON_ID,
        data,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Salvataggio servizi centralizzati fallito (HTTP ${res.status}) ${detail.slice(0, 200)}`
    );
  }
}

// ------------------------------------------------------------------------------
// Cache helpers
// ------------------------------------------------------------------------------

function setReadCache(services: Service[]): void {
  readCache = services.map(cloneService);
  readCacheAt = Date.now();
}

function invalidateReadCache(): void {
  readCache = null;
  readCacheAt = 0;
}

async function loadServices(): Promise<Service[]> {
  try {
    const data = await fetchSingletonData();
    const services = extractServices(data);

    if (services.length > 0) {
      setReadCache(services);
      return services;
    }

    // Singleton assente o `data.services` vuoto: inizializza con il listino predefinito.
    const seeded = defaultServices();
    try {
      await writeServices(seeded, data);
      setReadCache(seeded);
      return seeded;
    } catch (err) {
      // Database raggiungibile in lettura ma non scrivibile: si serve comunque
      // il listino predefinito, senza bloccare la vetrina.
      console.warn(
        "[serverServicesStore] Inizializzazione del singleton servizi non riuscita:",
        errorMessage(err)
      );
      return seeded;
    }
  } catch (err) {
    // Errore di rete / database irraggiungibile: fallback di resilienza sul listino statico.
    console.warn(
      "[serverServicesStore] Lettura servizi dal cloud non riuscita, uso SERVICES come fallback:",
      errorMessage(err)
    );
    invalidateReadCache();
    return defaultServices();
  }
}

// ------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------

export async function getCentralServices(options?: { fresh?: boolean }): Promise<Service[]> {
  const now = Date.now();
  if (!options?.fresh && readCache && now - readCacheAt < READ_CACHE_TTL_MS) {
    return readCache.map(cloneService);
  }
  if (!options?.fresh && pendingRead) {
    return pendingRead;
  }

  let task: Promise<Service[]> | null = null;
  task = loadServices().finally(() => {
    if (pendingRead === task) pendingRead = null;
  });
  pendingRead = task;
  return task;
}

export async function saveCentralService(service: Service): Promise<Service[]> {
  const serviceId = assertSavable(service);

  const data = await fetchSingletonData();
  const stored = extractServices(data);
  const base = stored.length > 0 ? stored : defaultServices();

  const existingIndex = base.findIndex((item) => item.id === serviceId);
  const existing = existingIndex >= 0 ? base[existingIndex] : undefined;

  const normalized = buildService(service, existing);
  if (!normalized) {
    throw new Error("Servizio non valido: impossibile normalizzare i dati ricevuti.");
  }

  const next = base.map(cloneService);
  if (existingIndex >= 0) {
    next[existingIndex] = normalized;
  } else {
    next.push(normalized);
  }

  await writeServices(next, data);
  invalidateReadCache();
  return next;
}

export async function deleteCentralService(serviceId: string): Promise<Service[]> {
  const id = typeof serviceId === "string" ? serviceId.trim() : "";
  if (!id) {
    throw new Error("Eliminazione non riuscita: campo 'id' obbligatorio.");
  }

  const data = await fetchSingletonData();
  const stored = extractServices(data);
  const base = stored.length > 0 ? stored : defaultServices();

  const next = base.filter((item) => item.id !== id);
  if (next.length === base.length) {
    // Nessun servizio con questo id: nessuna scrittura necessaria.
    return base.map(cloneService);
  }

  await writeServices(next, data);
  invalidateReadCache();
  return next;
}

export async function resetCentralServices(): Promise<Service[]> {
  // La lettura previa è obbligatoria: garantisce di preservare le altre chiavi
  // del singleton e di non sovrascrivere dati con un oggetto parziale.
  const data = await fetchSingletonData();
  const defaults = defaultServices();

  await writeServices(defaults, data);
  invalidateReadCache();
  return defaults;
}
