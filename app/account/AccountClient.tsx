"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2, Mail, PackageSearch, ShoppingBag } from "lucide-react";
import OrderTrackingCard from "@/components/orders/OrderTrackingCard";
import { ORDER_STATUS_LABELS, type PublicOrder } from "@/lib/orderTracking";
import type { PacklinkTracking } from "@/lib/packlink";

type Tab = "track" | "mine";

interface AccountClientProps {
  initialOrderNumber?: string;
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

const inputClass =
  "w-full rounded-xl border border-[#D8C2E7] bg-white px-4 py-3 text-sm text-[#1F1B24] placeholder-neutral-400 focus:border-[#5E1788] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/15";
const primaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5E1788] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#7A3293] disabled:cursor-not-allowed disabled:opacity-60";

type LookupResult = { order: PublicOrder; tracking: PacklinkTracking | null } | { error: string };

async function fetchOrder(number: string, mail: string): Promise<LookupResult> {
  try {
    const qs = new URLSearchParams({ orderNumber: number.trim(), email: mail.trim() });
    const res = await fetch(`/api/orders/lookup?${qs.toString()}`, { cache: "no-store" });
    const data = (await res.json()) as {
      success: boolean;
      error?: string;
      order?: PublicOrder;
      tracking?: PacklinkTracking | null;
    };
    if (!res.ok || !data.success || !data.order) {
      return { error: data.error || "Ordine non trovato" };
    }
    return { order: data.order, tracking: data.tracking ?? null };
  } catch {
    return { error: "Connessione non riuscita. Riprova tra qualche istante." };
  }
}

export default function AccountClient({ initialOrderNumber = "" }: AccountClientProps) {
  const searchParams = useSearchParams();
  const urlOrder = (searchParams.get("order") || initialOrderNumber).trim();
  const urlEmail = (searchParams.get("email") || "").trim();

  const [tab, setTab] = useState<Tab>("track");
  const [orderNumber, setOrderNumber] = useState(urlOrder);
  const [email, setEmail] = useState(urlEmail);
  const [loading, setLoading] = useState(Boolean(urlOrder && urlEmail));
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<PublicOrder[] | null>(null);
  const [selected, setSelected] = useState<{ order: PublicOrder; tracking: PacklinkTracking | null } | null>(
    null
  );
  const [backToList, setBackToList] = useState(false);
  const autoLoadedRef = useRef(false);

  const lookupOrder = useCallback((number: string, mail: string, fromList = false) => {
    setLoading(true);
    setError("");
    return fetchOrder(number, mail).then((result) => {
      if ("error" in result) {
        setError(result.error);
      } else {
        setSelected(result);
        setBackToList(fromList);
      }
      setLoading(false);
    });
  }, []);

  const loadMyOrders = useCallback(async (mail: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders/my-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string; orders?: PublicOrder[] };
      if (!res.ok || !data.success) {
        setError(data.error || "Impossibile recuperare gli ordini");
        return;
      }
      setOrders(data.orders ?? []);
    } catch {
      setError("Connessione non riuscita. Riprova tra qualche istante.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    if (!urlOrder || !urlEmail) return;
    fetchOrder(urlOrder, urlEmail).then((result) => {
      if ("error" in result) setError(result.error);
      else setSelected(result);
      setLoading(false);
    });
  }, [urlOrder, urlEmail]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError("Inserisci numero ordine ed email.");
      return;
    }
    void lookupOrder(orderNumber, email);
  };

  const handleMineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Inserisci la tua email.");
      return;
    }
    setOrders(null);
    void loadMyOrders(email);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError("");
  };

  const closeOrder = () => {
    setSelected(null);
    setError("");
  };

  return (
    <div className="min-h-[70vh] bg-brand-soft">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D462A6]">
            Area Clienti
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#5E1788] sm:text-5xl">
            I tuoi ordini, con cura
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600">
            Segui il percorso del tuo ordine dall&apos;Atelier di Napoli fino a casa tua.
          </p>
        </div>

        {selected ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={closeOrder}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5E1788] hover:text-[#7A3293]"
            >
              <ArrowLeft className="h-4 w-4" />
              {backToList ? "Torna ai miei ordini" : "Nuova ricerca"}
            </button>
            <OrderTrackingCard order={selected.order} tracking={selected.tracking} />
          </div>
        ) : (
          <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
            <div role="tablist" className="mb-6 grid grid-cols-2 gap-1.5 rounded-full bg-[#FAF7FC] p-1.5">
              {(
                [
                  { key: "track", label: "Traccia un Ordine", Icon: PackageSearch },
                  { key: "mine", label: "I Miei Ordini", Icon: ShoppingBag },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => switchTab(key)}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                    tab === key
                      ? "bg-[#5E1788] text-white shadow-sm"
                      : "text-[#5E1788] hover:bg-[#D8C2E7]/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {tab === "track" ? (
              <form onSubmit={handleTrackSubmit} className="space-y-4">
                <div>
                  <label htmlFor="order-number" className="mb-1.5 block text-xs font-semibold text-[#1F1B24]">
                    Numero Ordine
                  </label>
                  <input
                    id="order-number"
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="SC-ORD-2026-0001"
                    autoComplete="off"
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label htmlFor="track-email" className="mb-1.5 block text-xs font-semibold text-[#1F1B24]">
                    Email utilizzata al checkout
                  </label>
                  <input
                    id="track-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@email.it"
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />}
                  Visualizza Ordine
                </button>
              </form>
            ) : (
              <form onSubmit={handleMineSubmit} className="space-y-4">
                <div>
                  <label htmlFor="mine-email" className="mb-1.5 block text-xs font-semibold text-[#1F1B24]">
                    La tua Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A3293]" />
                    <input
                      id="mine-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@email.it"
                      autoComplete="email"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                  Mostra tutti i miei ordini
                </button>
              </form>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </p>
            )}

            {tab === "mine" && orders && (
              <div className="mt-8">
                {orders.length === 0 ? (
                  <p className="rounded-xl bg-[#FAF7FC] px-4 py-6 text-center text-sm text-neutral-600">
                    Non abbiamo trovato ordini associati a questa email.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {orders.map((order) => {
                      const badge = ORDER_STATUS_LABELS[order.status];
                      return (
                        <li key={order.id}>
                          <button
                            type="button"
                            onClick={() => void lookupOrder(order.id, email, true)}
                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#D8C2E7]/60 bg-white p-4 text-left transition-all hover:border-[#5E1788]/40 hover:shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-semibold text-[#5E1788]">{order.id}</p>
                              <p className="mt-0.5 text-xs text-neutral-500">
                                {new Date(order.createdAt).toLocaleDateString("it-IT", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}{" "}
                                · {order.items.length} {order.items.length === 1 ? "articolo" : "articoli"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <div className="text-right">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <p className="mt-1 text-sm font-semibold text-[#1F1B24]">
                                  {euro.format(order.total)}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-[#7A3293]" />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {loading && selected === null && !error && urlOrder && urlEmail && !orders && (
          <p className="mt-6 text-center text-sm text-[#5E1788]">Recupero del tuo ordine in corso...</p>
        )}
      </div>
    </div>
  );
}
