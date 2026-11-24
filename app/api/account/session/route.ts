import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_TTL_SECONDS,
  customerCookieOptions,
  sanitizeCustomerSessionPayload,
  signCustomerSession,
  verifyCustomerToken,
} from "@/lib/customerSessionCookie";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
  const session = verifyCustomerToken(rawCookie);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  // Rinnovo silenzioso del cookie firmato server-side (bypass ITP 7gg Safari iPhone)
  cookieStore.set(CUSTOMER_COOKIE_NAME, signCustomerSession(session), customerCookieOptions());
  return NextResponse.json({ session });
}

export async function POST(req: Request) {
  const gate = consumeRateLimit(`account_session:${getClientIp(req)}`, 30, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { success: false, error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const session = sanitizeCustomerSessionPayload(body);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Email cliente non valida" },
        { status: 400 }
      );
    }

    const signed = signCustomerSession(session);
    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_COOKIE_NAME, signed, customerCookieOptions());

    return NextResponse.json({ success: true, maxAgeSeconds: CUSTOMER_TTL_SECONDS });
  } catch {
    return NextResponse.json(
      { success: false, error: "Richiesta non valida" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE_NAME);
  return NextResponse.json({ success: true });
}
