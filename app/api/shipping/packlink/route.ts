import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getCentralOrders, updateCentralOrderFields } from "@/lib/serverOrderStore";
import { createPacklinkShipment, getPacklinkLabels, getPacklinkTracking, PacklinkError } from "@/lib/packlink";
import { isPacklinkReference } from "@/lib/trackingUtils";

export const dynamic = "force-dynamic";

interface PacklinkPostBody {
  orderId?: string;
}

export async function POST(req: Request) {
  const authError = requireAdmin(req);
  if (authError) return authError;

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

    let labels: string[] = [];
    try {
      labels = await getPacklinkLabels(shipment.reference);
    } catch (err) {
      console.warn(
        "[packlink] Recupero etichette fallito:",
        err instanceof Error ? err.message : err
      );
    }
    const labelUrl = labels[0] ?? null;

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
      labels,
      labelUrl,
      order: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno Packlink";
    const status = err instanceof PacklinkError && err.status && err.status < 500 ? 422 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(req: Request) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  try {
    const params = new URL(req.url).searchParams;
    const reference = params.get("reference")?.trim();
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Parametro reference obbligatorio" },
        { status: 400 }
      );
    }
    if (params.get("labels") === "true") {
      const labels = await getPacklinkLabels(reference);
      return NextResponse.json({ success: true, labels });
    }
    const tracking = await getPacklinkTracking(reference);
    if (tracking.trackingNumber) {
      try {
        const orderIdParam = params.get("orderId")?.trim();
        const orders = await getCentralOrders();
        const matchingOrder = orders.find((o) =>
          orderIdParam
            ? o.id.toLowerCase() === orderIdParam.toLowerCase()
            : o.packlinkReference?.toLowerCase() === reference.toLowerCase()
        );
        if (
          matchingOrder &&
          (!matchingOrder.trackingCode ||
            matchingOrder.trackingCode === matchingOrder.packlinkReference ||
            isPacklinkReference(matchingOrder.trackingCode))
        ) {
          await updateCentralOrderFields(matchingOrder.id, {
            trackingCode: tracking.trackingNumber,
            ...(tracking.carrier ? { courierName: tracking.carrier } : {}),
          });
        }
      } catch (syncErr) {
        console.warn(
          "[packlink] Sync codice corriere su ordine fallito:",
          syncErr instanceof Error ? syncErr.message : syncErr
        );
      }
    }
    return NextResponse.json({ success: true, tracking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno tracking";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
