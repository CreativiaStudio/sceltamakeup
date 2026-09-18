import { Suspense } from "react";
import { Metadata } from "next";
import PrenotaSuccessClient from "./PrenotaSuccessClient";

export const metadata: Metadata = {
  title: "Prenotazione Confermata",
  description: "Il tuo appuntamento make-up su Scelta Makeup è stato confermato.",
};

export default function PrenotaSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-sm text-[#5E1788]">
          Verifica pagamento in corso...
        </div>
      }
    >
      <PrenotaSuccessClient />
    </Suspense>
  );
}
