import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  AUTH_SHORT_TTL_SECONDS,
  AUTH_TOKEN_TTL_SECONDS,
  createSignedAdminToken,
  inspectSignedAdminToken,
} from "@/lib/adminAuth";

// La verifica di sessione deve sempre leggere il cookie a runtime:
// nessuna cache statica su CDN/edge (evita 401/stati stale sul laptop salone).
export const dynamic = "force-dynamic";

/**
 * Credenziali lette dall'ambiente con fallback server-only per garantire
 * la continuità operativa del salone anche se una variabile mancasse sul deploy.
 */
function readCredentials(): { pin: string; masterPassword: string } {
  const pin = (process.env.ADMIN_PIN || "2829").trim();
  const masterPassword = (process.env.ADMIN_MASTER_PASSWORD || "%sceltamakeup%2026").trim();

  return { pin, masterPassword };
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

  try {
    const body = await req.json();
    const { pin, password, rememberDevice } = body;

    let isAuthenticated = false;
    let authRole = "";

    if (typeof pin === "string" && pin.trim() === credentials.pin) {
      isAuthenticated = true;
      authRole = "store_operator";
    } else if (
      typeof password === "string" &&
      password.trim() === credentials.masterPassword
    ) {
      isAuthenticated = true;
      authRole = "master_admin";
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Credenziali o PIN non validi" },
        { status: 401 }
      );
    }

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
