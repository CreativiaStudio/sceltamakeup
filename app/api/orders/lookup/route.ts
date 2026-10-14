import { NextResponse } from "next/server";
import { getCentralOrders } from "@/lib/serverOrderStore";
import { getPacklinkTracking, type PacklinkTracking } from "@/lib/packlink";
import { isCustomerVisibleOrder, normalizeEmail, toPublicOrder } from "@/lib/orderTracking";

export const dynamic = "force-dynamic";

const NOT_FOUND_MESSAGE =
  "Nessun ordine trovato con questi dati. Controlla numero ordine ed email usata al checkout.";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const orderNumber = (params.get("orderNumber") || params.get("orderId") || "").trim().toLowerCase();
    const email = normalizeEmail(params.get("email"));

    if (!orderNumber || !email) {
      return NextResponse.json(
        { success: false, error: "Numero ordine ed email sono obbligatori" },
        { status: 400 }
      );
    }

    const orders = await getCentralOrders();
    const order = orders.find(
      (o) =>
        isCustomerVisibleOrder(o) &&
        o.id.toLowerCase() === orderNumber &&
        normalizeEmail(o.customerEmail) === email
    );

    if (!order) {
      return NextResponse.json({ success: false, error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    let tracking: PacklinkTracking | null = null;
    if (order.packlinkReference) {
      tracking = await getPacklinkTracking(order.packlinkReference).catch(() => null);
    }

    return NextResponse.json({ success: true, order: toPublicOrder(order), tracking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno ricerca ordine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
