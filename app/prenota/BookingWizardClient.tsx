"use client";

import { useSearchParams } from "next/navigation";
import { Service } from "@/types/booking";
import BookingWizard from "@/components/booking/BookingWizard";

interface BookingWizardClientProps {
  initialServices?: Service[];
}

export default function BookingWizardClient({ initialServices }: BookingWizardClientProps) {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("servizio") || undefined;

  return (
    <BookingWizard
      preselectedServiceId={serviceParam}
      initialServices={initialServices}
    />
  );
}
