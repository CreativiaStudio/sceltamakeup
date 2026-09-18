import { Suspense } from "react";
import { Metadata } from "next";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export const metadata: Metadata = {
  title: "Ordine Confermato",
  description: "Il tuo ordine su Scelta Makeup è stato confermato con successo.",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-sm text-[#5E1788]">
          Verifica pagamento in corso...
        </div>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
