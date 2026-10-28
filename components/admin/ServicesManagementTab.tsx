'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Plus, RefreshCw, CheckCircle2, Clock, Eye, Edit3, Trash2, Filter, Search, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useServicesSync, getClientServices, saveClientService, toggleClientServiceActive, deleteClientService, syncServicesFromCloud, ClientService } from '@/lib/servicesStore';
import { ServiceChannel } from '@/types/booking';
import ServiceEditorModal from './ServiceEditorModal';

type FilterChannel = 'all' | 'makeup' | 'beauty';

const euro = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(value) ? value : 0);

export default function ServicesManagementTab() {
  useServicesSync();

  const [services, setServices] = useState<ClientService[]>(() => getClientServices());
  const [editingService, setEditingService] = useState<ClientService | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setServices(getClientServices());
    };
    window.addEventListener('scelta_services_updated', handleUpdate);
    return () => {
      window.removeEventListener('scelta_services_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!syncNotification) return;
    const timer = window.setTimeout(() => setSyncNotification(null), 3500);
    return () => window.clearTimeout(timer);
  }, [syncNotification]);

  const refreshFromStore = useCallback(() => {
    setServices(getClientServices());
  }, []);

  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      await Promise.resolve(syncServicesFromCloud());
      refreshFromStore();
      setSyncNotification('Sincronizzazione con il cloud completata.');
    } catch {
      setSyncNotification('Sincronizzazione non riuscita. Riprova.');
    } finally {
      setIsManualSyncing(false);
    }
  }, [refreshFromStore]);

  const openNewModal = useCallback(() => {
    setEditingService(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((service: ClientService) => {
    setEditingService(service);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingService(null);
  }, []);

  const handleSave = useCallback(
    async (service: ClientService) => {
      try {
        await Promise.resolve(saveClientService(service));
        refreshFromStore();
        setSyncNotification('Pacchetto salvato e sincronizzato.');
      } catch {
        setSyncNotification('Salvataggio non riuscito. Riprova.');
      } finally {
        closeModal();
      }
    },
    [refreshFromStore, closeModal]
  );

  const handleToggleActive = useCallback(
    async (service: ClientService) => {
      try {
        await Promise.resolve(toggleClientServiceActive(service.id));
        refreshFromStore();
      } catch {
        setSyncNotification('Impossibile aggiornare lo stato del pacchetto.');
      }
    },
    [refreshFromStore]
  );

  const handleDelete = useCallback(
    async (service: ClientService) => {
      const confirmed = window.confirm(`Eliminare il pacchetto "${service.name}"? L'operazione è immediata su tutti i dispositivi.`);
      if (!confirmed) return;
      try {
        await Promise.resolve(deleteClientService(service.id));
        refreshFromStore();
        setSyncNotification('Pacchetto eliminato.');
      } catch {
        setSyncNotification('Eliminazione non riuscita. Riprova.');
      }
    },
    [refreshFromStore]
  );

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return services.filter((service) => {
      const matchesChannel = filterChannel === 'all' || service.channel === (filterChannel as ServiceChannel);
      const matchesQuery =
        query.length === 0 ||
        service.name.toLowerCase().includes(query) ||
        (service.description ?? '').toLowerCase().includes(query);
      return matchesChannel && matchesQuery;
    });
  }, [services, filterChannel, searchQuery]);

  const stats = useMemo(() => {
    const total = services.length;
    const activeWeb = services.filter((s) => s.active).length;
    const makeup = services.filter((s) => s.channel === ('makeup' as ServiceChannel)).length;
    const beauty = services.filter((s) => s.channel === ('beauty' as ServiceChannel)).length;
    const avgList = total > 0 ? services.reduce((sum, s) => sum + (s.priceList ?? 0), 0) / total : 0;
    const avgDiscount = total > 0 ? services.reduce((sum, s) => sum + (s.discountOnline ?? 0), 0) / total : 0;
    return { activeWeb, makeup, beauty, avgList, avgDiscount };
  }, [services]);

  return (
    <div className="w-full space-y-8 bg-[#FFFFFF] p-6 text-[#1F1B24]">
      {/* Banner Superiore */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#D462A6]/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#D8C2E7]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#D8C2E7]">
              <Sparkles className="h-3.5 w-3.5" />
              Vetrina Prenotazioni Web (/prenota &amp; /servizi)
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Pacchetti Make-Up &amp; Servizi Salone</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#D8C2E7]">
              {"Gestisci i pacchetti make-up e i trattamenti prenotabili online dalle clienti. Ogni modifica è sincronizzata all'istante con Supabase e visibile su tutti i dispositivi."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D8C2E7]/40 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
              {isManualSyncing ? 'Sincronizzazione...' : 'Sincronizza Cloud'}
            </button>
            <button
              type="button"
              onClick={openNewModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D462A6] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              + Nuovo Pacchetto
            </button>
          </div>
        </div>
      </div>

      {syncNotification && (
        <div className="flex items-center gap-2 rounded-xl border border-[#D8C2E7] bg-[#D8C2E7]/30 px-4 py-3 text-sm text-[#5E1788]">
          {syncNotification.includes('non riuscit') || syncNotification.includes('Impossibile') ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span>{syncNotification}</span>
        </div>
      )}

      {/* Riga KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#D8C2E7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A3293]">Pacchetti Attivi Web</p>
            <CheckCircle2 className="h-5 w-5 text-[#D462A6]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#5E1788]">{stats.activeWeb}</p>
        </div>
        <div className="rounded-2xl border border-[#D8C2E7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A3293]">Trucco Salone vs Cabina</p>
            <Eye className="h-5 w-5 text-[#D462A6]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#5E1788]">
            {stats.makeup} <span className="text-lg text-[#7A3293]">/ {stats.beauty}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#D8C2E7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A3293]">Prezzo Medio Listino (€)</p>
            <Sparkles className="h-5 w-5 text-[#D462A6]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#5E1788]">{euro(stats.avgList)}</p>
        </div>
        <div className="rounded-2xl border border-[#D8C2E7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A3293]">Sconto Medio Web (€)</p>
            <Sparkles className="h-5 w-5 text-[#D462A6]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#5E1788]">{euro(stats.avgDiscount)}</p>
        </div>
      </div>

      {/* Ricerca e Filtri */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#D8C2E7] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A3293]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca pacchetto o descrizione..."
            className="w-full rounded-xl border border-[#D8C2E7] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-sm text-[#1F1B24] outline-none transition focus:border-[#7A3293] focus:ring-2 focus:ring-[#D8C2E7]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#7A3293]" />
          {(['all', 'makeup', 'beauty'] as FilterChannel[]).map((channel) => {
            const isActive = filterChannel === channel;
            const label = channel === 'all' ? 'Tutti' : channel === 'makeup' ? 'Make-Up Salone' : 'Cabina Estetica';
            return (
              <button
                key={channel}
                type="button"
                onClick={() => setFilterChannel(channel)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#5E1788] text-white shadow'
                    : 'border border-[#D8C2E7] bg-white text-[#5E1788] hover:bg-[#D8C2E7]/40'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Griglia Card */}
      {filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8C2E7] p-12 text-center text-sm text-[#7A3293]">
          Nessun pacchetto trovato con i filtri selezionati.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => {
            const isMakeup = service.channel === ('makeup' as ServiceChannel);
            const channelLabel = isMakeup ? 'Postazione Make-Up Salone' : 'Cabina Estetica Privata';
            const channelColor = isMakeup ? '#5E1788' : '#7A3293';
            const listPrice = service.priceList ?? 0;
            const webDiscount = service.discountOnline ?? 0;
            const finalPrice = service.priceOnline ?? Math.max(listPrice - webDiscount, 0);
            const deposit = service.depositAmount ?? Math.round(finalPrice * 0.2 * 100) / 100;
            const balance = service.balanceAmount ?? Math.round((finalPrice - deposit) * 100) / 100;
            const isSeasonal = /Halloween|Feste/i.test(service.name);
            const slugOrId = service.slug ?? service.id;
            const benefits = service.benefits ?? [];

            return (
              <article
                key={service.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-[#D8C2E7] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3 p-6 pb-4">
                  <div className="space-y-2">
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
                      style={{ backgroundColor: channelColor }}
                    >
                      {channelLabel}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[#7A3293]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{service.durationMinutes ?? 0} min</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={service.active}
                    onClick={() => handleToggleActive(service)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                      service.active ? 'bg-[#D462A6]' : 'bg-[#D8C2E7]'
                    }`}
                    title={service.active ? 'Disattiva dalla vetrina web' : 'Attiva sulla vetrina web'}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        service.active ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-3 px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-[#1F1B24]">{service.name}</h3>
                    {isSeasonal && (
                      <span className="rounded-full bg-[#D462A6]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D462A6]">
                        Edizione Speciale
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-[#1F1B24]/75">{service.description}</p>
                </div>

                {/* Box Finanziario */}
                <div className="mx-6 mt-5 space-y-3 rounded-2xl bg-[#D8C2E7]/25 p-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A3293]">Listino</p>
                      <p className="text-sm font-semibold text-[#1F1B24]">{euro(listPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A3293]">Sconto Web</p>
                      <p className="text-sm font-semibold text-[#D462A6]">-{euro(webDiscount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A3293]">Prezzo Online</p>
                      <p className="text-sm font-bold text-[#5E1788]">{euro(finalPrice)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-[#D8C2E7] pt-3 text-center">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A3293]">Acconto 20% online</p>
                      <p className="text-sm font-semibold text-[#5E1788]">{euro(deposit)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A3293]">Saldo Salone 80%</p>
                      <p className="text-sm font-semibold text-[#1F1B24]">{euro(balance)}</p>
                    </div>
                  </div>
                </div>

                {/* Vantaggi */}
                {benefits.length > 0 && (
                  <ul className="space-y-2 px-6 pt-5">
                    {benefits.slice(0, 3).map((benefit, index) => (
                      <li key={`${service.id}-benefit-${index}`} className="flex items-start gap-2 text-sm text-[#1F1B24]/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D462A6]" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Azioni */}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[#D8C2E7] p-5">
                  <button
                    type="button"
                    onClick={() => openEditModal(service)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5E1788] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#7A3293]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Modifica
                  </button>
                  <a
                    href={`/prenota?servizio=${encodeURIComponent(slugOrId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#D8C2E7] bg-white px-3 py-2 text-xs font-semibold text-[#5E1788] transition hover:bg-[#D8C2E7]/40"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Vedi su /prenota
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(service)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D462A6]/40 bg-white px-3 py-2 text-xs font-semibold text-[#D462A6] transition hover:bg-[#D462A6]/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <ServiceEditorModal
          isOpen={isModalOpen}
          service={editingService}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}