import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import type { SceltaAdminOrder } from "@/lib/adminStore";
import { getCentralOrders, saveCentralOrder } from "@/lib/serverOrderStore";
import { incrementCouponUsage } from "@/lib/serverCouponStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (
    !webhookSecret ||
    webhookSecret === "whsec_da_sostituire_dopo_il_webhook_stripe"
  ) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET non configurata sul server.");
    return NextResponse.json(
      { error: "Webhook secret non configurato sul server" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Header stripe-signature mancante" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Firma webhook non valida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Gestisce solo ordini e-commerce pagati (le prenotazioni salone hanno metadata.serviceId)
    if (session.payment_status === "paid" && !session.metadata?.serviceId) {
      try {
        const existingOrders = await getCentralOrders();
        const alreadyExists = existingOrders.some(
          (o) => o.stripeSessionId === session.id
        );

        if (!alreadyExists) {
          const now = new Date().toISOString();
          const deliveryMethod =
            session.metadata?.deliveryMethod === "boutique" ? "boutique" : "shipping";
          const paidTotal =
            typeof session.amount_total === "number"
              ? Math.round(session.amount_total) / 100
              : 0;

          const collectedAddress = session.collected_information?.shipping_details?.address;
          const shippingAddress =
            collectedAddress?.line1
              ? {
                  street: collectedAddress.line1,
                  city: collectedAddress.city || "Napoli",
                  postalCode: collectedAddress.postal_code || "",
                  province: collectedAddress.state || "",
                }
              : undefined;

          const adminOrder: SceltaAdminOrder = {
            id: `SC-ORD-${new Date().getFullYear()}-${session.id.slice(-6).toUpperCase()}`,
            customerName:
              session.metadata?.orderCustomer ||
              session.customer_details?.name ||
              "Cliente",
            customerEmail:
              session.customer_details?.email || session.customer_email || "",
            customerPhone:
              session.metadata?.customerPhone ||
              session.customer_details?.phone ||
              "",
            total: paidTotal,
            status: deliveryMethod === "boutique" ? "ready_for_pickup" : "processing",
            fulfillmentType:
              deliveryMethod === "boutique" ? "store_pickup" : "courier",
            paymentMethod: "stripe",
            stripeSessionId: session.id,
            shippingAddress,
            items: [],
            createdAt: now,
            updatedAt: now,
          };

          await saveCentralOrder(adminOrder);

          const couponCode = session.metadata?.couponCode?.trim();
          if (couponCode) {
            await incrementCouponUsage(couponCode);
          }
        }
      } catch (err) {
        console.error("Stripe webhook order persistence error:", err);
        return NextResponse.json(
          { error: "Errore interno salvataggio ordine webhook" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
