import { NextResponse } from "next/server";
import { getCentralOrders } from "@/lib/serverOrderStore";
import { isCustomerVisibleOrder, normalizeEmail, toPublicOrder } from "@/lib/orderTracking";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskCustomerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

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
      .map((order) => {
        const pub = toPublicOrder(order);
        return {
          ...pub,
          customerName: maskCustomerName(pub.customerName),
          // Maschera l'indirizzo completo sulle richieste con sola email (senza numero ordine)
          shippingAddress: undefined,
        };
      });

    return NextResponse.json({ success: true, orders: mine });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno recupero ordini";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
