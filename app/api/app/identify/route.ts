import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { guessNameFromEmail } from "@/lib/customerSession";
import {
  CUSTOMER_COOKIE_NAME,
  EMAIL_PATTERN,
  customerCookieOptions,
  signCustomerSession,
} from "@/lib/customerSessionCookie";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const DEFAULT_ADMIN_EMAILS = [
  "federica.cesiano@gmail.com",
  "info@sceltamakeup.it",
  "federica@sceltamakeup.it",
  "mario@creativiastudio.com",
  "sviluppo@creativiastudio.com",
  "mariopepe9@hotmail.it",
];

function getAdminEmailSet(): Set<string> {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv]);
}

export async function POST(req: Request) {
  const gate = consumeRateLimit(`app_identify:${getClientIp(req)}`, 30, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { success: false, error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, error: "Inserisci un indirizzo email valido" },
        { status: 400 }
      );
    }

    const adminEmails = getAdminEmailSet();
    if (adminEmails.has(email)) {
      // Email riconosciuta lato server come amministratore: richiede ora il PIN / Password Master
      return NextResponse.json({
        success: true,
        nextStep: "admin_pin",
      });
    }

    // Email cliente: crea subito la sessione persistente firmata (180 giorni) e smista allo shop
    const customerSession = {
      email,
      name: guessNameFromEmail(email),
    };
    const signed = signCustomerSession(customerSession);
    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_COOKIE_NAME, signed, customerCookieOptions());

    return NextResponse.json({
      success: true,
      nextStep: "store",
      customer: customerSession,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Richiesta non valida" },
      { status: 400 }
    );
  }
}
