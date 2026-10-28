"use client";

/**
 * Scelta Makeup — Pacchetti & Servizi Web Store
 * Module: lib/servicesStore.ts
 *
 * Sorgente unica lato client per i pacchetti make-up e i servizi prenotabili
 * pubblicati su /prenota e /servizi. Lo store è offline-first:
 *   1. idrata i servizi di partenza da data/services.ts;
 *   2. persiste ogni modifica in localStorage (istantanea, zero attese);
 *   3. propaga la modifica a tutte le schede/dispositivi via BroadcastChannel
 *      e allinea il cloud tramite /api/services quando disponibile.
 *
 * Le formule finanziarie sono sempre ricalcolate qui (mai fidarsi dei valori
 * salvati): Prezzo Online = Listino − Sconto, Acconto 20%, Saldo 80%.
 */

import { useCallback, useEffect, useState } from "react";
import type { Service, ServiceChannel } from "@/types/booking";
import { SERVICES } from "@/data/services";

export const SERVICES_STORAGE_KEY = "scelta_makeup_services_v1";
export const SERVICES_SYNC_EVENT = "scelta_services_updated";
export const SERVICES_API_ENDPOINT = "/api/services";
const SERVICES_BROADCAST_CHANNEL = "scelta_services_sync_v1";

export interface ClientService extends Service {
  /** true per i pacchetti creati da Federica dal Cockpit. */
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface StoredServicesState {
  version: number;
  services: ClientService[];
  updatedAt: string;
}

export interface ServicesUpdatedDetail {
  services: ClientService[];
  updatedAt: string;
}

export interface SaveClientServiceResult {
  success: boolean;
  service: ClientService;
  cloudSynced: boolean;
  error?: string;
}

export interface ServicesSyncState {
  services: ClientService[];
  isSyncing: boolean;
  lastSyncedAt: number | null;
  cloudAvailable: boolean;
  syncNow: () => Promise<void>;
  refreshLocal: () => void;
}

function roundCurrency(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Ricalcola sempre prezzo online, acconto e saldo dalle due cifre di input. */
export function applyServicePricing(service: ClientService): ClientService {
  const priceList = Math.max(0, roundCurrency(Number(service.priceList)));
  const discountOnline = clamp(
    roundCurrency(Number(service.discountOnline)),
    0,
    priceList
  );
  const priceOnline = roundCurrency(priceList - discountOnline);
  const depositAmount = roundCurrency(priceOnline * 0.2);
  const balanceAmount = roundCurrency(priceOnline - depositAmount);

  return {
    ...service,
    priceList,
    discountOnline,
    priceOnline,
    depositPercent: 0.2,
    depositAmount,
    balanceAmount,
  };
}

function isServiceChannel(value: unknown): value is ServiceChannel {
  return value === "makeup" || value === "beauty";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Sanitizza una riga proveniente da localStorage/cloud prima di usarla in UI. */
export function normalizeClientService(value: unknown): ClientService | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !name) return null;

  const channel: ServiceChannel = isServiceChannel(raw.channel)
    ? raw.channel
    : "makeup";
  const durationMinutes = Number(raw.durationMinutes);
  const priceList = Number(raw.priceList);
  const discountOnline = Number(raw.discountOnline);

  return applyServicePricing({
    id,
    slug: typeof raw.slug === "string" && raw.slug.trim() ? raw.slug.trim() : id,
    name,
    channel,
    description: typeof raw.description === "string" ? raw.description : "",
    durationMinutes:
      Number.isFinite(durationMinutes) && durationMinutes > 0
        ? Math.round(durationMinutes)
        : 45,
    priceList: Number.isFinite(priceList) ? priceList : 0,
    priceOnline: 0,
    discountOnline: Number.isFinite(discountOnline) ? discountOnline : 0,
    depositPercent: 0.2,
    depositAmount: 0,
    balanceAmount: 0,
    active: raw.active !== false,
    image: typeof raw.image === "string" ? raw.image : "",
    benefits: toStringArray(raw.benefits),
    includes: toStringArray(raw.includes),
    recommendedFor:
      typeof raw.recommendedFor === "string" ? raw.recommendedFor : "",
    isCustom: raw.isCustom === true,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  });
}

function buildSeedServices(): ClientService[] {
  return SERVICES.map((service) =>
    applyServicePricing({
      ...service,
      isCustom: false,
      updatedAt: "seed",
    })
  );
}

function readStoredState(): StoredServicesState {
  const seed = buildSeedServices();
  if (typeof window === "undefined") {
    return { version: 1, services: seed, updatedAt: "" };
  }

  try {
    const raw = window.localStorage.getItem(SERVICES_STORAGE_KEY);
    if (!raw) {
      const initial: StoredServicesState = {
        version: 1,
        services: seed,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed: unknown = JSON.parse(raw);
    const rawServices = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" &&
          Array.isArray((parsed as StoredServicesState).services)
        ? (parsed as StoredServicesState).services
        : [];

    const services = rawServices
      .map(normalizeClientService)
      .filter((service): service is ClientService => service !== null);

    return {
      version: 1,
      services: services.length > 0 ? services : seed,
      updatedAt:
        parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
        typeof (parsed as StoredServicesState).updatedAt === "string"
          ? (parsed as StoredServicesState).updatedAt
          : "",
    };
  } catch (error) {
    console.error("[SceltaServicesStore] Lettura locale non riuscita", error);
    return { version: 1, services: seed, updatedAt: "" };
  }
}

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(SERVICES_BROADCAST_CHANNEL);
  }
  return broadcastChannel;
}

function writeStoredState(services: ClientService[]): ServicesUpdatedDetail {
  const updatedAt = new Date().toISOString();
  const state: StoredServicesState = {
    version: 1,
    services,
    updatedAt,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("[SceltaServicesStore] Persistenza locale non riuscita", error);
    }

    window.dispatchEvent(
      new CustomEvent<ServicesUpdatedDetail>(SERVICES_SYNC_EVENT, {
        detail: { services, updatedAt },
      })
    );

    // Le altre schede dello stesso dispositivo si aggiornano senza polling.
    try {
      getBroadcastChannel()?.postMessage({ services, updatedAt });
    } catch {
      /* BroadcastChannel non disponibile: resta la sync via storage/fetch */
    }
  }

  return { services, updatedAt };
}

function mergeServiceLists(
  localServices: ClientService[],
  remoteServices: unknown[]
): ClientService[] {
  const merged = new Map<string, ClientService>();
  localServices.forEach((service) => merged.set(service.id, service));

  remoteServices.forEach((raw) => {
    const remote = normalizeClientService(raw);
    if (!remote) return;
    const current = merged.get(remote.id);
    if (!current) {
      merged.set(remote.id, remote);
      return;
    }
    const currentTime = current.updatedAt ? Date.parse(current.updatedAt) : 0;
    const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
    if (!Number.isFinite(currentTime) || remoteTime >= currentTime) {
      merged.set(remote.id, remote);
    }
  });

  return Array.from(merged.values());
}

/** Tutti i servizi, inclusi quelli disattivati dalla vetrina. */
export function getClientServices(): ClientService[] {
  return readStoredState().services;
}

export function getActiveClientServices(): ClientService[] {
  return getClientServices().filter((service) => service.active);
}

export function getClientServiceById(id: string): ClientService | undefined {
  return getClientServices().find((service) => service.id === id);
}

export function getClientServiceBySlug(slug: string): ClientService | undefined {
  return getClientServices().find((service) => service.slug === slug);
}

/** Sincronizza i servizi dal cloud Supabase aggiornando la cache locale. */
export async function syncServicesFromCloud(fresh = true): Promise<ClientService[]> {
  if (typeof window === "undefined") return getClientServices();
  try {
    const res = await fetch(`${SERVICES_API_ENDPOINT}?fresh=${fresh ? "1" : "0"}`, {
      cache: "no-store",
    });
    if (!res.ok) return getClientServices();
    const data = await res.json();
    if (data.success && Array.isArray(data.services)) {
      writeStoredState(data.services);
      return data.services;
    }
  } catch (_) {}
  return getClientServices();
}

export function isCustomService(service: ClientService): boolean {
  return service.isCustom === true || service.id.startsWith("srv-custom-");
}

async function deliverSaveToCloud(service: ClientService): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch(SERVICES_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.services)) {
        writeStoredState(data.services);
      }
      return true;
    }
    return false;
  } catch {
    // Offline-first: la modifica resta salvata in locale e verrà ripresa.
    return false;
  }
}

/**
 * Salva (crea o aggiorna) un pacchetto: prima in locale — così il Cockpit è
 * sempre reattivo — poi tenta la sincronizzazione cloud.
 */
export async function saveClientService(
  input: Service | ClientService
): Promise<SaveClientServiceResult> {
  const base = normalizeClientService(input);
  if (!base) {
    return {
      success: false,
      service: input as ClientService,
      cloudSynced: false,
      error: "Dati del servizio non validi.",
    };
  }

  const state = readStoredState();
  const index = state.services.findIndex((service) => service.id === base.id);
  const existing = index >= 0 ? state.services[index] : undefined;
  const now = new Date().toISOString();

  const service = applyServicePricing({
    ...base,
    isCustom:
      (input as ClientService).isCustom ?? existing?.isCustom ?? true,
    createdAt: existing?.createdAt ?? base.createdAt ?? now,
    updatedAt: now,
  });

  const nextServices =
    index >= 0
      ? state.services.map((item) => (item.id === service.id ? service : item))
      : [...state.services, service];

  writeStoredState(nextServices);
  const cloudSynced = await deliverSaveToCloud(service);

  return { success: true, service, cloudSynced };
}

/** Attiva/disattiva un pacchetto con un solo click dalla griglia. */
export async function toggleClientServiceActive(
  id: string,
  active?: boolean
): Promise<ClientService | null> {
  const current = getClientServiceById(id);
  if (!current) return null;
  const targetActive = typeof active === "boolean" ? active : !current.active;
  const result = await saveClientService({ ...current, active: targetActive });
  return result.success ? result.service : null;
}

/** Elimina un pacchetto personalizzato (i servizi di catalogo non si toccano). */
export async function deleteClientService(id: string): Promise<boolean> {
  const current = getClientServiceById(id);
  if (!current || !isCustomService(current)) return false;

  const nextServices = getClientServices().filter((service) => service.id !== id);
  writeStoredState(nextServices);

  if (typeof window !== "undefined") {
    try {
      const response = await fetch(`${SERVICES_API_ENDPOINT}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && Array.isArray(data.services)) {
          writeStoredState(data.services);
        }
      }
    } catch {
      /* Offline: la rimozione locale resta valida. */
    }
  }

  return true;
}

/**
 * Hook di sincronizzazione: stato locale reattivo, eventi intra-scheda,
 * BroadcastChannel, ritorno in focus e polling leggero dal cloud.
 */
export function useServicesSync(intervalMs = 30000): ServicesSyncState {
  const [services, setServices] = useState<ClientService[]>(() =>
    getClientServices()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [cloudAvailable, setCloudAvailable] = useState(false);

  const refreshLocal = useCallback(() => {
    setServices(getClientServices());
  }, []);

  const syncNow = useCallback(async () => {
    if (typeof window === "undefined") return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${SERVICES_API_ENDPOINT}?fresh=1`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload: unknown = await response.json();
      const remoteServices =
        payload && typeof payload === "object" &&
        Array.isArray((payload as { services?: unknown[] }).services)
          ? ((payload as { services: unknown[] }).services)
          : null;
      if (!remoteServices) throw new Error("Risposta cloud non valida");

      const merged = mergeServiceLists(getClientServices(), remoteServices);
      writeStoredState(merged);
      setServices(merged);
      setCloudAvailable(true);
      setLastSyncedAt(Date.now());
    } catch {
      setCloudAvailable(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshLocal();

    const handleLocalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<ServicesUpdatedDetail>).detail;
      setServices(detail?.services ?? getClientServices());
      setLastSyncedAt(Date.now());
      setCloudAvailable(true);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SERVICES_STORAGE_KEY) refreshLocal();
    };

    const handleFocus = () => {
      refreshLocal();
      void syncNow();
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        refreshLocal();
        void syncNow();
      }
    };

    const channel = getBroadcastChannel();
    const handleBroadcast = (event: MessageEvent<ServicesUpdatedDetail>) => {
      if (event.data?.services) {
        setServices(event.data.services);
        setLastSyncedAt(Date.now());
        setCloudAvailable(true);
      }
    };

    window.addEventListener(SERVICES_SYNC_EVENT, handleLocalUpdate);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    channel?.addEventListener("message", handleBroadcast);

    void syncNow();
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void syncNow();
    }, intervalMs);

    return () => {
      window.removeEventListener(SERVICES_SYNC_EVENT, handleLocalUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      channel?.removeEventListener("message", handleBroadcast);
      window.clearInterval(interval);
    };
  }, [intervalMs, refreshLocal, syncNow]);

  return {
    services,
    isSyncing,
    lastSyncedAt,
    cloudAvailable,
    syncNow,
    refreshLocal,
  };
}
