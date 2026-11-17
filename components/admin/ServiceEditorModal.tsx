"use client";

/**
 * Scelta Makeup — Cockpit Admin / Editor Pacchetto
 * Module: components/admin/ServiceEditorModal.tsx
 *
 * Editor completo di un pacchetto make-up o di un trattamento in cabina.
 * Ogni cifra inserita viene ricalcolata in tempo reale dal simulatore
 * finanziario: Prezzo Online = Listino − Sconto, Acconto 20%, Saldo 80%.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Percent,
  Plus,
  Save,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { applyServicePricing, saveClientService, type ClientService, type SaveClientServiceResult } from "@/lib/servicesStore";
import type { ServiceChannel } from "@/types/booking";

interface ServiceEditorModalProps {
  isOpen: boolean;
  /** null = nuovo pacchetto. */
  service: ClientService | null;
  onClose: () => void;
  onSaved: (result: SaveClientServiceResult) => void;
}

type DiscountMode = "percent" | "fixed";

const CHANNEL_OPTIONS: Array<{
  value: ServiceChannel;
  label: string;
  hint: string;
}> = [
  {
    value: "makeup",
    label: "Postazione Trucco Salone",
    hint: "Make-up viso e cerimonia in negozio",
  },
  {
    value: "beauty",
    label: "Cabina Estetica",
    hint: "Trattamenti viso e corpo in cabina",
  },
];

const DURATION_PRESETS = [30, 45, 60, 75, 90];
const DISCOUNT_PRESETS = [5, 10, 15, 20];

const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F1B24]/60";
const inputClass =
  "w-full rounded-xl border border-[#D8C2E7] bg-white px-3.5 py-2.5 text-sm text-[#1F1B24] outline-none transition placeholder:text-[#1F1B24]/35 focus:border-[#5E1788] focus:ring-2 focus:ring-[#5E1788]/15";
const chipClass =
  "rounded-full border border-[#D8C2E7] bg-white px-3 py-1 text-xs font-semibold text-[#5E1788] transition hover:border-[#7A3293] hover:bg-[#D8C2E7]/30";
const addButtonClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[#5E1788]/25 bg-[#5E1788]/5 px-3 py-1.5 text-[11px] font-semibold text-[#5E1788] transition hover:bg-[#5E1788]/10";

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function formatEuro(value: number): string {
  return euroFormatter.format(Number.isFinite(value) ? value : 0);
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "pacchetto-salone";
}

function createServiceId(): string {
  const random = Math.random().toString(36).slice(2, 7);
  return `srv-custom-${Date.now().toString(36)}-${random}`;
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

function ListEditor({
  title,
  hint,
  icon,
  items,
  placeholder,
  addLabel,
  onChange,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  items: string[];
  placeholder: string;
  addLabel: string;
  onChange: (next: string[]) => void;
}) {
  const updateRow = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={labelClass}>{title}</p>
          <p className="text-[11px] text-[#1F1B24]/45">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className={addButtonClass}
        >
          <Plus size={13} /> {addLabel}
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <span className="text-[#7A3293]">{icon}</span>
            <input
              type="text"
              value={item}
              onChange={(event) => updateRow(index, event.target.value)}
              placeholder={placeholder}
              className={inputClass}
            />
            <button
              type="button"
              aria-label={`Rimuovi riga ${index + 1} di ${title}`}
              onClick={() => removeRow(index)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D462A6]/30 bg-[#D462A6]/10 text-[#D462A6] transition hover:bg-[#D462A6]/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D8C2E7] bg-white/70 px-3 py-2 text-[11px] text-[#1F1B24]/45">
            Nessuna riga presente: premi &laquo;{addLabel}&raquo; per aggiungerne una.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ServiceEditorModal({
  isOpen,
  service,
  onClose,
  onSaved,
}: ServiceEditorModalProps) {
  if (!isOpen) return null;

  return (
    <ServiceEditorDialog
      key={service?.id ?? "new-service"}
      service={service}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function ServiceEditorDialog({
  service,
  onClose,
  onSaved,
}: {
  service: ClientService | null;
  onClose: () => void;
  onSaved: (result: SaveClientServiceResult) => void;
}) {
  const isEditing = service !== null;

  const [name, setName] = useState(service?.name ?? "");
  const [channel, setChannel] = useState<ServiceChannel>(
    service?.channel ?? "makeup"
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [durationInput, setDurationInput] = useState(
    service ? String(service.durationMinutes) : "45"
  );
  const [priceListInput, setPriceListInput] = useState(
    service ? String(service.priceList) : ""
  );
  const [discountMode, setDiscountMode] = useState<DiscountMode>("fixed");
  const [discountInput, setDiscountInput] = useState(
    service && service.discountOnline > 0 ? String(service.discountOnline) : ""
  );
  const [active, setActive] = useState(service?.active ?? true);
  const [benefits, setBenefits] = useState<string[]>(
    service?.benefits?.length ? [...service.benefits] : [""]
  );
  const [includes, setIncludes] = useState<string[]>(
    service?.includes?.length ? [...service.includes] : [""]
  );
  const [recommendedFor, setRecommendedFor] = useState(
    service?.recommendedFor ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceList = Math.max(0, parseAmount(priceListInput) ?? 0);
  const rawDiscount = parseAmount(discountInput) ?? 0;
  const discountOnline = Math.min(
    Math.max(
      discountMode === "percent" ? (priceList * rawDiscount) / 100 : rawDiscount,
      0
    ),
    priceList
  );
  const durationMinutes = Math.max(
    5,
    Math.round(parseAmount(durationInput) ?? 45)
  );

  const preview = useMemo(
    () =>
      applyServicePricing({
        id: service?.id ?? "preview",
        slug: service?.slug ?? "preview",
        name: name.trim() || "Pacchetto",
        channel,
        description,
        durationMinutes,
        priceList,
        priceOnline: 0,
        discountOnline,
        depositPercent: 0.2,
        depositAmount: 0,
        balanceAmount: 0,
        active,
        image: service?.image ?? "",
        benefits: [],
        includes: [],
        recommendedFor,
        isCustom: service?.isCustom ?? true,
        createdAt: service?.createdAt,
        updatedAt: service?.updatedAt,
      }),
    [
      active,
      channel,
      description,
      discountOnline,
      durationMinutes,
      name,
      priceList,
      recommendedFor,
      service,
    ]
  );

  const discountPercent =
    preview.priceList > 0
      ? (preview.discountOnline / preview.priceList) * 100
      : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSaving, onClose]);

  const handleDiscountModeChange = (next: DiscountMode) => {
    if (next === discountMode) return;

    if (next === "percent") {
      const pct = preview.priceList > 0
        ? (preview.discountOnline / preview.priceList) * 100
        : 0;
      setDiscountInput(pct > 0 ? String(Number(pct.toFixed(1))) : "");
    } else {
      setDiscountInput(
        preview.discountOnline > 0
          ? String(Number(preview.discountOnline.toFixed(2)))
          : ""
      );
    }

    setDiscountMode(next);
  };

  const applyPercentPreset = (percent: number) => {
    setDiscountMode("percent");
    setDiscountInput(String(percent));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Inserisci il titolo del pacchetto.");
      return;
    }

    const parsedPrice = parseAmount(priceListInput);
    if (parsedPrice === null || parsedPrice < 0) {
      setError("Inserisci un prezzo di listino valido (maggiore o uguale a 0 €).");
      return;
    }

    setError(null);
    setIsSaving(true);

    const updatedService: ClientService = applyServicePricing({
      id: service?.id ?? createServiceId(),
      slug: service?.slug ?? slugify(trimmedName),
      name: trimmedName,
      channel,
      description: description.trim(),
      durationMinutes,
      priceList: parsedPrice,
      priceOnline: 0,
      discountOnline,
      depositPercent: 0.2,
      depositAmount: 0,
      balanceAmount: 0,
      active,
      image: service?.image ?? "",
      benefits: benefits.map((item) => item.trim()).filter(Boolean),
      includes: includes.map((item) => item.trim()).filter(Boolean),
      recommendedFor: recommendedFor.trim(),
      isCustom: service?.isCustom ?? true,
      createdAt: service?.createdAt,
      updatedAt: new Date().toISOString(),
    });

    try {
      const result = await saveClientService(updatedService);
      if (!result.success) {
        throw new Error(result.error ?? "Salvataggio non riuscito. Riprova.");
      }
      onSaved(result);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Salvataggio non riuscito. Riprova."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-[#1F1B24]/60 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-editor-title"
        className="relative my-2 w-full max-w-3xl overflow-hidden rounded-3xl border border-[#D8C2E7]/70 bg-[#FAF7FC] shadow-2xl sm:my-6"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#D8C2E7]/70 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5E1788] to-[#7A3293] text-white">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7A3293]">
                {isEditing ? "Modifica pacchetto" : "Nuovo pacchetto"}
              </p>
              <h2
                id="service-editor-title"
                className="font-serif text-xl leading-tight text-[#1F1B24] sm:text-2xl"
              >
                {isEditing ? service.name : "Crea un pacchetto per la vetrina"}
              </h2>
              <p className="mt-0.5 text-[11px] text-[#1F1B24]/50">
                Le modifiche sono pubblicate su /prenota e /servizi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Chiudi editor"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8C2E7] bg-white text-[#1F1B24]/60 transition hover:border-[#D462A6] hover:text-[#D462A6] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </header>

        <div className="max-h-[calc(90vh-9rem)] space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
          <section className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <label htmlFor="service-name" className={labelClass}>
                Titolo / Nome Servizio
              </label>
              <input
                id="service-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Es. Make-up Sposa & Prova"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            <div>
              <span className={labelClass}>Canale di erogazione</span>
              <div className="space-y-2">
                {CHANNEL_OPTIONS.map((option) => {
                  const selected = channel === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setChannel(option.value)}
                      aria-pressed={selected}
                      className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition ${
                        selected
                          ? "border-[#5E1788] bg-[#5E1788]/5 ring-1 ring-[#5E1788]/20"
                          : "border-[#D8C2E7] bg-white hover:border-[#7A3293]/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-[#5E1788] bg-[#5E1788] text-white"
                            : "border-[#D8C2E7] text-transparent"
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span>
                        <span className="block text-xs font-semibold text-[#1F1B24]">
                          {option.label}
                        </span>
                        <span className="block text-[10px] text-[#1F1B24]/45">
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div>
            <label htmlFor="service-description" className={labelClass}>
              Descrizione per la cliente
            </label>
            <textarea
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Racconta il trattamento, il risultato e l'esperienza in salone."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="service-duration" className={labelClass}>
                Durata (minuti)
              </label>
              <input
                id="service-duration"
                type="number"
                min={5}
                max={240}
                step={5}
                value={durationInput}
                onChange={(event) =>
                  setDurationInput(event.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="45"
                className={inputClass}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setDurationInput(String(minutes))}
                    className={`${chipClass} ${
                      durationMinutes === minutes
                        ? "border-[#5E1788] bg-[#5E1788] text-white hover:bg-[#5E1788]"
                        : ""
                    }`}
                  >
                    <Clock size={11} className="mr-1 inline" />
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="service-price" className={labelClass}>
                Prezzo di listino (€)
              </label>
              <div className="relative">
                <Tag
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7A3293]"
                />
                <input
                  id="service-price"
                  type="text"
                  inputMode="decimal"
                  value={priceListInput}
                  onChange={(event) =>
                    setPriceListInput(
                      event.target.value.replace(/[^0-9.,]/g, "")
                    )
                  }
                  placeholder="0,00"
                  className={`${inputClass} pl-8`}
                />
              </div>
              <p className="mt-2 flex items-start gap-1 text-[11px] text-[#1F1B24]/45">
                <Info size={12} className="mt-0.5 shrink-0" />
                Inserisci il prezzo ufficiale del salone, IVA inclusa.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#D8C2E7]/70 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1F1B24]">
                  <Percent size={14} className="text-[#D462A6]" />
                  Sconto web riservato alla prenotazione online
                </p>
                <p className="mt-0.5 text-[11px] text-[#1F1B24]/45">
                  Il prezzo online viene ricalcolato in automatico.
                </p>
              </div>

              <div className="inline-flex rounded-full border border-[#D8C2E7] bg-[#FAF7FC] p-0.5">
                <button
                  type="button"
                  onClick={() => handleDiscountModeChange("fixed")}
                  aria-pressed={discountMode === "fixed"}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    discountMode === "fixed"
                      ? "bg-[#5E1788] text-white"
                      : "text-[#5E1788]"
                  }`}
                >
                  € fisso
                </button>
                <button
                  type="button"
                  onClick={() => handleDiscountModeChange("percent")}
                  aria-pressed={discountMode === "percent"}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    discountMode === "percent"
                      ? "bg-[#5E1788] text-white"
                      : "text-[#5E1788]"
                  }`}
                >
                  % percentuale
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={
                    discountMode === "percent"
                      ? "Sconto web in percentuale"
                      : "Sconto web in euro"
                  }
                  value={discountInput}
                  onChange={(event) =>
                    setDiscountInput(
                      event.target.value.replace(/[^0-9.,]/g, "")
                    )
                  }
                  placeholder={discountMode === "percent" ? "10" : "0,00"}
                  className={`${inputClass} pr-10`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#1F1B24]/40">
                  {discountMode === "percent" ? "%" : "€"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {DISCOUNT_PRESETS.map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => applyPercentPreset(percent)}
                    className={chipClass}
                  >
                    -{percent}%
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-[#1F1B24]/50">
                Sconto applicato:{" "}
                <strong className="text-[#D462A6]">
                  −{formatEuro(preview.discountOnline)}
                </strong>{" "}
                ({discountPercent.toFixed(1)}% del listino)
              </span>
              {discountPercent > 30 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#D462A6]">
                  <AlertTriangle size={12} /> Sconto superiore al 30%
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-[#5E1788] to-[#7A3293] p-4 text-white shadow-lg shadow-[#5E1788]/20 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                <Wallet size={13} /> Simulatore finanziario
              </p>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                Anteprima live
              </span>
            </div>

            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3 text-white/80">
                <dt>Prezzo listino ufficiale</dt>
                <dd className="font-semibold text-white">
                  {formatEuro(preview.priceList)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 text-white/80">
                <dt>Sconto web applicato</dt>
                <dd className="font-semibold text-[#D8C2E7]">
                  −{formatEuro(preview.discountOnline)}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/12 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                Prezzo finale online
              </span>
              <span className="font-serif text-2xl leading-none">
                {formatEuro(preview.priceOnline)}
              </span>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                  <CreditCard size={12} /> Acconto web 20%
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatEuro(preview.depositAmount)}
                </p>
                <p className="text-[10px] text-white/55">
                  Pagato con carta o Apple Pay alla prenotazione.
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                  <Store size={12} /> Saldo salone 80%
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {formatEuro(preview.balanceAmount)}
                </p>
                <p className="text-[10px] text-white/55">
                  Da incassare in salone con POS o contanti.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8C2E7]/70 bg-white px-4 py-3">
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-[#5E1788]/10 text-[#5E1788]"
                    : "bg-[#1F1B24]/5 text-[#1F1B24]/40"
                }`}
              >
                {active ? <Eye size={15} /> : <EyeOff size={15} />}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1F1B24]">
                  Visibile e prenotabile sul sito (/prenota)
                </p>
                <p className="text-[11px] text-[#1F1B24]/45">
                  {active
                    ? "Il pacchetto è prenotabile online dalle clienti."
                    : "Il pacchetto resta salvato ma nascosto dalla vetrina."}
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={active}
              onChange={setActive}
              label="Visibile e prenotabile sul sito (/prenota)"
              disabled={isSaving}
            />
          </section>

          <ListEditor
            title="Vantaggi e punti di forza"
            hint="I motivi per cui scegliere questo pacchetto."
            icon={<Sparkles size={14} />}
            items={benefits}
            placeholder="Es. Tenuta fino a 16 ore senza ritocchi"
            addLabel="Aggiungi vantaggio"
            onChange={setBenefits}
          />

          <ListEditor
            title="Cosa include il trattamento"
            hint="Le fasi e i servizi compresi nel prezzo."
            icon={<Check size={14} />}
            items={includes}
            placeholder="Es. Detersione, skincare express e fissaggio"
            addLabel="Aggiungi fase"
            onChange={setIncludes}
          />

          <div>
            <label htmlFor="service-recommended" className={labelClass}>
              Consigliato per
            </label>
            <input
              id="service-recommended"
              type="text"
              value={recommendedFor}
              onChange={(event) => setRecommendedFor(event.target.value)}
              placeholder="Es. Matrimoni, lauree ed eventi serali"
              className={inputClass}
            />
          </div>
        </div>

        <footer className="border-t border-[#D8C2E7]/70 bg-white px-5 py-4 sm:px-7">
          {error ? (
            <p
              role="alert"
              className="mb-3 flex items-start gap-1.5 rounded-xl border border-[#D462A6]/30 bg-[#D462A6]/10 px-3 py-2 text-xs font-medium text-[#7A3293]"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-[#1F1B24]/40">
              Salvataggio immediato in locale e sincronizzazione cloud.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#D8C2E7] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F1B24]/70 transition hover:border-[#7A3293]/50 hover:text-[#5E1788] disabled:opacity-50 sm:flex-none"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5E1788]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Salvataggio...
                  </>
                ) : (
                  <>
                    <Save size={15} /> Salva e Sincronizza nel Cloud
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
}
