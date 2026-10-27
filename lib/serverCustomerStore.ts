/**
 * Scelta Makeup — Centralized Cloud CRM Customers Persistence (Server-Only)
 * Module: lib/serverCustomerStore.ts
 *
 * Single source of truth for every CRM customer card (anagrafica + beauty
 * profiling) created at the Naples boutique or from the remote admin panel.
 *
 * Backend (isolato):
 *   - Dedicated Supabase project (`zsycaulbamdxqhcukrvn`), table
 *     `scelta_customers`
 *     (id uuid, first_name, last_name, email, phone, total_orders,
 *      total_spend, total_appointments, notes).
 *     Nessuna dipendenza da hub o progetti esterni.
 *
 * Perché `notes` contiene anche il profilo beauty:
 *   la tabella ha colonne fisse, quindi tutti i campi del CRM che non hanno una
 *   colonna dedicata vengono serializzati in `notes` con il prefisso
 *   `__CRM_META__:`. In lettura il record viene ricostruito al 100%, incluso il
 *   `crmId` originale (che resta l'identità usata dalla UI).
 *
 * Features:
 *   - Promise write queue to serialize concurrent writes (zero lost updates).
 *   - Fast in-memory cache with 3s TTL for instant queries.
 *   - Deterministic UUID for legacy non-UUID CRM ids, so repeated saves update
 *     the same row instead of creating duplicates.
 */

import type { SceltaCrmCustomer } from "@/lib/adminStore";

// Resilienza produzione (pattern identico a lib/serverOrderStore.ts): se le
// variabili non sono ancora configurate nel pannello Vercel, l'app continua a
// usare il progetto Supabase dedicato `zsycaulbamdxqhcukrvn` invece di fallire
// a runtime.
const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEFAULT_DEDICATED_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_DEDICATED_SERVICE_KEY;

const CUSTOMERS_TABLE = "scelta_customers";
const CACHE_TTL_MS = 3000;
const CRM_META_PREFIX = "__CRM_META__:";

/** Payload serializzato dentro `scelta_customers.notes`. */
interface CrmMeta {
  crmId?: string;
  skinType?: string;
  favoriteColors?: string[];
  beautyInterests?: string[];
  preferredBrands?: string[];
  undertone?: string;
  colorSeason?: string;
  purchasedProductsNotes?: string;
  originalEmail?: string;
  rawNotes?: string;
}

/** Row shape returned by PostgREST for `scelta_customers`. */
interface CustomerRow {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  total_orders?: number | null;
  total_spend?: number | null;
  total_appointments?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const CUSTOMER_COLUMNS =
  "id,first_name,last_name,email,phone,total_orders,total_spend,total_appointments,notes,created_at,updated_at";
// Fallback usato quando la tabella non espone le colonne timestamp.
const CUSTOMER_BASE_COLUMNS =
  "id,first_name,last_name,email,phone,total_orders,total_spend,total_appointments,notes";

let memoryCache: SceltaCrmCustomer[] | null = null;
let cacheFetchedAt = 0;

// Serializes writes so concurrent saves never overwrite each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

function headersFor(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

// ------------------------------------------------------------------------------
// UUID handling
// ------------------------------------------------------------------------------
// The CRM has always used readable ids (`crm-cust-1699999999999`), while the
// column is a real `uuid`. We keep the readable id inside `__CRM_META__` and
// derive a *deterministic* UUID from it, so saving the same customer twice
// always targets the same row (no duplicates, no orphaned cards).

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hashHex(input: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function deterministicUuid(input: string): string {
  const seeds = [0x811c9dc5, 0x9e3779b1, 0x85ebca6b, 0xc2b2ae35];
  const hexChars = seeds.map((seed, index) => hashHex(`${index}:${input}`, seed)).join("").split("");
  // Force RFC-4122 version 4 / variant bits so Postgres accepts it as a uuid.
  hexChars[12] = "4";
  hexChars[16] = ((parseInt(hexChars[16], 16) & 0x3) | 0x8).toString(16);
  const hex = hexChars.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function resolveRowId(crmId: string): string {
  if (UUID_REGEX.test(crmId)) return crmId.toLowerCase();
  return deterministicUuid(crmId);
}

// ------------------------------------------------------------------------------
// Mapping domain <-> row
// ------------------------------------------------------------------------------

function splitName(fullName: string): { firstName: string; lastName: string } {
  const clean = (fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "Cliente", lastName: "" };
  const firstSpace = clean.indexOf(" ");
  if (firstSpace === -1) return { firstName: clean, lastName: "" };
  return {
    firstName: clean.slice(0, firstSpace),
    lastName: clean.slice(firstSpace + 1).trim(),
  };
}

function buildFallbackEmail(crmId: string): string {
  return `cliente_${crmId.replace(/[^a-zA-Z0-9]/g, "")}@sceltamakeup.it`;
}

/** Maps a domain customer to the `scelta_customers` row shape. */
function toRow(customer: SceltaCrmCustomer): Record<string, unknown> {
  const { firstName, lastName } = splitName(customer.name);
  const email = (customer.email || "").trim() || buildFallbackEmail(customer.id);

  const meta: CrmMeta = {
    crmId: customer.id,
    skinType: customer.skinType,
    favoriteColors: customer.favoriteColors,
    beautyInterests: customer.beautyInterests,
    preferredBrands: customer.preferredBrands,
    undertone: customer.undertone,
    colorSeason: customer.colorSeason,
    purchasedProductsNotes: customer.purchasedProductsNotes,
    originalEmail: customer.email,
    rawNotes: customer.notes,
  };

  return {
    id: resolveRowId(customer.id),
    first_name: firstName,
    last_name: lastName,
    email,
    phone: customer.phone || "",
    total_orders: customer.ordersCount || 0,
    total_spend: customer.totalSpend || 0,
    total_appointments: customer.appointmentsCount || 0,
    notes: CRM_META_PREFIX + JSON.stringify(meta),
  };
}

function parseCrmMeta(notes: string): CrmMeta | null {
  if (!notes.startsWith(CRM_META_PREFIX)) return null;
  try {
    const parsed = JSON.parse(notes.slice(CRM_META_PREFIX.length)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as CrmMeta;
  } catch {
    return null;
  }
}

/** Rebuilds a full domain customer from a cloud row. */
function fromRow(row: CustomerRow): SceltaCrmCustomer {
  const rowId = typeof row.id === "string" ? row.id : "";
  const columnNotes = typeof row.notes === "string" ? row.notes : "";
  const meta = parseCrmMeta(columnNotes);

  const columnEmail = typeof row.email === "string" ? row.email : "";
  const firstName = (row.first_name ?? "").trim();
  const lastName = (row.last_name ?? "").trim();
  const columnName = [firstName, lastName].filter(Boolean).join(" ") || "Cliente";

  const lastActive = row.updated_at || row.created_at || "";

  if (meta) {
    return {
      id: meta.crmId || rowId,
      name: columnName,
      email: meta.originalEmail ?? columnEmail,
      phone: typeof row.phone === "string" ? row.phone : "",
      totalSpend: toNumber(row.total_spend),
      ordersCount: toNumber(row.total_orders),
      appointmentsCount: toNumber(row.total_appointments),
      lastActive,
      notes: meta.rawNotes || "",
      skinType: meta.skinType || "",
      preferredBrands: toStringList(meta.preferredBrands),
      beautyInterests: toStringList(meta.beautyInterests),
      favoriteColors: toStringList(meta.favoriteColors),
      purchasedProductsNotes: meta.purchasedProductsNotes || "",
      colorSeason: meta.colorSeason || "",
      undertone: meta.undertone || "",
    };
  }

  // Riga creata fuori dal CRM (nessun meta): campi colonna con default sicuri.
  return {
    id: rowId,
    name: columnName,
    email: columnEmail,
    phone: typeof row.phone === "string" ? row.phone : "",
    totalSpend: toNumber(row.total_spend),
    ordersCount: toNumber(row.total_orders),
    appointmentsCount: toNumber(row.total_appointments),
    lastActive,
    notes: columnNotes,
    skinType: "",
    preferredBrands: [],
    beautyInterests: [],
    favoriteColors: [],
    purchasedProductsNotes: "",
    colorSeason: "",
    undertone: "",
  };
}

// ------------------------------------------------------------------------------
// Supabase transport
// ------------------------------------------------------------------------------

async function readFromDedicated(): Promise<SceltaCrmCustomer[] | null> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return null;

  // Prima scelta: colonne complete (con timestamp). Se la tabella non le espone,
  // PostgREST risponde 400 e si ripiega sulle sole colonne del CRM.
  const queries = [
    `select=${encodeURIComponent(CUSTOMER_COLUMNS)}&order=updated_at.desc`,
    `select=${encodeURIComponent(CUSTOMER_BASE_COLUMNS)}`,
  ];

  for (const query of queries) {
    try {
      const res = await fetch(`${DEDICATED_URL}/rest/v1/${CUSTOMERS_TABLE}?${query}`, {
        method: "GET",
        headers: headersFor(DEDICATED_SERVICE_KEY),
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 400) continue;
        console.error("[serverCustomerStore] Read error: HTTP", res.status, res.statusText);
        return null;
      }

      const rows = (await res.json()) as CustomerRow[];
      if (!Array.isArray(rows)) return [];
      return rows
        .filter((r): r is CustomerRow => Boolean(r && typeof r === "object"))
        .map(fromRow)
        .filter((c) => Boolean(c.id));
    } catch (err) {
      console.error("[serverCustomerStore] Read error:", err);
      return null;
    }
  }

  console.error("[serverCustomerStore] Read error: nessuna query compatibile con la tabella");
  return null;
}

async function upsertRows(rows: Array<Record<string, unknown>>): Promise<boolean> {
  if (rows.length === 0) return true;
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return false;
  try {
    const res = await fetch(`${DEDICATED_URL}/rest/v1/${CUSTOMERS_TABLE}`, {
      method: "POST",
      headers: {
        ...headersFor(DEDICATED_SERVICE_KEY),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      console.error("[serverCustomerStore] Write error: HTTP", res.status, res.statusText);
    }
    return res.ok;
  } catch (err) {
    console.error("[serverCustomerStore] Write error:", err);
    return false;
  }
}

async function deleteRow(crmId: string): Promise<boolean> {
  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) return false;
  try {
    // 1) Riga con id UUID (nuove schede).
    const byId = `${DEDICATED_URL}/rest/v1/${CUSTOMERS_TABLE}?id=eq.${encodeURIComponent(
      resolveRowId(crmId)
    )}`;
    const first = await fetch(byId, {
      method: "DELETE",
      headers: { ...headersFor(DEDICATED_SERVICE_KEY), Prefer: "return=minimal" },
    });
    if (!first.ok) {
      console.error("[serverCustomerStore] DELETE error: HTTP", first.status, first.statusText);
    }

    // 2) Riga storica il cui id UUID non deriva dal crmId: la si ritrova dal meta.
    if (!UUID_REGEX.test(crmId)) {
      const metaFragment = `"crmId":${JSON.stringify(crmId)}`;
      const byMeta = `${DEDICATED_URL}/rest/v1/${CUSTOMERS_TABLE}?notes=like.${encodeURIComponent(
        `*${metaFragment}*`
      )}`;
      const second = await fetch(byMeta, {
        method: "DELETE",
        headers: { ...headersFor(DEDICATED_SERVICE_KEY), Prefer: "return=minimal" },
      });
      if (!second.ok) {
        console.error("[serverCustomerStore] DELETE (meta) error: HTTP", second.status, second.statusText);
      }
      return first.ok || second.ok;
    }

    return first.ok;
  } catch (err) {
    console.error("[serverCustomerStore] DELETE error:", err);
    return false;
  }
}

function sortCustomers(customers: SceltaCrmCustomer[]): SceltaCrmCustomer[] {
  return [...customers].sort(
    (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
  );
}

// ------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------

export async function getCentralCustomers(): Promise<SceltaCrmCustomer[]> {
  const now = Date.now();
  if (memoryCache && now - cacheFetchedAt < CACHE_TTL_MS) {
    return memoryCache;
  }

  const previous = new Map<string, SceltaCrmCustomer>(
    (memoryCache ?? []).map((c) => [c.id, c])
  );
  const read = await readFromDedicated();
  const fallbackIso = new Date().toISOString();
  const resolved = (read ?? memoryCache ?? []).map((c) => {
    if (c.lastActive) return c;
    // Riga senza timestamp: si conserva l'ultimo valore noto per non far
    // "saltare" l'ordinamento a ogni polling.
    return { ...c, lastActive: previous.get(c.id)?.lastActive || fallbackIso };
  });
  const customers = sortCustomers(resolved);

  memoryCache = customers;
  cacheFetchedAt = Date.now();
  return customers;
}

export async function saveCentralCustomer(
  customer: SceltaCrmCustomer
): Promise<SceltaCrmCustomer[]> {
  return enqueue(async () => {
    const current = await getCentralCustomers();
    const map = new Map<string, SceltaCrmCustomer>();

    // Put the just-saved customer first (most recently active).
    map.set(customer.id, customer);
    for (const c of current) {
      if (!map.has(c.id)) map.set(c.id, c);
    }

    const updated = sortCustomers(Array.from(map.values()));

    const ok = await upsertRows([toRow(customer)]);
    if (ok) {
      memoryCache = updated;
      cacheFetchedAt = Date.now();
    }

    return updated;
  });
}

export async function saveCentralCustomers(
  customersBatch: SceltaCrmCustomer[]
): Promise<SceltaCrmCustomer[]> {
  return enqueue(async () => {
    const current = await getCentralCustomers();
    const map = new Map<string, SceltaCrmCustomer>();

    for (const c of customersBatch) {
      if (!c || typeof c !== "object" || !c.id) continue;
      map.set(c.id, c);
    }
    for (const c of current) {
      if (!map.has(c.id)) map.set(c.id, c);
    }

    const updated = sortCustomers(Array.from(map.values()));
    const rows = customersBatch
      .filter((c) => Boolean(c && typeof c === "object" && c.id))
      .map((c) => toRow(c));

    const ok = await upsertRows(rows);
    if (ok) {
      memoryCache = updated;
      cacheFetchedAt = Date.now();
    }

    return updated;
  });
}

export async function deleteCentralCustomer(crmId: string): Promise<SceltaCrmCustomer[]> {
  return enqueue(async () => {
    const current = await getCentralCustomers();
    const updated = current.filter((c) => c.id !== crmId);

    const ok = await deleteRow(crmId);
    if (ok) {
      memoryCache = updated;
      cacheFetchedAt = Date.now();
    }

    return updated;
  });
}
