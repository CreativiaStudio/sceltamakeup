import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getAllProducts } from "@/lib/catalog";
import ProductDetailClient from "@/components/ProductDetailClient";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Prodotto Non Trovato | Scelta Makeup",
    };
  }

  const primaryImage = product.images[0] || "/brand/logo.png";

  return {
    title: `${product.name} — ${product.brand} | Scelta Makeup`,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} — Scelta Makeup`,
      description: product.shortDescription,
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await getAllProducts();
  const relatedProducts = allProducts.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand)
  );

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}
