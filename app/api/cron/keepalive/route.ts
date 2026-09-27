import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resilienza produzione (pattern identico a lib/r2.ts): il keep-alive anti-pausa
// deve funzionare anche se le variabili non sono ancora nel pannello Vercel.
const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEFAULT_DEDICATED_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_DEDICATED_SERVICE_KEY;
const HEARTBEAT_TABLE = "scelta_heartbeat";
const OVERRIDES_TABLE = "scelta_catalog_overrides";

function headersFor(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Cron di keep-alive anti-pausa.
 *
 * Supabase mette in pausa i progetti inattivi: questo endpoint esegue una
 * scrittura reale e leggera su `scelta_heartbeat` e una lettura su
 * `scelta_catalog_overrides`, mantenendo il database dedicato attivo.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
    }
  }

  if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) {
    return NextResponse.json(
      { ok: false, error: "Configurazione Supabase dedicata mancante" },
      { status: 500 }
    );
  }

  try {
    // 1. Scrittura reale (upsert del ping) per svegliare il database.
    const heartbeatRes = await fetch(`${DEDICATED_URL}/rest/v1/${HEARTBEAT_TABLE}`, {
      method: "POST",
      headers: {
        ...headersFor(DEDICATED_SERVICE_KEY),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: "singleton",
        last_ping: new Date().toISOString(),
        source: "cron",
      }),
    });

    if (!heartbeatRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Heartbeat HTTP ${heartbeatRes.status}` },
        { status: 502 }
      );
    }

    // 2. Lettura leggera di conferma sullo store catalogo.
    const readRes = await fetch(
      `${DEDICATED_URL}/rest/v1/${OVERRIDES_TABLE}?select=id&limit=1`,
      { headers: headersFor(DEDICATED_SERVICE_KEY), cache: "no-store" }
    );

    if (!readRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Read HTTP ${readRes.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Errore keep-alive" },
      { status: 500 }
    );
  }
}
