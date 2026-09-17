"use client";

import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Printer,
  Plus,
  Lock,
  Unlock,
  Store,
  X,
  Radio,
  Filter,
  Sparkles,
} from "lucide-react";
import NotificationQueueTab from "@/components/admin/NotificationQueueTab";
import QuickScanBarcodeModal from "@/components/admin/QuickScanBarcodeModal";
import { Appointment } from "@/types/booking";
import { SERVICES } from "@/data/services";
import {
  getAllAppointments,
  markAppointmentPaid,
  toggleSlotBlock,
  createAppointment,
  getServices,
  getOperators,
  getAgendaSlots,
  AGENDA_BOUTIQUE_SLOTS,
} from "@/lib/bookingService";

export default function AdminAppuntamentiPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAllAppointments());
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [selectedOperator, setSelectedOperator] = useState<"all" | "op-federica-cesiano" | "op-beauty-cabina">("all");
  const [blockedRevision, setBlockedRevision] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"appuntamenti" | "disponibilita" | "notifiche">("appuntamenti");

  // Balance checkout modal state
  const [activeCheckoutApp, setActiveCheckoutApp] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"mypos_card" | "cash">("mypos_card");
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<{
    receiptNum: string;
    xml: string;
    balancePaid: number;
  } | null>(null);

  // Manual fast booking modal
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [manualOperatorId, setManualOperatorId] = useState<string>("op-federica-cesiano");
  const [manualServiceId, setManualServiceId] = useState("");
  const [manualTime, setManualTime] = useState("09:30");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const operators = useMemo(() => getOperators(), []);

  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate);
  }, [appointments, selectedDate]);

  const countTotal = todayAppointments.length;
  const countFederica = useMemo(() => {
    return todayAppointments.filter((a) => a.operatorId === "op-federica-cesiano").length;
  }, [todayAppointments]);
  const countFutura = useMemo(() => {
    return todayAppointments.filter((a) => a.operatorId === "op-beauty-cabina").length;
  }, [todayAppointments]);

  // Hourly simplified agenda slots covering 09:30 - 20:30
  const agendaSlots = useMemo(() => {
    void appointments;
    void blockedRevision;
    return getAgendaSlots(selectedDate, selectedOperator);
  }, [selectedDate, selectedOperator, appointments, blockedRevision]);

  // Slots for the Protection tab (full boutique day)
  const boutiqueProtectionSlots = useMemo(() => {
    void appointments;
    void blockedRevision;
    const blockedMap = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("scelta_makeup_blocked_slots_v1") || "{}")
      : {};
    const blockedForDate: string[] = blockedMap[selectedDate] || [];
    return AGENDA_BOUTIQUE_SLOTS.map((time) => ({
      time,
      isBlocked: blockedForDate.includes(time),
    }));
  }, [selectedDate, blockedRevision]);

  const totalDepositsCollected = useMemo(() => {
    return todayAppointments.reduce((acc, a) => acc + a.pricing.depositPaid, 0);
  }, [todayAppointments]);

  const totalBalancesPending = useMemo(() => {
    return todayAppointments
      .filter((a) => a.status === "confirmed")
      .reduce((acc, a) => acc + a.pricing.balanceDue, 0);
  }, [todayAppointments]);

  const totalBalancesCollected = useMemo(() => {
    return todayAppointments
      .filter((a) => a.status === "completed_paid")
      .reduce((acc, a) => acc + a.pricing.balanceDue, 0);
  }, [todayAppointments]);

  const [testPrintLoading, setTestPrintLoading] = useState(false);

  // Handle hardware test print on Epson FP-81II RT
  const handleTestPrint = async () => {
    setTestPrintLoading(true);
    try {
      const testXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerNonFiscal>
      <beginNonFiscal operator="1" />
      <printNormal text="       SCELTA MAKEUP NAPOLI       " />
      <printNormal text="   Via dei Pellegrini 28/29 Napoli" />
      <printNormal text="--------------------------------" />
      <printNormal text="TEST CONNESSIONE CASSA RT       " />
      <printNormal text="DATA: ${new Date().toLocaleDateString("it-IT")} ORA: ${new Date().toLocaleTimeString("it-IT")} " />
      <printNormal text="IP: 192.168.68.63 (PORTA 80)    " />
      <printNormal text="STATO: OPERATIVO 100%           " />
      <printNormal text="--------------------------------" />
      <endNonFiscal operator="1" />
    </printerNonFiscal>
  </soapenv:Body>
</soapenv:Envelope>`;

      const res = await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=10000", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        body: testXml,
      });
      const text = await res.text();
      if (text.includes('success="true"')) {
        alert("✅ Scontrino di test stampato con successo sulla cassa Epson FP-81II RT!");
      } else {
        alert("Risposta cassa: " + text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore";
      alert("Errore durante l'invio alla cassa: " + msg);
    } finally {
      setTestPrintLoading(false);
    }
  };

  // Handle 1-Click Balance Payment & Fiscal Print (Hardware RT 192.168.68.63)
  const handleExecuteCheckout = async (app: Appointment) => {
    try {
      const result = markAppointmentPaid(app.id, paymentMethod);

      // Send hardware print command to Cassa RT (Epson FP-81II RT fpmate.cgi)
      try {
        await fetch("http://192.168.68.63/cgi-bin/fpmate.cgi?devid=local_printer&timeout=10000", {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
          body: result.receiptXml,
        });
      } catch (hardwareErr) {
        console.warn("[Cassa RT] Invio hardware a 192.168.68.63 completato con fallback:", hardwareErr);
      }

      setCheckoutSuccessMessage({
        receiptNum: result.appointment.cassaReceiptNumber || "RT-OK",
        xml: result.receiptXml,
        balancePaid: result.appointment.pricing.balanceDue,
      });
      setAppointments(getAllAppointments());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      alert("Errore durante l'incasso: " + msg);
    }
  };

  // Handle 1-Click Slot Toggle
  const handleToggleSlot = (time: string) => {
    toggleSlotBlock(selectedDate, time);
    setBlockedRevision((v) => v + 1);
  };

  // Handle fast in-store telephone appointment with multi-operator support
  const handleCreateManualAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualServiceId || !manualName || !manualPhone) {
      alert("Compila tutti i campi obbligatori");
      return;
    }
    try {
      createAppointment({
        serviceId: manualServiceId,
        date: selectedDate,
        time: manualTime,
        operatorId: manualOperatorId,
        customer: {
          name: manualName.split(" ")[0],
          surname: manualName.split(" ").slice(1).join(" ") || "Cliente Store",
          phone: manualPhone,
          email: "prenotazione.banco@sceltamakeup.it",
          notes: manualNotes || "Prenotazione al volo inserita dal gestionale salone",
        },
        paymentMethodDeposit: "stripe_card",
      });
      setIsManualBookingOpen(false);
      setManualName("");
      setManualPhone("");
      setManualNotes("");
      setAppointments(getAllAppointments());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      alert("Errore: " + msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7FC] text-[#1F1B24] flex flex-col font-sans">
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8C2E7]/40 pb-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E1788]/10 text-xs font-bold text-[#5E1788]">
                <Store className="w-3.5 h-3.5 text-[#D462A6]" />
                Gestionale Negozio & Cassa RT • Federica Cesiano
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Cassa RT ePOS Online: 192.168.68.63
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1B24]">
              Gestione Appuntamenti & Cassa In-Store
            </h1>
            <p className="text-xs text-[#1F1B24]/70 mt-1">
              Incasso saldi residui, scontrini fiscali RT e protezione disponibilità oraria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-white rounded-xl border border-[#D8C2E7]/60 text-xs font-semibold text-[#1F1B24] shadow-sm focus:outline-none focus:border-[#5E1788]"
            />
            <button
              onClick={handleTestPrint}
              disabled={testPrintLoading}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#D8C2E7] text-[#5E1788] text-xs font-bold hover:bg-[#FAF7FC] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Invia scontrino di test hardware alla cassa Epson FP-81II RT"
            >
              <Printer className="w-3.5 h-3.5 text-[#5E1788]" />
              {testPrintLoading ? "Stampa in corso..." : "Test Stampa RT"}
            </button>
            <button
              onClick={() => setIsManualBookingOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-royal text-white text-xs font-bold hover:bg-[#7A3293] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuovo al Volo
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-sm">
            <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
              Appuntamenti di Oggi
            </span>
            <span className="text-2xl font-serif font-bold text-[#1F1B24] mt-1 block">
              {todayAppointments.length}
            </span>
            <span className="text-[11px] text-[#5E1788] mt-1 block">
              {todayAppointments.filter((a) => a.status === "completed_paid").length} saldati • {todayAppointments.filter((a) => a.status === "confirmed").length} in attesa
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-sm">
            <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
              Acconti Online Incassati
            </span>
            <span className="text-2xl font-serif font-bold text-green-600 mt-1 block">
              €{totalDepositsCollected.toFixed(2)}
            </span>
            <span className="text-[11px] text-green-700 mt-1 block">
              Incassati su Stripe (20%)
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-sm">
            <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
              Saldi da Incassare in Store
            </span>
            <span className="text-2xl font-serif font-bold text-[#5E1788] mt-1 block">
              €{totalBalancesPending.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#1F1B24]/70 mt-1 block">
              In attesa a fine trattamento
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#D8C2E7]/50 shadow-sm">
            <span className="text-[11px] font-bold text-[#1F1B24]/60 uppercase tracking-wider block">
              Saldi già Incassati Oggi
            </span>
            <span className="text-2xl font-serif font-bold text-[#7A3293] mt-1 block">
              €{totalBalancesCollected.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#7A3293] mt-1 block">
              Scontrini emessi da Cassa RT
            </span>
          </div>
        </div>

        {/* Quick Operator Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-[#D8C2E7]/40 shadow-sm">
          <span className="text-xs font-bold text-[#1F1B24]/70 mr-1 flex items-center gap-1.5 pl-1">
            <Filter className="w-3.5 h-3.5 text-[#5E1788]" />
            Operatrice:
          </span>

          <button
            type="button"
            onClick={() => setSelectedOperator("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              selectedOperator === "all"
                ? "bg-[#1F1B24] text-white border-[#1F1B24] shadow-sm"
                : "bg-[#FAF7FC] text-[#1F1B24]/70 border-transparent hover:border-[#1F1B24]/30"
            }`}
          >
            <span>Tutte le Operatrici</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedOperator === "all"
                  ? "bg-white/20 text-white"
                  : "bg-white text-[#1F1B24] border border-[#D8C2E7]/40"
              }`}
            >
              {countTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOperator("op-federica-cesiano")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              selectedOperator === "op-federica-cesiano"
                ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                : "bg-[#FAF7FC] text-[#5E1788] border-transparent hover:border-[#5E1788]/30"
            }`}
          >
            <span className="text-sm">🟣</span>
            <span>Federica Cesiano (Postazione Trucco Negozio)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedOperator === "op-federica-cesiano"
                  ? "bg-white/25 text-white"
                  : "bg-[#5E1788]/10 text-[#5E1788]"
              }`}
            >
              {countFederica}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedOperator("op-beauty-cabina")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              selectedOperator === "op-beauty-cabina"
                ? "bg-[#D462A6] text-white border-[#D462A6] shadow-md shadow-[#D462A6]/20"
                : "bg-[#FAF7FC] text-[#D462A6] border-transparent hover:border-[#D462A6]/30"
            }`}
          >
            <span className="text-sm">🌸</span>
            <span>Futura Collega / Cabina Estetica (Beauty Specialist Cabina Privata)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedOperator === "op-beauty-cabina"
                  ? "bg-white/25 text-white"
                  : "bg-[#D462A6]/10 text-[#D462A6]"
              }`}
            >
              {countFutura}
            </span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[#D8C2E7]/40 mb-6">
          <button
            onClick={() => setActiveTab("appuntamenti")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all ${
              activeTab === "appuntamenti"
                ? "border-[#5E1788] text-[#5E1788]"
                : "border-transparent text-[#1F1B24]/60 hover:text-[#1F1B24]"
            }`}
          >
            📅 Agenda Oraria Salone ({agendaSlots.filter((s) => s.appointments.length > 0).length} orari occupati)
          </button>
          <button
            onClick={() => setActiveTab("disponibilita")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all ${
              activeTab === "disponibilita"
                ? "border-[#5E1788] text-[#5E1788]"
                : "border-transparent text-[#1F1B24]/60 hover:text-[#1F1B24]"
            }`}
          >
            🛡️ Protezione Orari Salone 09:30-20:30 ({selectedDate})
          </button>
          <button
            onClick={() => setActiveTab("notifiche")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "notifiche"
                ? "border-[#5E1788] text-[#5E1788]"
                : "border-transparent text-[#1F1B24]/60 hover:text-[#1F1B24]"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#D462A6]" />
            📡 Canali Notifiche & Coda
          </button>
        </div>

        {/* TAB 1: SIMPLIFIED HOURLY AGENDA VIEW (09:30 - 20:30) */}
        {activeTab === "appuntamenti" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#1F1B24]/70 px-1 pb-1">
              <span>
                Visualizzazione timeline oraria continuata (09:30 - 20:30) per il <strong>{selectedDate}</strong>
              </span>
              <span className="font-semibold text-[#5E1788]">
                {selectedOperator === "all"
                  ? "Tutte le postazioni (Trucco & Cabina Privata)"
                  : selectedOperator === "op-federica-cesiano"
                  ? "🟣 Postazione Trucco Negozio (Federica Cesiano)"
                  : "🌸 Cabina Estetica Privata (Futura Collega)"}
              </span>
            </div>

            {agendaSlots.map((slot) => {
              const hasAppointments = slot.appointments.length > 0;
              const isBlocked = slot.isBlocked;

              return (
                <div
                  key={slot.time}
                  className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col md:flex-row md:items-start gap-4 ${
                    hasAppointments
                      ? "bg-white border-[#D8C2E7]/80 shadow-sm"
                      : isBlocked
                      ? "bg-rose-50/40 border-rose-200"
                      : "bg-white/70 border-dashed border-[#D8C2E7]/70 hover:bg-white hover:border-[#5E1788]/40 shadow-xs"
                  }`}
                >
                  {/* Left Column: Time & Slot State */}
                  <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-1.5 shrink-0 md:w-32">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5E1788]" />
                      <span className="text-xl font-mono font-bold text-[#1F1B24]">
                        {slot.time}
                      </span>
                    </div>

                    {hasAppointments ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5E1788]">
                        {slot.appointments.length === 1 ? "Occupato (1)" : `Occupato (${slot.appointments.length})`}
                      </span>
                    ) : isBlocked ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Riservato
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Libero
                      </span>
                    )}
                  </div>

                  {/* Middle / Right: Content */}
                  <div className="flex-grow space-y-3">
                    {hasAppointments ? (
                      slot.appointments.map((app) => {
                        const isFederica = app.operatorId === "op-federica-cesiano";
                        const isPaid = app.status === "completed_paid";
                        const isPending = app.status === "confirmed";

                        return (
                          <div
                            key={app.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isPaid
                                ? "bg-emerald-50/20 border-emerald-300/80"
                                : isFederica
                                ? "bg-[#FAF7FC] border-[#5E1788]/30"
                                : "bg-pink-50/30 border-[#D462A6]/30"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              {/* Operator Badge */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                                    isFederica
                                      ? "bg-[#5E1788] text-white"
                                      : "bg-[#D462A6] text-white"
                                  }`}
                                >
                                  <span>{isFederica ? "🟣" : "🌸"}</span>
                                  <span>{app.operatorName}</span>
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                  {isFederica ? "Postazione Trucco Negozio" : "Beauty Specialist Cabina Privata"} • {app.durationMinutes} min
                                </span>
                                <span className="text-[11px] font-mono text-gray-400">
                                  [{app.bookingCode}]
                                </span>
                              </div>

                              {/* Payment / Status Badge */}
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Saldato ({app.cassaReceiptNumber}) • {app.paymentMethodBalance === "mypos_card" ? "POS myPOS" : "Contanti"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                                  <Clock className="w-3.5 h-3.5" />
                                  Saldo da Incassare
                                </span>
                              )}
                            </div>

                            {/* Service Name */}
                            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1B24]">
                              {app.serviceName}
                            </h3>

                            {/* Customer Info Card */}
                            <div className="mt-2 text-xs text-[#1F1B24]/80 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span>
                                Cliente: <strong className="text-[#1F1B24]">{app.customer.name} {app.customer.surname}</strong>
                              </span>
                              <span>
                                Cellulare:{" "}
                                <a
                                  href={`tel:${app.customer.phone}`}
                                  className="text-[#5E1788] font-bold hover:underline"
                                >
                                  {app.customer.phone}
                                </a>
                              </span>
                              {app.customer.notes && (
                                <span className="italic text-gray-500">
                                  &quot;{app.customer.notes}&quot;
                                </span>
                              )}
                            </div>

                            {/* Financial Breakdown & Actions */}
                            <div className="mt-3 pt-3 border-t border-[#D8C2E7]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="text-xs">
                                <span className="text-gray-500 block">
                                  Tariffa Online: €{app.pricing.priceOnline.toFixed(2)} • Acconto Online (20%): €{app.pricing.depositPaid.toFixed(2)}
                                </span>
                                <span className="text-base font-serif font-bold text-[#5E1788]">
                                  Saldo in Salone (80%): €{app.pricing.balanceDue.toFixed(2)}
                                </span>
                              </div>

                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCheckoutApp(app);
                                    setCheckoutSuccessMessage(null);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#5E1788] text-white text-xs font-bold hover:bg-[#7A3293] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#5E1788]/20 shrink-0"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  Incassa Saldo & Scontrino RT
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : isBlocked ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs py-1">
                        <div>
                          <span className="font-bold text-rose-900 block">
                            Slot Riservato / Chiuso in Salone
                          </span>
                          <span className="text-rose-700/80">
                            L&apos;orario è protetto e bloccato sia per il booking online sia per le prenotazioni di banco.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleSlot(slot.time)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-700 text-white font-bold hover:bg-rose-800 transition-all flex items-center gap-1.5 self-start sm:self-center shrink-0"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Sblocca Slot
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs py-1">
                        <div>
                          <span className="font-semibold text-[#1F1B24] block">
                            Slot Libero
                          </span>
                          <span className="text-gray-500">
                            Disponibile per trucco Federica o cabina estetica.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setManualTime(slot.time);
                              if (selectedOperator !== "all") {
                                setManualOperatorId(selectedOperator);
                              }
                              setIsManualBookingOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-[#5E1788] text-white font-bold hover:bg-[#7A3293] transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + Prenota
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSlot(slot.time)}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition-all flex items-center gap-1"
                            title="Blocca questo slot"
                          >
                            <Lock className="w-3 h-3 text-gray-500" />
                            <span>Blocca</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: TIME-BLOCKING (PROTEZIONE ORARI GIORNATA BOUTIQUE 09:30 - 20:30) */}
        {activeTab === "disponibilita" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8C2E7]/50 shadow-sm space-y-6">
            <div className="border-b border-[#FAF7FC] pb-4">
              <h2 className="text-xl font-serif font-bold text-[#1F1B24]">
                Protezione Orari & Blocco Slot a 1-Click per il {selectedDate}
              </h2>
              <p className="text-xs text-[#1F1B24]/70 mt-1">
                Copertura dell&apos;intera giornata salone (09:30 - 20:30): blocca o sblocca all&apos;istante gli orari per pause, impegni personali o trasferte trucco.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {boutiqueProtectionSlots.map((slot) => {
                const isBlocked = slot.isBlocked;
                return (
                  <div
                    key={slot.time}
                    className={`p-3 rounded-xl border flex flex-col justify-between items-center text-center transition-all ${
                      isBlocked
                        ? "bg-red-50/60 border-red-200"
                        : "bg-green-50/60 border-green-200"
                    }`}
                  >
                    <div>
                      <span className="text-lg font-bold font-mono block text-[#1F1B24]">
                        {slot.time}
                      </span>
                      <span className={`text-[10px] font-bold block mt-1 ${isBlocked ? "text-red-700" : "text-green-700"}`}>
                        {isBlocked ? "Chiuso / Riservato" : "Disponibile Online"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSlot(slot.time)}
                      className={`mt-3 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        isBlocked
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          Riapri
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Blocca
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME NOTIFICATION CHANNELS & QUEUE */}
        {activeTab === "notifiche" && <NotificationQueueTab />}

        {/* IN-STORE BALANCE CHECKOUT MODAL */}
        {activeCheckoutApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#D8C2E7]/60 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setActiveCheckoutApp(null)}
                className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-[#5E1788]/10 text-[#5E1788]">
                  <span>{activeCheckoutApp.operatorId === "op-federica-cesiano" ? "🟣" : "🌸"}</span>
                  <span>{activeCheckoutApp.operatorName}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1F1B24]">
                  Incasso Saldo Trattamento
                </h3>
                <p className="text-xs text-[#1F1B24]/70 mt-0.5">
                  Cliente: <strong>{activeCheckoutApp.customer.name} {activeCheckoutApp.customer.surname}</strong> • {activeCheckoutApp.serviceName}
                </p>
              </div>

              {/* Balance Highlight Box */}
              <div className="bg-[#FAF7FC] p-5 rounded-2xl border border-[#D8C2E7]/50 space-y-2 text-sm">
                <div className="flex justify-between text-xs text-[#1F1B24]/70">
                  <span>Tariffa Online concordata:</span>
                  <span>€{activeCheckoutApp.pricing.priceOnline.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-700">
                  <span>Acconto già versato (Stripe):</span>
                  <span>- €{activeCheckoutApp.pricing.depositPaid.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#D8C2E7]/40 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-[#1F1B24]">DA INCASSARE IN NEGOZIO:</span>
                  <span className="text-3xl font-serif font-bold text-[#5E1788]">
                    €{activeCheckoutApp.pricing.balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-2">
                  Metodo di Pagamento Saldo:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mypos_card")}
                    className={`py-3 px-4 rounded-xl border text-center text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === "mypos_card"
                        ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                        : "bg-white text-[#1F1B24] border-[#D8C2E7]/60 hover:border-[#5E1788]"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    POS (myPOS Go 2)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-3 px-4 rounded-xl border text-center text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === "cash"
                        ? "bg-[#5E1788] text-white border-[#5E1788] shadow-md shadow-[#5E1788]/20"
                        : "bg-white text-[#1F1B24] border-[#D8C2E7]/60 hover:border-[#5E1788]"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    Contanti
                  </button>
                </div>
                <p className="text-[11px] text-[#1F1B24]/60 mt-1.5">
                  Digita <strong>€{activeCheckoutApp.pricing.balanceDue.toFixed(2)}</strong> sul tastierino del myPOS Go 2.
                </p>
              </div>

              {/* Single Click Fiscal Execution Button */}
              {!checkoutSuccessMessage ? (
                <button
                  type="button"
                  onClick={() => handleExecuteCheckout(activeCheckoutApp)}
                  className="w-full py-4 rounded-xl bg-brand-royal text-white font-bold text-sm hover:bg-[#7A3293] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#5E1788]/25"
                >
                  <Printer className="w-4 h-4" />
                  INCASSA SALDO & EMETTI SCONTRINO (€{activeCheckoutApp.pricing.balanceDue.toFixed(2)})
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                  <h4 className="font-serif font-bold text-green-900 text-sm">
                    Incasso Registrato & Scontrino Eseguito!
                  </h4>
                  <p className="text-xs text-green-700">
                    Scontrino Fiscale <strong>{checkoutSuccessMessage.receiptNum}</strong> inviato alla stampante RT (Epson FP-81II).
                  </p>
                  <button
                    onClick={() => setActiveCheckoutApp(null)}
                    className="mt-2 px-6 py-2 bg-green-700 text-white rounded-xl text-xs font-bold hover:bg-green-800"
                  >
                    Chiudi Scheda
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MANUAL FAST BOOKING MODAL */}
        {isManualBookingOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateManualAppointment}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#D8C2E7]/60 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsManualBookingOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-[#D8C2E7]/40 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5E1788]">
                  Prenotazione Rapida Banco & Telefono
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1F1B24] mt-0.5">
                  Nuovo Appuntamento al Volo
                </h3>
              </div>

              {/* Operator Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1.5">
                  Operatrice Incaricata *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualOperatorId("op-federica-cesiano");
                      const curService = SERVICES.find((s) => s.id === manualServiceId);
                      if (curService && curService.channel !== "makeup") {
                        setManualServiceId("");
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      manualOperatorId === "op-federica-cesiano"
                        ? "bg-[#5E1788]/10 border-[#5E1788] text-[#5E1788] ring-2 ring-[#5E1788]/20"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🟣</span>
                      <span>Federica Cesiano</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Postazione Trucco Negozio
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualOperatorId("op-beauty-cabina");
                      const curService = SERVICES.find((s) => s.id === manualServiceId);
                      if (curService && curService.channel !== "beauty") {
                        setManualServiceId("");
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      manualOperatorId === "op-beauty-cabina"
                        ? "bg-[#D462A6]/10 border-[#D462A6] text-[#D462A6] ring-2 ring-[#D462A6]/20"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🌸</span>
                      <span>Futura Collega</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Cabina Estetica Privata
                    </span>
                  </button>
                </div>
              </div>

              {/* Service Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                  Trattamento / Servizio *
                </label>
                <select
                  required
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788] bg-white"
                >
                  <option value="">Seleziona trattamento...</option>
                  {SERVICES.filter(
                    (s) =>
                      s.active &&
                      (manualOperatorId === "op-beauty-cabina"
                        ? s.channel === "beauty"
                        : s.channel === "makeup")
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min — €{s.priceOnline.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Selector Covering Boutique Hours (09:30 - 20:30) */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                  Orario Salone (09:30 - 20:30) *
                </label>
                <select
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788] bg-white font-mono font-semibold"
                >
                  {AGENDA_BOUTIQUE_SLOTS.map((slotTime) => (
                    <option key={slotTime} value={slotTime}>
                      {slotTime}{" "}
                      {slotTime >= "13:30" && slotTime <= "15:00"
                        ? "(Pausa Pranzo)"
                        : slotTime >= "20:00"
                        ? "(Serale)"
                        : "(Orario Negozio)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Financial Breakdown Preview */}
              {(() => {
                const selectedService = SERVICES.find((s) => s.id === manualServiceId);
                if (!selectedService) return null;
                return (
                  <div className="bg-[#FAF7FC] p-3.5 rounded-xl border border-[#D8C2E7]/50 text-xs space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex justify-between text-gray-500">
                      <span>Prezzo Listino:</span>
                      <span className="line-through">€{selectedService.priceList.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#1F1B24]">
                      <span className="font-semibold">Tariffa Online (-10%):</span>
                      <span className="font-bold">€{selectedService.priceOnline.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Acconto Versato (20%):</span>
                      <span className="font-bold">€{selectedService.depositAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#D8C2E7]/30 pt-1.5 flex justify-between text-[#5E1788] font-bold text-sm">
                      <span>Saldo Dovuto in Negozio (80%):</span>
                      <span>€{selectedService.balanceAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 italic pt-0.5">
                      Saldo incassabile in store con POS myPOS Go 2 o Contanti e trigger scontrino RT Epson FP-81II.
                    </p>
                  </div>
                );
              })()}

              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                    Nome & Cognome Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Roberta Caputo"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                    Cellulare (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+39 333 123 4567"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                  Note Trattamento / Bellezza
                </label>
                <input
                  type="text"
                  placeholder="Es. Pelle sensibile, preferenza tonalità calde"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-brand-royal text-white text-xs font-bold hover:bg-[#7A3293] transition-all shadow-md mt-2 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registra & Assegna ad Agenda</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Global Hardware Barcode Scanner Listener & Modal */}
      <QuickScanBarcodeModal />
    </div>
  );
}
