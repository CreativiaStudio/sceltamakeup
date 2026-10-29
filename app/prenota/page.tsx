import { Suspense } from "react";
import { Metadata } from "next";
import { getCentralServices } from "@/lib/serverServicesStore";
import BookingWizardClient from "./BookingWizardClient";

export const dynamic = "force-dynamic";

const DEFAULT_TITLE =
  "Prenota Appuntamento Make-up & Trattamenti Viso | Scelta Makeup Napoli";
const DEFAULT_DESCRIPTION =
  "Riserva il tuo appuntamento per Make-up Cerimonia, Giorno, Sposa o Trattamenti Cabina con Federica Cesiano. 10% di sconto immediato con acconto online.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ servizio?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const requestedService = params?.servizio?.trim();

  if (!requestedService) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        type: "website",
        siteName: "Scelta Makeup",
      },
    };
  }

  try {
    const services = await getCentralServices();
    const normalizedRequest = requestedService.toLowerCase();
    const matchedService = services.find(
      (service) =>
        service.active &&
        (service.id === requestedService ||
          service.slug === requestedService ||
          service.slug.toLowerCase() === normalizedRequest)
    );

    if (!matchedService) {
      return {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        openGraph: {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          type: "website",
          siteName: "Scelta Makeup",
        },
      };
    }

    const channelLabel =
      matchedService.channel === "beauty"
        ? "Cabina Estetica Privata"
        : "Make-Up Salone";
    const title = `${matchedService.name} | Prenota in Salone – Scelta Makeup Napoli`;
    const description = `${matchedService.description} ${channelLabel} • ${matchedService.durationMinutes} min • €${matchedService.priceOnline.toFixed(2)} con il 10% di sconto online e acconto del 20% per bloccare data e orario.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Scelta Makeup",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        type: "website",
        siteName: "Scelta Makeup",
      },
    };
  }
}

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
