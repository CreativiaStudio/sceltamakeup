import { NextResponse } from "next/server";
import {
  ACTIVITY_CATEGORIES,
  MAX_CLOUD_AUDIT_LOGS,
  sanitizeAdminActivityLogItem,
  type ActivityCategory,
  type AdminActivityLogItem,
} from "@/lib/auditLogger";
import { appendAuditLogs, getCentralCatalogState } from "@/lib/serverCatalogStore";

export const dynamic = "force-dynamic";

// La timeline non deve mai essere servita da cache: Mario la consulta da remoto
// e deve vedere all'istante l'ultima operazione di Federica al banco.
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

interface AuditLogPostBody {
  log?: unknown;
  logs?: unknown;
}

/**
 * Estrae e valida gli eventi da un payload POST, accettando sia `{ log }`
 * (invio singolo della cassa) sia `{ logs: [...] }` (sync batch / restore).
 */
function collectIncomingLogs(body: AuditLogPostBody | null): AdminActivityLogItem[] {
  if (!body || typeof body !== "object") return [];

  const candidates: unknown[] = [];
  if (Array.isArray(body.logs)) candidates.push(...body.logs);
  if (Array.isArray(body.log)) candidates.push(...body.log);
  else if (body.log !== undefined) candidates.push(body.log);

  const out: AdminActivityLogItem[] = [];
  for (const candidate of candidates) {
    const clean = sanitizeAdminActivityLogItem(candidate);
    if (clean) out.push(clean);
  }
  return out;
}

/** GET: restituisce la timeline cloud completa con intestazioni no-store. */
export async function GET() {
  try {
    const state = await getCentralCatalogState();
    return NextResponse.json(
      { success: true, logs: state.auditLogs || [] },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST: appende uno o più eventi alla scatola nera e persiste nel singleton. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as AuditLogPostBody | null;
    const incoming = collectIncomingLogs(body);

    if (incoming.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nessun evento valido ricevuto (attesi: log oppure logs[]).",
          acceptedCategories: ACTIVITY_CATEGORIES as readonly ActivityCategory[],
        },
        { status: 400 }
      );
    }

    const state = await appendAuditLogs(incoming);
    return NextResponse.json(
      {
        success: true,
        received: incoming.length,
        total: (state.auditLogs || []).length,
        maxCloudEvents: MAX_CLOUD_AUDIT_LOGS,
        updatedAt: state.updatedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}