import { Suspense } from "react";
import type { Metadata } from "next";
import AccountClient from "@/app/account/AccountClient";

interface OrderPageProps {
  params: Promise<{ orderNumber: string }>;
}

export const metadata: Metadata = {
  title: "Il tuo ordine",
  description: "Segui lo stato e la spedizione del tuo ordine Scelta Makeup.",
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderNumber: rawOrderNumber } = await params;
  let orderNumber = rawOrderNumber;
  try {
    orderNumber = decodeURIComponent(rawOrderNumber);
  } catch {
    // keep raw value
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-[#5E1788]">
          Recupero del tuo ordine...
        </div>
      }
    >
      <AccountClient initialOrderNumber={orderNumber} />
    </Suspense>
  );
}
