/**
 * Scelta Makeup — Rate Limiter In-Memory (server-only)
 * Module: lib/rateLimit.ts
 *
 * Protezione leggera contro brute-force e abuso di endpoint pubblici senza
 * dipendenze esterne. Mantiene i contatori per istanza server con pulizia
 * automatica delle finestre scadute.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 1000;

function cleanupExpired(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/** Estrae l'IP del client dagli header proxy standard (Vercel / Cloudflare). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  return "unknown";
}

/**
 * Controlla lo stato attuale di una chiave senza incrementare il contatore.
 * Utile per i tentativi falliti di login (non penalizza gli accessi riusciti).
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.count),
    retryAfterSeconds: 0,
  };
}

/** Registra un tentativo fallito e ritorna se la chiave è ora bloccata. */
export function recordRateLimitFailure(
  key: string,
  maxAttempts: number,
  windowMs: number
): { blocked: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      blocked: maxAttempts <= 1,
      remaining: Math.max(0, maxAttempts - 1),
      retryAfterSeconds: maxAttempts <= 1 ? Math.ceil(windowMs / 1000) : 0,
    };
  }

  existing.count += 1;
  const blocked = existing.count >= maxAttempts;
  return {
    blocked,
    remaining: Math.max(0, maxAttempts - existing.count),
    retryAfterSeconds: blocked ? Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) : 0,
  };
}

/** Azzera il contatore dopo un'autenticazione riuscita. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Consuma 1 richiesta nella finestra (fixed window) per endpoint pubblici. */
export function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, maxRequests - 1), retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: 0,
  };
}
