/**
 * Scelta Makeup — Riordino rapido (tipi e risoluzione varianti)
 * Module: lib/reorder.ts
 *
 * Il modulo è condiviso tra la route API `/api/catalog/reorder` e il client
 * dell'Area Personale: contiene solo logica pura e tipi, nessun import server.
 */

import type { Product, ProductVariant, Shade } from "@/types/product";

export interface ReorderRequestItem {
  productId: string;
  variantName?: string;
}

export interface ResolvedReorderProduct {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  /** Nome variante originale richiesto (eco della richiesta). */
  variantName?: string;
  /** Shades pronta per il carrello, quando riconosciuta. */
  shade?: Shade;
}

/** Chiave di deduplica per prodotto + variante. */
export function variantKey(productId: string, variantName?: string | null): string {
  return `${productId.trim()}::${(variantName ?? "").trim().toLowerCase()}`;
}

const DEFAULT_SWATCH_HEX = "#FAF7FC";

function shadeFromShade(shade: Shade, fallbackImage: string): Shade {
  return {
    id: shade.id,
    name: shade.name,
    code: shade.code || shade.id,
    hex: shade.hex || DEFAULT_SWATCH_HEX,
    image: shade.image || fallbackImage,
  };
}

function shadeFromVariant(variant: ProductVariant, fallbackImage: string): Shade {
  return {
    id: variant.id,
    name: variant.name,
    code: variant.sku || variant.id,
    hex: variant.colorHex || DEFAULT_SWATCH_HEX,
    image: variant.image || fallbackImage,
  };
}

/**
 * Risolve un prodotto di catalogo nel formato necessario al riordino, provando
 * a riconoscere la variante esatta acquistata in passato.
 */
export function resolveReorderProduct(product: Product, variantName?: string): ResolvedReorderProduct {
  const fallbackImage = product.images?.[0] ?? "";
  const shades = product.shades ?? [];
  const variants = product.variants ?? [];
  const target = (variantName ?? "").trim().toLowerCase();

  let shade: Shade | undefined;

  if (target) {
    const matchedShade = shades.find((s) => s.name.trim().toLowerCase() === target);
    if (matchedShade) {
      shade = shadeFromShade(matchedShade, fallbackImage);
    } else {
      const matchedVariant =
        variants.find((v) => v.name.trim().toLowerCase() === target) ??
        variants.find((v) => v.sku.trim().toLowerCase() === target);
      if (matchedVariant) shade = shadeFromVariant(matchedVariant, fallbackImage);
    }
  }

  // Fallback: un solo formato/nuance disponibile -> è per forza quello acquistato.
  if (!shade) {
    if (shades.length === 1) shade = shadeFromShade(shades[0], fallbackImage);
    else if (shades.length === 0 && variants.length === 1) {
      shade = shadeFromVariant(variants[0], fallbackImage);
    }
  }

  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    image: shade?.image || fallbackImage,
    variantName: variantName?.trim() || undefined,
    shade,
  };
}
