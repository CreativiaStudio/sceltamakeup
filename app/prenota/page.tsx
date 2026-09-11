import { Suspense } from "react";
import { Metadata } from "next";
import BookingWizardClient from "./BookingWizardClient";

export const metadata: Metadata = {
  title: "Prenota Appuntamento Make-up | Scelta Makeup Napoli",
  description:
    "Riserva il tuo appuntamento per Make-up Cerimonia, Giorno, Sposa o Lezione di trucco con Federica Cesiano. 10% di sconto immediato con acconto online.",
};

export default function PrenotaPage() {
  return (
    <div className="min-h-screen bg-[#FAF7FC] text-[#1F1B24] flex flex-col font-sans">
      <main className="flex-grow py-8">
        <Suspense fallback={<div className="text-center py-20 text-sm text-[#5E1788]">Caricamento atelier booking...</div>}>
          <BookingWizardClient />
        </Suspense>
      </main>
    </div>
  );
}
