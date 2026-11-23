/**
 * Scelta Makeup — Autenticazione Admin (helper lato server)
 * Module: lib/adminAuth.ts
 *
 * Firma e verifica il cookie di sessione `scelta_admin_session` con HMAC-SHA256.
 * Il token è opaco, firmato con un segreto letto dall'ambiente e mai esposto in
 * chiaro: l'integrità è garantita da `timingSafeEqual` (comparazione in tempo
 * costante, resistente ai timing attack).
 *
 * ⚠️ File server-only: usa `crypto` di Node.js. Non importarlo in componenti
 * client o verrà incluso nel bundle browser.
 */

import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { NextResponse } from "next/server";

/** Nome del cookie di sessione admin (deve coincidere con la route /api/admin/auth). */
export const AUTH_COOKIE_NAME = "scelta_admin_session";

/** Durata standard sessione persistente: 180 giorni (6 mesi) per mobilità e app. */
export const AUTH_TOKEN_TTL_SECONDS = 180 * 24 * 60 * 60;

/** Durata breve opzionale (quando "Resta connessa" è disattivato): 12 ore. */
export const AUTH_SHORT_TTL_SECONDS = 12 * 60 * 60;

/** Soglia oltre la quale un token valido viene rinnovato silenziosamente (24 ore). */
export const AUTH_REFRESH_THRESHOLD_SECONDS = 24 * 60 * 60;

/** Versione del formato token, per evoluzioni future senza rottura. */
const TOKEN_FORMAT_VERSION = 1;

// ------------------------------------------------------------------------------
// Risoluzione del segreto di firma
// ------------------------------------------------------------------------------

let cachedSecret: string | null = null;

/**
 * Segreto HMAC usato per firmare/verificare i token di sessione.
 *
 * Ordine di lettura:
 *  1. `ADMIN_SESSION_SECRET` (segreto dedicato, preferito)
 *  2. `ADMIN_MASTER_PASSWORD` (ricaduta sulla password master del salone)
 *  3. `STRIPE_SECRET_KEY` (ultima ricaduta disponibile in produzione)
 *
 * Se nessuna variabile è presente, genera un segreto random per processo
 * (`crypto.randomBytes`): non esiste MAI una stringa fissa nota. La
 * conseguenza è che in tale configurazione le sessioni non sopravvivono al
 * riavvio del processo, che è il comportamento atteso e sicuro.
 */
function resolveAdminSecret(): string {
  if (cachedSecret) return cachedSecret;

  const envSecret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_MASTER_PASSWORD ||
    process.env.STRIPE_SECRET_KEY;

  if (envSecret && envSecret.trim().length > 0) {
    cachedSecret = envSecret;
  } else {
    // Fallback random per processo: mai una costante predicibile nel codice.
    cachedSecret = `sm_process_${randomBytes(32).toString("hex")}`;
  }

  return cachedSecret;
}

// ------------------------------------------------------------------------------
// Codifica / decodifica Base64URL (senza dipendere da Buffer polifill browser)
// ------------------------------------------------------------------------------

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

// ------------------------------------------------------------------------------
// Firma e verifica del token
// ------------------------------------------------------------------------------

interface AdminTokenPayload {
  v: number;
  iat: number; // issued-at, secondi Unix
  exp: number; // scadenza, secondi Unix
  nonce: string; // nonce casuale anti-replay
}

export interface AdminTokenInspection {
  valid: boolean;
  iat?: number;
  exp?: number;
  shouldRefresh: boolean;
}

/**
 * Crea un token di sessione firmato.
 *
 * Formato: `<payloadBase64Url>.<hmacSha256Hex>` dove il payload è un JSON
 * codificato in Base64URL contenente versione, emesso-a, scadenza e nonce.
 */
export function createSignedAdminToken(ttlSeconds: number = AUTH_TOKEN_TTL_SECONDS): string {
  const secret = resolveAdminSecret();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const effectiveTtl =
    typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) && ttlSeconds > 0
      ? Math.floor(ttlSeconds)
      : AUTH_TOKEN_TTL_SECONDS;

  const payload: AdminTokenPayload = {
    v: TOKEN_FORMAT_VERSION,
    iat: nowSeconds,
    exp: nowSeconds + effectiveTtl,
    nonce: randomBytes(12).toString("hex"),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("hex");

  return `${encodedPayload}.${signature}`;
}

/**
 * Ispeziona un token di sessione: verifica HMAC in tempo costante, scadenza
 * e segnala se il token ha superato `AUTH_REFRESH_THRESHOLD_SECONDS` dall'emissione.
 */
export function inspectSignedAdminToken(
  token: string | null | undefined
): AdminTokenInspection {
  if (!token || typeof token !== "string") {
    return { valid: false, shouldRefresh: false };
  }

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return { valid: false, shouldRefresh: false };
  }

  const encodedPayload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const secret = resolveAdminSecret();
  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  // La lunghezza deve coincidere prima di chiamare timingSafeEqual (che la richiede).
  if (expectedBuffer.length === 0 || providedBuffer.length !== expectedBuffer.length) {
    return { valid: false, shouldRefresh: false };
  }
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { valid: false, shouldRefresh: false };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as Partial<AdminTokenPayload>;
    if (!parsed || parsed.v !== TOKEN_FORMAT_VERSION) {
      return { valid: false, shouldRefresh: false };
    }
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return { valid: false, shouldRefresh: false };
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSeconds) {
      return { valid: false, shouldRefresh: false };
    }

    const iat = typeof parsed.iat === "number" && Number.isFinite(parsed.iat) ? parsed.iat : undefined;
    const isLongSession = parsed.exp - (iat ?? nowSeconds) > AUTH_SHORT_TTL_SECONDS;
    const shouldRefresh =
      isLongSession && iat !== undefined && nowSeconds - iat >= AUTH_REFRESH_THRESHOLD_SECONDS;

    return {
      valid: true,
      iat,
      exp: parsed.exp,
      shouldRefresh,
    };
  } catch {
    return { valid: false, shouldRefresh: false };
  }
}

/**
 * Verifica un token di sessione: HMAC corretto (confronto in tempo costante) e
 * scadenza non superata. Ritorna `true` solo se il token è integro e valido.
 */
export function verifySignedAdminToken(token: string | null | undefined): boolean {
  return inspectSignedAdminToken(token).valid;
}

// ------------------------------------------------------------------------------
// Lettura del cookie dalla richiesta
// ------------------------------------------------------------------------------

/**
 * Parsa l'header `Cookie` in una mappa nome → valore. Non dipende da NextRequest
 * né da `next/headers`, quindi funziona con qualunque oggetto `Request`.
 */
function parseCookieHeader(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;

  for (const part of header.split(";")) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    const name = part.slice(0, eqIndex).trim();
    const value = part.slice(eqIndex + 1).trim();
    if (name) result[name] = value;
  }

  return result;
}

/**
 * Ritorna `true` se la richiesta in ingresso trasporta un cookie di sessione
 * admin valido e non scaduto.
 */
export function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie");
  const token = parseCookieHeader(cookieHeader)[AUTH_COOKIE_NAME];
  return verifySignedAdminToken(token);
}

/**
 * Guard server-side per le route protette.
 *
 * Ritorna `null` se la richiesta è autenticata (l'handler può proseguire),
 * altrimenti una `NextResponse` 401 pronta da restituire.
 *
 * Esempio d'uso in una route handler:
 *   const unauthorized = requireAdmin(request);
 *   if (unauthorized) return unauthorized;
 */
export function requireAdmin(request: Request): NextResponse | null {
  if (isAdminRequest(request)) return null;
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}
