"use client";

import { useSearchParams } from "next/navigation";
import BookingWizard from "@/components/booking/BookingWizard";

export default function BookingWizardClient() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("servizio") || undefined;

  return <BookingWizard preselectedServiceId={serviceParam} />;
}
