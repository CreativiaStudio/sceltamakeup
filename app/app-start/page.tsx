import { Suspense } from "react";
import type { Metadata } from "next";
import AppLauncherClient from "@/components/AppLauncherClient";

export const metadata: Metadata = {
  title: "Accesso App | Scelta Makeup",
  description: "Accesso rapido all'App Scelta Makeup.",
};

export default function AppStartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7FC] flex items-center justify-center text-xs font-semibold text-[#5E1788] uppercase tracking-widest">
          Avvio Scelta Makeup...
        </div>
      }
    >
      <AppLauncherClient />
    </Suspense>
  );
}
