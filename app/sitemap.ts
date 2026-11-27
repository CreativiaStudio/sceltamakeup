import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/catalog";
import { isPlaceholderImage, resolveProductImageUrl } from "@/lib/r2Public";

export const revalidate = 3600;

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.sceltamakeup.it"
).replace(/\/$/, "");

function toAbsoluteImageUrl(src?: string | null): string | null {
  if (!src || isPlaceholderImage(src)) return null;
  const resolved = resolveProductImageUrl(src);
  if (isPlaceholderImage(resolved)) return null;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  if (resolved.startsWith("/")) {
    return `${BASE_URL}${resolved}`;
  }
  return `${BASE_URL}/${resolved}`;
}

function isExcludedFromPublicSeo(product: {
  id: string;
  slug: string;
  name: string;
  isLocalOnly?: boolean;
}): boolean {
  if (product.isLocalOnly) return true;
  if (product.id === "TEST01" || product.slug === "test-cassa-1-euro") return true;
  if (/test cassa/i.test(product.name)) return true;
  return false;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/prodotti`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/servizi`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/prenota`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/termini-e-condizioni`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookie-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getAllProducts();
    productRoutes = products
      .filter(
        (p) =>
          typeof p.slug === "string" &&
          p.slug.trim().length > 0 &&
          !isExcludedFromPublicSeo(p)
      )
      .map((p) => {
        const imgs = Array.from(
          new Set(
            [...(p.images || []), ...(p.variants || []).map((v) => v.image)]
              .map((u) => toAbsoluteImageUrl(u))
              .filter((u): u is string => Boolean(u))
          )
        ).slice(0, 5);

        return {
          url: `${BASE_URL}/prodotti/${p.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
          ...(imgs.length > 0 ? { images: imgs } : {}),
        };
      });
  } catch (err) {
    console.error("[Sitemap] Errore recupero catalogo:", err);
  }

  return [...staticRoutes, ...productRoutes];
}
