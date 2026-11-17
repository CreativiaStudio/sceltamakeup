import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type { SceltaAdminOrder } from "@/lib/adminStore";
import { getCentralOrders, saveCentralOrder } from "@/lib/serverOrderStore";
import { incrementCouponUsage } from "@/lib/serverCouponStore";
import type { Order } from "@/types/order";

export const dynamic = "force-dynamic";

interface ConfirmOrderBody {
  sessionId?: string;
  pendingOrder?: Partial<Order> | null;
}

export async function POST(req: Request) {
  let body: ConfirmOrderBody;
  try {
    body = (await req.json()) as ConfirmOrderBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Corpo richiesta non valido" },
      { status: 400 }
    );
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "sessionId obbligatorio" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, error: "Pagamento non confermato su Stripe" },
        { status: 400 }
      );
    }

    const pending = body.pendingOrder ?? undefined;
    const existingOrders = await getCentralOrders();

    const bySession = existingOrders.find((o) => o.stripeSessionId === session.id);
    const pendingOrderId =
      typeof pending?.orderNumber === "string" ? pending.orderNumber.trim() : "";
    const byId = pendingOrderId
      ? existingOrders.find((o) => o.id.toLowerCase() === pendingOrderId.toLowerCase())
      : undefined;

    const existing = bySession || byId;
    if (existing) {
      return NextResponse.json({
        success: true,
        order: existing,
        alreadyConfirmed: true,
      });
    }

    const now = new Date().toISOString();
    const deliveryMethod =
      pending?.deliveryMethod ||
      (session.metadata?.deliveryMethod === "boutique" ? "boutique" : "shipping");

    const paidTotal =
      typeof session.amount_total === "number"
        ? Math.round(session.amount_total) / 100
        : Number(pending?.total) || 0;

    const customerName =
      pending?.customer
        ? `${pending.customer.nome} ${pending.customer.cognome}`.trim()
        : session.metadata?.orderCustomer ||
          session.customer_details?.name ||
          "Cliente";

    const customerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      pending?.customer?.email ||
      "";

    const customerPhone =
      pending?.customer?.telefono ||
      session.metadata?.customerPhone ||
      session.customer_details?.phone ||
      "";

    const orderId =
      pendingOrderId ||
      `SC-ORD-${new Date().getFullYear()}-${session.id.slice(-6).toUpperCase()}`;

    const shippingAddress = pending?.customer?.indirizzo
      ? {
          street: pending.customer.indirizzo,
          city: pending.customer.citta || "Napoli",
          postalCode: pending.customer.cap || "80134",
          province: "NA",
        }
      : undefined;

    const adminOrder: SceltaAdminOrder = {
      id: orderId,
      customerName,
      customerEmail,
      customerPhone,
      total: paidTotal,
      status: deliveryMethod === "boutique" ? "ready_for_pickup" : "processing",
      fulfillmentType: deliveryMethod === "boutique" ? "store_pickup" : "courier",
      paymentMethod: "stripe",
      stripeSessionId: session.id,
      shippingAddress,
      items: Array.isArray(pending?.items)
        ? pending.items.map((item) => ({
            productId: item.productId,
            productTitle: item.name,
            variantName: item.shade?.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          }))
        : [],
      createdAt: pending?.createdAt || now,
      updatedAt: now,
    };

    await saveCentralOrder(adminOrder);

    const couponCode = session.metadata?.couponCode?.trim();
    if (couponCode) {
      await incrementCouponUsage(couponCode);
    }

    return NextResponse.json({
      success: true,
      order: adminOrder,
      alreadyConfirmed: false,
    });
  } catch (err) {
    console.error("Order confirm error:", err);
    const message = err instanceof Error ? err.message : "Errore interno conferma ordine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
