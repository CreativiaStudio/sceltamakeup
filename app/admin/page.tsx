import { Suspense } from "react";
import type { Metadata } from "next";
import AdminClientWrapper from "@/components/admin/AdminClientWrapper";

export const metadata: Metadata = {
  title: "Admin Cockpit | Scelta Makeup",
  description:
    "Pannello di controllo unificato per l'e-commerce, catalogo cosmetici, ordini, spedizioni corriere, ritiro in salone e CRM di Scelta Makeup.",
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7FC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#5E1788] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-[#5E1788] tracking-wider uppercase">
              Caricamento Cockpit Scelta Makeup...
            </span>
          </div>
        </div>
      }
    >
      <AdminClientWrapper />
    </Suspense>
  );
}
