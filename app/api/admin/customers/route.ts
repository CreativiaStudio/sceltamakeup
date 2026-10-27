import { NextResponse } from "next/server";
import { SceltaCrmCustomer } from "@/lib/adminStore";
import {
  deleteCentralCustomer,
  getCentralCustomers,
  saveCentralCustomer,
  saveCentralCustomers,
} from "@/lib/serverCustomerStore";

export const dynamic = "force-dynamic";

interface CustomersPostBody {
  customer?: SceltaCrmCustomer;
  customers?: SceltaCrmCustomer[];
}

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  try {
    const customers = await getCentralCustomers();
    return NextResponse.json(
      {
        success: true,
        customers,
        updatedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno lettura clienti";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CustomersPostBody;

    if (body.customer && typeof body.customer === "object" && body.customer.id) {
      const customers = await saveCentralCustomer(body.customer);
      return NextResponse.json(
        {
          success: true,
          customers,
          updatedAt: new Date().toISOString(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (Array.isArray(body.customers) && body.customers.length > 0) {
      const customers = await saveCentralCustomers(body.customers);
      return NextResponse.json(
        {
          success: true,
          customers,
          updatedAt: new Date().toISOString(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: false, error: "Nessun cliente valido fornito nel body" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno salvataggio cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Parametro id obbligatorio" },
        { status: 400 }
      );
    }

    const customers = await deleteCentralCustomer(id);
    return NextResponse.json(
      {
        success: true,
        customers,
        updatedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno eliminazione cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
