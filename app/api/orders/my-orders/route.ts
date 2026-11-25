import { NextResponse } from "next/server";
import { getCentralOrders, updateCentralOrderFields } from "@/lib/serverOrderStore";
import { getPacklinkTracking } from "@/lib/packlink";
import {
  isCustomerVisibleOrder,
  maskCustomerName,
  normalizeEmail,
  toPublicOrder,
} from "@/lib/orderTracking";
import { isPacklinkReference } from "@/lib/trackingUtils";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const gate = consumeRateLimit(`orders_mine:${getClientIp(req)}`, 30, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { success: false, error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

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
    const visibleOrders = orders
      .filter((o) => isCustomerVisibleOrder(o) && normalizeEmail(o.customerEmail) === email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const ordersNeedingCode = visibleOrders
      .filter(
        (o) =>
          o.fulfillmentType === "courier" &&
          Boolean(o.packlinkReference) &&
          (!o.trackingCode || o.trackingCode === o.packlinkReference || isPacklinkReference(o.trackingCode))
      )
      .slice(0, 5);

    const resolvedOverrides = new Map<string, { trackingCode: string; courierName?: string }>();
    if (ordersNeedingCode.length > 0) {
      await Promise.all(
        ordersNeedingCode.map(async (order) => {
          const ref = order.packlinkReference;
          if (!ref) return;
          const tracking = await getPacklinkTracking(ref).catch(() => null);
          if (!tracking?.trackingNumber) return;
          const nextCourier = !order.courierName && tracking.carrier ? tracking.carrier : undefined;
          resolvedOverrides.set(order.id, {
            trackingCode: tracking.trackingNumber,
            ...(nextCourier ? { courierName: nextCourier } : {}),
          });
          await updateCentralOrderFields(order.id, {
            trackingCode: tracking.trackingNumber,
            ...(nextCourier ? { courierName: nextCourier } : {}),
          }).catch(() => null);
        })
      );
    }

    const mine = visibleOrders.map((order) => {
      const override = resolvedOverrides.get(order.id);
      const pub = toPublicOrder(override ? { ...order, ...override } : order);
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
