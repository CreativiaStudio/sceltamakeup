import { NextResponse } from "next/server";
import type { SceltaVariantStock } from "@/lib/adminStore";
import { saveVariantStock } from "@/lib/serverCatalogStore";

export const dynamic = "force-dynamic";

interface StockPostBody {
  variantId?: unknown;
  delta?: unknown;
  newQuantity?: unknown;
  variantStock?: unknown;
  seed?: unknown;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as StockPostBody | null;
  const variantId = typeof body?.variantId === "string" ? body.variantId : "";

  if (!variantId) {
    return NextResponse.json({ success: false, error: "variantId mancante" }, { status: 400 });
  }

  try {
    const state = await saveVariantStock({
      variantId,
      delta: typeof body?.delta === "number" ? body.delta : undefined,
      newQuantity: typeof body?.newQuantity === "number" ? body.newQuantity : undefined,
      variantStock:
        body?.variantStock && typeof body.variantStock === "object"
          ? (body.variantStock as Partial<SceltaVariantStock>)
          : undefined,
      seed:
        body?.seed && typeof body.seed === "object" && !Array.isArray(body.seed)
          ? (body.seed as Partial<SceltaVariantStock>)
          : undefined,
    });

    return NextResponse.json({
      success: true,
      variantStocks: state.variantStocks,
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    // 5xx: errore temporaneo, il client ritenta dalla coda locale.
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
