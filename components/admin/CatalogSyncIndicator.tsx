"use client";

import React, { useEffect, useState } from "react";
import { CATALOG_SYNC_EVENT, getCatalogSyncStatus, type CatalogSyncStatus } from "@/lib/adminStore";

/**
 * Indicatore fisso: compare SOLO quando ci sono modifiche al catalogo non ancora
 * confermate dal cloud. Arancione = invio in corso, rosso = problemi ripetuti.
 */
export default function CatalogSyncIndicator() {
  const [status, setStatus] = useState<CatalogSyncStatus>({ pending: 0, attempts: 0 });

  useEffect(() => {
    const refresh = () => setStatus(getCatalogSyncStatus());
    refresh();
    window.addEventListener(CATALOG_SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    const id = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener(CATALOG_SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(id);
    };
  }, []);

  if (status.pending === 0) return null;

  const isProblem = status.attempts > 2;
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-4 z-[9999] max-w-xs rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
        isProblem ? "bg-red-600 text-white" : "bg-amber-400 text-black"
      }`}
    >
      {isProblem
        ? `⚠ ${status.pending} modific${status.pending === 1 ? "a" : "he"} NON ancora salvat${
            status.pending === 1 ? "a" : "e"
          } sul cloud (${status.lastError || "connessione"}). Riprovo da solo: non chiudere il browser.`
        : `Salvataggio in corso… ${status.pending} modific${status.pending === 1 ? "a" : "he"} in invio`}
    </div>
  );
}
