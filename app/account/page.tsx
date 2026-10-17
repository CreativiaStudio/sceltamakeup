import { Suspense } from "react";
import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Area Riservata Clienti & Dashboard",
  description:
    "Accedi alla tua Area Personale Scelta Makeup: i tuoi ordini con tracking live, il riordino rapido dei preferiti e gli appuntamenti in Atelier a Napoli.",
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
