import { Suspense } from "react";
import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Area Clienti & Traccia Ordine",
  description:
    "Consulta i tuoi ordini Scelta Makeup e segui la spedizione in tempo reale, dall'Atelier di Napoli a casa tua.",
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-[#5E1788]">
          Caricamento Area Clienti...
        </div>
      }
    >
      <AccountClient />
    </Suspense>
  );
}
