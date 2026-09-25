import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEFAULT_PIN = "2829"; // Via dei Pellegrini 28/29, Napoli
const DEFAULT_MASTER = "%sceltamakeup%2026";
const AUTH_COOKIE_NAME = "scelta_admin_session";

// Semplice firma token di sessione
function createSessionToken(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `sm_adm_${ts}_${rand}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin, password } = body;

    const validPin = process.env.ADMIN_STORE_PIN || DEFAULT_PIN;
    const validPassword = process.env.ADMIN_MASTER_PASSWORD || DEFAULT_MASTER;

    let isAuthenticated = false;
    let authRole = "";

    if (pin && pin.trim() === validPin) {
      isAuthenticated = true;
      authRole = "store_operator";
    } else if (password && password.trim() === validPassword) {
      isAuthenticated = true;
      authRole = "master_admin";
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Credenziali o PIN non validi" },
        { status: 401 }
      );
    }

    const token = createSessionToken();
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
      token,
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

  if (!session?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ success: true, message: "Cockpit bloccato con successo" });
}
