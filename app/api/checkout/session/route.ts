import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = consumeRateLimit(`checkout_session:${getClientIp(req)}`, 30, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

  const sessionId = (req.nextUrl.searchParams.get("session_id") || "").trim();

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id mancante o non valido" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      sessionId: session.id,
      payment_status: session.payment_status,
      status: session.status,
      customer_email: session.customer_details?.email ?? null,
      customer_name: session.customer_details?.name ?? null,
      metadata: session.metadata ?? {},
      amount_total: session.amount_total ?? 0,
    });
  } catch (error) {
    console.error("Stripe Session retrieve error:", error);
    return NextResponse.json(
      { error: "Sessione di pagamento non disponibile" },
      { status: 500 }
    );
  }
}
