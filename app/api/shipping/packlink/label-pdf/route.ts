import { NextResponse } from "next/server";
import { getPacklinkLabels, PacklinkError } from "@/lib/packlink";

export const dynamic = "force-dynamic";

const LABEL_FETCH_TIMEOUT_MS = 20000;

export async function GET(req: Request) {
  try {
    const reference = new URL(req.url).searchParams.get("reference")?.trim();
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Parametro reference obbligatorio" },
        { status: 400 }
      );
    }

    const labels = await getPacklinkLabels(reference);
    const labelUrl = labels.find((url) => typeof url === "string" && url.trim().length > 0)?.trim();

    if (!labelUrl) {
      return NextResponse.json(
        { success: false, error: `Nessuna etichetta disponibile per la spedizione ${reference}` },
        { status: 404 }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LABEL_FETCH_TIMEOUT_MS);
    let pdfBuffer: ArrayBuffer;
    try {
      const labelRes = await fetch(labelUrl, { cache: "no-store", signal: controller.signal });
      if (!labelRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Download etichetta non riuscito (HTTP ${labelRes.status})`,
          },
          { status: 502 }
        );
      }
      pdfBuffer = await labelRes.arrayBuffer();
    } catch (err) {
      const reason = err instanceof Error ? err.message : "errore di rete";
      return NextResponse.json(
        { success: false, error: `Etichetta Packlink non raggiungibile: ${reason}` },
        { status: 502 }
      );
    } finally {
      clearTimeout(timer);
    }

    if (pdfBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "Il file PDF dell'etichetta risulta vuoto" },
        { status: 502 }
      );
    }

    const safeReference = reference.replace(/[^a-zA-Z0-9_-]/g, "") || "packlink";

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="etichetta-${safeReference}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno Packlink";
    const status = err instanceof PacklinkError && err.status && err.status < 500 ? 422 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
