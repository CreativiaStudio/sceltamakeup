import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HUB_URL =
  process.env.CREATIVIA_HUB_SUPABASE_URL || "https://ekfnekrjpumjpetzgwzy.supabase.co";
const HUB_KEY =
  process.env.CREATIVIA_HUB_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZm5la3JqcHVtanBldHpnd3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgyNjAxNiwiZXhwIjoyMDk5NDAyMDE2fQ.Ne-jtSPB8NP-79_pV1KsGubYbCDtQVhQAXRtC-PzT-8";
const BUCKET_NAME = "scelta-products";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  try {
    let buffer: Buffer;
    let mimeType = "image/jpeg";
    let productId = "item";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const rawImage = body.image as string;
      productId = body.productId ? String(body.productId).replace(/[^a-zA-Z0-9-_]/g, "") : "item";

      if (!rawImage || typeof rawImage !== "string") {
        return NextResponse.json({ success: false, error: "Nessuna immagine fornita" }, { status: 400 });
      }

      if (rawImage.startsWith("data:")) {
        const match = rawImage.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          buffer = Buffer.from(match[2], "base64");
        } else {
          buffer = Buffer.from(rawImage.replace(/^data:[^;]+;base64,/, ""), "base64");
        }
      } else {
        buffer = Buffer.from(rawImage, "base64");
      }
    } else {
      const formData = await req.formData();
      const file = (formData.get("file") ?? formData.get("image")) as File | Blob | null;
      productId = (formData.get("productId") as string) || "item";

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ success: false, error: "Nessun file immagine fornito" }, { status: 400 });
      }

      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const ext = ALLOWED_MIME_TO_EXT[mimeType] || "jpg";
    // Cartella separata 'salone-federica/' dentro il bucket dedicato scelta-products
    const fileName = `salone-federica/prod-${productId}-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${HUB_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUB_KEY}`,
        "Content-Type": mimeType,
      },
      body: new Uint8Array(buffer),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ success: false, error: `Errore storage: ${errText}` }, { status: 500 });
    }

    const publicUrl = `${HUB_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
    return NextResponse.json({ success: true, url: publicUrl, fileName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore durante il caricamento immagine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
