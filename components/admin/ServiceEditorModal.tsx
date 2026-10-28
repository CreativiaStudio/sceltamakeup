'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Clock, Check, Plus, Trash2, AlertCircle } from 'lucide-react';
import { ClientService, applyServicePricing } from '@/lib/servicesStore';
import { ServiceChannel } from '@/types/booking';

export interface ServiceEditorModalProps {
  isOpen: boolean;
  service: ClientService | null;
  onClose: () => void;
  onSave: (service: ClientService) => Promise<void>;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatEuro = (value: number): string =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

export default function ServiceEditorModal({
  isOpen,
  service,
  onClose,
  onSave,
}: ServiceEditorModalProps) {
  const [name, setName] = useState<string>('');
  const [channel, setChannel] = useState<ServiceChannel>('makeup');
  const [description, setDescription] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [priceList, setPriceList] = useState<number>(0);
  const [discountOnline, setDiscountOnline] = useState<number>(0);
  const [active, setActive] = useState<boolean>(true);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [includes, setIncludes] = useState<string[]>([]);
  const [recommendedFor, setRecommendedFor] = useState<string>('');

  const [newBenefit, setNewBenefit] = useState<string>('');
  const [newInclude, setNewInclude] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const s = service as any;
    setName(s?.name ?? '');
    setChannel((s?.channel as ServiceChannel) ?? 'makeup');
    setDescription(s?.description ?? '');
    setDurationMinutes(Number(s?.durationMinutes ?? 60));
    setPriceList(Number(s?.priceList ?? 0));
    setDiscountOnline(Number(s?.discountOnline ?? 0));
    setActive(s?.active ?? true);
    setBenefits(Array.isArray(s?.benefits) ? [...s.benefits] : []);
    setIncludes(Array.isArray(s?.includes) ? [...s.includes] : []);
    setRecommendedFor(s?.recommendedFor ?? '');
    setNewBenefit('');
    setNewInclude('');
    setError(null);
    setIsSaving(false);
  }, [service, isOpen]);

  const financials = useMemo(() => {
    const priceOnline = Math.max(0, priceList - discountOnline);
    const depositAmount = Math.round(priceOnline * 0.2 * 100) / 100;
    const balanceAmount = Math.round((priceOnline - depositAmount) * 100) / 100;
    return { priceOnline, depositAmount, balanceAmount };
  }, [priceList, discountOnline]);

  if (!isOpen) return null;

  const addBenefit = () => {
    const value = newBenefit.trim();
    if (!value) return;
    setBenefits((prev) => [...prev, value]);
    setNewBenefit('');
  };

  const removeBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  const addInclude = () => {
    const value = newInclude.trim();
    if (!value) return;
    setIncludes((prev) => [...prev, value]);
    setNewInclude('');
  };

  const removeInclude = (index: number) => {
    setIncludes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Il nome del trattamento è obbligatorio.');
      return;
    }
    if (priceList < 0) {
      setError('Il prezzo di listino non può essere negativo.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const id =
        (service as any)?.id ?? `srv-${slugify(name.trim())}`;

      const draft = {
        ...((service as any) ?? {}),
        id,
        name: name.trim(),
        channel,
        description: description.trim(),
        durationMinutes,
        priceList,
        discountOnline,
        active,
        benefits,
        includes,
        recommendedFor: recommendedFor.trim(),
      } as ClientService;

      const payload = applyServicePricing(draft);

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Salvataggio non riuscito. Riprova tra qualche istante.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#D8C2E7] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#1F1B24] placeholder:text-[#1F1B24]/40 focus:border-[#7A3293] focus:outline-none focus:ring-2 focus:ring-[#D8C2E7]';
  const labelClass =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7A3293]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FFFFFF] shadow-2xl text-[#1F1B24]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D8C2E7] bg-[#FFFFFF] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#5E1788] to-[#D462A6] text-[#FFFFFF]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#5E1788]">
                {service ? 'Modifica trattamento' : 'Nuovo trattamento'}
              </h2>
              <p className="text-xs text-[#1F1B24]/60">
                La bellezza che valorizza la tua unicità
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-[#1F1B24]/60 transition hover:bg-[#D8C2E7]/40 hover:text-[#5E1788] disabled:opacity-50"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-[#D462A6]/40 bg-[#D462A6]/10 px-4 py-3 text-sm text-[#1F1B24]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D462A6]" />
              <span>{error}</span>
            </div>
          )}

          {/* Dati base */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="svc-name">Nome trattamento</label>
              <input
                id="svc-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Makeup da cerimonia"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="svc-channel">Canale</label>
              <select
                id="svc-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as ServiceChannel)}
                className={inputClass}
              >
                <option value="makeup">Make-up professionale</option>
                <option value="beauty">Dermo-cosmesi &amp; beauty</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="svc-duration">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Durata (minuti)
                </span>
              </label>
              <input
                id="svc-duration"
                type="number"
                min={0}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="svc-description">Descrizione</label>
              <textarea
                id="svc-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Racconta l'esperienza presso il Salone"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="svc-recommended">Consigliato per</label>
              <input
                id="svc-recommended"
                type="text"
                value={recommendedFor}
                onChange={(e) => setRecommendedFor(e.target.value)}
                placeholder="Es. Cerimonie, servizi fotografici, eventi serali"
                className={inputClass}
              />
            </div>
          </section>

          {/* Prezzi */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="svc-price">Prezzo listino (€)</label>
              <input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={priceList}
                onChange={(e) => setPriceList(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="svc-discount">Sconto web (€)</label>
              <input
                id="svc-discount"
                type="number"
                min={0}
                step="0.01"
                value={discountOnline}
                onChange={(e) => setDiscountOnline(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </section>

          {/* Trasparenza cassa */}
          <section className="overflow-hidden rounded-2xl border border-[#D8C2E7] bg-gradient-to-br from-[#D8C2E7]/50 via-[#FAF7FC] to-[#7A3293]/10 p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#5E1788]">
              Trasparenza cassa
            </h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#1F1B24]/70">Prezzo Listino</dt>
                <dd className="font-medium">{formatEuro(priceList)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1F1B24]/70">Sconto Web</dt>
                <dd className="font-medium text-[#D462A6]">- {formatEuro(discountOnline)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#D8C2E7] pt-2.5">
                <dt className="font-semibold text-[#5E1788]">Prezzo Finale Online</dt>
                <dd className="font-semibold text-[#5E1788]">{formatEuro(financials.priceOnline)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1F1B24]/70">Acconto 20% online (con carta)</dt>
                <dd className="font-medium">{formatEuro(financials.depositAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#1F1B24]/70">Saldo 80% incassato al banco Salone</dt>
                <dd className="font-medium">{formatEuro(financials.balanceAmount)}</dd>
              </div>
            </dl>
          </section>

          {/* Benefits */}
          <ListEditor
            title="Benefici"
            items={benefits}
            value={newBenefit}
            onValueChange={setNewBenefit}
            onAdd={addBenefit}
            onRemove={removeBenefit}
            placeholder="Es. Tenuta fino a 12 ore"
            inputClass={inputClass}
            labelClass={labelClass}
          />

          {/* Includes */}
          <ListEditor
            title="Incluso nel trattamento"
            items={includes}
            value={newInclude}
            onValueChange={setNewInclude}
            onAdd={addInclude}
            onRemove={removeInclude}
            placeholder="Es. Prova makeup pre-evento"
            inputClass={inputClass}
            labelClass={labelClass}
          />

          {/* Stato */}
          <section>
            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((prev) => !prev)}
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
                  active ? 'bg-[#5E1788]' : 'bg-[#D8C2E7]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full bg-[#FFFFFF] shadow transition ${
                    active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {active && <Check className="h-3 w-3 text-[#5E1788]" />}
                </span>
              </button>
              <span className="text-sm font-medium text-[#1F1B24]">
                Trattamento attivo e visibile ai clienti
              </span>
            </label>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[#D8C2E7] bg-[#FFFFFF] px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-[#1F1B24]/70 transition hover:bg-[#D8C2E7]/40 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] px-6 py-2.5 text-sm font-semibold text-[#FFFFFF] shadow-md transition hover:shadow-lg disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFFFFF]/40 border-t-[#FFFFFF]" />
                Salvataggio in corso...
              </>
            ) : (
              'Salva nel Cloud Supabase'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ListEditorProps {
  title: string;
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder: string;
  inputClass: string;
  labelClass: string;
}

function ListEditor({
  title,
  items,
  value,
  onValueChange,
  onAdd,
  onRemove,
  placeholder,
  inputClass,
  labelClass,
}: ListEditorProps) {
  return (
    <section>
      <span className={labelClass}>{title}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#D462A6] px-4 py-2.5 text-sm font-semibold text-[#FFFFFF] transition hover:bg-[#7A3293]"
        >
          <Plus className="h-4 w-4" />
          Aggiungi
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#D8C2E7] bg-[#FAF7FC] px-4 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#7A3293]" />
                {item}
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-lg p-1.5 text-[#1F1B24]/50 transition hover:bg-[#D462A6]/15 hover:text-[#D462A6]"
                aria-label="Rimuovi voce"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}