"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, RotateCcw, Home } from "lucide-react";

/**
 * Global site error boundary (public storefront).
 *
 * Renders a branded, reassuring recovery screen instead of the raw Next.js
 * "This page couldn't load" system message.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Scelta Makeup] Errore imprevisto:", error);
  }, [error]);

  return (
    <section className="min-h-[70vh] bg-gradient-to-b from-white via-[#FAF7FC] to-[#F4EBF7] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-[#5E1788]/10 p-8 sm:p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#5E1788] to-[#D462A6] flex items-center justify-center shadow-lg shadow-[#5E1788]/20 text-white mb-5">
          <AlertTriangle size={30} />
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1B24] tracking-tight">
          Qualcosa è andato storto
        </h1>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          Ci scusiamo per il disagio. Puoi riprovare ad aprire la pagina oppure
          tornare alla home e continuare la tua visita allo store Scelta Makeup.
        </p>

        <div className="mt-7 space-y-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#9242AD] text-white font-semibold text-sm uppercase tracking-wider transition-all shadow-md shadow-[#5E1788]/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={17} />
            <span>Riprova</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-2xl bg-[#FAF7FC] hover:bg-[#F2E4F5] text-[#1F1B24] border border-[#E8DEF8] font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            <span>Ricarica pagina</span>
          </button>

          <Link
            href="/"
            className="w-full py-3 rounded-2xl bg-white hover:bg-gray-50 text-[#5E1788] border border-[#5E1788]/20 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            <span>Torna alla Home</span>
          </Link>
        </div>

        {error?.message && (
          <details className="mt-5">
            <summary className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer select-none">
              Dettagli tecnici
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-[10px] text-gray-500 whitespace-pre-wrap break-words text-left overflow-x-auto">
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          </details>
        )}
      </div>
    </section>
  );
}
