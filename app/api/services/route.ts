/**
 * Scelta Makeup — API listino servizi (Salone)
 * Module: app/api/services/route.ts
 *
 * GET    /api/services         → elenco servizi (sempre fresco, nessuna cache CDN)
 * POST   /api/services         → salva/aggiorna un servizio   { service: Service }
 * DELETE /api/services?id=...  → elimina un servizio per id
 *
 * Tutte le risposte viaggiano con header anti-cache: il pannello admin e la
 * vetrina devono vedere immediatamente le modifiche fatte da un altro device.
 */

import { NextResponse } from "next/server";
import type { Service } from "@/types/booking";
import {
  deleteCentralService,
  getCentralServices,
  saveCentralService,
} from "@/lib/serverServicesStore";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Errore interno del server.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidService(value: unknown): value is Service {
  if (!isRecord(value)) return false;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const priceList = value.priceList;
  return (
    id.length > 0 &&
    name.length > 0 &&
    typeof priceList === "number" &&
    Number.isFinite(priceList) &&
    priceList >= 0
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const services = await getCentralServices({ fresh: true });
    return json({ success: true, services });
  } catch (err) {
    console.error("[api/services] Lettura servizi fallita:", errorMessage(err));
    return json(
      { success: false, error: "Impossibile leggere il listino servizi.", services: [] },
      500
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Body JSON non valido." }, 400);
  }

  const service = isRecord(payload) ? payload.service : undefined;
  if (!isValidService(service)) {
    return json(
      {
        success: false,
        error: "Servizio non valido: 'id', 'name' e 'priceList' sono obbligatori.",
      },
      400
    );
  }

  try {
    const services = await saveCentralService(service);
    return json({ success: true, services });
  } catch (err) {
    console.error("[api/services] Salvataggio servizio fallito:", errorMessage(err));
    return json(
      { success: false, error: "Impossibile salvare il servizio." },
      500
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.trim() === "") {
    return json({ success: false, error: "Parametro 'id' obbligatorio." }, 400);
  }

  try {
    const services = await deleteCentralService(id);
    return json({ success: true, services });
  } catch (err) {
    console.error("[api/services] Eliminazione servizio fallita:", errorMessage(err));
    return json(
      { success: false, error: "Impossibile eliminare il servizio." },
      500
    );
  }
}
