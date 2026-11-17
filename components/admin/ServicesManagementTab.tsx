"use client";

/**
 * Scelta Makeup — Cockpit Admin / Gestione Pacchetti
 * Module: components/admin/ServicesManagementTab.tsx
 *
 * Vetrina di controllo dei pacchetti make-up e dei trattamenti in cabina.
 * Ogni modifica viene persistita in locale, propagata via evento custom,
 * BroadcastChannel e sincronizzata con il cloud tramite la API services.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brush,
  CalendarClock,
  Check,
  CircleCheck,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import ServiceEditorModal from "./ServiceEditorModal";
import {
  SERVICES_STORAGE_KEY,
  SERVICES_SYNC_EVENT,
  applyServicePricing,
  deleteClientService,
  getClientServices,
  isCustomService,
  type SaveClientServiceResult,
  toggleClientServiceActive,
  useServicesSync,
  type ClientService,
} from "@/lib/servicesStore";

type ServiceFilter = "all" | "makeup" | "beauty" | "active";

type Feedback = {
  tone: "success" | "error" | "info";
  message: string;
};

const FILTERS: Array<{ value: ServiceFilter; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "makeup", label: "Make-up Salone" },
  { value: "beauty", label: "Cabina Estetica" },
  { value: "active", label: "Solo Attivi" },
];

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function formatEuro(value: number): string {
  return euroFormatter.format(Number.isFinite(value) ? value : 0);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function channelLabel(channel: ClientService["channel"]): string {
  return channel === "makeup" ? "Postazione Salone" : "Cabina Estetica";
}

function channelIcon(channel: ClientService["channel"]): React.ReactNode {
  return channel === "makeup" ? <Brush size={12} /> : <Sparkles size={12} />;
}

/** Riconosce i pacchetti stagionali per mostrare il badge dedicato. */
function seasonalBadge(service: ClientService): string | null {
  const haystack = `${service.name} ${service.description} ${service.recommendedFor}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (haystack.includes("halloween")) return "Special Halloween";
  if (
    haystack.includes("natale") ||
    haystack.includes("festiv") ||
    haystack.includes("capodanno") ||
    haystack.includes("befana")
  ) {
    return "Edizione Festività";
  }
  if (haystack.includes("san valentino")) return "San Valentino";
  if (haystack.includes("estate") || haystack.includes("summer")) {
    return "Summer Edition";
  }
  return null;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E1788]/40 focus-visible:ring-offset-2 ${
        checked ? "bg-[#5E1788]" : "bg-[#1F1B24]/20"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8C2E7]/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1F1B24]/50">
          {label}
        </p>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#5E1788]/8 text-[#5E1788]">
          {icon}
        </span>
      </div>
      <p className="mt-2 font-serif text-2xl leading-none text-[#1F1B24]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#1F1B24]/45">{hint}</p>
    </div>
  );
}

export default function ServicesManagementTab() {
  const { isSyncing, lastSyncedAt, cloudAvailable, syncNow } = useServicesSync();

  const [services, setServices] = useState<ClientService[]>(() =>
    getClientServices()
  );
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClientService | null>(
    null
  );
  const [pendingDelete, setPendingDelete] = useState<ClientService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Aggiornamento a 0 ms: evento custom intra-scheda, storage cross-tab e focus.
  useEffect(() => {
    const handleLocalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ services?: ClientService[] }>)
        .detail;
      if (detail?.services) {
        setServices(detail.services.map(applyServicePricing));
      } else {
        setServices(getClientServices());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SERVICES_STORAGE_KEY) {
        setServices(getClientServices());
      }
    };

    const handleFocus = () => {
      setServices(getClientServices());
    };

    window.addEventListener(SERVICES_SYNC_EVENT, handleLocalUpdate);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(SERVICES_SYNC_EVENT, handleLocalUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const stats = useMemo(() => {
    const activeServices = services.filter((service) => service.active);
    const makeupCount = activeServices.filter(
      (service) => service.channel === "makeup"
    ).length;
    const beautyCount = activeServices.filter(
      (service) => service.channel === "beauty"
    ).length;
    const averageList = average(activeServices.map((service) => service.priceList));
    const averageDiscount = average(
      activeServices.map((service) => service.discountOnline)
    );
    const averageDiscountPercent =
      averageList > 0 ? (averageDiscount / averageList) * 100 : 0;

    return {
      activeCount: activeServices.length,
      totalCount: services.length,
      makeupCount,
      beautyCount,
      averageList,
      averageDiscount,
      averageDiscountPercent,
    };
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services
      .filter((service) => {
        if (filter === "active" && !service.active) return false;
        if (
          (filter === "makeup" || filter === "beauty") &&
          service.channel !== filter
        ) {
          return false;
        }
        if (!query) return true;

        const haystack = [
          service.name,
          service.description,
          service.recommendedFor,
          channelLabel(service.channel),
          ...service.benefits,
          ...service.includes,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          a.name.localeCompare(b.name, "it")
      );
  }, [filter, searchQuery, services]);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncedAt) return "Mai sincronizzato";
    return new Date(lastSyncedAt).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSyncedAt]);

  const cloudLabel = isSyncing
    ? "Sincronizzazione in corso"
    : cloudAvailable
      ? "Sincronizzato col Cloud Supabase"
      : lastSyncedAt
        ? "Cloud non raggiungibile"
        : "Cloud in attesa";

  const openNewService = () => {
    setEditingService(null);
    setIsEditorOpen(true);
  };

  const openServiceEditor = (service: ClientService) => {
    setEditingService(service);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingService(null);
  };

  const handleSaveService = (result: SaveClientServiceResult) => {
    setServices(getClientServices());

    if (!result.success) {
      setFeedback({
        tone: "error",
        message: result.error ?? "Salvataggio non riuscito. Riprova.",
      });
      return;
    }

    setIsEditorOpen(false);
    setEditingService(null);
    setFeedback({
      tone: "success",
      message: result.cloudSynced
        ? `"${result.service.name}" salvato e sincronizzato con il cloud.`
        : `"${result.service.name}" salvato in locale: sincronizzazione cloud in attesa.`,
    });
  };

  const handleToggleService = async (service: ClientService) => {
    if (busyServiceId) return;

    const nextActive = !service.active;
    setBusyServiceId(service.id);
    setServices((current) =>
      current.map((item) =>
        item.id === service.id
          ? applyServicePricing({ ...item, active: nextActive })
          : item
      )
    );

    const updated = await toggleClientServiceActive(service.id, nextActive);
    setBusyServiceId(null);
    setServices(getClientServices());

    if (!updated) {
      setFeedback({
        tone: "error",
        message: `Impossibile aggiornare "${service.name}". Riprova.`,
      });
      return;
    }

    setFeedback({
      tone: "success",
      message: nextActive
        ? `"${service.name}" pubblicato su /prenota.`
        : `"${service.name}" nascosto dalla vetrina web.`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeleting) return;

    setIsDeleting(true);
    const deleted = await deleteClientService(pendingDelete.id);
    setIsDeleting(false);
    setPendingDelete(null);

    if (!deleted) {
      setFeedback({
        tone: "error",
        message: "Eliminazione non consentita: il pacchetto è di catalogo.",
      });
      return;
    }

    setServices(getClientServices());
    setFeedback({
      tone: "success",
      message: "Pacchetto personalizzato eliminato dalla vetrina.",
    });
  };

  const handleCloudSync = async () => {
    await syncNow();
    setServices(getClientServices());
    setFeedback({
      tone: "info",
      message: "Sincronizzazione cloud completata.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner superiore */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] p-5 text-white shadow-xl shadow-[#5E1788]/20 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
              <Sparkles size={12} />
              Gestione Vetrina Web (/prenota &amp; /servizi)
            </span>

            <h1 className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">
              Pacchetti Make-Up &amp; Servizi Prenotabili
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Modifica in tempo reale i pacchetti make-up visibili dalle clienti
              sul sito web. Ogni modifica è sincronizzata istantaneamente con il
              cloud Supabase e visibile su tutti i dispositivi.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    cloudAvailable ? "bg-white" : "bg-[#D462A6]"
                  }`}
                />
                {cloudLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} /> Ultimo sync: {lastSyncLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={isSyncing ? "animate-spin" : undefined}
              />
              {isSyncing ? "Sincronizzo..." : "Sincronizza Cloud"}
            </button>

            <button
              type="button"
              onClick={openNewService}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#5E1788] shadow-lg shadow-black/10 transition hover:bg-[#FAF7FC]"
            >
              <Plus size={16} /> Nuovo Pacchetto
            </button>
          </div>
        </div>
      </section>

      {/* Riga KPI */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Eye size={15} />}
          label="Pacchetti attivi web"
          value={String(stats.activeCount)}
          hint={`${stats.totalCount} pacchetti totali in archivio`}
        />
        <KpiCard
          icon={<Brush size={15} />}
          label="Postazione Salone (Federica) vs Cabina"
          value={`${stats.makeupCount} / ${stats.beautyCount}`}
          hint="Pacchetti attivi per canale"
        />
        <KpiCard
          icon={<Tag size={15} />}
          label="Prezzo medio listino"
          value={formatEuro(stats.averageList)}
          hint="Media dei pacchetti attivi"
        />
        <KpiCard
          icon={<Percent size={15} />}
          label="Sconto medio web"
          value={`${stats.averageDiscountPercent.toFixed(1).replace(".", ",")}%`}
          hint={`≈ ${formatEuro(stats.averageDiscount)} di sconto medio`}
        />
      </section>

      {/* Ricerca e filtri */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#D8C2E7]/70 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7A3293]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cerca un pacchetto, un vantaggio, un canale..."
            aria-label="Cerca pacchetti"
            className="w-full rounded-xl border border-[#D8C2E7] bg-[#FAF7FC] py-2.5 pl-9 pr-3 text-sm text-[#1F1B24] outline-none transition placeholder:text-[#1F1B24]/35 focus:border-[#5E1788] focus:ring-2 focus:ring-[#5E1788]/15"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => {
            const selected = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "border-[#5E1788] bg-[#5E1788] text-white"
                    : "border-[#D8C2E7] bg-white text-[#1F1B24]/60 hover:border-[#7A3293]/60 hover:text-[#5E1788]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Griglia servizi */}
      {filteredServices.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#D8C2E7] bg-white px-6 py-14 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5E1788]/8 text-[#5E1788]">
            <Sparkles size={20} />
          </span>
          <h2 className="mt-3 font-serif text-lg text-[#1F1B24]">
            Nessun pacchetto trovato
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#1F1B24]/50">
            Modifica i filtri o la ricerca, oppure crea un nuovo pacchetto da
            pubblicare sulla vetrina di prenotazione.
          </p>
          <button
            type="button"
            onClick={openNewService}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5E1788]/20"
          >
            <Plus size={16} /> Nuovo Pacchetto
          </button>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              busy={busyServiceId === service.id}
              onEdit={() => openServiceEditor(service)}
              onToggle={() => handleToggleService(service)}
              onDelete={() => setPendingDelete(service)}
            />
          ))}
        </section>
      )}

      {/* Editor */}
      <ServiceEditorModal
        isOpen={isEditorOpen}
        service={editingService}
        onClose={closeEditor}
        onSaved={handleSaveService}
      />

      {/* Conferma eliminazione */}
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-[#1F1B24]/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-service-title"
            className="w-full max-w-md rounded-3xl border border-[#D8C2E7]/70 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D462A6]/12 text-[#D462A6]">
                <Trash2 size={18} />
              </span>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                aria-label="Annulla eliminazione"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8C2E7] text-[#1F1B24]/50 transition hover:text-[#D462A6] disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>

            <h3
              id="delete-service-title"
              className="mt-3 font-serif text-xl text-[#1F1B24]"
            >
              Eliminare questo pacchetto?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[#1F1B24]/55">
              <strong className="text-[#1F1B24]">{pendingDelete.name}</strong>{" "}
              verrà rimosso dalla vetrina e non sarà più prenotabile online.
              L&apos;operazione non può essere annullata.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-xl border border-[#D8C2E7] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F1B24]/70 transition hover:text-[#5E1788] disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D462A6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#D462A6]/20 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Elimino...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Elimina definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast di feedback */}
      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[140] flex max-w-sm items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-xl ${
            feedback.tone === "success"
              ? "border-[#5E1788]/20 bg-white text-[#1F1B24]"
              : feedback.tone === "error"
                ? "border-[#D462A6]/40 bg-white text-[#1F1B24]"
                : "border-[#7A3293]/25 bg-white text-[#1F1B24]"
          }`}
        >
          <span
            className={`mt-0.5 shrink-0 ${
              feedback.tone === "success"
                ? "text-[#5E1788]"
                : feedback.tone === "error"
                  ? "text-[#D462A6]"
                  : "text-[#7A3293]"
            }`}
          >
            {feedback.tone === "success" ? (
              <CircleCheck size={16} />
            ) : feedback.tone === "error" ? (
              <AlertTriangle size={16} />
            ) : (
              <Info size={16} />
            )}
          </span>
          <p className="leading-snug">{feedback.message}</p>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Chiudi messaggio"
            className="ml-1 shrink-0 text-[#1F1B24]/35 transition hover:text-[#1F1B24]/70"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ServiceCard({
  service,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: ClientService;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const badge = seasonalBadge(service);
  const previewBenefits = service.benefits.slice(0, 3);
  const previewIncludes = service.includes.slice(0, 2);

  return (
    <article
      className={`flex flex-col rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        service.active
          ? "border-[#D8C2E7]/70"
          : "border-[#D8C2E7]/40 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              service.channel === "makeup"
                ? "bg-[#5E1788]/10 text-[#5E1788]"
                : "bg-[#D462A6]/12 text-[#7A3293]"
            }`}
          >
            {channelIcon(service.channel)}
            {channelLabel(service.channel)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF7FC] px-2 py-0.5 text-[10px] font-medium text-[#1F1B24]/55">
            <Clock size={11} />
            {service.durationMinutes} min
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1F1B24]/40">
            {service.active ? "Attivo" : "Disattivato"}
          </span>
          <ToggleSwitch
            checked={service.active}
            onChange={onToggle}
            label={`Visibilità web di ${service.name}`}
            disabled={busy}
          />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2">
        <h3 className="flex-1 font-serif text-lg leading-snug text-[#1F1B24]">
          {service.name}
        </h3>
        {badge ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#D462A6] to-[#7A3293] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            <Sparkles size={10} /> {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#1F1B24]/55">
        {service.description || "Nessuna descrizione inserita."}
      </p>

      {/* Box finanziario trasparente */}
      <div className="mt-3 rounded-2xl border border-[#D8C2E7]/60 bg-[#FAF7FC] p-2.5">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl bg-white px-1 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#1F1B24]/40">
              Listino
            </p>
            <p className="mt-0.5 text-sm font-bold text-[#1F1B24] line-through decoration-[#D462A6]/60">
              {formatEuro(service.priceList)}
            </p>
          </div>
          <div className="rounded-xl bg-white px-1 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#1F1B24]/40">
              Sconto Web
            </p>
            <p className="mt-0.5 text-sm font-bold text-[#D462A6]">
              −{formatEuro(service.discountOnline)}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-[#5E1788] to-[#7A3293] px-1 py-1.5 text-white">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Prezzo Online
            </p>
            <p className="mt-0.5 text-sm font-bold">
              {formatEuro(service.priceOnline)}
            </p>
          </div>
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-dashed border-[#D8C2E7] pt-1.5 text-[10px]">
          <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1">
            <CreditCard size={12} className="shrink-0 text-[#7A3293]" />
            <span className="flex flex-col leading-tight text-[#1F1B24]/55">
              <span>Acconto online 20%</span>
              <span className="text-[9px] text-[#1F1B24]/40">carta / Apple Pay</span>
            </span>
            <strong className="ml-auto text-[#1F1B24]">
              {formatEuro(service.depositAmount)}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1">
            <Store size={12} className="shrink-0 text-[#7A3293]" />
            <span className="flex flex-col leading-tight text-[#1F1B24]/55">
              <span>Saldo Salone 80%</span>
              <span className="text-[9px] text-[#1F1B24]/40">POS/contanti · cassa RT</span>
            </span>
            <strong className="ml-auto text-[#1F1B24]">
              {formatEuro(service.balanceAmount)}
            </strong>
          </div>
        </div>
      </div>

      {/* Vantaggi e punti di forza */}
      <div className="mt-3 flex-1">
        {previewBenefits.length > 0 ? (
          <ul className="space-y-1">
            {previewBenefits.map((benefit, index) => (
              <li
                key={`${service.id}-benefit-${index}`}
                className="flex items-start gap-1.5 text-[11px] leading-snug text-[#1F1B24]/65"
              >
                <Check
                  size={12}
                  className="mt-0.5 shrink-0 text-[#7A3293]"
                  strokeWidth={3}
                />
                <span className="line-clamp-1">{benefit}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {previewIncludes.length > 0 ? (
          <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-snug text-[#1F1B24]/40">
            <CalendarClock size={11} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">
              Include: {previewIncludes.join(" · ")}
              {service.includes.length > previewIncludes.length
                ? " · …"
                : ""}
            </span>
          </p>
        ) : null}

        {service.recommendedFor ? (
          <p className="mt-1.5 line-clamp-1 text-[10px] italic text-[#7A3293]/70">
            Ideale per: {service.recommendedFor}
          </p>
        ) : null}
      </div>

      {/* Azioni */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-[#D8C2E7]/50 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5E1788] px-2.5 py-2 text-[11px] font-semibold text-white transition hover:brightness-110"
        >
          <Pencil size={12} /> Modifica
        </button>

        <a
          href={`/prenota?servizio=${encodeURIComponent(service.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#D8C2E7] bg-white px-2.5 py-2 text-[11px] font-semibold text-[#5E1788] transition hover:border-[#7A3293]/60 hover:bg-[#FAF7FC]"
        >
          <ExternalLink size={12} /> Anteprima /prenota
        </a>

        {isCustomService(service) ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Elimina ${service.name}`}
            title="Elimina pacchetto"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D462A6]/30 bg-[#D462A6]/10 text-[#D462A6] transition hover:bg-[#D462A6]/20"
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <span
            title="Pacchetto di catalogo: non eliminabile"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D8C2E7]/60 text-[#1F1B24]/25"
          >
            <EyeOff size={13} />
          </span>
        )}
      </div>
    </article>
  );
}
