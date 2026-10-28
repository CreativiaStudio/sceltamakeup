import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCentralCoupons } from "@/lib/serverCouponStore";
import { getAllProducts } from "@/lib/catalog";
import rawCatalog from "@/data/catalog.json";
import { Product } from "@/types/product";
import PromoLandingClient from "@/components/PromoLandingClient";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase().trim();

  try {
    const coupons = await getCentralCoupons({ fresh: true });
    const coupon = coupons.find(
      (c) =>
        (c.slug && c.slug.toLowerCase() === cleanSlug) ||
        c.code.toLowerCase() === cleanSlug
    );

    if (!coupon) {
      return {
        title: "Offerta Promozionale | Scelta Makeup Napoli",
        description: "Scopri le promozioni e le selezioni esclusive del Salone Scelta Makeup Napoli.",
      };
    }

    return {
      title: `${coupon.headline || coupon.name} | Scelta Makeup Napoli`,
      description:
        coupon.description ||
        `Selezione esclusiva di cosmetici scelta da Federica Cesiano con sconto dedicato.`,
      openGraph: {
        title: `${coupon.headline || coupon.name} — Scelta Makeup`,
        description:
          coupon.description ||
          `Offerta speciale del Salone Scelta Makeup Napoli (Via dei Pellegrini 28/29).`,
      },
    };
  } catch {
    return {
      title: "Offerta Promozionale | Scelta Makeup Napoli",
    };
  }
}

export default async function PromoPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase().trim();

  let coupons = await getCentralCoupons({ fresh: false });
  let coupon = coupons.find(
    (c) =>
      (c.slug && c.slug.toLowerCase() === cleanSlug) ||
      c.code.toLowerCase() === cleanSlug
  );

  if (!coupon) {
    // Retry with fresh cloud data
    coupons = await getCentralCoupons({ fresh: true });
    coupon = coupons.find(
      (c) =>
        (c.slug && c.slug.toLowerCase() === cleanSlug) ||
        c.code.toLowerCase() === cleanSlug
    );
  }

  if (!coupon) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7FC] py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-neutral-200 text-center space-y-4">
          <span className="text-3xl">🌸</span>
          <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
            Promozione Non Trovata o Conclusa
          </h1>
          <p className="text-xs text-neutral-500">
            Questa offerta speciale non è più attiva o il link inserito non è corretto. Puoi comunque esplorare tutti i prodotti e i servizi disponibili nel nostro Salone.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#5E1788] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#7A3293] transition-colors"
          >
            Torna alla Home
          </a>
        </div>
      </div>
    );
  }

  const allProducts = (await getAllProducts()) as Product[];

  // Resolve matching products based on coupon scope
  let matchingProducts: Product[] = [];

  if (coupon.scope === "products" && Array.isArray(coupon.targetProductIds)) {
    matchingProducts = coupon.targetProductIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter(Boolean) as Product[];
  } else if (coupon.scope === "brand" && coupon.targetBrand) {
    matchingProducts = allProducts.filter((p) =>
      (p.brand || "").toLowerCase().includes(coupon.targetBrand!.toLowerCase())
    );
  } else if (coupon.scope === "category" && coupon.targetCategory) {
    matchingProducts = allProducts.filter((p) =>
      (p.category || "").toLowerCase().includes(coupon.targetCategory!.toLowerCase())
    );
  } else {
    // For 'all' scope, show first 12 popular products
    matchingProducts = allProducts.slice(0, 12);
  }

  return <PromoLandingClient coupon={coupon} products={matchingProducts} />;
}
