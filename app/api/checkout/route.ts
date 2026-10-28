import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import type { DeliveryMethod, PaymentMethod } from "@/types/order";
import {
  validateCouponForCart,
  incrementCouponUsage,
} from "@/lib/serverCouponStore";

interface CheckoutItemInput {
  name: string;
  brand?: string;
  category?: string;
  price: number;
  quantity: number;
  image?: string;
  shade?: string;
}

interface CheckoutCustomerInput {
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  note?: string;
}

interface CheckoutRequestBody {
  items: CheckoutItemInput[];
  customer: CheckoutCustomerInput;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  shippingCost: number;
  total: number;
  couponCode?: string;
}

function toCents(euros: number): number {
  return Math.round((Number.isFinite(euros) ? euros : 0) * 100);
}

function absoluteUrl(path: string | undefined, origin: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  try {
    return new URL(path, origin).toString();
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  let body: CheckoutRequestBody;
  try {
    body = (await req.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Corpo richiesta non valido" }, { status: 400 });
  }

  const { items, customer, deliveryMethod, paymentMethod, shippingCost, couponCode } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrello vuoto" }, { status: 400 });
  }
  if (!customer?.email) {
    return NextResponse.json({ error: "Email cliente mancante" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  // Validazione coupon server-side
  let validatedDiscount = 0;
  let validCouponCode: string | undefined = undefined;

  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    const val = await validateCouponForCart(couponCode.trim(), items);
    if (val.valid && val.discountAmount > 0) {
      validatedDiscount = val.discountAmount;
      validCouponCode = val.coupon?.code;
      await incrementCouponUsage(couponCode.trim());
    }
  }

  // Calcolo ripartizione sconto sui prodotti eleggibili
  const subtotalBeforeDiscount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountRatio =
    subtotalBeforeDiscount > 0
      ? Math.max(0, 1 - validatedDiscount / subtotalBeforeDiscount)
      : 1;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    // Se è presente uno sconto valido, il prezzo unitario riflette lo sconto
    const netPrice = validatedDiscount > 0 ? item.price * discountRatio : item.price;

    return {
      price_data: {
        currency: "eur",
        unit_amount: toCents(netPrice),
        product_data: {
          name: validCouponCode
            ? `${item.shade ? `${item.name} — ${item.shade}` : item.name} [Promo ${validCouponCode}]`
            : item.shade
            ? `${item.name} — ${item.shade}`
            : item.name,
          images: absoluteUrl(item.image, origin) ? [absoluteUrl(item.image, origin)!] : undefined,
        },
      },
      quantity: item.quantity,
    };
  });

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: toCents(shippingCost),
        product_data: {
          name: "Spedizione Corriere Espresso 24/48h",
        },
      },
      quantity: 1,
    });
  }

  const itemsSummary = items
    .map((i) => `${i.name}${i.shade ? ` (${i.shade})` : ""} x${i.quantity}`)
    .join(", ")
    .slice(0, 480);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: lineItems,
      customer_email: customer.email,
      metadata: {
        orderCustomer: `${customer.nome} ${customer.cognome}`.trim(),
        deliveryMethod,
        paymentMethod,
        itemsSummary,
        couponCode: validCouponCode || "",
        discountAmount: String(validatedDiscount),
      },
      shipping_address_collection:
        deliveryMethod === "shipping" ? { allowed_countries: ["IT"] } : undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe Checkout Session error:", error);
    const message = error instanceof Error ? error.message : "Errore di connessione con Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
