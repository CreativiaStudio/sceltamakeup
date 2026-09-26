"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Eraser,
  ArrowLeft,
} from "lucide-react";
import { STORAGE_ADMIN_STORE_KEY, resetAdminStoreToDefaults } from "@/lib/adminStore";

/**
 * Admin Cockpit error boundary.
 *
 * Guarantees that any unexpected render/runtime error inside the gestionale
 * (for example a poisoned variant row loaded from localStorage) shows a calm,
 * branded recovery screen instead of Next.js' raw "This page couldn't load".
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Keep the technical detail in the console for support/debugging only.
    console.error("[Scelta Makeup · Admin] Errore imprevisto nel gestionale:", error);
  }, [error]);

  const handleRetry = () => {
    setIsResetting(false);
    reset();
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleEmergencyReset = () => {
    setIsResetting(true);
    try {
      // 1. Ripristina il catalogo/giacenze ai valori di fabbrica (memoria e storage).
      resetAdminStoreToDefaults();
      // 2. Rimuove l'archivio corrotto: alla ricarica verrà ricostruito pulito.
      window.localStorage.removeItem(STORAGE_ADMIN_STORE_KEY);
    } catch {
      // Ignore: il reload qui sotto garantisce comunque il recupero.
    }
    window.setTimeout(() => {
      window.location.reload();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7FC] via-[#F4EBF7] to-[#E9D7EE] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#5E1788]/15 p-8 sm:p-10">
        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5E1788] to-[#7A3293] flex items-center justify-center shadow-lg shadow-[#5E1788]/30 text-white mb-5">
            <AlertTriangle size={30} />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1B24] tracking-tight">
            Si è verificato un problema imprevisto nel gestionale
          </h1>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-md">
            Nessun panico, Federica: la cassa e i tuoi dati sono al sicuro. Puoi
            provare a ripristinare l&apos;ultima schermata con un solo clic. Se il
            problema dovesse ripetersi, usa il ripristino di emergenza per ripulire
            la memoria del gestionale.
          </p>
        </div>

        {/* Recovery actions */}
        <div className="mt-7 space-y-2.5">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isResetting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#9242AD] text-white font-semibold text-sm uppercase tracking-wider transition-all shadow-md shadow-[#5E1788]/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={17} />
            <span>Riprova / Ripristina cassa</span>
          </button>

          <button
            type="button"
            onClick={handleReload}
            disabled={isResetting}
            className="w-full py-3 rounded-2xl bg-[#FAF7FC] hover:bg-[#F2E4F5] text-[#1F1B24] border border-[#E8DEF8] font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            <span>Ricarica pagina</span>
          </button>

          <button
            type="button"
            onClick={handleEmergencyReset}
            disabled={isResetting}
            className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Eraser size={16} />
            <span>
              {isResetting
                ? "Ripristino in corso..."
                : "Ripristina e pulisci memoria cassa"}
            </span>
          </button>
        </div>

        {/* Security reassurance */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-emerald-700">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Le vendite già registrate non vengono mai perse.</span>
        </div>

        {/* Technical detail (collapsible) */}
        {error?.message && (
          <details className="mt-5 group">
            <summary className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer select-none text-center">
              Dettagli tecnici per l&apos;assistenza
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-[10px] text-gray-500 whitespace-pre-wrap break-words overflow-x-auto">
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          </details>
        )}

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#5E1788] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Torna alla Dashboard del gestionale</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
