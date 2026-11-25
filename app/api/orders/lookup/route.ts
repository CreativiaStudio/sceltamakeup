import { NextResponse } from "next/server";
import { getCentralOrders, updateCentralOrderFields } from "@/lib/serverOrderStore";
import { getPacklinkTracking, type PacklinkTracking } from "@/lib/packlink";
import {
  isCustomerVisibleOrder,
  maskCustomerName,
  maskShippingAddress,
  normalizeEmail,
  toPublicOrder,
} from "@/lib/orderTracking";
import { isPacklinkReference } from "@/lib/trackingUtils";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const NOT_FOUND_MESSAGE =
  "Nessun ordine trovato con questi dati. Controlla numero ordine ed email usata al checkout.";

export async function GET(req: Request) {
  const gate = consumeRateLimit(`orders_lookup:${getClientIp(req)}`, 30, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { success: false, error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

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
    let resolvedOrder = order;
    if (order.packlinkReference) {
      tracking = await getPacklinkTracking(order.packlinkReference).catch(() => null);
      if (
        tracking?.trackingNumber &&
        (!order.trackingCode ||
          order.trackingCode === order.packlinkReference ||
          isPacklinkReference(order.trackingCode))
      ) {
        const nextCourier = !order.courierName && tracking.carrier ? tracking.carrier : order.courierName;
        resolvedOrder = {
          ...order,
          trackingCode: tracking.trackingNumber,
          ...(nextCourier ? { courierName: nextCourier } : {}),
        };
        await updateCentralOrderFields(order.id, {
          trackingCode: tracking.trackingNumber,
          ...(tracking.carrier && !order.courierName ? { courierName: tracking.carrier } : {}),
        }).catch(() => null);
      }
    }

    const publicOrder = toPublicOrder(resolvedOrder);
    return NextResponse.json({
      success: true,
      order: {
        ...publicOrder,
        customerName: maskCustomerName(publicOrder.customerName),
        shippingAddress: maskShippingAddress(publicOrder.shippingAddress),
      },
      tracking,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno ricerca ordine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
