import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id mancante" }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Errore di connessione con Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
