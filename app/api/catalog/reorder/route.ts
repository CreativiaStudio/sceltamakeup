import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/catalog";
import {
  resolveReorderProduct,
  variantKey,
  type ReorderRequestItem,
  type ResolvedReorderProduct,
} from "@/lib/reorder";

export const dynamic = "force-dynamic";

/** Limite di sicurezza sul numero di articoli risolti per richiesta. */
const MAX_ITEMS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Risolve una lista di prodotti acquistati (prodotto + variante) nei dati
 * minimi necessari al "Riordino in 1 tap": slug, brand, prezzo, immagine e
 * nuance esatta. Evita di spedire al browser l'intero catalogo.
 */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const rawItems = isRecord(body) && Array.isArray(body.items) ? body.items : [];

  const seen = new Set<string>();
  const requested: ReorderRequestItem[] = [];

  for (const raw of rawItems) {
    if (!isRecord(raw)) continue;
    const productId = typeof raw.productId === "string" ? raw.productId.trim() : "";
    if (!productId) continue;
    const variantName = typeof raw.variantName === "string" ? raw.variantName : undefined;
    const key = variantKey(productId, variantName);
    if (seen.has(key)) continue;
    seen.add(key);
    requested.push({ productId, variantName });
    if (requested.length >= MAX_ITEMS) break;
  }

  if (requested.length === 0) {
    return NextResponse.json({ success: true, products: [] });
  }

  try {
    const all = await getAllProducts({ includeLocalOnly: true });
    const byId = new Map(all.map((product) => [product.id, product]));

    const products: ResolvedReorderProduct[] = [];
    for (const item of requested) {
      const product = byId.get(item.productId);
      if (!product) continue;
      products.push(resolveReorderProduct(product, item.variantName));
    }

    return NextResponse.json({ success: true, products });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore interno recupero prodotti";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
