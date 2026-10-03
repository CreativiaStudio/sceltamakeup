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
 *  2. Coda persistente di invio ("outbox", max 3000 eventi) in localStorage
 *     (`scelta_audit_outbox_v1`): ogni evento viene accodato e inviato in batch
 *     a `/api/admin/audit-log` (POST) con retry automatici (interval 15s, evento
 *     `online`, ritorno in primo piano) finché il server non ne conferma la
 *     ricezione. Il cloud Supabase dedicato conserva la storia completa
 *     (max 1000 eventi) ed è consultabile da remoto. L'invio è idempotente
 *     sugli id: un eventuale reinvio non genera duplicati.
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
  | "sistema" // Reset, errori, ripristini
  | "errore"; // Errori ed anomalie runtime (telemetria globale)

/** Gravità dell'evento: gli errori vengono evidenziati nella Scatola Nera. */
export type AuditLogLevel = "info" | "warning" | "error";

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
  level?: AuditLogLevel; // Popolato per errori/anomalie (default: info)
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

/** Coda persistente di eventi in attesa di conferma dal cloud. */
export const AUDIT_OUTBOX_STORAGE_KEY = "scelta_audit_outbox_v1";
export const MAX_AUDIT_OUTBOX_ITEMS = 3000;

/** Parametri del flush: dimensione batch, timeout e intervallo di ritentativo. */
const AUDIT_OUTBOX_BATCH_SIZE = 100;
const AUDIT_OUTBOX_TIMEOUT_MS = 15_000;
const AUDIT_OUTBOX_FLUSH_INTERVAL_MS = 15_000;
const AUDIT_OUTBOX_KEEPALIVE_MAX_BYTES = 60 * 1024;

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  "cassa_rt",
  "prezzo",
  "giacenza",
  "barcode",
  "prodotto",
  "canale",
  "sistema",
  "errore",
] as const;

// ------------------------------------------------------------------------------
// Stato in memoria (ring buffer, specchiato in localStorage)
// ------------------------------------------------------------------------------

let memoryLogs: AdminActivityLogItem[] = [];

/** Coda outbox in memoria (fallback quando localStorage non è disponibile). */
let memoryOutbox: AdminActivityLogItem[] = [];

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

export function isAuditLogLevel(value: unknown): value is AuditLogLevel {
  return value === "info" || value === "warning" || value === "error";
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
    level: isAuditLogLevel(raw.level) ? raw.level : undefined,
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
// Coda outbox persistente (invio garantito al cloud)
// ------------------------------------------------------------------------------

/**
 * Legge la coda di invio dallo storage, scartando le voci malformate. In assenza
 * o con storage corrotto ricade sulla copia in memoria.
 */
function readOutbox(): AdminActivityLogItem[] {
  if (isBrowser()) {
    const raw = safeGetStorage(AUDIT_OUTBOX_STORAGE_KEY);
    if (raw !== null) {
      try {
        memoryOutbox = sanitizeLogList(JSON.parse(raw));
        return memoryOutbox;
      } catch {
        // Storage corrotto: si conserva la copia in memoria.
      }
    }
  }
  return memoryOutbox;
}

/** Scrive la coda in localStorage; senza storage disponibile resta solo in memoria. */
function writeOutbox(items: AdminActivityLogItem[]): void {
  memoryOutbox = items;
  if (!isBrowser()) return;
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(AUDIT_OUTBOX_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    // Quota piena o storage disabilitato: la coda in memoria mantiene gli eventi.
    console.warn("[Scelta Makeup · Audit] Impossibile salvare l'outbox locale:", err);
  }
}

/**
 * Mantiene la coda entro il limite scartando le voci più vecchie: sono già state
 * conservate nel ring buffer locale (`scelta_admin_audit_logs_v1`).
 */
function trimOutbox(items: AdminActivityLogItem[]): AdminActivityLogItem[] {
  if (items.length <= MAX_AUDIT_OUTBOX_ITEMS) return items;
  return items.slice(items.length - MAX_AUDIT_OUTBOX_ITEMS);
}

/** Accoda un singolo evento (dedup per id) e aggiorna la coda persistente. */
function enqueueOutboxItem(item: AdminActivityLogItem): void {
  const current = readOutbox();
  if (current.some((existing) => existing.id === item.id)) return;
  writeOutbox(trimOutbox([...current, item]));
}

/** Accoda più eventi deduplicandoli per id rispetto alla coda corrente. */
function enqueueOutboxItems(items: AdminActivityLogItem[]): void {
  const current = readOutbox();
  const seen = new Set(current.map((existing) => existing.id));
  const additions: AdminActivityLogItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    additions.push(item);
  }
  if (additions.length === 0) return;
  writeOutbox(trimOutbox([...current, ...additions]));
}

/** Rimuove dalla coda (rileggendola dallo storage) esattamente gli id confermati. */
function removeOutboxItemsById(ids: Set<string>): void {
  const current = readOutbox();
  const next = current.filter((item) => !ids.has(item.id));
  if (next.length !== current.length) writeOutbox(next);
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

/** Flag di modulo: auto-flush e recupero storico avviati una sola volta per pagina. */
let didScheduleAutoFlush = false;
let didRecoverHistoricalLogs = false;
let activeFlush: Promise<void> | null = null;

/**
 * Svuota la coda verso il cloud a piccoli batch. Un solo flush alla volta: le
 * chiamate concorrenti condividono la stessa promise. Non lancia mai eccezioni.
 */
export function flushAuditOutbox(): Promise<void> {
  if (activeFlush) return activeFlush;
  activeFlush = runAuditOutboxFlush().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

async function runAuditOutboxFlush(): Promise<void> {
  if (typeof fetch !== "function") return;
  try {
    while (true) {
      const queue = readOutbox();
      if (queue.length === 0) return;

      const batch = queue.slice(0, AUDIT_OUTBOX_BATCH_SIZE);
      const body = JSON.stringify({ logs: batch });
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), AUDIT_OUTBOX_TIMEOUT_MS)
        : null;

      let response: Response;
      try {
        response = await fetch(AUDIT_LOG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          // `keepalive` protegge l'evento se la pagina viene chiusa subito, ma solo
          // quando il body è piccolo: oltre i 60KB il browser rifiuterebbe la richiesta.
          keepalive: body.length < AUDIT_OUTBOX_KEEPALIVE_MAX_BYTES,
          cache: "no-store",
          signal: controller ? controller.signal : undefined,
        });
      } catch {
        // Errore di rete, timeout o abort: si riprova al prossimo flush.
        return;
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
      }

      if (response.ok) {
        // Rilegge la coda: nel frattempo altri eventi possono essere stati aggiunti.
        removeOutboxItemsById(new Set(batch.map((item) => item.id)));
        continue;
      }

      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        // Server/rete temporaneamente non disponibile: si ferma e riprova più tardi.
        return;
      }

      // Altro 4xx: payload rifiutato dal server, rimuove il batch per non bloccare la coda.
      console.warn(
        `[Scelta Makeup · Audit] Outbox: batch scartato dal server (HTTP ${response.status}).`
      );
      removeOutboxItemsById(new Set(batch.map((item) => item.id)));
    }
  } catch (err) {
    console.warn("[Scelta Makeup · Audit] Flush outbox non riuscito:", err);
  }
}

/**
 * Recupera una sola volta per pagina gli eventi già presenti nel ring buffer
 * locale (anche persi in passato da questo dispositivo), accodandoli. Grazie
 * all'idempotenza del server il reinvio di eventuali duplicati è innocuo.
 */
function recoverHistoricalLogsOnce(): void {
  if (didRecoverHistoricalLogs) return;
  didRecoverHistoricalLogs = true;
  try {
    enqueueOutboxItems(readStoredLogs());
  } catch {
    // Storage illeggibile: nessun recupero, la coda corrente resta intatta.
  }
}

/**
 * Avvia i tentativi di invio automatici (solo nel browser): interval di 15s,
 * evento `online` e ritorno in primo piano della pagina. Idempotente: una sola
 * installazione per pagina. Ritorna la funzione di cleanup.
 */
export function startAuditOutboxAutoFlush(): () => void {
  if (!isBrowser()) return () => {};
  recoverHistoricalLogsOnce();
  if (didScheduleAutoFlush) return () => {};

  const timer = window.setInterval(() => {
    if (getAuditOutboxPendingCount() > 0) void flushAuditOutbox();
  }, AUDIT_OUTBOX_FLUSH_INTERVAL_MS);

  const handleOnline = () => {
    void flushAuditOutbox();
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") void flushAuditOutbox();
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  didScheduleAutoFlush = true;

  return () => {
    if (!didScheduleAutoFlush) return;
    window.clearInterval(timer);
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    didScheduleAutoFlush = false;
  };
}

/** Numero di eventi attualmente in attesa di conferma dal cloud. */
export function getAuditOutboxPendingCount(): number {
  try {
    return readOutbox().length;
  } catch {
    return 0;
  }
}

/**
 * Registra un evento nella scatola nera.
 *
 * - Assegna ID univoco `act_${Date.now()}_${random}` e timestamp ISO.
 * - Aggiorna il ring buffer in memoria + localStorage (max 500 eventi).
 * - Emette `scelta_audit_log_added` per l'aggiornamento reattivo della UI.
 * - Accoda l'evento nell'outbox persistente e avvia l'invio batch a
 *   `/api/admin/audit-log`, con retry automatici finché il cloud non conferma.
 */
export function logAdminActivity(
  entry: Omit<AdminActivityLogItem, "id" | "timestamp">
): AdminActivityLogItem {
  const item: AdminActivityLogItem = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    operator: isNonEmptyString(entry.operator) ? entry.operator.trim() : getAuditOperator(),
    device: isNonEmptyString(entry.device) ? entry.device.trim() : getAuditDevice(),
    details: safeDetails(entry.details),
  };

  try {
    memoryLogs = mergeAuditLogs(memoryLogs, [item, ...readStoredLogs()]).slice(
      0,
      MAX_LOCAL_AUDIT_LOGS
    );
    writeStoredLogs(memoryLogs);
    emitAuditLogAdded(item);
    // Accoda l'evento e tenta subito l'invio: la coda persiste finché il cloud non conferma.
    enqueueOutboxItem(item);
    startAuditOutboxAutoFlush();
    void flushAuditOutbox();
  } catch (err) {
    // Il registro non deve MAI interrompere una vendita o un salvataggio.
    console.warn("[Scelta Makeup · Audit] Registrazione evento non riuscita:", err);
  }

  return item;
}

// ------------------------------------------------------------------------------
// Telemetria errori (Scatola Nera automatica)
// ------------------------------------------------------------------------------

interface NormalizedErrorInfo {
  name: string;
  message: string;
  stack?: string;
}

/** Normalizza qualunque valore lanciato (`Error`, stringa, oggetto, unknown) in dati serializzabili. */
function normalizeErrorInfo(error: unknown): NormalizedErrorInfo {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Errore sconosciuto",
      stack: error.stack,
    };
  }
  if (isNonEmptyString(error)) {
    return { name: "Error", message: error.trim().slice(0, 2000) };
  }
  if (error && typeof error === "object") {
    const raw = error as { name?: unknown; message?: unknown; stack?: unknown };
    let fallback = "Errore sconosciuto";
    try {
      fallback = JSON.stringify(error) ?? fallback;
    } catch {
      // Struttura circolare o non serializzabile: si mantiene il fallback.
    }
    return {
      name: isNonEmptyString(raw.name) ? raw.name : "Error",
      message: isNonEmptyString(raw.message) ? raw.message : fallback.slice(0, 2000),
      stack: isNonEmptyString(raw.stack) ? raw.stack : undefined,
    };
  }
  if (error === undefined || error === null) return { name: "Error", message: "Errore sconosciuto" };
  return { name: "Error", message: String(error) };
}

/**
 * Registra un errore/anomalia nella Scatola Nera con tutti i dettagli diagnostici
 * utili a Mario per intervenire in remoto PRIMA che la cliente segnali il problema:
 * messaggio, nome, stack trace, URL della pagina, userAgent e metadati extra.
 *
 * Restituisce la voce creata (già persistita in locale e inviata al cloud).
 */
export function logAdminError(params: {
  action: string;
  title: string;
  description: string;
  error?: unknown;
  details?: Record<string, unknown>;
}): AdminActivityLogItem {
  const info = normalizeErrorInfo(params.error);
  const pageUrl = isBrowser() ? window.location.href : undefined;
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined;

  return logAdminActivity({
    category: "errore",
    level: "error",
    action: params.action,
    title: params.title,
    description: params.description,
    details: {
      ...(params.details ?? {}),
      errorName: info.name,
      errorMessage: info.message,
      stack: info.stack,
      pageUrl,
      userAgent,
    },
  });
}

/**
 * Aggancia la telemetria globale del browser: cattura ogni eccezione runtime non
 * gestita (`window.onerror`) e ogni Promise rifiutata senza `.catch`
 * (`unhandledrejection`) e la spedisce alla Scatola Nera.
 *
 * Una mappa di deduplicazione evita di registrare lo stesso errore più di una
 * volta ogni 10 secondi (es. errori che si ripetono a ogni render o polling),
 * così la timeline di Mario resta leggibile e non viene inondata di duplicati.
 *
 * Ritorna la funzione di cleanup da invocare allo smontaggio del componente.
 */
export function setupGlobalErrorTelemetry(): () => void {
  if (!isBrowser()) return () => {};

  const DEDUP_WINDOW_MS = 10_000;
  const recentKeys = new Map<string, number>();

  const shouldReport = (key: string): boolean => {
    const now = Date.now();
    for (const [existingKey, at] of recentKeys) {
      if (now - at >= DEDUP_WINDOW_MS) recentKeys.delete(existingKey);
    }
    const last = recentKeys.get(key);
    if (last !== undefined && now - last < DEDUP_WINDOW_MS) return false;
    recentKeys.set(key, now);
    return true;
  };

  const handleWindowError = (event: ErrorEvent) => {
    const thrown: unknown = event.error ?? event.message;
    const info = normalizeErrorInfo(thrown);
    const location = event.filename
      ? `${event.filename}:${event.lineno ?? 0}:${event.colno ?? 0}`
      : "";
    const key = `error:${info.name}:${info.message}:${location}`;
    if (!shouldReport(key)) return;

    logAdminError({
      action: "window_unhandled_error",
      title: "Anomalia JavaScript Rilevata",
      description: `${info.name}: ${info.message}${location ? ` — origine ${location}` : ""}`,
      error: thrown,
      details: {
        source: "window.error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const info = normalizeErrorInfo(event.reason);
    const key = `unhandledrejection:${info.name}:${info.message}`;
    if (!shouldReport(key)) return;

    logAdminError({
      action: "window_unhandled_rejection",
      title: "Promise Non Gestita Rilevata",
      description: `${info.name}: ${info.message}`,
      error: event.reason,
      details: { source: "window.unhandledrejection" },
    });
  };

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    recentKeys.clear();
  };
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