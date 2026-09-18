import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import type { DeliveryMethod, PaymentMethod } from "@/types/order";

interface CheckoutItemInput {
  name: string;
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

  const { items, customer, deliveryMethod, paymentMethod, shippingCost } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrello vuoto" }, { status: 400 });
  }
  if (!customer?.email) {
    return NextResponse.json({ error: "Email cliente mancante" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: "eur",
      unit_amount: toCents(item.price),
      product_data: {
        name: item.shade ? `${item.name} — ${item.shade}` : item.name,
        images: absoluteUrl(item.image, origin) ? [absoluteUrl(item.image, origin)!] : undefined,
      },
    },
    quantity: item.quantity,
  }));

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
      // Quando non viene specificato payment_method_types, Stripe Checkout
      // attiva automaticamente tutti i metodi abilitati sulla dashboard:
      // Carte, Klarna, PayPal, Apple Pay e Google Pay.
      metadata: {
        orderCustomer: `${customer.nome} ${customer.cognome}`.trim(),
        deliveryMethod,
        paymentMethod,
        itemsSummary,
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
