import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { uploadBufferToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

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
        const match = rawImage.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return NextResponse.json({ success: false, error: "Formato data URI non valido" }, { status: 400 });
        }
        mimeType = match[1].toLowerCase().trim();
        buffer = Buffer.from(match[2], "base64");
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

      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { success: false, error: "Immagine troppo grande (massimo 10 MB)" },
          { status: 413 }
        );
      }

      mimeType = (file.type || "").toLowerCase().trim();
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const ext = ALLOWED_MIME_TO_EXT[mimeType];
    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato immagine non supportato. Formati consentiti: JPEG, PNG, WebP, AVIF, GIF.",
        },
        { status: 400 }
      );
    }

    if (buffer.byteLength === 0) {
      return NextResponse.json({ success: false, error: "Immagine vuota" }, { status: 400 });
    }

    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Immagine troppo grande (massimo 10 MB)" },
        { status: 413 }
      );
    }

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
