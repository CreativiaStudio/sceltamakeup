import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { CustomerSession, ShippingAddress } from "@/lib/customerSession";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const CUSTOMER_COOKIE_NAME = "scelta_customer_session";
const CUSTOMER_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 giorni (6 mesi)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let cachedCustomerSecret: string | null = null;

function resolveCustomerSecret(): string {
  if (cachedCustomerSecret) return cachedCustomerSecret;
  const base =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.STRIPE_SECRET_KEY ||
    randomBytes(32).toString("hex");
  cachedCustomerSecret = `scelta_customer_cookie_v1:${base}`;
  return cachedCustomerSecret;
}

function signCustomerSession(session: CustomerSession): string {
  const encoded = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const sig = createHmac("sha256", resolveCustomerSecret()).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

function verifyCustomerToken(token: string | undefined): CustomerSession | null {
  if (!token || typeof token !== "string") return null;
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === token.length - 1) return null;

  const encoded = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  const expectedSig = createHmac("sha256", resolveCustomerSecret())
    .update(encoded)
    .digest("hex");

  const a = Buffer.from(providedSig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    return sanitizeSessionPayload(JSON.parse(decoded));
  } catch {
    return null;
  }
}

function sanitizeAddress(raw: unknown): ShippingAddress | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const street = typeof obj.street === "string" ? obj.street.trim().slice(0, 160) : "";
  const city = typeof obj.city === "string" ? obj.city.trim().slice(0, 80) : "";
  const postalCode = typeof obj.postalCode === "string" ? obj.postalCode.trim().slice(0, 16) : "";
  const province = typeof obj.province === "string" ? obj.province.trim().slice(0, 16) : "";
  if (!street && !city && !postalCode && !province) return undefined;
  return { street, city, postalCode, province };
}

function sanitizeSessionPayload(raw: unknown): CustomerSession | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const email = typeof obj.email === "string" ? obj.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_PATTERN.test(email)) return null;
  const name = typeof obj.name === "string" ? obj.name.trim().slice(0, 100) : "";
  return {
    email,
    name,
    savedAddress: sanitizeAddress(obj.savedAddress),
  };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: CUSTOMER_TTL_SECONDS,
    path: "/",
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
  const session = verifyCustomerToken(rawCookie);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  // Rinnovo silenzioso del cookie firmato server-side (bypass ITP 7gg Safari iPhone)
  cookieStore.set(CUSTOMER_COOKIE_NAME, signCustomerSession(session), cookieOptions());
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
    const session = sanitizeSessionPayload(body);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Email cliente non valida" },
        { status: 400 }
      );
    }

    const signed = signCustomerSession(session);
    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_COOKIE_NAME, signed, cookieOptions());

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
