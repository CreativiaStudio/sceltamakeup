import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type { SceltaAdminOrder } from "@/lib/adminStore";
import { getAllProducts } from "@/lib/catalog";
import { getCentralOrders, saveCentralOrder } from "@/lib/serverOrderStore";
import { incrementCouponUsage } from "@/lib/serverCouponStore";
import { toPublicOrder } from "@/lib/orderTracking";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  extractStripeShippingAddress,
  mapStripeLineItemsToOrderItems,
} from "@/lib/stripeOrderMapper";
import type { Order } from "@/types/order";

export const dynamic = "force-dynamic";

interface ConfirmOrderBody {
  sessionId?: string;
  pendingOrder?: Partial<Order> | null;
}

export async function POST(req: Request) {
  const gate = consumeRateLimit(`orders_confirm:${getClientIp(req)}`, 20, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { success: false, error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

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
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json(
      { success: false, error: "sessionId non valido" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

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
    // Fix IDOR: un ordine esistente può essere associato per ID solo se privo di sessione
    // Stripe o se appartiene esattamente alla stessa sessione Stripe verificata.
    const byId = pendingOrderId
      ? existingOrders.find(
          (o) =>
            o.id.toLowerCase() === pendingOrderId.toLowerCase() &&
            (!o.stripeSessionId || o.stripeSessionId === session.id)
        )
      : undefined;

    const existing = bySession || byId;
    if (existing) {
      return NextResponse.json({
        success: true,
        order: toPublicOrder(existing),
        alreadyConfirmed: true,
      });
    }

    const now = new Date().toISOString();
    const deliveryMethod =
      session.metadata?.deliveryMethod === "boutique"
        ? "boutique"
        : pending?.deliveryMethod === "boutique"
          ? "boutique"
          : "shipping";

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
      pendingOrderId && !existingOrders.some((o) => o.id.toLowerCase() === pendingOrderId.toLowerCase())
        ? pendingOrderId
        : `SC-ORD-${new Date().getFullYear()}-${session.id.slice(-6).toUpperCase()}`;

    const shippingAddress = pending?.customer?.indirizzo
      ? {
          street: pending.customer.indirizzo,
          city: pending.customer.citta || "Napoli",
          postalCode: pending.customer.cap || "80134",
          province: "NA",
        }
      : extractStripeShippingAddress(session);

    const sanitizedPendingItems = Array.isArray(pending?.items)
      ? pending.items
          .filter((item) => item && typeof item.productId === "string" && typeof item.name === "string")
          .map((item) => ({
            productId: item.productId,
            productTitle: item.name,
            variantName: item.shade?.name,
            quantity:
              typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity >= 1
                ? Math.floor(item.quantity)
                : 1,
            price:
              typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0
                ? Math.round(item.price * 100) / 100
                : 0,
            image: typeof item.image === "string" ? item.image : undefined,
          }))
      : [];

    const stripeFallbackItems =
      sanitizedPendingItems.length > 0
        ? sanitizedPendingItems
        : mapStripeLineItemsToOrderItems(
            session.line_items?.data,
            await getAllProducts({ includeLocalOnly: true })
          );

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
      items: stripeFallbackItems,
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
      order: toPublicOrder(adminOrder),
      alreadyConfirmed: false,
    });
  } catch (err) {
    console.error("Order confirm error:", err);
    return NextResponse.json(
      { success: false, error: "Errore durante la verifica della conferma ordine" },
      { status: 500 }
    );
  }
}
