/**
 * Scelta Makeup — Centralized Coupons & Smart Links Store (Server-Only)
 * Module: lib/serverCouponStore.ts
 *
 * Persistenza: singleton `id = 'singleton'` nella tabella `scelta_catalog_overrides`,
 * campo JSONB `data` con chiave `coupons`.
 * Fonte di verità unica cloud Supabase per coupon e smart link promozionali.
 */

import { PromoCoupon, CouponValidationResult } from "@/types/coupon";

const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEFAULT_DEDICATED_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_DEDICATED_SERVICE_KEY;

const OVERRIDES_TABLE = "scelta_catalog_overrides";
const SINGLETON_ID = "singleton";
const COUPONS_KEY = "coupons";

const REQUEST_TIMEOUT_MS = 10_000;
const READ_CACHE_TTL_MS = 3_000;

let readCache: PromoCoupon[] | null = null;
let readCacheAt = 0;

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: DEDICATED_SERVICE_KEY,
    Authorization: `Bearer ${DEDICATED_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export const INITIAL_DEMO_COUPONS: PromoCoupon[] = [
  {
    id: "cpn-diego10",
    code: "DIEGO10",
    slug: "diego10",
    name: "10% Speciale Diego dalla Palma",
    discountType: "percentage",
    discountValue: 10,
    scope: "brand",
    targetBrand: "Diego dalla Palma",
    startDate: "2026-10-01",
    endDate: "2026-11-30",
    maxUses: 100,
    currentUses: 0,
    active: true,
    autoApplyOnLink: true,
    bannerText: "🎉 10% di sconto Diego dalla Palma applicato al tuo carrello!",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cpn-benvenuto5",
    code: "BENVENUTO5",
    slug: "benvenuto",
    name: "5€ di Benvenuto su tutto il catalogo",
    discountType: "fixed",
    discountValue: 5,
    scope: "all",
    minSpend: 35,
    startDate: "2026-10-01",
    currentUses: 0,
    active: true,
    autoApplyOnLink: true,
    bannerText: "✨ 5€ di sconto di benvenuto applicato al tuo ordine!",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function fetchSingletonData(): Promise<Record<string, unknown> | null> {
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
    throw new Error(`Lettura coupon fallita (HTTP ${res.status}): ${detail.slice(0, 150)}`);
  }

  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  return row && typeof row === "object" && "data" in row && typeof (row as any).data === "object"
    ? ((row as any).data as Record<string, unknown>)
    : null;
}

async function writeCoupons(
  coupons: PromoCoupon[],
  currentData: Record<string, unknown> | null
): Promise<void> {
  const data: Record<string, unknown> = {
    ...(currentData || {}),
    [COUPONS_KEY]: coupons,
  };

  const res = await fetch(`${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?on_conflict=id`, {
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
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Salvataggio coupon fallito (HTTP ${res.status}): ${detail.slice(0, 150)}`);
  }
}

export async function getCentralCoupons(options?: { fresh?: boolean }): Promise<PromoCoupon[]> {
  const now = Date.now();
  if (!options?.fresh && readCache && now - readCacheAt < READ_CACHE_TTL_MS) {
    return [...readCache];
  }

  try {
    const data = await fetchSingletonData();
    const raw = data ? data[COUPONS_KEY] : null;

    if (Array.isArray(raw) && raw.length > 0) {
      const sanitized = raw.map((c: any) => ({
        ...c,
        code: normalizeCode(c.code || ""),
        discountValue: Number(c.discountValue) || 0,
        currentUses: Number(c.currentUses) || 0,
        active: c.active !== false,
      })) as PromoCoupon[];

      readCache = sanitized;
      readCacheAt = now;
      return sanitized;
    }

    // Se non presenti nel singleton, inizializza con i coupon predefiniti
    const seeded = [...INITIAL_DEMO_COUPONS];
    try {
      await writeCoupons(seeded, data);
    } catch {}
    readCache = seeded;
    readCacheAt = now;
    return seeded;
  } catch (err) {
    console.warn("[serverCouponStore] Fallback su INITIAL_DEMO_COUPONS:", err);
    return INITIAL_DEMO_COUPONS;
  }
}

export async function saveCentralCoupon(input: PromoCoupon): Promise<PromoCoupon[]> {
  const code = normalizeCode(input.code);
  if (!code) throw new Error("Codice coupon obbligatorio.");
  if (!input.name?.trim()) throw new Error("Titolo promozionale obbligatorio.");
  if (input.discountValue <= 0) throw new Error("Valore sconto non valido.");

  const data = await fetchSingletonData();
  const current = await getCentralCoupons({ fresh: true });

  const existingIdx = current.findIndex(
    (c) => c.id === input.id || c.code.toUpperCase() === code
  );

  const now = new Date().toISOString();
  const coupon: PromoCoupon = {
    ...input,
    id: input.id || `cpn-${code.toLowerCase()}`,
    code,
    name: input.name.trim(),
    discountType: input.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: roundMoney(Number(input.discountValue)),
    scope: input.scope || "all",
    targetBrand: input.targetBrand?.trim() || undefined,
    targetCategory: input.targetCategory?.trim() || undefined,
    minSpend: input.minSpend ? roundMoney(Number(input.minSpend)) : undefined,
    startDate: input.startDate || now.split("T")[0],
    endDate: input.endDate?.trim() || undefined,
    maxUses: input.maxUses ? Number(input.maxUses) : undefined,
    currentUses: Number(input.currentUses) || 0,
    active: input.active !== false,
    autoApplyOnLink: input.autoApplyOnLink !== false,
    bannerText: input.bannerText?.trim() || undefined,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  const next = [...current];
  if (existingIdx >= 0) {
    next[existingIdx] = coupon;
  } else {
    next.push(coupon);
  }

  await writeCoupons(next, data);
  readCache = next;
  readCacheAt = Date.now();
  return next;
}

export async function deleteCentralCoupon(idOrCode: string): Promise<PromoCoupon[]> {
  const target = idOrCode.trim();
  const data = await fetchSingletonData();
  const current = await getCentralCoupons({ fresh: true });

  const next = current.filter(
    (c) => c.id !== target && c.code.toUpperCase() !== target.toUpperCase()
  );

  if (next.length === current.length) return current;

  await writeCoupons(next, data);
  readCache = next;
  readCacheAt = Date.now();
  return next;
}

export async function incrementCouponUsage(code: string): Promise<void> {
  try {
    const targetCode = normalizeCode(code);
    const data = await fetchSingletonData();
    const current = await getCentralCoupons({ fresh: true });
    const coupon = current.find((c) => c.code === targetCode);
    if (!coupon) return;

    coupon.currentUses = (coupon.currentUses || 0) + 1;
    coupon.updatedAt = new Date().toISOString();

    await writeCoupons(current, data);
    readCache = current;
    readCacheAt = Date.now();
  } catch (err) {
    console.warn("[serverCouponStore] Incremento utilizzi fallito:", err);
  }
}

/**
 * Validazione blindata di un coupon per un carrello reale.
 */
export async function validateCouponForCart(
  code: string,
  items: Array<{
    id?: string;
    productId?: string;
    brand?: string;
    category?: string;
    price: number;
    quantity: number;
  }>
): Promise<CouponValidationResult> {
  const normCode = normalizeCode(code);
  if (!normCode) {
    return { valid: false, discountAmount: 0, eligibleSubtotal: 0, error: "Codice promo non valido." };
  }

  const coupons = await getCentralCoupons({ fresh: false });
  const coupon = coupons.find((c) => c.code === normCode);

  if (!coupon) {
    return { valid: false, discountAmount: 0, eligibleSubtotal: 0, error: "Codice promo non riconosciuto." };
  }

  if (!coupon.active) {
    return { valid: false, coupon, discountAmount: 0, eligibleSubtotal: 0, error: "Questo codice promo è stato disattivato." };
  }

  const today = new Date().toISOString().split("T")[0];
  if (coupon.startDate && coupon.startDate > today) {
    return { valid: false, coupon, discountAmount: 0, eligibleSubtotal: 0, error: `La promozione inizierà il ${coupon.startDate}.` };
  }
  if (coupon.endDate && coupon.endDate < today) {
    return { valid: false, coupon, discountAmount: 0, eligibleSubtotal: 0, error: "La promozione è scaduta." };
  }

  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, coupon, discountAmount: 0, eligibleSubtotal: 0, error: "Questo codice ha raggiunto il limite massimo di utilizzi." };
  }

  const totalCartSubtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  if (coupon.minSpend && totalCartSubtotal < coupon.minSpend) {
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: totalCartSubtotal,
      error: `Ordine minimo di €${coupon.minSpend.toFixed(2)} richiesto per applicare questo coupon.`,
    };
  }

  // Filtra gli articoli eleggibili per brand, categoria o selezione prodotti
  const eligibleItems = items.filter((item) => {
    if (coupon.scope === "all") return true;
    if (coupon.scope === "brand" && coupon.targetBrand) {
      return (item.brand || "").toLowerCase().includes(coupon.targetBrand.toLowerCase());
    }
    if (coupon.scope === "category" && coupon.targetCategory) {
      return (item.category || "").toLowerCase().includes(coupon.targetCategory.toLowerCase());
    }
    if (coupon.scope === "products" && Array.isArray(coupon.targetProductIds)) {
      const iId = item.id || "";
      const pId = item.productId || "";
      return (
        (iId && coupon.targetProductIds.includes(iId)) ||
        (pId && coupon.targetProductIds.includes(pId))
      );
    }
    return false;
  });

  const eligibleSubtotal = eligibleItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

  if (eligibleSubtotal <= 0) {
    const targetLabel =
      coupon.scope === "brand"
        ? coupon.targetBrand
        : coupon.scope === "category"
        ? coupon.targetCategory
        : "in promozione";
    return {
      valid: false,
      coupon,
      discountAmount: 0,
      eligibleSubtotal: 0,
      error: `Questo codice è valido solo sui prodotti ${targetLabel || ""}. Aggiungine uno al carrello!`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = roundMoney((eligibleSubtotal * coupon.discountValue) / 100);
  } else if (coupon.discountType === "fixed") {
    discountAmount = roundMoney(Math.min(eligibleSubtotal, coupon.discountValue));
  }

  return {
    valid: true,
    coupon,
    discountAmount,
    eligibleSubtotal,
  };
}
