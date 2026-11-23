import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  AUTH_SHORT_TTL_SECONDS,
  AUTH_TOKEN_TTL_SECONDS,
  createSignedAdminToken,
  inspectSignedAdminToken,
} from "@/lib/adminAuth";
import {
  checkRateLimit,
  getClientIp,
  recordRateLimitFailure,
  resetRateLimit,
} from "@/lib/rateLimit";

// La verifica di sessione deve sempre leggere il cookie a runtime:
// nessuna cache statica su CDN/edge (evita 401/stati stale sul laptop salone).
export const dynamic = "force-dynamic";

const MAX_AUTH_FAILURES = 8;
const AUTH_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

/** Credenziali lette esclusivamente dalle variabili ambiente server-side. */
function readCredentials(): { pin: string; masterPassword: string } {
  const pin = (process.env.ADMIN_PIN || "").trim();
  const masterPassword = (process.env.ADMIN_MASTER_PASSWORD || "").trim();
  return { pin, masterPassword };
}

/** Comparazione in tempo costante su hash SHA-256 (previene timing attack). */
function safeSecretEquals(provided: string, expected: string): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function buildCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAgeSeconds,
    path: "/",
  };
}

export async function POST(req: Request) {
  const credentials = readCredentials();
  if (!credentials.pin && !credentials.masterPassword) {
    return NextResponse.json(
      { success: false, error: "Credenziali admin non configurate sul server" },
      { status: 503 }
    );
  }

  const rateKey = `admin_auth:${getClientIp(req)}`;
  const gate = checkRateLimit(rateKey, MAX_AUTH_FAILURES);
  if (!gate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Troppi tentativi errati. Attendi qualche minuto prima di riprovare.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(gate.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await req.json();
    const { pin, password, rememberDevice } = body;

    let isAuthenticated = false;
    let authRole = "";

    if (
      typeof pin === "string" &&
      credentials.pin.length > 0 &&
      safeSecretEquals(pin.trim(), credentials.pin)
    ) {
      isAuthenticated = true;
      authRole = "store_operator";
    } else if (
      typeof password === "string" &&
      credentials.masterPassword.length > 0 &&
      safeSecretEquals(password.trim(), credentials.masterPassword)
    ) {
      isAuthenticated = true;
      authRole = "master_admin";
    }

    if (!isAuthenticated) {
      const failure = recordRateLimitFailure(
        rateKey,
        MAX_AUTH_FAILURES,
        AUTH_LOCKOUT_WINDOW_MS
      );
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (failure.blocked) {
        return NextResponse.json(
          {
            success: false,
            error: "Troppi tentativi errati. Attendi qualche minuto prima di riprovare.",
          },
          {
            status: 429,
            headers: { "Retry-After": String(failure.retryAfterSeconds) },
          }
        );
      }

      return NextResponse.json(
        { success: false, error: "Credenziali o PIN non validi" },
        { status: 401 }
      );
    }

    resetRateLimit(rateKey);

    const persistent = rememberDevice !== false;
    const ttlSeconds = persistent ? AUTH_TOKEN_TTL_SECONDS : AUTH_SHORT_TTL_SECONDS;
    const token = createSignedAdminToken(ttlSeconds);
    const cookieStore = await cookies();

    // Cookie persistente di default (180 giorni / 6 mesi) oppure 12 ore se disattivato
    cookieStore.set(AUTH_COOKIE_NAME, token, buildCookieOptions(ttlSeconds));

    return NextResponse.json({
      success: true,
      role: authRole,
      expiresIn: persistent ? "180d" : "12h",
      maxAgeSeconds: ttlSeconds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Richiesta non valida";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME);
  const inspection = inspectSignedAdminToken(session?.value);

  if (!inspection.valid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Rolling sliding session: se il token ha più di 24h, rinnova silenziosamente per altri 180 giorni
  if (inspection.shouldRefresh) {
    const refreshedToken = createSignedAdminToken(AUTH_TOKEN_TTL_SECONDS);
    cookieStore.set(AUTH_COOKIE_NAME, refreshedToken, buildCookieOptions(AUTH_TOKEN_TTL_SECONDS));
  }

  return NextResponse.json({
    authenticated: true,
    refreshed: inspection.shouldRefresh,
    persistentDays: 180,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ success: true, message: "Cockpit bloccato con successo" });
}
