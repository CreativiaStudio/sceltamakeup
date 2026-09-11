import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProducts } from "@/lib/catalog";
import CatalogClient from "@/components/CatalogClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Catalogo Completo Make-Up & Skincare | Scelta Makeup Napoli",
  description:
    "Sfoglia l'intero catalogo di 341 creazioni cosmetiche professionali: Diego dalla Palma, Cipria Makeup, RVB LAB, Pierre René ed Eveline Cosmetics. Spedizione gratuita da 49€ o ritiro in boutique a Napoli.",
};

export default async function ProdottiCatalogPage() {
  const products = await getAllProducts();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-24 bg-[#FAF7FC]/30">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#5E1788] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-neutral-600">
              Caricamento del catalogo Scelta Makeup...
            </p>
          </div>
        </div>
      }
    >
      <CatalogClient initialProducts={products} />
    </Suspense>
  );
}
