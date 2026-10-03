import { NextResponse } from "next/server";
import { Product } from "@/types/product";
import type { SceltaVariantStock } from "@/lib/adminStore";
import {
  getCentralCatalogState,
  saveProductOverride,
  deleteProductOverride,
} from "@/lib/serverCatalogStore";

export const dynamic = "force-dynamic";

// Never let Vercel CDN, proxies or the browser serve a stale catalog snapshot.
// A cached GET is exactly what reverted Federica's freshly saved changes.
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

interface OverridesPostBody {
  productId?: unknown;
  updates?: unknown;
  variantStocks?: unknown;
  replaceVariants?: unknown;
  variantStockSeeds?: unknown;
}

export async function GET(req: Request) {
  try {
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";
    const state = await getCentralCatalogState({ fresh });
    return NextResponse.json(
      {
        success: true,
        productOverrides: state.productOverrides,
        variantStocks: state.variantStocks,
        updatedAt: state.updatedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

/**
 * POST: applica una PATCH (solo i campi modificati) all'override del prodotto.
 * Risponde con la sola riga salvata (+ giacenze toccate), non con l'intero catalogo.
 * 400 = richiesta non valida (il client non ritenta), 5xx = errore temporaneo (ritenta).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as OverridesPostBody | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ success: false, error: "productId mancante" }, { status: 400 });
  }

  const updates =
    body?.updates && typeof body.updates === "object" && !Array.isArray(body.updates)
      ? (body.updates as Partial<Product>)
      : {};
  const variantStocks =
    body?.variantStocks && typeof body.variantStocks === "object" && !Array.isArray(body.variantStocks)
      ? (body.variantStocks as Record<string, Partial<SceltaVariantStock>>)
      : undefined;
  const variantStockSeeds =
    body?.variantStockSeeds && typeof body.variantStockSeeds === "object" && !Array.isArray(body.variantStockSeeds)
      ? (body.variantStockSeeds as Record<string, Partial<SceltaVariantStock>>)
      : undefined;

  try {
    const result = await saveProductOverride(productId, updates, variantStocks, {
      replaceVariants: body?.replaceVariants === true,
      variantStockSeeds,
    });
    return NextResponse.json(
      {
        success: true,
        productOverrides: result.productOverrides,
        variantStocks: result.variantStocks,
        updatedAt: result.updatedAt,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId") || "";
  if (!productId) {
    return NextResponse.json({ success: false, error: "productId mancante" }, { status: 400 });
  }
  try {
    const result = await deleteProductOverride(productId);
    return NextResponse.json({
      success: true,
      productOverrides: result.productOverrides,
      variantStocks: result.variantStocks,
      updatedAt: result.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
