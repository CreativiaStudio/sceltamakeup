import { NextResponse } from "next/server";
import { getCentralOrders } from "@/lib/serverOrderStore";
import { isCustomerVisibleOrder, normalizeEmail, toPublicOrder } from "@/lib/orderTracking";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = normalizeEmail(body.email);

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, error: "Inserisci un indirizzo email valido" },
        { status: 400 }
      );
    }

    const orders = await getCentralOrders();
    const mine = orders
      .filter((o) => isCustomerVisibleOrder(o) && normalizeEmail(o.customerEmail) === email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toPublicOrder);

    return NextResponse.json({ success: true, orders: mine });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno recupero ordini";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
