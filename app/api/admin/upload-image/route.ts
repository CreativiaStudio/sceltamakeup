import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const key = `salone-federica/prod-${productId}-${Date.now()}.${ext}`;

    const r2Result = await uploadBufferToR2({
      key,
      buffer,
      mimeType,
    });

    if (!r2Result.publicUrl) {
      throw new Error("R2 public URL non configurato");
    }

    return NextResponse.json({ success: true, url: r2Result.publicUrl, fileName: key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore durante il caricamento immagine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
