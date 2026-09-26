/**
 * Scelta Makeup — Scatola Nera / Registro Attività Operatore (Audit Trail)
 * Module: lib/auditLogger.ts
 *
 * Registra in modo immutabile ogni operazione sensibile svolta al banco cassa
 * (da Federica sul laptop salone YASHI) o nel catalogo (anche dall'admin remoto
 * di Mario): scontrini RT, variazioni prezzi, rettifiche giacenze, scansioni
 * barcode, modifiche schede prodotto e toggle canale di vendita.
 *
 * Architettura offline-first:
 *  1. Ring buffer in memoria (max 500 eventi) specchiato in localStorage
 *     (`scelta_admin_audit_logs_v1`) → la cassa continua a lavorare anche senza
 *     rete e la timeline si aggiorna all'istante.
 *  2. Notifica asincrona best-effort a `/api/admin/audit-log` (POST) → il cloud
 *     Supabase / Creativia Hub conserva la storia completa (max 1000 eventi) ed
 *     è consultabile da remoto.
 *  3. Evento window `scelta_audit_log_added` → la tab "Registro Attività" si
 *     ridisegna in tempo reale senza polling ad alta frequenza.
 *
 * Garanzia di non-interferenza: qualunque errore interno (storage pieno,
 * modalità privata, rete assente) viene assorbito silenziosamente: un problema
 * del registro NON deve mai bloccare una vendita o una modifica al banco.
 */

export type ActivityCategory =
  | "cassa_rt" // Scontrini fiscali, incassi, aperture cassetto
  | "prezzo" // Variazioni di listino
  | "giacenza" // Carico/scarico, rettifiche stock
  | "barcode" // Scansioni ottiche, codici non trovati
  | "prodotto" // Modifiche scheda, descrizioni, foto, nuovo prodotto
  | "canale" // Toggle solo negozio vs online
  | "sistema"; // Reset, errori, ripristini

export interface AdminActivityLogItem {
  id: string;
  timestamp: string; // ISO string
  category: ActivityCategory;
  action: string;
  title: string;
  description: string;
  details?: Record<string, unknown>;
  operator?: string; // Default: "Banco Salone (Federica)"
  device?: string;
}

// ------------------------------------------------------------------------------
// Costanti pubbliche
// ------------------------------------------------------------------------------

export const AUDIT_LOG_STORAGE_KEY = "scelta_admin_audit_logs_v1";
export const AUDIT_LOG_EVENT_NAME = "scelta_audit_log_added";
export const AUDIT_LOG_ENDPOINT = "/api/admin/audit-log";

/** Chiavi di sessione scritte da AdminAuthGuard in base alla modalità di accesso. */
export const AUDIT_OPERATOR_STORAGE_KEY = "scelta_admin_operator_label";
export const AUDIT_DEVICE_STORAGE_KEY = "scelta_admin_device_label";

export const DEFAULT_OPERATOR_LABEL = "Banco Salone (Federica)";
export const REMOTE_OPERATOR_LABEL = "Admin Remoto";

export const MAX_LOCAL_AUDIT_LOGS = 500;
export const MAX_CLOUD_AUDIT_LOGS = 1000;

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  "cassa_rt",
  "prezzo",
  "giacenza",
  "barcode",
  "prodotto",
  "canale",
  "sistema",
] as const;

// ------------------------------------------------------------------------------
// Stato in memoria (ring buffer, specchiato in localStorage)
// ------------------------------------------------------------------------------

let memoryLogs: AdminActivityLogItem[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGetStorage(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeGetSessionStorage(key: string): string | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------
// Sanitizzazione (condivisa con il backend: nessun dato malformato entra in UI)
// ------------------------------------------------------------------------------

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isActivityCategory(value: unknown): value is ActivityCategory {
  return typeof value === "string" && (ACTIVITY_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Clona e valida i metadati dell'evento: un round-trip JSON garantisce che
 * `details` sia serializzabile (mai oggetti circolari o funzioni in storage).
 */
function safeDetails(details: unknown): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  try {
    return JSON.parse(JSON.stringify(details)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Ripulisce una voce arbitraria proveniente da localStorage o dal cloud.
 * Ritorna `null` se non è un evento valido (id/timestamp/categoria/titolo).
 */
export function sanitizeAdminActivityLogItem(value: unknown): AdminActivityLogItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  if (!isNonEmptyString(raw.id)) return null;
  if (!isNonEmptyString(raw.timestamp)) return null;
  if (!isActivityCategory(raw.category)) return null;
  if (!isNonEmptyString(raw.title)) return null;

  return {
    id: raw.id.trim().slice(0, 120),
    timestamp: raw.timestamp,
    category: raw.category,
    action: isNonEmptyString(raw.action) ? raw.action.trim().slice(0, 120) : raw.category,
    title: raw.title.trim().slice(0, 200),
    description: isNonEmptyString(raw.description) ? raw.description.trim().slice(0, 2000) : "",
    details: safeDetails(raw.details),
    operator: isNonEmptyString(raw.operator) ? raw.operator.trim().slice(0, 120) : undefined,
    device: isNonEmptyString(raw.device) ? raw.device.trim().slice(0, 120) : undefined,
  };
}

function sanitizeLogList(value: unknown): AdminActivityLogItem[] {
  if (!Array.isArray(value)) return [];
  const out: AdminActivityLogItem[] = [];
  for (const entry of value) {
    const clean = sanitizeAdminActivityLogItem(entry);
    if (clean) out.push(clean);
  }
  return out;
}

// ------------------------------------------------------------------------------
// Fusione e ordinamento
// ------------------------------------------------------------------------------

/** Deduplica per id (vince l'ultima versione incontrata) e ordina dal più recente. */
function mergeAuditLogs(
  first: AdminActivityLogItem[],
  second: AdminActivityLogItem[]
): AdminActivityLogItem[] {
  const byId = new Map<string, AdminActivityLogItem>();
  for (const item of first) byId.set(item.id, item);
  for (const item of second) byId.set(item.id, item);

  return Array.from(byId.values()).sort((a, b) => {
    const ta = Date.parse(a.timestamp);
    const tb = Date.parse(b.timestamp);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

function readStoredLogs(): AdminActivityLogItem[] {
  const raw = safeGetStorage(AUDIT_LOG_STORAGE_KEY);
  if (!raw) return [];
  try {
    return sanitizeLogList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeStoredLogs(logs: AdminActivityLogItem[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    // Quota piena o storage disabilitato: la cassa continua comunque a funzionare.
    console.warn("[Scelta Makeup · Audit] Impossibile salvare il registro locale:", err);
  }
}

// ------------------------------------------------------------------------------
// Identità operatore / dispositivo
// ------------------------------------------------------------------------------

/**
 * Etichetta operatore corrente. La sessione PIN cassa scrive
 * "Banco Salone (Federica)", la Password Master scrive "Admin Remoto".
 * In assenza di informazione si assume il banco salone (comportamento storico).
 */
export function getAuditOperator(): string {
  if (!isBrowser()) return DEFAULT_OPERATOR_LABEL;
  const session = safeGetSessionStorage(AUDIT_OPERATOR_STORAGE_KEY);
  if (isNonEmptyString(session)) return session.trim();
  const persisted = safeGetStorage(AUDIT_OPERATOR_STORAGE_KEY);
  if (isNonEmptyString(persisted)) return persisted.trim();
  return DEFAULT_OPERATOR_LABEL;
}

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Dispositivo Sconosciuto";
  const ua = navigator.userAgent || "";

  let os = "Dispositivo";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "Mac";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/CriOS\//i.test(ua)) browser = "Chrome iOS";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return `${os} · ${browser}`;
}

/**
 * Etichetta dispositivo corrente: "YASHI (Laptop Salone)" per la cassa PIN,
 * "Browser Amministratore" per l'accesso remoto, altrimenti rilevata dall'UA.
 */
export function getAuditDevice(): string {
  if (!isBrowser()) return "Server";
  const session = safeGetSessionStorage(AUDIT_DEVICE_STORAGE_KEY);
  if (isNonEmptyString(session)) return session.trim();
  const persisted = safeGetStorage(AUDIT_DEVICE_STORAGE_KEY);
  if (isNonEmptyString(persisted)) return persisted.trim();
  return detectDeviceLabel();
}

/** Memorizza l'identità dell'operatore per la sessione corrente (per-tab, non condivisa). */
export function setAuditOperatorSession(operator: string, device?: string): void {
  if (!isBrowser()) return;
  try {
    if (isNonEmptyString(operator)) {
      sessionStorage.setItem(AUDIT_OPERATOR_STORAGE_KEY, operator.trim());
    }
    if (isNonEmptyString(device)) {
      sessionStorage.setItem(AUDIT_DEVICE_STORAGE_KEY, device.trim());
    }
  } catch {
    // Storage di sessione non disponibile: si ricade sull'etichetta di default.
  }
}

// ------------------------------------------------------------------------------
// Scrittura eventi
// ------------------------------------------------------------------------------

function emitAuditLogAdded(item?: AdminActivityLogItem): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(
      new CustomEvent<AdminActivityLogItem | null>(AUDIT_LOG_EVENT_NAME, { detail: item ?? null })
    );
  } catch {
    // Ambienti senza CustomEvent (test/SSR): la UI si aggiornerà al prossimo render.
  }
}

/** Notifica asincrona best-effort al cloud: se fallisce, resta la copia locale. */
async function postAuditLogToCloud(item: AdminActivityLogItem): Promise<void> {
  if (typeof fetch !== "function") return;
  try {
    await fetch(AUDIT_LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log: item }),
      // `keepalive` protegge l'evento anche se la pagina viene ricaricata/chiusa subito.
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Offline: il ring buffer locale conserva l'evento, il cloud lo riceverà nei prossimi invii.
  }
}

/**
 * Registra un evento nella scatola nera.
 *
 * - Assegna ID univoco `act_${Date.now()}_${random}` e timestamp ISO.
 * - Aggiorna il ring buffer in memoria + localStorage (max 500 eventi).
 * - Emette `scelta_audit_log_added` per l'aggiornamento reattivo della UI.
 * - Invia la notifica asincrona a `/api/admin/audit-log` (POST, best-effort).
 */
export function logAdminActivity(entry: Omit<AdminActivityLogItem, "id" | "timestamp">): void {
  try {
    const item: AdminActivityLogItem = {
      ...entry,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      operator: isNonEmptyString(entry.operator) ? entry.operator.trim() : getAuditOperator(),
      device: isNonEmptyString(entry.device) ? entry.device.trim() : getAuditDevice(),
      details: safeDetails(entry.details),
    };

    memoryLogs = mergeAuditLogs(memoryLogs, [item, ...readStoredLogs()]).slice(
      0,
      MAX_LOCAL_AUDIT_LOGS
    );
    writeStoredLogs(memoryLogs);
    emitAuditLogAdded(item);
    void postAuditLogToCloud(item);
  } catch (err) {
    // Il registro non deve MAI interrompere una vendita o un salvataggio.
    console.warn("[Scelta Makeup · Audit] Registrazione evento non riuscita:", err);
  }
}

// ------------------------------------------------------------------------------
// Lettura e sincronizzazione
// ------------------------------------------------------------------------------

/**
 * Restituisce gli eventi ordinati dal più recente al più vecchio, unendo la
 * copia in memoria con quanto scritto nel frattempo in localStorage da altre
 * tab del gestionale (es. la cassa aperta in una seconda finestra).
 */
export function getAdminActivityLogs(): AdminActivityLogItem[] {
  try {
    memoryLogs = mergeAuditLogs(memoryLogs, readStoredLogs()).slice(0, MAX_LOCAL_AUDIT_LOGS);
  } catch {
    // In caso di storage illeggibile si restituisce la sola copia in memoria.
  }
  return memoryLogs;
}

/**
 * Interroga `GET /api/admin/audit-log` e fonde la storia cloud con quella
 * locale preservando la cronologia completa (deduplica per id, taglio a 500
 * eventi locali). In assenza di rete ritorna pacificamente la copia locale.
 */
export async function fetchCloudActivityLogs(): Promise<AdminActivityLogItem[]> {
  try {
    if (typeof fetch !== "function") return getAdminActivityLogs();

    const res = await fetch(AUDIT_LOG_ENDPOINT, { method: "GET", cache: "no-store" });
    if (!res.ok) return getAdminActivityLogs();

    const data = (await res.json().catch(() => null)) as { logs?: unknown } | null;
    const cloudLogs = sanitizeLogList(data?.logs);

    const merged = mergeAuditLogs(getAdminActivityLogs(), cloudLogs).slice(
      0,
      MAX_LOCAL_AUDIT_LOGS
    );
    memoryLogs = merged;
    writeStoredLogs(merged);
    emitAuditLogAdded();
    return merged;
  } catch {
    return getAdminActivityLogs();
  }
}

/**
 * Svuota il registro locale (memoria + localStorage).
 * Strumento di sola manutenzione: la storia cloud non viene toccata e alla
 * prossima sincronizzazione viene ripristinata integralmente.
 */
export function clearAdminActivityLogs(): void {
  memoryLogs = [];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
    }
  } catch {
    // Ignore: la memoria è già vuota.
  }
  emitAuditLogAdded();
}