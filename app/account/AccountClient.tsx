"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarHeart,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  PackageSearch,
  RefreshCw,
  Save,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  User,
} from "lucide-react";
import OrderTrackingCard from "@/components/orders/OrderTrackingCard";
import { ORDER_STATUS_LABELS, normalizeEmail, type PublicOrder } from "@/lib/orderTracking";
import type { PacklinkTracking } from "@/lib/packlink";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { resolveProductImageUrl } from "@/lib/r2";
import { useCartStore } from "@/store/useCartStore";
import { useIsMounted } from "@/lib/useIsMounted";
import {
  EMPTY_SHIPPING_ADDRESS,
  clearCustomerSession,
  guessNameFromEmail,
  isUsableAddress,
  readCustomerSession,
  saveCustomerSession,
  type CustomerSession,
  type ShippingAddress,
} from "@/lib/customerSession";
import {
  variantKey,
  type ResolvedReorderProduct,
  type ReorderRequestItem,
} from "@/lib/reorder";
import { getAllAppointments } from "@/lib/bookingService";
import type { Appointment, AppointmentStatus } from "@/types/booking";

type DashboardTab = "orders" | "reorder" | "appointments" | "profile";
type OrderWithTracking = { order: PublicOrder; tracking: PacklinkTracking | null };
type LookupResult = OrderWithTracking | { error: string };

interface AccountClientProps {
  initialOrderNumber?: string;
}

interface FavouriteProduct {
  key: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  variantLabel?: string;
  shade?: ResolvedReorderProduct["shade"];
  purchasedCount: number;
  lastOrderedAt: string;
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ATELIER_ADDRESS = "Via Pellegrini 28/29, 80134 Napoli";
const ATELIER_HOURS = "Lunedì – Sabato · 9:30 – 13:30 / 16:30 – 20:00";
const ATELIER_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Scelta Makeup Via Pellegrini 28 Napoli"
)}`;

const ACTIVE_ORDER_STATUSES: PublicOrder["status"][] = ["shipped", "processing", "ready_for_pickup"];

const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmed: { label: "Confermato", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  completed_paid: {
    label: "Completato",
    className: "bg-[#D8C2E7]/30 text-[#5E1788] border-[#D8C2E7]",
  },
  cancelled: { label: "Annullato", className: "bg-rose-50 text-rose-800 border-rose-200" },
  no_show: { label: "Non presentata", className: "bg-amber-50 text-amber-800 border-amber-200" },
};

const inputClass =
  "w-full rounded-xl border border-[#D8C2E7] bg-white px-4 py-3 text-sm text-[#1F1B24] placeholder-neutral-400 focus:border-[#5E1788] focus:outline-none focus:ring-2 focus:ring-[#5E1788]/15";
const primaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5E1788] px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#7A3293] disabled:cursor-not-allowed disabled:opacity-60";
const softButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#D8C2E7] bg-white px-5 py-2.5 text-sm font-semibold text-[#5E1788] transition-colors hover:bg-[#FAF7FC] disabled:cursor-not-allowed disabled:opacity-60";

function formatDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function formatAppointment(date: string, time: string): string {
  const value = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(value.getTime())) return `${date} · ${time}`;
  return value.toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addressFromOrder(order?: PublicOrder): ShippingAddress | null {
  const address = order?.shippingAddress;
  if (!address || !address.street) return null;
  return {
    street: address.street.trim(),
    city: (address.city ?? "").trim(),
    postalCode: (address.postalCode ?? "").trim(),
    province: (address.province ?? "").trim(),
  };
}

/** Ordine più recente ancora in lavorazione o in transito. */
function pickActiveOrder(orders: PublicOrder[]): PublicOrder | undefined {
  return [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .find((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
}

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
  const urlEmail = normalizeEmail(searchParams.get("email") || "");
  const isMounted = useIsMounted();

  const [session, setSession] = useState<CustomerSession | null>(() => readCustomerSession());
  const [tab, setTab] = useState<DashboardTab>("orders");
  const [orders, setOrders] = useState<PublicOrder[] | null>(null);
  const [selected, setSelected] = useState<OrderWithTracking | null>(null);
  const [guestOrder, setGuestOrder] = useState<OrderWithTracking | null>(null);
  const [reorder, setReorder] = useState<ResolvedReorderProduct[] | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [email, setEmail] = useState(urlEmail);
  const [orderNumber, setOrderNumber] = useState(urlOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [nameForm, setNameForm] = useState(() => readCustomerSession()?.name ?? "");
  const [addressForm, setAddressForm] = useState<ShippingAddress>(
    () => readCustomerSession()?.savedAddress ?? EMPTY_SHIPPING_ADDRESS
  );
  const [addressSaved, setAddressSaved] = useState(false);

  const bootedRef = useRef(false);

  const commitSession = useCallback((next: CustomerSession) => {
    saveCustomerSession(next);
    setSession(next);
  }, []);

  // Risoluzione dei preferiti (prodotti acquistati) per il riordino rapido.
  // Invocata dopo il caricamento degli ordini, mai sincronamente in un render.
  const resolveReorder = useCallback((list: PublicOrder[]) => {
    if (list.length === 0) {
      setReorder(null);
      return;
    }
    const seen = new Set<string>();
    const items: ReorderRequestItem[] = [];
    for (const order of list) {
      for (const item of order.items) {
        const key = variantKey(item.productId, item.variantName);
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({ productId: item.productId, variantName: item.variantName });
      }
    }
    if (items.length === 0) {
      setReorder([]);
      return;
    }

    setReorderLoading(true);
    fetch("/api/catalog/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; products?: ResolvedReorderProduct[] }) => {
        setReorder(data.products ?? []);
      })
      .catch(() => setReorder([]))
      .finally(() => setReorderLoading(false));
  }, []);

  // Appuntamenti in Atelier associati all'email della cliente.
  const loadAppointments = useCallback((mail: string) => {
    if (!mail) {
      setAppointments([]);
      return;
    }
    try {
      const mine = getAllAppointments()
        .filter((appointment) => normalizeEmail(appointment.customer?.email) === mail)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
      setAppointments(mine);
    } catch {
      setAppointments([]);
    }
  }, []);

  const lookupOrder = useCallback(
    async (number: string, mail: string, opts?: { guest?: boolean }) => {
      setLoading(true);
      setError("");
      const result = await fetchOrder(number, mail);
      if ("error" in result) {
        setError(result.error);
      } else if (opts?.guest) {
        setGuestOrder(result);
      } else {
        setSelected(result);
      }
      setLoading(false);
      return result;
    },
    []
  );

  const loadOrdersFor = useCallback(
    async (mail: string, orderToOpen?: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/orders/my-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: mail }),
        });
        const data = (await res.json()) as {
          success: boolean;
          error?: string;
          orders?: PublicOrder[];
        };
        if (!res.ok || !data.success) {
          setError(data.error || "Impossibile recuperare gli ordini");
          return;
        }
        const list = data.orders ?? [];
        setOrders(list);
        resolveReorder(list);

        const current = readCustomerSession() ?? { email: mail, name: "" };
        const updated: CustomerSession = { ...current, email: mail };
        const named = list.find((order) => order.customerName?.trim());
        if (named) updated.name = named.customerName.trim();
        if (!isUsableAddress(updated.savedAddress)) {
          const derived = addressFromOrder(list.find((order) => addressFromOrder(order)));
          if (derived) updated.savedAddress = derived;
        }
        if (updated.name !== current.name || updated.savedAddress !== current.savedAddress) {
          saveCustomerSession(updated);
          setSession(updated);
        }
        if (updated.savedAddress) {
          setAddressForm((prev) =>
            prev.street || prev.city ? prev : updated.savedAddress ?? EMPTY_SHIPPING_ADDRESS
          );
        }

        const target =
          (orderToOpen
            ? list.find((order) => order.id.toLowerCase() === orderToOpen.toLowerCase())
            : pickActiveOrder(list)) ?? undefined;
        if (target) {
          void lookupOrder(target.id, mail);
        } else if (orderToOpen) {
          void lookupOrder(orderToOpen, mail);
        }
      } catch {
        setError("Connessione non riuscita. Riprova tra qualche istante.");
      } finally {
        setLoading(false);
      }
    },
    [lookupOrder, resolveReorder]
  );

  const startSession = useCallback(
    (rawMail: string, orderToOpen?: string) => {
      const mail = normalizeEmail(rawMail);
      if (!mail) return;
      const existing = readCustomerSession();
      const reuse = existing && existing.email === mail ? existing : null;
      const next: CustomerSession = {
        email: mail,
        name: reuse?.name || guessNameFromEmail(mail),
        savedAddress: reuse?.savedAddress,
      };
      commitSession(next);
      setNameForm(next.name);
      setAddressForm(next.savedAddress ?? EMPTY_SHIPPING_ADDRESS);
      setError("");
      setOrders(null);
      setReorder(null);
      setSelected(null);
      setGuestOrder(null);
      setTab("orders");
      loadAppointments(mail);
      void loadOrdersFor(mail, orderToOpen);
    },
    [commitSession, loadAppointments, loadOrdersFor]
  );

  // Ripristino sessione / auto-login da URL (?email=... e ?order=...&email=...).
  // L'accesso a localStorage e gli aggiornamenti di stato sono differiti in un
  // microtask, così l'effetto si limita a sincronizzarsi con lo storage esterno.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    queueMicrotask(() => {
      const stored = readCustomerSession();
      const effectiveEmail = urlEmail || stored?.email || "";

      if (stored && stored.email === effectiveEmail) {
        loadAppointments(stored.email);
        void loadOrdersFor(stored.email, urlOrder || undefined);
        return;
      }
      if (effectiveEmail) {
        startSession(effectiveEmail, urlOrder || undefined);
      }
    });
  }, [loadAppointments, loadOrdersFor, startSession, urlEmail, urlOrder]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const favourites = useMemo<FavouriteProduct[]>(() => {
    if (!orders || orders.length === 0) return [];
    const resolvedByKey = new Map<string, ResolvedReorderProduct>();
    for (const product of reorder ?? []) {
      resolvedByKey.set(variantKey(product.productId, product.variantName), product);
    }

    const map = new Map<string, FavouriteProduct>();
    for (const order of orders) {
      for (const item of order.items) {
        const key = variantKey(item.productId, item.variantName);
        const resolved = resolvedByKey.get(key);
        const existing = map.get(key);
        if (existing) {
          existing.purchasedCount += item.quantity;
          if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderedAt).getTime()) {
            existing.lastOrderedAt = order.createdAt;
          }
          continue;
        }
        const shade = resolved?.shade;
        map.set(key, {
          key,
          productId: item.productId,
          slug: resolved?.slug ?? item.productId,
          name: resolved?.name ?? item.productTitle,
          brand: resolved?.brand ?? "Scelta Makeup",
          price: resolved?.price ?? item.price,
          image: resolved?.image ?? item.image ?? "",
          variantLabel: item.variantName ?? shade?.name,
          shade,
          purchasedCount: item.quantity,
          lastOrderedAt: order.createdAt,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime()
    );
  }, [orders, reorder]);

  const displayName = session?.name?.trim() || "Cliente";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const mail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(mail)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }
    startSession(mail, urlOrder || undefined);
  };

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError("Inserisci numero ordine ed email.");
      return;
    }
    void lookupOrder(orderNumber, email, { guest: true });
  };

  const handleLogout = () => {
    clearCustomerSession();
    setSession(null);
    setOrders(null);
    setSelected(null);
    setGuestOrder(null);
    setReorder(null);
    setAppointments([]);
    setEmail("");
    setOrderNumber("");
    setError("");
    setNameForm("");
    setAddressForm(EMPTY_SHIPPING_ADDRESS);
    setTab("orders");
  };

  const handleReorder = (favourite: FavouriteProduct) => {
    const cart = useCartStore.getState();
    cart.addItem({
      productId: favourite.productId,
      slug: favourite.slug,
      name: favourite.name,
      brand: favourite.brand,
      price: favourite.price,
      shade: favourite.shade
        ? {
            id: favourite.shade.id,
            name: favourite.shade.name,
            code: favourite.shade.code,
            hex: favourite.shade.hex,
            image: favourite.shade.image,
          }
        : undefined,
      image: favourite.image,
      quantity: 1,
    });
    cart.openCart();
    setToast(`Aggiunto al carrello: ${favourite.name}`);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const updated: CustomerSession = {
      ...session,
      name: nameForm.trim() || session.name,
      savedAddress: {
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        postalCode: addressForm.postalCode.trim(),
        province: addressForm.province.trim(),
      },
    };
    commitSession(updated);
    setAddressSaved(true);
    setToast("I tuoi dati sono stati aggiornati");
    window.setTimeout(() => setAddressSaved(false), 3000);
  };

  if (!isMounted) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-[#5E1788]">
        Caricamento Area Personale...
      </div>
    );
  }

  const tabs: { key: DashboardTab; label: string; Icon: typeof Package }[] = [
    { key: "orders", label: "I Miei Ordini", Icon: Package },
    { key: "reorder", label: "Riordino Rapido", Icon: Heart },
    { key: "appointments", label: "Appuntamenti", Icon: CalendarHeart },
    { key: "profile", label: "I Miei Dati", Icon: MapPin },
  ];

  return (
    <div className="min-h-[70vh] bg-brand-soft">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {guestOrder ? (
          <GuestOrderView
            order={guestOrder.order}
            tracking={guestOrder.tracking}
            onBack={() => {
              setGuestOrder(null);
              setError("");
            }}
          />
        ) : session ? (
          <section className="space-y-6">
            {/* Header dashboard */}
            <header className="bg-brand-royal relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                    Area Personale
                  </p>
                  <h1 className="mt-2 flex items-center gap-2 font-serif text-3xl font-semibold sm:text-4xl">
                    <Sparkles className="h-6 w-6 shrink-0 text-[#F3D9F1]" />
                    Bentornata, {displayName}
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-4 w-4 shrink-0" />
                    Atelier Scelta Makeup • {ATELIER_ADDRESS}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Esci
                </button>
              </div>
            </header>

            {/* Barra tab */}
            <div
              role="tablist"
              aria-label="Sezioni Area Personale"
              className="grid grid-cols-2 gap-1.5 rounded-3xl border border-[#D8C2E7]/60 bg-white p-1.5 shadow-sm sm:grid-cols-4"
            >
              {tabs.map(({ key, label, Icon }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(key)}
                    className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold transition-all sm:text-sm ${
                      active
                        ? "bg-[#5E1788] text-white shadow-sm"
                        : "text-[#5E1788] hover:bg-[#D8C2E7]/25"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {error}
              </p>
            )}

            {/* TAB 1 — Ordini & tracking */}
            {tab === "orders" && (
              <div className="space-y-6">
                {selected ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5E1788] hover:text-[#7A3293]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Torna all&apos;elenco ordini
                    </button>
                    <OrderTrackingCard order={selected.order} tracking={selected.tracking} />
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center gap-2 rounded-3xl border border-[#D8C2E7]/60 bg-white py-10 text-sm text-[#5E1788]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recupero dei tuoi ordini in corso...
                  </div>
                ) : null}

                <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
                      <Package className="h-5 w-5" />
                      I Miei Ordini
                    </h2>
                    <button
                      type="button"
                      onClick={() => void loadOrdersFor(session.email)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D8C2E7] px-3 py-1.5 text-xs font-semibold text-[#5E1788] transition-colors hover:bg-[#FAF7FC] disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      Aggiorna
                    </button>
                  </div>

                  {orders === null ? (
                    <p className="rounded-2xl bg-[#FAF7FC] px-4 py-6 text-center text-sm text-neutral-600">
                      {loading ? "Caricamento..." : "Nessun ordine da mostrare."}
                    </p>
                  ) : orders.length === 0 ? (
                    <div className="rounded-2xl bg-[#FAF7FC] px-4 py-8 text-center">
                      <ShoppingBag className="mx-auto h-8 w-8 text-[#D8C2E7]" />
                      <p className="mt-3 text-sm text-neutral-600">
                        Non abbiamo ancora ordini associati a questa email.
                      </p>
                      <Link
                        href="/prodotti"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5E1788] underline-offset-4 hover:underline"
                      >
                        Scopri le novità dell&apos;Atelier
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {orders.map((order) => {
                        const badge = ORDER_STATUS_LABELS[order.status];
                        const isSelected = selected?.order.id === order.id;
                        return (
                          <li key={order.id}>
                            <div
                              className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                                isSelected
                                  ? "border-[#5E1788]/50 shadow-sm"
                                  : "border-[#D8C2E7]/60"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => void lookupOrder(order.id, session.email)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="font-mono text-sm font-semibold text-[#5E1788]">
                                  {order.id}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {formatDate(order.createdAt)} · {order.items.length}{" "}
                                  {order.items.length === 1 ? "articolo" : "articoli"}
                                </p>
                                <p className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                                  <Truck className="h-3.5 w-3.5 text-[#D462A6]" />
                                  {order.fulfillmentType === "store_pickup"
                                    ? "Ritiro in Atelier"
                                    : order.courierName || "Spedizione corriere"}
                                </p>
                              </button>
                              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
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
                                <button
                                  type="button"
                                  onClick={() => void lookupOrder(order.id, session.email)}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#FAF7FC] px-3 py-2 text-xs font-semibold text-[#5E1788] transition-colors hover:bg-[#D8C2E7]/40"
                                >
                                  Dettagli &amp; Tracking
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2 — Riordino rapido */}
            {tab === "reorder" && (
              <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
                  <Heart className="h-5 w-5" />
                  Riordino Rapido — I Tuoi Preferiti
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  I prodotti che hai già acquistato, raccolti con la loro nuance esatta. Riordinali
                  con un solo tocco.
                </p>

                {orders === null || (reorderLoading && reorder === null) ? (
                  <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[#FAF7FC] py-10 text-sm text-[#5E1788]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Raccolgo i tuoi preferiti...
                  </div>
                ) : favourites.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-[#FAF7FC] px-4 py-8 text-center">
                    <Sparkles className="mx-auto h-8 w-8 text-[#D8C2E7]" />
                    <p className="mt-3 text-sm text-neutral-600">
                      Qui troverai i tuoi prodotti preferiti dopo il primo ordine.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {favourites.map((favourite) => (
                      <li
                        key={favourite.key}
                        className="flex gap-4 rounded-2xl border border-[#D8C2E7]/60 bg-white p-4"
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#FAF7FC]">
                          <Image
                            src={resolveProductImageUrl(favourite.image)}
                            alt={favourite.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D462A6]">
                            {favourite.brand}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-[#1F1B24]">
                            {favourite.name}
                          </p>
                          {favourite.variantLabel && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                              {favourite.shade && (
                                <span
                                  aria-hidden
                                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/10"
                                  style={{ backgroundColor: favourite.shade.hex }}
                                />
                              )}
                              {favourite.variantLabel}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                            <span className="text-sm font-semibold text-[#5E1788]">
                              {euro.format(favourite.price)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleReorder(favourite)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#5E1788] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#7A3293]"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              Riordina in 1 tap
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* TAB 3 — Appuntamenti in Atelier */}
            {tab === "appointments" && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
                    <CalendarHeart className="h-5 w-5" />
                    I Miei Appuntamenti in Salone
                  </h2>
                  {appointments.length === 0 ? (
                    <p className="mt-4 rounded-2xl bg-[#FAF7FC] px-4 py-6 text-center text-sm text-neutral-600">
                      Non hai ancora appuntamenti prenotati. Ti aspettiamo in Atelier!
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {appointments.map((appointment) => {
                        const badge = APPOINTMENT_STATUS[appointment.status];
                        return (
                          <li
                            key={appointment.id}
                            className="flex flex-col gap-2 rounded-2xl border border-[#D8C2E7]/60 bg-[#FAF7FC] p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1F1B24]">
                                {appointment.serviceName}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
                                <Clock className="h-3.5 w-3.5 text-[#D462A6]" />
                                {formatAppointment(appointment.date, appointment.time)}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                Con {appointment.operatorName} · Codice{" "}
                                <span className="font-mono font-semibold text-[#5E1788]">
                                  {appointment.bookingCode}
                                </span>
                              </p>
                            </div>
                            <span
                              className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Card promozionale luxury */}
                <div className="bg-brand-velvet relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#D462A6]/20 blur-3xl" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      -10% esclusivo online
                    </span>
                    <h3 className="mt-4 font-serif text-2xl font-semibold sm:text-3xl">
                      Prenota una Consulenza Make-Up o Trattamento Viso in Atelier
                    </h3>
                    <p className="mt-3 max-w-xl text-sm text-white/80">
                      Un consulto su misura con le nostre make-up artist per trovare la tua tonalità
                      perfetta. Prenotando online hai il 10% di sconto dedicato.
                    </p>
                    <div className="mt-5 space-y-1.5 text-sm text-white/80">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-[#F3D9F1]" />
                        {ATELIER_ADDRESS}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 text-[#F3D9F1]" />
                        {ATELIER_HOURS}
                      </p>
                    </div>
                    <Link
                      href="/prenota"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#5E1788] shadow-md transition-transform hover:scale-[1.02]"
                    >
                      <CalendarHeart className="h-4 w-4" />
                      Prenota un Appuntamento
                    </Link>
                  </div>
                </div>

                {/* Indicazioni stradali */}
                <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
                  <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
                    <Store className="h-5 w-5" />
                    L&apos;Atelier di Napoli
                  </h3>
                  <p className="mt-3 text-sm text-neutral-700">{ATELIER_ADDRESS}</p>
                  <p className="text-sm text-neutral-500">{ATELIER_HOURS}</p>
                  <a
                    href={ATELIER_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D8C2E7] px-4 py-2.5 text-sm font-semibold text-[#5E1788] transition-colors hover:bg-[#FAF7FC]"
                  >
                    <Navigation className="h-4 w-4" />
                    Indicazioni stradali su Google Maps
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* TAB 4 — Dati & indirizzo */}
            {tab === "profile" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
                    <User className="h-5 w-5" />
                    I Miei Dati
                  </h2>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Nome
                      </dt>
                      <dd className="mt-0.5 font-semibold text-[#1F1B24]">{displayName}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Email
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-2 text-[#1F1B24]">
                        <Mail className="h-4 w-4 text-[#7A3293]" />
                        {session.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Indirizzo di spedizione predefinito
                      </dt>
                      <dd className="mt-1">
                        {isUsableAddress(session.savedAddress) ? (
                          <address className="not-italic leading-relaxed text-neutral-700">
                            {session.savedAddress?.street}
                            <br />
                            {session.savedAddress?.postalCode} {session.savedAddress?.city}
                            {session.savedAddress?.province
                              ? ` (${session.savedAddress?.province})`
                              : ""}
                            <br />
                            Italia
                          </address>
                        ) : (
                          <span className="text-neutral-500">Nessun indirizzo salvato.</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <form
                  onSubmit={handleSaveProfile}
                  className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8"
                >
                  <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-[#5E1788]">
                    <MapPin className="h-5 w-5" />
                    Aggiorna l&apos;indirizzo
                  </h2>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label
                        htmlFor="profile-name"
                        className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
                      >
                        Nome e Cognome
                      </label>
                      <input
                        id="profile-name"
                        type="text"
                        value={nameForm}
                        onChange={(e) => setNameForm(e.target.value)}
                        placeholder="Il tuo nome"
                        autoComplete="name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="profile-street"
                        className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
                      >
                        Via e numero civico
                      </label>
                      <input
                        id="profile-street"
                        type="text"
                        value={addressForm.street}
                        onChange={(e) =>
                          setAddressForm((prev) => ({ ...prev, street: e.target.value }))
                        }
                        placeholder="Via Roma 1"
                        autoComplete="street-address"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <label
                          htmlFor="profile-cap"
                          className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
                        >
                          CAP
                        </label>
                        <input
                          id="profile-cap"
                          type="text"
                          value={addressForm.postalCode}
                          onChange={(e) =>
                            setAddressForm((prev) => ({ ...prev, postalCode: e.target.value }))
                          }
                          placeholder="80134"
                          autoComplete="postal-code"
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label
                          htmlFor="profile-city"
                          className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
                        >
                          Città
                        </label>
                        <input
                          id="profile-city"
                          type="text"
                          value={addressForm.city}
                          onChange={(e) =>
                            setAddressForm((prev) => ({ ...prev, city: e.target.value }))
                          }
                          placeholder="Napoli"
                          autoComplete="address-level2"
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label
                          htmlFor="profile-province"
                          className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
                        >
                          Provincia
                        </label>
                        <input
                          id="profile-province"
                          type="text"
                          value={addressForm.province}
                          onChange={(e) =>
                            setAddressForm((prev) => ({ ...prev, province: e.target.value }))
                          }
                          placeholder="NA"
                          autoComplete="address-level1"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className={`${primaryButtonClass} mt-6`}>
                    {addressSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {addressSaved ? "Dati salvati" : "Salva i miei dati"}
                  </button>
                </form>
              </div>
            )}

            <ConciergeBanner />
          </section>
        ) : (
          <LoginView
            email={email}
            orderNumber={orderNumber}
            loading={loading}
            error={error}
            onEmailChange={setEmail}
            onOrderNumberChange={setOrderNumber}
            onLogin={handleLogin}
            onQuickTrack={handleQuickTrack}
          />
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#1F1B24] px-5 py-3 text-sm font-semibold text-white shadow-xl">
            <Check className="h-4 w-4 text-[#D462A6]" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componenti di supporto                                              */
/* ------------------------------------------------------------------ */

interface LoginViewProps {
  email: string;
  orderNumber: string;
  loading: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onOrderNumberChange: (value: string) => void;
  onLogin: (e: React.FormEvent) => void;
  onQuickTrack: (e: React.FormEvent) => void;
}

function LoginView({
  email,
  orderNumber,
  loading,
  error,
  onEmailChange,
  onOrderNumberChange,
  onLogin,
  onQuickTrack,
}: LoginViewProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D462A6]">
          Area Riservata Clienti
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#5E1788] sm:text-5xl">
          La tua bellezza, con cura
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600">
          Accedi alla tua Area Personale per ritrovare i tuoi ordini, riordinare i tuoi preferiti e
          prenotare i tuoi appuntamenti in Atelier.
        </p>
      </div>

      <div className="rounded-3xl border border-[#D8C2E7]/60 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[#1F1B24]">
              La tua Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A3293]" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="nome@email.it"
                autoComplete="email"
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Accedi alla tua Area Personale
          </button>
        </form>

        <div className="my-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#D8C2E7]/60" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            oppure
          </span>
          <span className="h-px flex-1 bg-[#D8C2E7]/60" />
        </div>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl bg-[#FAF7FC] px-4 py-3 text-sm font-semibold text-[#5E1788]">
            <span className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4" />
              Hai solo un codice ordine? Traccia un singolo ordine
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <form onSubmit={onQuickTrack} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="quick-order"
                className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
              >
                Numero Ordine
              </label>
              <input
                id="quick-order"
                type="text"
                value={orderNumber}
                onChange={(e) => onOrderNumberChange(e.target.value)}
                placeholder="SC-ORD-2026-0001"
                autoComplete="off"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label
                htmlFor="quick-email"
                className="mb-1.5 block text-xs font-semibold text-[#1F1B24]"
              >
                Email utilizzata al checkout
              </label>
              <input
                id="quick-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="nome@email.it"
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={loading} className={softButtonClass}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageSearch className="h-4 w-4" />
              )}
              Visualizza Ordine
            </button>
          </form>
        </details>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface GuestOrderViewProps {
  order: PublicOrder;
  tracking: PacklinkTracking | null;
  onBack: () => void;
}

function GuestOrderView({ order, tracking, onBack }: GuestOrderViewProps) {
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5E1788] hover:text-[#7A3293]"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna all&apos;accesso
      </button>
      <OrderTrackingCard order={order} tracking={tracking} />
      <ConciergeBanner />
    </div>
  );
}

function ConciergeBanner() {
  return (
    <a
      href={buildWhatsAppUrl(
        "Salve Federica, avrei un dubbio sulla mia tonalità e vorrei un consiglio su misura"
      )}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-brand-orchid flex flex-col items-start justify-between gap-4 rounded-3xl p-6 text-white shadow-md transition-opacity hover:opacity-95 sm:flex-row sm:items-center sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="font-serif text-lg font-semibold">Beauty Concierge con Federica</p>
          <p className="mt-1 max-w-xl text-sm text-white/85">
            Hai dubbi sulla tua tonalità o desideri un consiglio su misura? Parla direttamente con
            Federica su WhatsApp.
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#5E1788]">
        <MessageCircle className="h-4 w-4" />
        Scrivi a Federica
      </span>
    </a>
  );
}
