export interface Shade {
  id: string;
  name: string;
  code: string;
  hex: string;
  image: string;
  textureImage?: string;
  price?: number;
  inStock?: boolean;
  stock?: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  ean: string;
  colorHex: string | null;
  image: string;
  textureImage?: string;
  inStock: boolean;
  stock?: number;
  price?: number;
  originalWholesalePrice?: number;
}

export type ProductBadge = 'bestseller' | 'nuovo' | 'cruelty_free' | 'vegan';
export type ProductBrand = 'RVB LAB' | 'Diego dalla Palma' | 'Cipria Make Up' | 'Eveline Cosmetics' | 'Pierre René' | 'Miyo';
export type ProductCategory = 'Viso' | 'Occhi' | 'Labbra' | 'Skincare & Dermo' | 'Beauty & Accessori';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  originalWholesalePrice: number;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  inStock?: boolean;
  badge?: 'Bestseller' | 'Novità' | 'Iconico' | 'Exclusive' | 'Must Have';
  badges: ProductBadge[];
  description: string;
  shortDescription: string;
  formulaBenefits: string;
  howToUse: string;
  inci: string;
  features: string[];
  shades: Shade[];
  variants: ProductVariant[];
  images: string[];
  isFeatured?: boolean;
  tags?: string[];
  texture?: string;
  coverage?: string;
  finish?: string;
}

export type CategoryKey = 'Tutti' | 'Viso' | 'Occhi' | 'Labbra' | 'Skincare & Dermo' | 'Beauty & Accessori';

export interface CartItem {
  id: string; // product id + shade id
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  shade?: {
    id: string;
    name: string;
    code: string;
    hex: string;
    image: string;
  };
  image: string;
}
