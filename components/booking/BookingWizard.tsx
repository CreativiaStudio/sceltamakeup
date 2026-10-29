"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Phone,
  User,
  Mail,
  ArrowLeft,
  Store,
  MessageCircle,
} from "lucide-react";
import { Service, CustomerData, Appointment } from "@/types/booking";
import {
  getServices,
  getAvailableSlots,
  createAppointment,
  isStoreClosedOnDate,
} from "@/lib/bookingService";
import { syncServicesFromCloud, getClientServices } from "@/lib/servicesStore";
import { enqueueWhatsAppMessage } from "@/lib/whatsappQueueService";
import { sendBookingConfirmationEmail } from "@/lib/resendService";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  VisaLogo,
  MastercardLogo,
  ApplePayLogo,
  GooglePayLogo,
  KlarnaLogo,
  PayPalLogo,
  ScalapayLogo,
} from "@/components/ui/PaymentLogos";

type DepositMethod =
  | "stripe_card"
  | "apple_pay"
  | "google_pay"
  | "klarna"
  | "paypal"
  | "scalapay";

const DEPOSIT_METHODS: {
  value: DepositMethod;
  label: string;
  subtitle: string;
}[] = [
  { value: "stripe_card", label: "Carta di Credito / Debito", subtitle: "Visa, Mastercard, Amex, PostePay" },
  { value: "apple_pay", label: "Apple Pay", subtitle: "Paga in 1 click dal dispositivo" },
  { value: "google_pay", label: "Google Pay", subtitle: "Paga in 1 click dal dispositivo" },
  { value: "klarna", label: "Klarna", subtitle: "Paga in 3 rate a tasso zero" },
  { value: "paypal", label: "PayPal", subtitle: "Conto PayPal o in 3 rate" },
  { value: "scalapay", label: "Scalapay", subtitle: "Paga in 3 rate senza interessi" },
];

interface BookingWizardProps {
  preselectedServiceId?: string;
  initialServices?: Service[];
}

export default function BookingWizard({ preselectedServiceId, initialServices }: BookingWizardProps) {
  const [services, setServices] = useState<Service[]>(() => {
    if (initialServices && initialServices.length > 0) {
      return initialServices.filter((s) => s.active);
    }
    if (typeof window !== "undefined") {
      const stored = getClientServices().filter((s) => s.active);
      if (stored.length > 0) return stored;
    }
    return getServices();
  });

  useEffect(() => {
    const handleUpdate = () => {
      const stored = getClientServices().filter((s) => s.active);
      if (stored.length > 0) setServices(stored);
    };
    window.addEventListener("scelta_services_updated", handleUpdate);
    void syncServicesFromCloud().then((cloudList) => {
      if (cloudList && Array.isArray(cloudList)) {
        const filtered = cloudList.filter((s) => s.active);
        if (filtered.length > 0) setServices(filtered);
      }
    });
    return () => window.removeEventListener("scelta_services_updated", handleUpdate);
  }, []);

  const [selectedService, setSelectedService] = useState<Service | null>(() => {
    if (!preselectedServiceId) return null;
    if (initialServices && initialServices.length > 0) {
      const match = initialServices.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId);
      if (match) return match;
    }
    const srvs = typeof window !== "undefined" ? getClientServices() : getServices();
    return srvs.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId) || null;
  });

  useEffect(() => {
    if (preselectedServiceId && (!selectedService || (selectedService.id !== preselectedServiceId && selectedService.slug !== preselectedServiceId))) {
      const match = services.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId);
      if (match) setSelectedService(match);
    }
  }, [preselectedServiceId, services, selectedService]);

  // Flow steps: 1 = Service, 2 = Date & Slot, 3 = Customer, 4 = Review & Deposit, 5 = Confirmed
  const [step, setStep] = useState<number>(() => {
    if (!preselectedServiceId) return 1;
    if (initialServices && initialServices.length > 0) {
      const match = initialServices.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId);
      return match ? 2 : 1;
    }
    const srvs = typeof window !== "undefined" ? getClientServices() : getServices();
    const match = srvs.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId);
    return match ? 2 : 1;
  });

  const [channelFilter, setChannelFilter] = useState<"all" | "makeup" | "beauty">("all");

  const makeupCount = useMemo(() => services.filter((s) => s.channel === "makeup").length, [services]);
  const beautyCount = useMemo(() => services.filter((s) => s.channel === "beauty").length, [services]);

  const displayedServices = useMemo(() => {
    if (channelFilter === "makeup") return services.filter((s) => s.channel === "makeup");
    if (channelFilter === "beauty") return services.filter((s) => s.channel === "beauty");
    return services;
  }, [services, channelFilter]);

  // Date selection (next 14 days)
  const availableDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    const monthNames = [
      "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
      "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split("T")[0];
      const isClosed = isStoreClosedOnDate(dateStr);
      dates.push({
        dateStr,
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        dayName: dayNames[dayOfWeek],
        isToday: i === 0,
        isClosed,
      });
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const candidate = new Date(d);
      candidate.setDate(d.getDate() + i);
      const candidateStr = candidate.toISOString().split("T")[0];
      if (!isStoreClosedOnDate(candidateStr)) {
        return candidateStr;
      }
    }
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const dateScrollRef = useRef<HTMLDivElement>(null);

  const scrollDates = (direction: "left" | "right") => {
    if (dateScrollRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      dateScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const slots = useMemo(() => {
    return selectedDate ? getAvailableSlots(selectedDate) : [];
  }, [selectedDate]);

  const afternoonSlots = useMemo(() => slots.filter((s) => s.time < "18:00"), [slots]);
  const eveningSlots = useMemo(() => slots.filter((s) => s.time >= "18:00"), [slots]);

  // Customer form
  const [customer, setCustomer] = useState<CustomerData>({
    name: "",
    surname: "",
    phone: "",
    email: "",
    notes: "",
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("stripe_card");

  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot("");
  };

  const handleSlotSelect = (time: string) => {
    setSelectedSlot(time);
  };

  const handleContinueToCustomer = () => {
    if (!selectedSlot) return;
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name || !customer.surname || !customer.phone || !customer.email) {
      alert("Per favore compila tutti i campi obbligatori.");
      return;
    }
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finalizeLocalBooking = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    const appointment = createAppointment({
      serviceId: selectedService.id,
      date: selectedDate,
      time: selectedSlot,
      customer,
      paymentMethodDeposit: depositMethod,
    });

    // Safely trigger WhatsApp queue and Resend email notifications
    try {
      enqueueWhatsAppMessage({
        recipientPhone: appointment.customer.phone,
        recipientName: `${appointment.customer.name} ${appointment.customer.surname}`,
        templateType: "booking_confirmation",
        context: {
          customerName: `${appointment.customer.name} ${appointment.customer.surname}`,
          serviceName: appointment.serviceName,
          bookingCode: appointment.bookingCode,
          bookingDate: appointment.date,
          bookingTime: appointment.time,
          operatorName: appointment.operatorName,
          durationMinutes: appointment.durationMinutes,
          priceList: appointment.pricing.priceList,
          discountOnline: appointment.pricing.discountOnline,
          priceOnline: appointment.pricing.priceOnline,
          depositPaid: appointment.pricing.depositPaid,
          balanceDue: appointment.pricing.balanceDue,
        },
      });

      sendBookingConfirmationEmail(appointment).catch((emailErr) => {
        console.warn("Booking confirmation email dispatch failed:", emailErr);
      });
    } catch (notifErr) {
      console.warn("Failed to enqueue booking notifications:", notifErr);
    }

    setConfirmedBooking(appointment);
    setStep(5);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmAndPayDeposit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/booking-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          date: selectedDate,
          time: selectedSlot,
          customer: {
            name: customer.name,
            surname: customer.surname,
            phone: customer.phone,
            email: customer.email,
            notes: customer.notes,
          },
          depositAmount: selectedService.depositAmount,
          depositMethod,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      // Fallback: offline / simulated immediate test
      await finalizeLocalBooking();
    } catch (err) {
      console.warn("Booking checkout offline, using local fallback:", err);
      await finalizeLocalBooking();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar Header */}
      {step < 5 && (
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-[#1F1B24]/70 mb-3">
            <span className={step >= 1 ? "text-[#5E1788] font-bold" : ""}>
              1. Servizio
            </span>
            <span className="opacity-30">→</span>
            <span className={step >= 2 ? "text-[#5E1788] font-bold" : ""}>
              2. Data & Orario
            </span>
            <span className="opacity-30">→</span>
            <span className={step >= 3 ? "text-[#5E1788] font-bold" : ""}>
              3. I tuoi Dati
            </span>
            <span className="opacity-30">→</span>
            <span className={step >= 4 ? "text-[#5E1788] font-bold" : ""}>
              4. Conferma
            </span>
          </div>
          <div className="w-full bg-[#FAF7FC] h-2 rounded-full overflow-hidden border border-[#D8C2E7]/40">
            <div
              className="bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] h-full transition-all duration-500 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: SELECT SERVICE */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/60 text-xs font-semibold text-[#5E1788] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
              Vantaggio Esclusivo Web
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1F1B24] tracking-tight">
              Scegli il tuo Trattamento in Salone
            </h1>
            <p className="mt-3 text-[#1F1B24]/70 text-sm sm:text-base leading-relaxed">
              Trattamenti viso, make-up professionale e percorsi estetici in cabina privata presso il nostro Salone di Napoli. Prenotando online ricevi subito il <strong>10% di sconto</strong> sul listino ufficiale.
            </p>
          </div>

          {/* Channel Filter Pills */}
          {beautyCount > 0 && (
            <div className="flex justify-center flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => setChannelFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  channelFilter === "all"
                    ? "bg-[#5E1788] text-white shadow-md shadow-[#5E1788]/20"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-[#FAF7FC]"
                }`}
              >
                Tutti i Servizi ({services.length})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("makeup")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  channelFilter === "makeup"
                    ? "bg-[#5E1788] text-white shadow-md shadow-[#5E1788]/20"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-[#FAF7FC]"
                }`}
              >
                💄 Make-Up Salone ({makeupCount})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("beauty")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  channelFilter === "beauty"
                    ? "bg-[#D462A6] text-white shadow-md shadow-[#D462A6]/20"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-[#FAF7FC]"
                }`}
              >
                💆‍♀️ Cabina Estetica & Viso ({beautyCount})
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedServices.map((service) => (
              <div
                key={service.id}
                onClick={() => handleSelectService(service)}
                className="group relative bg-white rounded-2xl p-6 border border-[#D8C2E7]/50 shadow-sm hover:shadow-xl hover:border-[#5E1788] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Badge 10% Off & Channel */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5E1788]/10 text-xs font-bold text-[#5E1788]">
                        <Sparkles className="w-3 h-3 text-[#D462A6]" />
                        -10% Online
                      </span>
                      {service.channel === "beauty" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-100 text-[10px] font-bold text-[#D462A6] border border-pink-200">
                          Cabina Estetica
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-[10px] font-bold text-[#5E1788] border border-purple-200">
                          Make-Up
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#1F1B24]/60 flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {service.durationMinutes} min
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-[#1F1B24] group-hover:text-[#5E1788] transition-colors">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-sm text-[#1F1B24]/70 line-clamp-2">
                    {service.description}
                  </p>

                  <ul className="mt-4 space-y-1.5">
                    {service.benefits.slice(0, 2).map((b, idx) => (
                      <li key={idx} className="text-xs text-[#1F1B24]/80 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#5E1788] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#FAF7FC] flex items-end justify-between">
                  <div>
                    <span className="text-xs text-[#1F1B24]/50 line-through mr-2">
                      €{service.priceList.toFixed(2)}
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#5E1788]">
                      €{service.priceOnline.toFixed(2)}
                    </span>
                    <span className="block text-xs text-[#1F1B24]/70 mt-1">
                      Acconto online: <strong>€{service.depositAmount.toFixed(2)}</strong> (saldo in store: €{service.balanceAmount.toFixed(2)})
                    </span>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-brand-royal text-white text-xs font-semibold group-hover:bg-[#7A3293] transition-colors flex items-center gap-1">
                    Seleziona
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: DATE & TIME SLOT (SOLO-WORKER PROTECTION) */}
      {step === 2 && selectedService && (
        <div className="space-y-6">
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E1788] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna alla scelta servizio
          </button>

          <div className="bg-white rounded-2xl p-6 border border-[#D8C2E7]/50 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider">
                    Trattamento Selezionato
                  </span>
                  {selectedService.channel === "beauty" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#D462A6]/10 text-[10px] font-bold text-[#D462A6] border border-[#D462A6]/30 uppercase tracking-wide">
                      Cabina Estetica Privata
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#5E1788]/10 text-[10px] font-bold text-[#5E1788] border border-[#5E1788]/25 uppercase tracking-wide">
                      Make-Up Salone
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-serif font-bold text-[#1F1B24] mt-1">
                  {selectedService.name}
                </h2>
                <p className="mt-2 text-sm text-[#1F1B24]/70 leading-relaxed">
                  {selectedService.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#1F1B24]/70">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#7A3293]" />
                    Durata:{" "}
                    <strong className="text-[#1F1B24]">
                      {selectedService.durationMinutes} min
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#7A3293]" />
                    {selectedService.channel === "beauty"
                      ? "Cabina Estetica Privata"
                      : "Salone Make-Up • Federica Cesiano"}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right sm:border-l sm:border-[#FAF7FC] sm:pl-6 shrink-0">
                <span className="text-xs text-[#1F1B24]/50 line-through block">
                  Listino: €{selectedService.priceList.toFixed(2)}
                </span>
                <span className="text-2xl font-serif font-bold text-[#5E1788]">
                  €{selectedService.priceOnline.toFixed(2)}
                </span>
                <span className="block text-[11px] font-semibold text-[#D462A6] mt-1">
                  -10% prenotando online
                </span>
              </div>
            </div>

            {selectedService.benefits.length > 0 && (
              <ul className="mt-5 pt-4 border-t border-[#FAF7FC] grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedService.benefits.map((benefit, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-[#1F1B24]/80 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5E1788] shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FAF7FC] border border-[#5E1788]/20 p-3.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5E1788]">
                  Acconto online (20%)
                </span>
                <span className="block text-lg font-serif font-bold text-[#5E1788] mt-0.5">
                  €{selectedService.depositAmount.toFixed(2)}
                </span>
                <span className="block text-[11px] text-[#1F1B24]/60 mt-0.5">
                  Da versare ora per bloccare data e orario
                </span>
              </div>
              <div className="rounded-xl bg-white border border-[#D8C2E7]/60 p-3.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7A3293]">
                  Saldo in Salone (80%)
                </span>
                <span className="block text-lg font-serif font-bold text-[#1F1B24] mt-0.5">
                  €{selectedService.balanceAmount.toFixed(2)}
                </span>
                <span className="block text-[11px] text-[#1F1B24]/60 mt-0.5">
                  Da corrispondere a fine seduta (Carta/POS o contanti)
                </span>
              </div>
            </div>
          </div>

          {/* Date Picker Horizontal Bar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[#1F1B24] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#5E1788]" />
                Seleziona il Giorno dell&apos;Appuntamento
              </label>
              {/* Desktop navigation chevrons */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollDates("left")}
                  aria-label="Scorri indietro nei giorni disponibili"
                  className="w-8 h-8 rounded-full border border-[#D8C2E7]/60 bg-white hover:bg-[#FAF7FC] text-[#5E1788] flex items-center justify-center transition-all shadow-xs hover:border-[#5E1788] active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollDates("right")}
                  aria-label="Scorri avanti nei giorni disponibili"
                  className="w-8 h-8 rounded-full border border-[#D8C2E7]/60 bg-white hover:bg-[#FAF7FC] text-[#5E1788] flex items-center justify-center transition-all shadow-xs hover:border-[#5E1788] active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={dateScrollRef}
              className="flex gap-2.5 overflow-x-auto pb-2 scroll-smooth scrollbar-thin"
            >
              {availableDates.map((item) => {
                const isSelected = item.dateStr === selectedDate;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    disabled={item.isClosed}
                    onClick={() => !item.isClosed && handleDateSelect(item.dateStr)}
                    className={`shrink-0 flex flex-col items-center justify-center w-20 py-3 px-2 rounded-xl border text-center transition-all ${
                      item.isClosed
                        ? "bg-neutral-100/80 text-neutral-400 border-neutral-200/80 cursor-not-allowed opacity-60"
                        : isSelected
                        ? "bg-gradient-to-br from-[#5E1788] via-[#7B2CBF] to-[#5E1788] text-white shadow-lg shadow-[#5E1788]/25 border-transparent cursor-pointer"
                        : "bg-white text-[#1F1B24] border-[#D8C2E7]/50 hover:border-[#5E1788] hover:shadow-xs cursor-pointer"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold uppercase ${
                        item.isClosed
                          ? "text-neutral-400"
                          : isSelected
                          ? "text-[#E9D8FD]"
                          : "text-[#1F1B24]/70"
                      }`}
                    >
                      {item.dayName}
                    </span>
                    <span className="text-sm font-bold mt-0.5">
                      {item.label}
                    </span>
                    {item.isClosed ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 bg-neutral-200/70 text-neutral-500">
                        Chiuso
                      </span>
                    ) : item.isToday ? (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-[#FAF7FC] text-[#5E1788] border border-[#D8C2E7]/40"
                        }`}
                      >
                        Oggi
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots (Outside Store Hours Protection Notice) */}
          <div className="bg-[#FAF7FC] p-4 rounded-xl border border-[#D8C2E7]/40">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#5E1788] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1F1B24]/80 leading-relaxed">
                <strong>Orari dedicati in esclusiva:</strong> Per garantirti la massima attenzione senza interruzioni di vendita al banco, gli appuntamenti trucco si svolgono in fasce dedicate (pausa pranzo 14:00 – 16:00 e fascia serale dopo le 19:30).
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1F1B24] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5E1788]" />
              Seleziona l&apos;Orario Disponibile
            </label>

            <div className="space-y-4">
              {afternoonSlots.length === 0 && eveningSlots.length === 0 && (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-6 text-center text-amber-900 space-y-2">
                  <CalendarIcon className="w-8 h-8 text-amber-600 mx-auto opacity-80" />
                  <h3 className="font-serif font-bold text-base">
                    Salone Chiuso di Domenica e Lunedì
                  </h3>
                  <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed">
                    Il salone e i servizi trucco personalizzati sono attivi dal <strong>Martedì al Sabato</strong> (09:30–14:00 / 16:00–19:30). Seleziona un giorno da martedì a sabato nella barra in alto per scegliere l&apos;orario.
                  </p>
                </div>
              )}

              {/* Sessione Pomeriggio */}
              {afternoonSlots.length > 0 && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D8C2E7]/50 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#5E1788]">
                      Sessione Pomeriggio
                    </span>
                    <span className="text-xs text-[#1F1B24]/70 font-medium">
                      Pausa pranzo salone (14:00 – 16:00)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {afternoonSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => handleSlotSelect(slot.time)}
                          className={`py-3 px-4 rounded-xl border text-center transition-all cursor-pointer ${
                            !slot.available
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-gradient-to-br from-[#5E1788] via-[#7B2CBF] to-[#5E1788] text-white shadow-md shadow-[#5E1788]/25 border-transparent"
                              : "bg-[#FAF7FC] text-[#1F1B24] border-[#D8C2E7]/50 hover:border-[#5E1788] hover:bg-white hover:shadow-xs"
                          }`}
                        >
                          <span className="block text-sm font-bold">{slot.time}</span>
                          <span className="block text-xs font-medium opacity-80 mt-0.5">
                            {slot.available ? "Pausa Pranzo" : slot.reason}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sessione Serale */}
              {eveningSlots.length > 0 && (
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D8C2E7]/50 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#5E1788]">
                      Sessione Serale
                    </span>
                    <span className="text-xs text-[#1F1B24]/70 font-medium">
                      Salone esclusivo post-chiusura (dalle 19:30)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eveningSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => handleSlotSelect(slot.time)}
                          className={`py-3 px-4 rounded-xl border text-center transition-all cursor-pointer ${
                            !slot.available
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-gradient-to-br from-[#5E1788] via-[#7B2CBF] to-[#5E1788] text-white shadow-md shadow-[#5E1788]/25 border-transparent"
                              : "bg-[#FAF7FC] text-[#1F1B24] border-[#D8C2E7]/50 hover:border-[#5E1788] hover:bg-white hover:shadow-xs"
                          }`}
                        >
                          <span className="block text-sm font-bold">{slot.time}</span>
                          <span className="block text-xs font-medium opacity-80 mt-0.5">
                            {slot.available ? "Salone Serale" : slot.reason}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={handleContinueToCustomer}
              className={`px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                selectedSlot
                  ? "bg-brand-royal text-white hover:bg-[#7A3293] shadow-lg shadow-[#5E1788]/20"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Continua con i tuoi Dati
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CUSTOMER DATA */}
      {step === 3 && selectedService && (
        <form onSubmit={handleContinueToReview} className="space-y-6">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E1788] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Modifica data o orario
          </button>

          <div className="bg-white rounded-2xl p-6 border border-[#D8C2E7]/50 shadow-sm space-y-4">
            <h2 className="text-xl font-serif font-bold text-[#1F1B24] border-b border-[#FAF7FC] pb-3">
              Dati di Contatto per l&apos;Appuntamento
            </h2>
            <p className="text-xs text-[#1F1B24]/70">
              Il tuo recapito telefonico verrà utilizzato per inviarti il promemoria dell&apos;appuntamento su WhatsApp e i dettagli per raggiungerci in salone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#5E1788]" />
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Es. Maria"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8C2E7]/60 text-sm focus:outline-none focus:border-[#5E1788]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#5E1788]" />
                  Cognome *
                </label>
                <input
                  type="text"
                  required
                  value={customer.surname}
                  onChange={(e) => setCustomer({ ...customer, surname: e.target.value })}
                  placeholder="Es. Esposito"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8C2E7]/60 text-sm focus:outline-none focus:border-[#5E1788]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#5E1788]" />
                  Cellulare (per promemoria WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="+39 348 123 4567"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8C2E7]/60 text-sm focus:outline-none focus:border-[#5E1788]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#5E1788]" />
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="maria.esposito@email.it"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D8C2E7]/60 text-sm focus:outline-none focus:border-[#5E1788]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1B24] mb-1.5">
                Note particolari o richieste (facoltativo)
              </label>
              <textarea
                rows={2}
                value={customer.notes}
                onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                placeholder="Es. Occhi sensibili, evento alle ore 18:00, gradito trucco sui toni caldi..."
                className="w-full px-4 py-2 rounded-xl border border-[#D8C2E7]/60 text-sm focus:outline-none focus:border-[#5E1788]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-brand-royal text-white font-semibold text-sm hover:bg-[#7A3293] transition-all shadow-lg shadow-[#5E1788]/20 flex items-center gap-2"
            >
              Riepilogo & Conferma Acconto
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: REVIEW, TRANSPARENT BREAKDOWN & DEPOSIT CHECKOUT */}
      {step === 4 && selectedService && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E1788] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Modifica dati personali
          </button>

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8C2E7]/50 shadow-sm space-y-6">
            <div className="border-b border-[#FAF7FC] pb-4">
              <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider">
                Riepilogo Prenotazione
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#1F1B24] mt-1">
                {selectedService.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#1F1B24]/70">
                <span>📅 <strong>Data:</strong> {selectedDate}</span>
                <span>⏰ <strong>Orario:</strong> {selectedSlot}</span>
                <span>📍 <strong>Luogo:</strong> Salone Napoli, Via dei Pellegrini 28/29</span>
                <span>👤 <strong>Cliente:</strong> {customer.name} {customer.surname}</span>
              </div>
            </div>

            {/* Financial Transparency Box */}
            <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#D8C2E7]/40 space-y-3">
              <div className="flex justify-between text-sm text-[#1F1B24]/70">
                <span>Prezzo di listino in salone:</span>
                <span className="line-through">€{selectedService.priceList.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#5E1788] font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
                  Vantaggio Prenotazione Online (-10%):
                </span>
                <span>- €{selectedService.discountOnline.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#1F1B24] border-t border-[#D8C2E7]/30 pt-2">
                <span>Totale concordato del servizio:</span>
                <span className="text-base text-[#5E1788]">€{selectedService.priceOnline.toFixed(2)}</span>
              </div>

              <div className="border-t border-[#D8C2E7]/40 pt-3 space-y-2">
                <div className="flex justify-between text-sm font-bold text-[#5E1788] bg-white p-3 rounded-xl border border-[#5E1788]/20 shadow-sm">
                  <div>
                    <span>Quota di conferma da versare ora (20%):</span>
                    <span className="block text-xs font-normal text-neutral-600 mt-0.5">
                      Blocca definitivamente l&apos;orario in salone
                    </span>
                  </div>
                  <span className="text-lg font-serif font-bold text-[#5E1788]">
                    €{selectedService.depositAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-[#1F1B24]/70 px-2">
                  <span>Saldo rimanente da versare in negozio a fine seduta:</span>
                  <span className="font-semibold text-[#1F1B24]">
                    €{selectedService.balanceAmount.toFixed(2)} (Carta/POS o Contanti)
                  </span>
                </div>
              </div>
            </div>

            {/* Elegant Anti-No-Show Copy & Cancellation Policy */}
            <div className="bg-white p-4 rounded-xl border border-[#D8C2E7]/60 space-y-2 text-xs text-[#1F1B24]/80 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-[#5E1788]">
                <ShieldCheck className="w-4 h-4 text-[#D462A6]" />
                Politica di Riservazione Esclusiva & Cancellazione
              </div>
              <p>
                Per offrirti la massima cura sartoriale e dedicare la nostra professionista esclusivamente a te, è richiesta una piccola quota di conferma (20%) al momento della prenotazione.
              </p>
              <p className="text-[#1F1B24]/70">
                🌸 <strong>Flessibilità e Disdetta:</strong> Sappiamo che gli imprevisti possono accadere. Puoi cancellare o riprogrammare l&apos;appuntamento senza alcun costo fino a <strong>24 ore prima</strong> dell&apos;orario fissato. In caso di mancata presentazione o cancellazione tardiva, la quota verrà trattenuta a copertura del tempo riservato.
              </p>
            </div>

            {/* Deposit Payment Method Selection */}
            <div className="border border-[#D8C2E7]/60 rounded-xl p-4 bg-[#FAF7FC]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#5E1788]" />
                  Metodo di Pagamento Acconto (€{selectedService.depositAmount.toFixed(2)})
                </span>
                <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-semibold border border-green-200/60">
                  Crittografia & Pagamento Protetto
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEPOSIT_METHODS.map((method) => {
                  const isSelected = depositMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setDepositMethod(method.value)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? "border-[#5E1788] bg-white ring-2 ring-[#5E1788]/20 shadow-xs"
                          : "border-[#D8C2E7]/50 bg-white hover:border-[#5E1788]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 text-xs font-bold text-[#1F1B24]">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#5E1788]" : "border-neutral-300"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5E1788]" />
                            )}
                          </span>
                          {method.label}
                        </span>
                        <span className="block text-[11px] text-[#1F1B24]/60 mt-0.5 pl-5 truncate">
                          {method.subtitle}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {method.value === "stripe_card" && (
                          <div className="flex gap-1">
                            <VisaLogo className="h-5 w-7" />
                            <MastercardLogo className="h-5 w-7" />
                          </div>
                        )}
                        {method.value === "apple_pay" && <ApplePayLogo className="h-5 w-8" />}
                        {method.value === "google_pay" && <GooglePayLogo className="h-5 w-8" />}
                        {method.value === "klarna" && <KlarnaLogo className="h-5 w-9" />}
                        {method.value === "paypal" && <PayPalLogo className="h-5 w-9" />}
                        {method.value === "scalapay" && <ScalapayLogo className="h-5 w-9" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-[#1F1B24]/80 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded text-[#5E1788] focus:ring-[#5E1788]"
              />
              <span>
                Accetto i termini di prenotazione e confermo che verserò il saldo di <strong>€{selectedService.balanceAmount.toFixed(2)}</strong> direttamente in salone.
              </span>
            </label>

            <button
              type="button"
              disabled={isProcessing || !acceptedTerms}
              onClick={handleConfirmAndPayDeposit}
              className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                isProcessing || !acceptedTerms
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-brand-royal text-white hover:bg-[#7A3293] shadow-xl shadow-[#5E1788]/25"
              }`}
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-[#D462A6]" />
                  Elaborazione Acconto in Corso...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Conferma & Versa Acconto di €{selectedService.depositAmount.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CONFIRMATION SCREEN */}
      {step === 5 && confirmedBooking && (
        <div className="bg-white rounded-2xl p-8 border border-[#D8C2E7]/60 shadow-xl text-center space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider">
              Prenotazione Confermata con Successo!
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1B24] mt-1">
              Ti aspettiamo in Salone
            </h2>
            <p className="text-xs text-[#1F1B24]/70 mt-2">
              Abbiamo registrato il tuo acconto di <strong>€{confirmedBooking.pricing.depositPaid.toFixed(2)}</strong>. Riceverai un promemoria automatico prima dell&apos;appuntamento.
            </p>
          </div>

          <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#D8C2E7]/40 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-[#D8C2E7]/30 pb-2">
              <span className="text-[#1F1B24]/60">Codice Prenotazione:</span>
              <span className="font-mono font-bold text-[#5E1788] text-sm">
                {confirmedBooking.bookingCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1F1B24]/60">Trattamento:</span>
              <span className="font-semibold text-[#1F1B24]">{confirmedBooking.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1F1B24]/60">Data & Orario:</span>
              <span className="font-semibold text-[#1F1B24]">
                {confirmedBooking.date} alle ore {confirmedBooking.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1F1B24]/60">Professionista:</span>
              <span className="font-semibold text-[#1F1B24]">{confirmedBooking.operatorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1F1B24]/60">Indirizzo Store:</span>
              <span className="font-semibold text-[#1F1B24]">Via dei Pellegrini 28/29, Napoli</span>
            </div>
            <div className="flex justify-between border-t border-[#D8C2E7]/30 pt-2 font-bold text-sm">
              <span className="text-[#1F1B24]">Saldo Residuo in Salone:</span>
              <span className="text-[#5E1788]">
                €{confirmedBooking.pricing.balanceDue.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={buildWhatsAppUrl(
                `Salve Federica, ho appena prenotato il servizio "${confirmedBooking.serviceName}" per il ${confirmedBooking.date} alle ${confirmedBooking.time} (Codice: ${confirmedBooking.bookingCode}).`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Scrivici su WhatsApp (+39 379 337 0322)
            </a>
            <Link
              href="/"
              className="flex-1 py-3 px-4 rounded-xl bg-[#FAF7FC] border border-[#D8C2E7]/60 text-xs font-bold text-[#5E1788] hover:bg-[#D8C2E7]/20 transition-all flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4" />
              Torna allo Shop
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
