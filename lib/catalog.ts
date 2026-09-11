// Auto-generated Scelta Makeup Catalog
// Source: Official Invoices & Verified Brand Portals (RVB LAB / Cipria Make Up)

import { Product, ProductCategory, ProductBrand, CategoryKey } from "@/types/product";
import rawCatalog from "@/data/catalog.json";

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
 * Restituisce tutti i prodotti a catalogo
 */
export async function getAllProducts(): Promise<Product[]> {
  return catalog;
}

/**
 * Trova un prodotto dato il suo ID univoco
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  return catalog.find(p => p.id === id);
}

/**
 * Trova un prodotto dato il suo slug URL
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return catalog.find(p => p.slug === slug);
}

/**
 * Filtra i prodotti per categoria principale
 */
export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  return catalog.filter(p => p.category === category);
}

/**
 * Filtra i prodotti per marchio ufficiale
 */
export async function getProductsByBrand(brand: ProductBrand | string): Promise<Product[]> {
  return catalog.filter(p => p.brand === brand);
}

/**
 * Ricerca prodotti per testo (nome, descrizione, brand, categoria, SKU, EAN, sfumature)
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter(p => {
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
  return catalog
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
