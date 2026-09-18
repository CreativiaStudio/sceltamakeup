import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

interface BookingCustomerInput {
  name: string;
  surname: string;
  phone: string;
  email: string;
  notes?: string;
}

interface BookingCheckoutRequestBody {
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  customer: BookingCustomerInput;
  depositAmount: number;
  depositMethod: string;
}

function toCents(euros: number): number {
  return Math.round((Number.isFinite(euros) ? euros : 0) * 100);
}

export async function POST(req: NextRequest) {
  let body: BookingCheckoutRequestBody;
  try {
    body = (await req.json()) as BookingCheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Corpo richiesta non valido" }, { status: 400 });
  }

  const { serviceId, serviceName, date, time, customer, depositAmount, depositMethod } = body;

  if (!serviceId || !serviceName || !date || !time) {
    return NextResponse.json({ error: "Dati prenotazione incompleti" }, { status: 400 });
  }
  if (!customer?.email || !customer?.name || !customer?.surname) {
    return NextResponse.json({ error: "Dati cliente incompleti" }, { status: 400 });
  }
  if (depositAmount <= 0) {
    return NextResponse.json({ error: "Importo acconto non valido" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: toCents(depositAmount),
            product_data: {
              name: `Acconto 20% — ${serviceName}`,
              description: `Prenotazione del ${date} alle ore ${time}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customer.email,
      metadata: {
        serviceId,
        serviceName,
        date,
        time,
        customerName: customer.name,
        customerSurname: customer.surname,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerNotes: customer.notes || "",
        depositAmount: String(depositAmount),
        depositMethod,
      },
      success_url: `${origin}/prenota/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/prenota`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe Booking Checkout Session error:", error);
    const message = error instanceof Error ? error.message : "Errore di connessione con Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
