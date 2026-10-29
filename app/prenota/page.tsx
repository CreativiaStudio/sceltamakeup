import { Suspense } from "react";
import { Metadata } from "next";
import { getCentralServices } from "@/lib/serverServicesStore";
import BookingWizardClient from "./BookingWizardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prenota Appuntamento Make-up & Trattamenti Viso | Scelta Makeup Napoli",
  description:
    "Riserva il tuo appuntamento per Make-up Cerimonia, Giorno, Sposa o Trattamenti Cabina con Federica Cesiano. 10% di sconto immediato con acconto online.",
};

export default async function PrenotaPage() {
  const initialServices = await getCentralServices();

  return (
    <div className="min-h-screen bg-[#FAF7FC] text-[#1F1B24] flex flex-col font-sans">
      <main className="flex-grow py-8">
        <Suspense fallback={<div className="text-center py-20 text-sm text-[#5E1788]">Caricamento salone booking...</div>}>
          <BookingWizardClient initialServices={initialServices} />
        </Suspense>
      </main>
    </div>
  );
}
