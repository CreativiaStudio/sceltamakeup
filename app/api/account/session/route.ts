import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { CustomerSession, ShippingAddress } from "@/lib/customerSession";

export const dynamic = "force-dynamic";

const CUSTOMER_COOKIE_NAME = "scelta_customer_session";
const CUSTOMER_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 giorni (6 mesi)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (!rawCookie) {
    return NextResponse.json({ session: null });
  }

  try {
    const decoded = Buffer.from(rawCookie, "base64url").toString("utf8");
    const session = sanitizeSessionPayload(JSON.parse(decoded));
    if (!session) {
      return NextResponse.json({ session: null });
    }

    // Rinnovo silenzioso del cookie server-side (bypass ITP 7gg Safari iPhone)
    cookieStore.set(CUSTOMER_COOKIE_NAME, rawCookie, cookieOptions());
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ session: null });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = sanitizeSessionPayload(body);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Email cliente non valida" },
        { status: 400 }
      );
    }

    const encoded = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_COOKIE_NAME, encoded, cookieOptions());

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
