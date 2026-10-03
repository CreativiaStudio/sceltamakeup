import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Resilienza produzione (stesso pattern di lib/serverOrderStore.ts): se le
// variabili non sono ancora configurate su Vercel, l'app continua a usare il
// progetto Supabase dedicato `zsycaulbamdxqhcukrvn` invece di fallire a runtime.
const DEFAULT_DEDICATED_URL = "https://zsycaulbamdxqhcukrvn.supabase.co";
const DEFAULT_DEDICATED_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0";

const DEDICATED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_DEDICATED_URL;
const DEDICATED_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_DEDICATED_SERVICE_KEY;

const SNAPSHOTS_TABLE = "scelta_device_snapshots";

// Limite massimo del body accettato: 4 MB. Oltre questa soglia si risponde 413.
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;

interface DeviceSnapshotBody {
  device?: unknown;
  operator?: unknown;
  userAgent?: unknown;
  pageUrl?: unknown;
  payload?: unknown;
}

/** Normalizza un campo testuale opzionale: stringa non vuota oppure null. */
function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * POST: riceve lo snapshot forense dei dati locali del browser e lo inserisce
 * nel progetto Supabase dedicato con una INSERT pura (nessun upsert).
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();

    // Controllo dimensione PRIMA del parse: evita di processare payload enormi.
    if (Buffer.byteLength(raw, "utf8") > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "Payload troppo grande (limite 4 MB)." },
        { status: 413 }
      );
    }

    let body: DeviceSnapshotBody | null = null;
    try {
      body = JSON.parse(raw) as DeviceSnapshotBody;
    } catch {
      body = null;
    }

    if (!body || typeof body !== "object" || body.payload === undefined || body.payload === null) {
      return NextResponse.json(
        { success: false, error: "Payload mancante o non valido." },
        { status: 400 }
      );
    }

    if (!DEDICATED_URL || !DEDICATED_SERVICE_KEY) {
      return NextResponse.json(
        { success: false, error: "Backend snapshot non configurato." },
        { status: 500 }
      );
    }

    const res = await fetch(`${DEDICATED_URL}/rest/v1/${SNAPSHOTS_TABLE}`, {
      method: "POST",
      headers: {
        apikey: DEDICATED_SERVICE_KEY,
        Authorization: `Bearer ${DEDICATED_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          device: optionalString(body.device),
          operator: optionalString(body.operator),
          user_agent: optionalString(body.userAgent),
          page_url: optionalString(body.pageUrl),
          payload: body.payload,
        },
      ]),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: detail || `Errore inserimento snapshot (HTTP ${res.status}).`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
