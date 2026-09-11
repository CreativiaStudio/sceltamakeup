"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  CheckCircle2,
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
} from "@/lib/bookingService";
import { enqueueWhatsAppMessage } from "@/lib/whatsappQueueService";
import { sendBookingConfirmationEmail } from "@/lib/resendService";
import { useWhatsAppModalStore } from "@/store/useWhatsAppModalStore";

interface BookingWizardProps {
  preselectedServiceId?: string;
}

export default function BookingWizard({ preselectedServiceId }: BookingWizardProps) {
  const openWhatsAppModal = useWhatsAppModalStore((state) => state.openModal);
  const services = useMemo(() => getServices("makeup"), []);

  const [selectedService, setSelectedService] = useState<Service | null>(() => {
    if (!preselectedServiceId) return null;
    const srvs = getServices("makeup");
    return srvs.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId) || null;
  });

  // Flow steps: 1 = Service, 2 = Date & Slot, 3 = Customer, 4 = Review & Deposit, 5 = Confirmed
  const [step, setStep] = useState<number>(() => {
    if (!preselectedServiceId) return 1;
    const srvs = getServices("makeup");
    const match = srvs.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId);
    return match ? 2 : 1;
  });

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
      dates.push({
        dateStr,
        label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        dayName: dayNames[dayOfWeek],
        isToday: i === 0,
      });
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const slots = useMemo(() => {
    return selectedDate ? getAvailableSlots(selectedDate) : [];
  }, [selectedDate]);

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

  const handleConfirmAndPayDeposit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setIsProcessing(true);

    // Simulate payment processing delay (Stripe intent confirmation)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const appointment = createAppointment({
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedSlot,
        customer,
        paymentMethodDeposit: "stripe_card",
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      alert("Errore durante la prenotazione: " + msg);
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
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7FC] border border-[#D8C2E7]/60 text-xs font-semibold text-[#5E1788] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
              Vantaggio Esclusivo Web
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1F1B24] tracking-tight">
              Scegli il tuo Trattamento Make-Up
            </h1>
            <p className="mt-3 text-[#1F1B24]/70 text-sm sm:text-base leading-relaxed">
              Tutte le sedute sono eseguite personalmente da <strong>Federica Cesiano</strong> presso la nostra boutique di Napoli. Prenotando online ricevi subito il <strong>10% di sconto</strong> sul listino ufficiale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => handleSelectService(service)}
                className="group relative bg-white rounded-2xl p-6 border border-[#D8C2E7]/50 shadow-sm hover:shadow-xl hover:border-[#5E1788] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Badge 10% Off */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5E1788]/10 text-xs font-bold text-[#5E1788]">
                      <Sparkles className="w-3 h-3 text-[#D462A6]" />
                      -10% Online
                    </span>
                    <span className="text-xs text-[#1F1B24]/60 flex items-center gap-1">
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
                    <span className="block text-[11px] text-[#1F1B24]/60 mt-0.5">
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

          <div className="bg-white rounded-2xl p-6 border border-[#D8C2E7]/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider">
                Trattamento Selezionato
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1F1B24]">
                {selectedService.name}
              </h2>
              <span className="text-xs text-[#1F1B24]/70">
                Durata: {selectedService.durationMinutes} min • Operatrice: Federica Cesiano
              </span>
            </div>
            <div className="text-right sm:border-l sm:border-[#FAF7FC] sm:pl-6">
              <span className="text-xs text-[#1F1B24]/50 line-through block">
                Listino: €{selectedService.priceList.toFixed(2)}
              </span>
              <span className="text-2xl font-serif font-bold text-[#5E1788]">
                €{selectedService.priceOnline.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Date Picker Horizontal Bar */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1B24] mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#5E1788]" />
              Seleziona il Giorno dell&apos;Appuntamento
            </label>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {availableDates.map((item) => {
                const isSelected = item.dateStr === selectedDate;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => handleDateSelect(item.dateStr)}
                    className={`shrink-0 flex flex-col items-center justify-center w-20 py-3 px-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                        : "bg-white text-[#1F1B24] border-[#D8C2E7]/50 hover:border-[#5E1788]"
                    }`}
                  >
                    <span className={`text-[11px] font-semibold uppercase ${isSelected ? "text-[#D8C2E7]" : "text-[#1F1B24]/60"}`}>
                      {item.dayName}
                    </span>
                    <span className="text-sm font-bold mt-0.5">
                      {item.label}
                    </span>
                    {item.isToday && (
                      <span className={`text-[9px] font-bold px-1 rounded mt-1 ${isSelected ? "bg-white/20 text-white" : "bg-[#FAF7FC] text-[#5E1788]"}`}>
                        Oggi
                      </span>
                    )}
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
                <strong>Orari dedicati in esclusiva:</strong> Per garantirti la massima attenzione senza interruzioni di vendita al banco, gli appuntamenti trucco si svolgono in fasce dedicate (pausa pranzo 13:30 – 15:30 e fascia serale dopo le 20:00).
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1F1B24] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5E1788]" />
              Seleziona l&apos;Orario Disponibile
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => handleSlotSelect(slot.time)}
                    className={`py-3 px-4 rounded-xl border text-center font-medium text-sm transition-all ${
                      !slot.available
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                        : isSelected
                        ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                        : "bg-white text-[#1F1B24] border-[#D8C2E7]/60 hover:border-[#5E1788]"
                    }`}
                  >
                    <span className="block font-bold">{slot.time}</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">
                      {slot.available ? (slot.time >= "20:00" ? "Serale" : "Pomeriggio") : slot.reason}
                    </span>
                  </button>
                );
              })}
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
              Il tuo recapito telefonico verrà utilizzato per inviarti il promemoria dell&apos;appuntamento su WhatsApp e i dettagli per raggiungerci in boutique.
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
                <span>📍 <strong>Luogo:</strong> Boutique Napoli, Via dei Pellegrini 28/29</span>
                <span>👤 <strong>Cliente:</strong> {customer.name} {customer.surname}</span>
              </div>
            </div>

            {/* Financial Transparency Box */}
            <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#D8C2E7]/40 space-y-3">
              <div className="flex justify-between text-sm text-[#1F1B24]/70">
                <span>Prezzo di listino in boutique:</span>
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
                    <span className="block text-[11px] font-normal text-[#1F1B24]/60">
                      Blocca definitivamente l&apos;orario in boutique
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

            {/* Card Payment Simulation Box */}
            <div className="border border-[#D8C2E7]/60 rounded-xl p-4 bg-[#FAF7FC]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#1F1B24] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#5E1788]" />
                  Pagamento Sicuro Acconto (€{selectedService.depositAmount.toFixed(2)})
                </span>
                <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded font-semibold">
                  Crittografia SSL 256-bit Stripe
                </span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  readOnly
                  value="•••• •••• •••• 4242 (Carta di Prova Protetto)"
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-[#D8C2E7]/50 text-gray-500 font-mono"
                />
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
                Accetto i termini di prenotazione e confermo che verserò il saldo di <strong>€{selectedService.balanceAmount.toFixed(2)}</strong> direttamente in boutique.
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
              Ti aspettiamo in Boutique
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
              <span className="text-[#1F1B24]">Saldo Residuo in Boutique:</span>
              <span className="text-[#5E1788]">
                €{confirmedBooking.pricing.balanceDue.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                openWhatsAppModal(
                  `Salve Federica, ho appena prenotato il servizio "${confirmedBooking.serviceName}" per il ${confirmedBooking.date} alle ${confirmedBooking.time} (Codice: ${confirmedBooking.bookingCode}).`,
                  `Prenotazione #${confirmedBooking.bookingCode}`
                )
              }
              className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Scrivici su WhatsApp (Demo)
            </button>
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
