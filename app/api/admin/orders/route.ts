import { NextResponse } from "next/server";
import { SceltaAdminOrder } from "@/lib/adminStore";
import {
  getCentralOrders,
  saveCentralOrder,
  saveCentralOrders,
  updateCentralOrderStatus,
} from "@/lib/serverOrderStore";

export const dynamic = "force-dynamic";

interface OrdersPostBody {
  order?: SceltaAdminOrder;
  orders?: SceltaAdminOrder[];
}

interface OrdersPatchBody {
  orderId?: string;
  status?: SceltaAdminOrder["status"];
}

function isValidOrder(o: unknown): o is SceltaAdminOrder {
  return (
    !!o &&
    typeof o === "object" &&
    typeof (o as SceltaAdminOrder).id === "string" &&
    (o as SceltaAdminOrder).id.trim().length > 0 &&
    Array.isArray((o as SceltaAdminOrder).items)
  );
}

export async function GET() {
  try {
    const orders = (await getCentralOrders()).filter(isValidOrder);
    return NextResponse.json({
      success: true,
      orders,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno lettura ordini";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as OrdersPostBody;

    if (isValidOrder(body.order)) {
      const updatedOrders = await saveCentralOrder(body.order);
      return NextResponse.json({
        success: true,
        orders: updatedOrders.filter(isValidOrder),
        updatedAt: new Date().toISOString(),
      });
    }

    const validOrders = Array.isArray(body.orders) ? body.orders.filter(isValidOrder) : [];
    if (validOrders.length > 0) {
      const updatedOrders = await saveCentralOrders(validOrders);
      return NextResponse.json({
        success: true,
        orders: updatedOrders.filter(isValidOrder),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Nessun ordine valido fornito nel body" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno salvataggio ordine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as OrdersPatchBody;
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: "orderId e status sono obbligatori" },
        { status: 400 }
      );
    }

    const updatedOrders = await updateCentralOrderStatus(orderId, status);
    return NextResponse.json({
      success: true,
      orders: updatedOrders,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno aggiornamento ordine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
