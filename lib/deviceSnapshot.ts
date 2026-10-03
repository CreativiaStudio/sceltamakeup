/**
 * Scelta Makeup — Snapshot Forensi dei Dati Locali del Browser (Client)
 * Module: lib/deviceSnapshot.ts
 *
 * Raccoglie in un colpo solo le copie locali del browser (tutte le chiavi
 * localStorage che iniziano con `scelta`: store admin, storico audit, carrelli
 * e preferenze) e le invia al cloud dedicato una volta ogni 6 ore. Serve a
 * ricostruire da remoto le modifiche al catalogo fatte al banco che non sono
 * mai arrivate online (es. laptop salone YASHI di Federica).
 *
 * Garanzia di non-interferenza: qualunque errore (storage assente, modalità
 * privata, quota piena, rete giù) viene assorbito silenziosamente. La funzione
 * non lancia mai eccezioni, non blocca la UI e non tocca alcuna chiave di
 * localStorage eccetto il proprio timestamp di invio.
 */

import { getAuditDevice, getAuditOperator } from "@/lib/auditLogger";

export const DEVICE_SNAPSHOT_ENDPOINT = "/api/admin/device-snapshot";

/** Timestamp dell'ultimo invio riuscito (ms epoch come stringa). */
export const DEVICE_SNAPSHOT_LAST_UPLOAD_KEY = "scelta_snapshot_last_upload";

/** Intervallo minimo tra due snapshot consecutivi: 6 ore. */
export const DEVICE_SNAPSHOT_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Legge tutte le chiavi di localStorage che iniziano con `scelta`.
 * Il valore viene provato con JSON.parse e, se non è JSON valido, conservato
 * come stringa grezza. Nessuna chiave viene modificata.
 */
function collectLocalStorageSnapshot(): Record<string, unknown> {
  const entries: Record<string, unknown> = {};
  try {
    if (typeof localStorage === "undefined") return entries;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("scelta")) continue;
      const original = localStorage.getItem(key);
      if (original === null) continue;
      // Le immagini base64 (residuo del vecchio upload) possono superare il
      // limite di 4.5 MB del body su Vercel: non contengono prezzi, le omettiamo.
      const raw = original.replace(
        /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
        (m) => `[base64 omesso ${m.length} caratteri]`
      );
      try {
        entries[key] = JSON.parse(raw) as unknown;
      } catch {
        // Valore non JSON (stringa semplice): si conserva la stringa grezza.
        entries[key] = raw;
      }
    }
  } catch {
    // Storage non accessibile (private mode): si invia almeno il contesto.
  }
  return entries;
}

/** Timestamp dell'ultimo upload; 0 se assente o illeggibile. */
function readLastUploadAt(): number {
  try {
    if (typeof localStorage === "undefined") return 0;
    const raw = localStorage.getItem(DEVICE_SNAPSHOT_LAST_UPLOAD_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Esegue l'invio effettivo (una sola volta, rispettando la finestra delle 6 ore). */
async function sendDeviceSnapshot(): Promise<void> {
  if (typeof window === "undefined" || typeof fetch !== "function") return;

  const now = Date.now();
  if (now - readLastUploadAt() < DEVICE_SNAPSHOT_MIN_INTERVAL_MS) return;

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const pageUrl = window.location.href;

  const payload = {
    capturedAt: new Date(now).toISOString(),
    localStorage: collectLocalStorageSnapshot(),
    userAgent,
    pageUrl,
  };

  const res = await fetch(DEVICE_SNAPSHOT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device: getAuditDevice(),
      operator: getAuditOperator(),
      userAgent,
      pageUrl,
      payload,
    }),
    cache: "no-store",
    // Protegge l'invio anche se la pagina viene ricaricata subito dopo.
    keepalive: true,
  });

  // Il timestamp viene scritto SOLO dopo una risposta positiva, così un invio
  // fallito (offline) verrà ritentato al prossimo avvio.
  if (res.ok) {
    try {
      localStorage.setItem(DEVICE_SNAPSHOT_LAST_UPLOAD_KEY, String(now));
    } catch {
      // Quota piena / private mode: lo snapshot è comunque arrivato al cloud.
    }
  }
}

/**
 * Invia al massimo uno snapshot ogni 6 ore per dispositivo.
 * Fire-and-forget: non restituisce una Promise e non propaga mai eccezioni,
 * quindi la UI dell'admin non viene mai bloccata.
 */
export function uploadDeviceSnapshotOnce(): void {
  void sendDeviceSnapshot().catch(() => {
    // Offline o endpoint non disponibile: si ritenta al prossimo avvio.
  });
}
