import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCentralServices } from "@/lib/serverServicesStore";

interface BookingCustomerInput {
  name: string;
  surname: string;
  phone: string;
  email: string;
  notes?: string;
}

interface BookingCheckoutRequestBody {
  serviceId: string;
  serviceName?: string;
  date: string;
  time: string;
  customer: BookingCustomerInput;
  depositAmount?: number;
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

  const { serviceId, date, time, customer, depositMethod } = body;

  if (!serviceId || !date || !time) {
    return NextResponse.json({ error: "Dati prenotazione incompleti" }, { status: 400 });
  }
  if (!customer?.email || !customer?.name || !customer?.surname) {
    return NextResponse.json({ error: "Dati cliente incompleti" }, { status: 400 });
  }

  const services = await getCentralServices();
  const service = services.find((s) => s.id === serviceId && s.active !== false);

  if (!service) {
    return NextResponse.json(
      { error: "Servizio non trovato o non disponibile" },
      { status: 400 }
    );
  }

  const serverPriceOnline =
    Number.isFinite(service.priceOnline) && service.priceOnline >= 0
      ? service.priceOnline
      : Math.max(0, service.priceList - (service.discountOnline || 0));

  const serverDepositAmount = Math.round(serverPriceOnline * 0.2 * 100) / 100;

  if (!Number.isFinite(serverDepositAmount) || serverDepositAmount <= 0) {
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
            unit_amount: toCents(serverDepositAmount),
            product_data: {
              name: `Acconto 20% — ${service.name}`,
              description: `Prenotazione del ${date} alle ore ${time}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customer.email,
      metadata: {
        serviceId: service.id,
        serviceName: service.name,
        date,
        time,
        customerName: customer.name,
        customerSurname: customer.surname,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerNotes: customer.notes || "",
        depositAmount: String(serverDepositAmount),
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
