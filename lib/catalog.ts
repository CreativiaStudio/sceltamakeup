import { Product, ProductCategory, ProductBrand, CategoryKey } from "@/types/product";
import rawCatalog from "@/data/catalog.json";
import { getCentralCatalogState } from "@/lib/serverCatalogStore";
import { applyCatalogOverrides } from "@/lib/catalogMerge";

export const catalog: Product[] = rawCatalog as Product[];

export const CATEGORIES: CategoryKey[] = [
  'Tutti',
  'Viso',
  'Occhi',
  'Labbra',
  'Skincare & Dermo',
  'Beauty & Accessori'
];

/**
 * Restituisce i prodotti a catalogo sincronizzati con il cloud.
 * Di default per lo storefront pubblico esclude i prodotti contrassegnati come "isLocalOnly: true" (Solo Negozio Fisico).
 * Passando options: { includeLocalOnly: true } restituisce il catalogo integrale.
 */
export async function getAllProducts(options?: {
  includeLocalOnly?: boolean;
  fresh?: boolean;
  strict?: boolean;
}): Promise<Product[]> {
  try {
    const central = await getCentralCatalogState({ fresh: options?.fresh });
    const withOverrides = applyCatalogOverrides(
      rawCatalog as Product[],
      central.productOverrides || {},
      central.variantStocks || {}
    );
    if (options?.includeLocalOnly) return withOverrides;
    return withOverrides.filter((p) => !p.isLocalOnly);
  } catch (err) {
    if (options?.strict) throw err;
    console.error(
      "[catalog] Fallback a catalogo statico:",
      err instanceof Error ? err.message : err
    );
    if (options?.includeLocalOnly) return catalog;
    return catalog.filter((p) => !p.isLocalOnly);
  }
}

/**
 * Trova un prodotto dato il suo ID univoco
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  const all = await getAllProducts();
  return all.find(p => p.id === id);
}

/**
 * Risolve un prodotto dato lo slug attuale oppure uno slug storico rinominato.
 */
export async function resolveProductBySlug(
  slug: string
): Promise<{ product: Product; redirectedFromLegacySlug: boolean } | undefined> {
  const all = await getAllProducts();
  const direct = all.find((p) => p.slug === slug);
  if (direct) {
    return { product: direct, redirectedFromLegacySlug: false };
  }

  const legacyBase = catalog.find((p) => p.slug === slug);
  if (legacyBase) {
    const current = all.find((p) => p.id === legacyBase.id);
    if (current) {
      return {
        product: current,
        redirectedFromLegacySlug: current.slug !== slug,
      };
    }
  }

  return undefined;
}

/**
 * Trova un prodotto dato il suo slug URL
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const resolved = await resolveProductBySlug(slug);
  return resolved?.product;
}

/**
 * Filtra i prodotti per categoria principale
 */
export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(p => p.category === category);
}

/**
 * Filtra i prodotti per marchio ufficiale
 */
export async function getProductsByBrand(brand: ProductBrand | string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(p => 
    p.brand === brand ||
    (brand === "Diego dalla Palma" && p.brand.toLowerCase().includes("diego dalla palma")) ||
    (brand === "RVB LAB" && p.brand.toLowerCase().includes("rvb lab"))
  );
}

/**
 * Ricerca prodotti per testo (nome, descrizione, brand, categoria, SKU, EAN, sfumature)
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const all = await getAllProducts();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(p => {
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.variants.some(v => v.sku.toLowerCase().includes(q) || v.ean.includes(q) || v.name.toLowerCase().includes(q))
    );
  });
}

/**
 * Restituisce i prodotti in evidenza (Bestseller o Novità)
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const all = await getAllProducts();
  return all
    .filter(p => p.badges.includes('bestseller') || p.badges.includes('nuovo') || p.badge === 'Bestseller')
    .slice(0, limit);
}

/**
 * Restituisce tutte le categorie uniche presenti a catalogo
 */
export function getAllCategories(): ProductCategory[] {
  return Array.from(new Set(catalog.map(p => p.category)));
}

/**
 * Restituisce tutti i brand presenti a catalogo
 */
export function getAllBrands(): string[] {
  return Array.from(new Set(catalog.map(p => p.brand)));
}
