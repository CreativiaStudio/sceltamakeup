"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Barcode,
  ChevronDown,
  Clock,
  Database,
  DollarSign,
  Download,
  Eye,
  FileEdit,
  Filter,
  History,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import {
  ACTIVITY_CATEGORIES,
  AUDIT_LOG_EVENT_NAME,
  clearAdminActivityLogs,
  fetchCloudActivityLogs,
  getAdminActivityLogs,
  type ActivityCategory,
  type AdminActivityLogItem,
} from "@/lib/auditLogger";

// ------------------------------------------------------------------------------
// Metadati categoria (label, icona, colori badge/icona)
// ------------------------------------------------------------------------------

interface CategoryMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  activeClass: string;
  iconWrapClass: string;
}

const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  cassa_rt: {
    label: "Cassa & Scontrini RT",
    icon: Receipt,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
    iconWrapClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  prezzo: {
    label: "Variazione Prezzi",
    icon: DollarSign,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100",
    activeClass: "bg-amber-500 text-white border-amber-500 shadow-sm",
    iconWrapClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  giacenza: {
    label: "Movimenti Giacenze",
    icon: Package,
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100",
    activeClass: "bg-blue-600 text-white border-blue-600 shadow-sm",
    iconWrapClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  barcode: {
    label: "Scansioni Barcode",
    icon: Barcode,
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
    activeClass: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
    iconWrapClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  prodotto: {
    label: "Schede Prodotto",
    icon: FileEdit,
    badgeClass: "bg-violet-50 text-violet-800 border-violet-300 hover:bg-violet-100",
    activeClass: "bg-violet-600 text-white border-violet-600 shadow-sm",
    iconWrapClass: "bg-violet-100 text-violet-700 border-violet-200",
  },
  canale: {
    label: "Canale Vendita",
    icon: Eye,
    badgeClass: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-300 hover:bg-fuchsia-100",
    activeClass: "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm",
    iconWrapClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  },
  sistema: {
    label: "Sistema & Ripristini",
    icon: AlertTriangle,
    badgeClass: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100",
    activeClass: "bg-rose-600 text-white border-rose-600 shadow-sm",
    iconWrapClass: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

type CategoryFilter = "all" | ActivityCategory;
type TimeFilter = "all" | "today" | "yesterday" | "last7";

const TIME_FILTERS: Array<{ id: TimeFilter; label: string }> = [
  { id: "all", label: "Tutti" },
  { id: "today", label: "Oggi" },
  { id: "yesterday", label: "Ieri" },
  { id: "last7", label: "Ultimi 7 giorni" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------------------
// Helpers di formattazione
// ------------------------------------------------------------------------------

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(iso: string, now: number): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "adesso";
  if (minutes < 60) return minutes === 1 ? "1 min fa" : `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 ora fa" : `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ieri";
  if (days < 30) return `${days} giorni fa`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 mese fa" : `${months} mesi fa`;
  return formatDay(iso);
}

function isRemoteOperator(operator?: string): boolean {
  return /admin/i.test(operator || "");
}

function buildSearchHaystack(item: AdminActivityLogItem): string {
  return [
    item.title,
    item.description,
    item.operator,
    item.device,
    item.action,
    CATEGORY_META[item.category]?.label,
    item.details ? JSON.stringify(item.details) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ------------------------------------------------------------------------------
// Card evento espandibile
// ------------------------------------------------------------------------------

function ActivityEventCard({
  item,
  expanded,
  onToggle,
  now,
}: {
  item: AdminActivityLogItem;
  expanded: boolean;
  onToggle: () => void;
  now: number;
}) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.sistema;
  const Icon = meta.icon;
  const remote = isRemoteOperator(item.operator);
  const today = startOfDay(new Date()) === startOfDay(new Date(item.timestamp));

  return (
    <article className="rounded-2xl border border-[#EFE6F5] bg-white hover:border-[#D8C2E7] transition-colors shadow-2xs overflow-hidden">
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        {/* Icona categoria */}
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.iconWrapClass}`}
        >
          <Icon className="w-4 h-4" />
        </div>

        {/* Contenuto */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#5E1788]">
              <Clock className="w-3 h-3 text-[#D462A6]" />
              {formatClock(item.timestamp)}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {today ? formatRelative(item.timestamp, now) : `${formatDay(item.timestamp)} · ${formatRelative(item.timestamp, now)}`}
            </span>
            <span
              className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-bold ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
          </div>

          <h4 className="text-sm font-bold text-[#1F1B24] mt-1.5 leading-snug">{item.title}</h4>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed break-words">{item.description}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                remote
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-[#5E1788]/10 text-[#5E1788] border-[#5E1788]/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${remote ? "bg-indigo-500" : "bg-[#5E1788]"}`} />
              {item.operator || "Banco Salone (Federica)"}
            </span>
            {item.device && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                <Database className="w-2.5 h-2.5" />
                {item.device}
              </span>
            )}
          </div>
        </div>

        {/* Espansione dettagli */}
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#5E1788] hover:bg-[#5E1788]/10 transition-colors cursor-pointer"
          title={expanded ? "Nascondi metadati" : "Mostra dettagli JSON"}
          aria-expanded={expanded}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#F5EFF9] bg-[#FAF7FC] px-4 py-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-600">
            <span>
              <span className="font-semibold text-gray-500">ID evento:</span>{" "}
              <span className="font-mono break-all">{item.id}</span>
            </span>
            <span>
              <span className="font-semibold text-gray-500">Azione:</span>{" "}
              <span className="font-mono">{item.action}</span>
            </span>
            <span>
              <span className="font-semibold text-gray-500">Timestamp ISO:</span>{" "}
              <span className="font-mono">{item.timestamp}</span>
            </span>
            <span>
              <span className="font-semibold text-gray-500">Categoria:</span>{" "}
              <span className="font-mono">{item.category}</span>
            </span>
          </div>

          {item.details && Object.keys(item.details).length > 0 && (
            <pre className="mt-1 p-3 rounded-xl bg-white border border-[#EFE6F5] text-[10px] text-gray-600 whitespace-pre-wrap break-words overflow-x-auto max-h-64">
              {JSON.stringify(item.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </article>
  );
}

// ------------------------------------------------------------------------------
// Tab principale
// ------------------------------------------------------------------------------

export default function ActivityLogTab() {
  const [logs, setLogs] = useState<AdminActivityLogItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Illustrazione live: aggiorna i tempi relativi ("2 min fa") ogni minuto.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const refreshFromCloud = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setIsSyncing(true);
    try {
      const merged = await fetchCloudActivityLogs();
      setLogs(merged);
      setLastSyncAt(Date.now());
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setSyncError(offline ? "Offline: mostro la copia locale, il cloud si aggiornerà automaticamente." : null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sincronizzazione non riuscita.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Idratazione dal ring buffer locale + sottoscrizione agli aggiornamenti
  // istantanei (stessa tab via evento custom, altre tab via `storage`).
  useEffect(() => {
    const sync = () => setLogs(getAdminActivityLogs());
    sync();

    window.addEventListener(AUDIT_LOG_EVENT_NAME, sync);
    window.addEventListener("storage", sync);

    // Prima sincronizzazione cloud differita al tick successivo: idrata subito
    // la timeline locale e poi arricchisce con la storia remota senza cascading render.
    const initialSyncTimer = window.setTimeout(() => void refreshFromCloud(true), 0);

    return () => {
      window.clearTimeout(initialSyncTimer);
      window.removeEventListener(AUDIT_LOG_EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [refreshFromCloud]);

  // Auto-aggiornamento discreto: solo quando la tab è visibile (nessun traffico in background).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshFromCloud(false);
    }, 45000);
    return () => window.clearInterval(id);
  }, [refreshFromCloud]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ActivityCategory, number> = {
      cassa_rt: 0,
      prezzo: 0,
      giacenza: 0,
      barcode: 0,
      prodotto: 0,
      canale: 0,
      sistema: 0,
    };
    for (const item of logs) counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const todayStart = startOfDay(new Date());

    return logs.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      if (timeFilter !== "all") {
        const time = new Date(item.timestamp).getTime();
        if (Number.isNaN(time)) return false;
        if (timeFilter === "today" && time < todayStart) return false;
        if (timeFilter === "yesterday" && (time < todayStart - DAY_MS || time >= todayStart)) return false;
        if (timeFilter === "last7" && time < todayStart - 6 * DAY_MS) return false;
      }

      if (needle && !buildSearchHaystack(item).includes(needle)) return false;
      return true;
    });
  }, [logs, categoryFilter, timeFilter, query]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const rows = filteredLogs.length > 0 ? filteredLogs : logs;
    if (rows.length === 0) return;

    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

    const header = [
      "ID",
      "Data e Ora",
      "Categoria",
      "Azione",
      "Titolo",
      "Descrizione",
      "Operatore",
      "Dispositivo",
      "Dettagli JSON",
    ];

    const lines = [header.map(escapeCsv).join(";")];
    for (const item of rows) {
      lines.push(
        [
          item.id,
          new Date(item.timestamp).toLocaleString("it-IT"),
          CATEGORY_META[item.category]?.label ?? item.category,
          item.action,
          item.title,
          item.description,
          item.operator ?? "",
          item.device ?? "",
          item.details ? JSON.stringify(item.details) : "",
        ]
          .map(escapeCsv)
          .join(";")
      );
    }

    // BOM UTF-8: Excel italiano apre correttamente accenti ed euro con il punto e virgola.
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registro-attivita-scelta-makeup-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, [filteredLogs, logs]);

  const handleClearLocalCache = useCallback(() => {
    const confirmed = window.confirm(
      "Manutenzione registro locale:\n\nSvuotare SOLO la cache di questo browser? " +
        "La timeline cloud nel gestionale resta intatta e verrà riscaricata alla prossima sincronizzazione."
    );
    if (!confirmed) return;
    clearAdminActivityLogs();
  }, []);

  return (
    <div className="space-y-5">
      {/* ============================ HEADER ============================ */}
      <section className="rounded-3xl border border-[#D8C2E7]/60 bg-white shadow-2xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#1F1B24] via-[#352542] to-[#5E1788] px-5 sm:px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-[#D462A6]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                Registro Attività &amp; Cassa
                <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D462A6]/30 border border-[#D462A6]/40 text-[#F3E7F8]">
                  Scatola Nera
                </span>
              </h2>
              <p className="text-[11px] text-[#D8C2E7]/90 mt-0.5">
                Timeline immutabile di ogni operazione al banco e nel catalogo — offline-first + cloud Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xl font-bold leading-none">{logs.length}</span>
              <span className="text-[10px] uppercase tracking-wider text-[#D8C2E7]/80">
                eventi totali
              </span>
            </div>

            <button
              type="button"
              onClick={() => void refreshFromCloud(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#5E1788] text-xs font-bold shadow-sm hover:bg-[#F3E7F8] transition-colors disabled:opacity-70 disabled:cursor-wait cursor-pointer"
              title="Risincronizza la timeline dal cloud senza ricaricare la pagina"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Aggiorna Live</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D462A6]/90 hover:bg-[#D462A6] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Esporta gli eventi filtrati in un file CSV per archivio e reportistica"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Esporta CSV</span>
            </button>
          </div>
        </div>

        {/* Barra di stato sincronizzazione */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#FAF7FC] border-t border-[#EFE6F5] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-gray-500">
            <Database className="w-3.5 h-3.5 text-[#5E1788]" />
            <span>
              Persistenza locale + cloud Supabase / Creativia Hub <span className="text-gray-400">(max 1000 eventi)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {syncError ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <WifiOff className="w-3.5 h-3.5" />
                {syncError}
              </span>
            ) : lastSyncAt ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud sincronizzato alle {formatClock(new Date(lastSyncAt).toISOString())}
              </span>
            ) : (
              <span className="text-gray-400">In attesa di sincronizzazione…</span>
            )}
            <button
              type="button"
              onClick={handleClearLocalCache}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Manutenzione: svuota solo la cache locale di questo browser (il cloud resta intatto)"
            >
              <Trash2 className="w-3 h-3" />
              Pulisci cache locale
            </button>
          </div>
        </div>
      </section>

      {/* ============================ FILTRI ============================ */}
      <section className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome prodotto, codice a barre, importo (€) o operatore..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1F1B24] bg-[#FAF7FC] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/20 focus:border-[#5E1788] transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                aria-label="Pulisci ricerca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7FC] p-1 rounded-xl border border-[#E8DEF8] self-start">
            {TIME_FILTERS.map((option) => {
              const active = timeFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTimeFilter(option.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[#5E1788] text-white shadow-sm"
                      : "text-gray-600 hover:text-[#5E1788] hover:bg-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Categoria
          </span>

          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
              categoryFilter === "all"
                ? "bg-[#5E1788] text-white border-[#5E1788] shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Tutti
            <span
              className={`text-[10px] px-1.5 rounded-full ${
                categoryFilter === "all" ? "bg-white/20" : "bg-gray-100 text-gray-500"
              }`}
            >
              {logs.length}
            </span>
          </button>

          {ACTIVITY_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            const active = categoryFilter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                  active ? meta.activeClass : meta.badgeClass
                }`}
              >
                <Icon className="w-3 h-3" />
                {meta.label}
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    active ? "bg-white/25" : "bg-white/70 text-gray-500"
                  }`}
                >
                  {categoryCounts[category]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================ TIMELINE ============================ */}
      <section className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5E1788]">
            Timeline operazioni
          </h3>
          <span className="text-[11px] text-gray-500 font-medium">
            {filteredLogs.length} di {logs.length} eventi
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF7FC] border border-[#EFE6F5] flex items-center justify-center text-[#5E1788] mb-3">
              <History className="w-7 h-7 opacity-60" />
            </div>
            <h4 className="font-serif text-base font-bold text-[#1F1B24]">
              Nessun evento registrato
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm leading-relaxed">
              {logs.length === 0
                ? "La scatola nera è pronta: ogni scansione barcode, modifica prezzo, rettifica giacenza, scontrino RT o cambio canale comparirà qui (e nel cloud) in tempo reale."
                : "Nessun evento corrisponde ai filtri selezionati. Prova ad ampliare la ricerca o a cambiare categoria/periodo."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLogs.map((item) => (
              <ActivityEventCard
                key={item.id}
                item={item}
                expanded={expandedIds.has(item.id)}
                onToggle={() => toggleExpanded(item.id)}
                now={nowTick}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}