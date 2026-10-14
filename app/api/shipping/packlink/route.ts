import { NextResponse } from "next/server";
import { getCentralOrders, updateCentralOrderFields } from "@/lib/serverOrderStore";
import { createPacklinkShipment, getPacklinkTracking, PacklinkError } from "@/lib/packlink";

export const dynamic = "force-dynamic";

interface PacklinkPostBody {
  orderId?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as PacklinkPostBody;
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId obbligatorio" }, { status: 400 });
    }

    const orders = await getCentralOrders();
    const order = orders.find((o) => o.id.toLowerCase() === orderId.toLowerCase());
    if (!order) {
      return NextResponse.json({ success: false, error: "Ordine non trovato" }, { status: 404 });
    }
    if (order.fulfillmentType !== "courier") {
      return NextResponse.json(
        { success: false, error: "Solo gli ordini con corriere possono essere spediti con Packlink" },
        { status: 400 }
      );
    }
    if (order.status === "cancelled" || order.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Ordine annullato o già concluso" },
        { status: 409 }
      );
    }
    if (order.packlinkReference) {
      return NextResponse.json(
        {
          success: false,
          error: `Spedizione Packlink già creata (${order.packlinkReference})`,
        },
        { status: 409 }
      );
    }

    const shipment = await createPacklinkShipment(order);

    const updated = await updateCentralOrderFields(order.id, {
      packlinkReference: shipment.reference,
      trackingCode: shipment.trackingCode,
      courierName: shipment.carrier,
      status: order.status === "processing" ? "shipped" : order.status,
    });

    return NextResponse.json({
      success: true,
      mock: shipment.mock,
      shipment,
      order: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno Packlink";
    const status = err instanceof PacklinkError && err.status && err.status < 500 ? 422 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const reference = new URL(req.url).searchParams.get("reference")?.trim();
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Parametro reference obbligatorio" },
        { status: 400 }
      );
    }
    const tracking = await getPacklinkTracking(reference);
    return NextResponse.json({ success: true, tracking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno tracking";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
