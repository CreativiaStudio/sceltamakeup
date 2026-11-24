import type { Product, ProductCategory, ProductVariant, Shade } from "@/types/product";
import type { SceltaVariantStock } from "@/lib/adminStore";
import { isPlaceholderImage } from "@/lib/r2Public";

function isValidVariant(value: unknown): value is ProductVariant {
  return Boolean(value && typeof value === "object");
}

function norm(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function buildShadeLookups(shades: Shade[] | undefined): {
  byId: Map<string, Shade>;
  byName: Map<string, Shade>;
} {
  const byId = new Map<string, Shade>();
  const byName = new Map<string, Shade>();
  if (!Array.isArray(shades)) return { byId, byName };
  for (const s of shades) {
    if (!s || typeof s !== "object") continue;
    if (s.id) byId.set(s.id, s);
    const key = norm(s.name);
    if (key) byName.set(key, s);
  }
  return { byId, byName };
}

/**
 * Unisce un prodotto base con il relativo override gestionale e le giacenze/prezzi
 * per variante, mantenendo sincronizzati `variants`, `shades`, `price`, `stock` e `images`.
 */
export function mergeProductWithOverride(
  base: Product,
  override?: Partial<Product> | null,
  variantStocks?: Record<string, Partial<SceltaVariantStock>>
): Product {
  const rawImages =
    Array.isArray(override?.images) && override.images.length > 0
      ? override.images
      : base.images;
  const candidateImages = (Array.isArray(rawImages) ? rawImages : []).filter(
    (img): img is string => typeof img === "string" && img.trim().length > 0
  );

  const rawVariants = Array.isArray(override?.variants)
    ? override.variants.filter(isValidVariant)
    : (Array.isArray(base.variants) ? base.variants : []).filter(isValidVariant);

  const allRealCandidates = [
    ...candidateImages,
    ...rawVariants.map((v) => v.image),
    ...rawVariants.map((v) => variantStocks?.[v.id]?.image),
  ].filter(
    (u): u is string =>
      typeof u === "string" && u.trim().length > 0 && !isPlaceholderImage(u)
  );
  const bestRealImage = allRealCandidates[0] || "";

  const mergedVariants: ProductVariant[] = rawVariants.map((v) => {
    const vs = variantStocks?.[v.id];
    const price =
      vs?.price !== undefined && Number.isFinite(Number(vs.price))
        ? Number(vs.price)
        : v.price !== undefined && Number.isFinite(Number(v.price))
          ? Number(v.price)
          : override?.price !== undefined && Number.isFinite(Number(override.price))
            ? Number(override.price)
            : base.price;

    const stock =
      vs?.stockQuantity !== undefined && Number.isFinite(Number(vs.stockQuantity))
        ? Number(vs.stockQuantity)
        : v.stock !== undefined && Number.isFinite(Number(v.stock))
          ? Number(v.stock)
          : undefined;

    const inStock = stock !== undefined ? stock > 0 : (v.inStock ?? true);
    const ownReal = v.image && v.image.trim() && !isPlaceholderImage(v.image) ? v.image.trim() : "";
    const vsReal =
      vs?.image && vs.image.trim() && !isPlaceholderImage(vs.image) ? vs.image.trim() : "";
    const image =
      ownReal ||
      vsReal ||
      bestRealImage ||
      (v.image && v.image.trim()) ||
      (vs?.image && vs.image.trim()) ||
      candidateImages[0] ||
      "";

    return {
      ...v,
      price,
      ...(stock !== undefined ? { stock } : {}),
      inStock,
      image,
    };
  });

  let mergedImages = candidateImages;
  if (allRealCandidates.length > 0) {
    const withoutPlaceholders = candidateImages.filter((img) => !isPlaceholderImage(img));
    mergedImages =
      withoutPlaceholders.length > 0
        ? withoutPlaceholders
        : Array.from(new Set(allRealCandidates));
  }
  if (
    mergedVariants.length > 0 &&
    mergedVariants.every((v) => v.image && v.image.includes("salone-federica/"))
  ) {
    const variantImgSet = new Set(mergedVariants.map((v) => v.image));
    const filtered = mergedImages.filter(
      (img) => !img.includes("/products/") || variantImgSet.has(img)
    );
    mergedImages = filtered.length > 0 ? filtered : Array.from(variantImgSet);
  }

  const baseShadesLookup = buildShadeLookups(base.shades);
  const ovShadesLookup = buildShadeLookups(override?.shades);

  let mergedShades: Shade[];
  if (mergedVariants.length > 0) {
    const hadNoShades =
      (!base.shades || base.shades.length === 0) &&
      (!override?.shades || override.shades.length === 0) &&
      mergedVariants.length <= 1;

    if (hadNoShades) {
      mergedShades = [];
    } else {
      mergedShades = mergedVariants.map((v) => {
        const existing =
          ovShadesLookup.byId.get(v.id) ??
          baseShadesLookup.byId.get(v.id) ??
          ovShadesLookup.byName.get(norm(v.name)) ??
          baseShadesLookup.byName.get(norm(v.name));

        const textureImage = v.textureImage || existing?.textureImage;
        const resolvedStock = v.stock !== undefined ? v.stock : existing?.stock;

        const shadeImage =
          [v.image, existing?.image, mergedImages[0]].find(
            (u): u is string => typeof u === "string" && u.trim().length > 0 && !isPlaceholderImage(u)
          ) ||
          v.image ||
          existing?.image ||
          mergedImages[0] ||
          "";

        return {
          id: v.id,
          name: v.name,
          code: v.ean || v.sku || existing?.code || "",
          hex: v.colorHex || existing?.hex || "",
          image: shadeImage,
          ...(textureImage ? { textureImage } : {}),
          price: v.price,
          ...(resolvedStock !== undefined ? { stock: resolvedStock } : {}),
          inStock: v.inStock,
        };
      });
    }
  } else {
    const fallbackShades = Array.isArray(override?.shades)
      ? override.shades
      : Array.isArray(base.shades)
        ? base.shades
        : [];
    mergedShades = fallbackShades.map((s) => ({
      ...s,
      price:
        s.price !== undefined && Number.isFinite(Number(s.price))
          ? Number(s.price)
          : override?.price !== undefined && Number.isFinite(Number(override.price))
            ? Number(override.price)
            : s.price,
    }));
  }

  const price =
    override?.price !== undefined && Number.isFinite(Number(override.price))
      ? Number(override.price)
      : mergedVariants.length > 0 && mergedVariants[0].price !== undefined
        ? mergedVariants[0].price
        : base.price;

  let stock: number | undefined;
  let inStock: boolean;
  if (mergedVariants.length > 0 && mergedVariants.some((v) => typeof v.stock === "number")) {
    const totalStock = mergedVariants.reduce(
      (sum, v) => sum + (typeof v.stock === "number" ? v.stock : 0),
      0
    );
    stock = totalStock;
    inStock = totalStock > 0;
  } else {
    stock = override?.stock ?? base.stock;
    inStock =
      typeof stock === "number"
        ? stock > 0
        : (override?.inStock ?? base.inStock ?? true);
  }

  return {
    ...base,
    ...(override || {}),
    id: base.id,
    images: mergedImages,
    variants: mergedVariants,
    shades: mergedShades,
    price,
    ...(stock !== undefined ? { stock } : {}),
    inStock,
  };
}

/**
 * Applica gli override e le giacenze centralizzate a tutto il catalogo base
 * includendo gli eventuali nuovi prodotti creati dal gestionale (con protezione ghost).
 */
export function applyCatalogOverrides(
  baseProducts: Product[],
  overrides?: Record<string, Partial<Product>>,
  variantStocks?: Record<string, Partial<SceltaVariantStock>>
): Product[] {
  const safeOverrides = overrides || {};
  const baseMap = baseProducts.map((p) =>
    mergeProductWithOverride(p, safeOverrides[p.id], variantStocks)
  );

  const baseIds = new Set(baseProducts.map((p) => p.id));
  const baseVariantIds = new Set(
    baseProducts.flatMap((p) => (p.variants || []).map((v) => v.id))
  );
  const extraProducts: Product[] = [];

  for (const [id, ov] of Object.entries(safeOverrides)) {
    if (baseIds.has(id) || !ov || !ov.name || !Array.isArray(ov.variants)) continue;
    const validOvVariants = ov.variants.filter(isValidVariant);
    // Evita la "resurrezione" di una scheda raggruppata rimossa: se tutte le
    // sue varianti sono già native a catalogo su schede autonome, è un ghost.
    const isGhost =
      validOvVariants.length > 0 &&
      validOvVariants.every((v) => baseVariantIds.has(v.id));
    if (isGhost) continue;

    const skeleton: Product = {
      id,
      slug: ov.slug || id,
      name: ov.name,
      brand: ov.brand || "Generico",
      category: (ov.category as ProductCategory) || "Viso",
      price: ov.price || 0,
      originalWholesalePrice: ov.originalWholesalePrice || 0,
      badges: ov.badges || [],
      description: ov.description || "",
      shortDescription: ov.shortDescription || "",
      formulaBenefits: ov.formulaBenefits || "",
      howToUse: ov.howToUse || "",
      inci: ov.inci || "",
      features: ov.features || [],
      shades: [],
      variants: [],
      images: [],
    };

    extraProducts.push(mergeProductWithOverride(skeleton, ov, variantStocks));
  }

  return [...baseMap, ...extraProducts];
}
