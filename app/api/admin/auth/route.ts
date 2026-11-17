import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  createSignedAdminToken,
  verifySignedAdminToken,
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

export async function POST(req: Request) {
  const credentials = readCredentials();

  try {
    const body = await req.json();
    const { pin, password } = body;

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

    const token = createSignedAdminToken();
    const cookieStore = await cookies();

    // Cookie valido per 12 ore (orario lavorativo salone)
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 12 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      role: authRole,
      expiresIn: "12h",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Richiesta non valida";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME);

  if (!session?.value || !verifySignedAdminToken(session.value)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ success: true, message: "Cockpit bloccato con successo" });
}
