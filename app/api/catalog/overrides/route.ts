import { NextResponse } from "next/server";
import { Product } from "@/types/product";
import type { SceltaVariantStock } from "@/lib/adminStore";
import {
  getCentralCatalogState,
  saveProductOverride,
  deleteProductOverride,
} from "@/lib/serverCatalogStore";

export const dynamic = "force-dynamic";

interface OverridesPostBody {
  productId?: unknown;
  updates?: unknown;
  variantStocks?: unknown;
}

export async function GET() {
  try {
    const state = await getCentralCatalogState();
    return NextResponse.json({
      success: true,
      productOverrides: state.productOverrides,
      variantStocks: state.variantStocks,
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as OverridesPostBody;
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const updates =
      body?.updates && typeof body.updates === "object" && !Array.isArray(body.updates)
        ? (body.updates as Partial<Product>)
        : {};
    const variantStocks =
      body?.variantStocks && typeof body.variantStocks === "object"
        ? (body.variantStocks as Record<string, SceltaVariantStock>)
        : undefined;

    if (!productId) {
      return NextResponse.json({ success: false, error: "productId mancante" }, { status: 400 });
    }

    const state = await saveProductOverride(productId, updates, variantStocks);
    return NextResponse.json({
      success: true,
      productOverrides: state.productOverrides,
      variantStocks: state.variantStocks,
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId") || "";

    if (!productId) {
      return NextResponse.json({ success: false, error: "productId mancante" }, { status: 400 });
    }

    const state = await deleteProductOverride(productId);
    return NextResponse.json({
      success: true,
      productOverrides: state.productOverrides,
      variantStocks: state.variantStocks,
      updatedAt: state.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
