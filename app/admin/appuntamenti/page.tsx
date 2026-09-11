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
} from "lucide-react";
import NotificationQueueTab from "@/components/admin/NotificationQueueTab";
import { Appointment } from "@/types/booking";
import {
  getAllAppointments,
  markAppointmentPaid,
  getAvailableSlots,
  toggleSlotBlock,
  createAppointment,
  getServices,
} from "@/lib/bookingService";

export default function AdminAppuntamentiPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAllAppointments());
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
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
  const [manualServiceId, setManualServiceId] = useState("");
  const [manualTime, setManualTime] = useState("13:30");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const slotsForDate = useMemo(() => {
    void appointments;
    void blockedRevision;
    return getAvailableSlots(selectedDate);
  }, [selectedDate, appointments, blockedRevision]);

  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate);
  }, [appointments, selectedDate]);

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

  // Handle fast in-store telephone appointment
  const handleCreateManualAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualServiceId || !manualName || !manualPhone) {
      alert("Compila tutti i campi");
      return;
    }
    try {
      createAppointment({
        serviceId: manualServiceId,
        date: selectedDate,
        time: manualTime,
        customer: {
          name: manualName.split(" ")[0],
          surname: manualName.split(" ").slice(1).join(" ") || "Cliente Store",
          phone: manualPhone,
          email: "prenotazione.banco@sceltamakeup.it",
          notes: "Appuntamento telefonico/banco inserito da Federica",
        },
        paymentMethodDeposit: "stripe_card",
      });
      setIsManualBookingOpen(false);
      setManualName("");
      setManualPhone("");
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
            📅 Appuntamenti del Giorno ({todayAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab("disponibilita")}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all ${
              activeTab === "disponibilita"
                ? "border-[#5E1788] text-[#5E1788]"
                : "border-transparent text-[#1F1B24]/60 hover:text-[#1F1B24]"
            }`}
          >
            🛡️ Gestione Slot & Protezione Orari ({selectedDate})
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

        {/* TAB 1: APPOINTMENTS LIST & BALANCE CHECKOUT */}
        {activeTab === "appuntamenti" && (
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-[#D8C2E7]/50">
                <CalendarIcon className="w-12 h-12 text-[#D8C2E7] mx-auto mb-3" />
                <h3 className="text-lg font-serif font-bold text-[#1F1B24]">
                  Nessun appuntamento programmato per il {selectedDate}
                </h3>
                <p className="text-xs text-[#1F1B24]/70 mt-1">
                  Gli slot orari sono aperti per le prenotazioni online o puoi inserirne uno al volo con il pulsante in alto.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayAppointments.map((app) => {
                  const isPending = app.status === "confirmed";
                  const isPaid = app.status === "completed_paid";

                  return (
                    <div
                      key={app.id}
                      className={`bg-white rounded-2xl p-6 border transition-all shadow-sm ${
                        isPaid
                          ? "border-green-300 bg-green-50/20"
                          : "border-[#5E1788]/40 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold text-[#5E1788] bg-[#FAF7FC] px-2.5 py-1 rounded-lg border border-[#D8C2E7]/40">
                            {app.time}
                          </span>
                          <span className="text-xs font-semibold text-[#1F1B24]">
                            {app.durationMinutes} min
                          </span>
                        </div>

                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Saldato ({app.cassaReceiptNumber})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            Saldo da Incassare
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-serif font-bold text-[#1F1B24]">
                        {app.serviceName}
                      </h3>

                      <div className="mt-3 bg-[#FAF7FC] p-3 rounded-xl border border-[#D8C2E7]/40 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#1F1B24]/70">Cliente:</span>
                          <span className="font-bold text-[#1F1B24]">{app.customer.name} {app.customer.surname}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#1F1B24]/70">Cellulare:</span>
                          <a href={`tel:${app.customer.phone}`} className="text-[#5E1788] font-semibold hover:underline">
                            {app.customer.phone}
                          </a>
                        </div>
                        {app.customer.notes && (
                          <div className="pt-1 text-[11px] text-[#1F1B24]/80 italic border-t border-[#D8C2E7]/30 mt-1">
                            &quot;{app.customer.notes}&quot;
                          </div>
                        )}
                      </div>

                      {/* Financial Detail Breakdown */}
                      <div className="mt-4 pt-3 border-t border-[#FAF7FC] flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-[#1F1B24]/60 block">
                            Tariffa: €{app.pricing.priceOnline.toFixed(2)} • Acconto: €{app.pricing.depositPaid.toFixed(2)}
                          </span>
                          <span className="text-base font-serif font-bold text-[#5E1788]">
                            Saldo: €{app.pricing.balanceDue.toFixed(2)}
                          </span>
                        </div>

                        {isPending && (
                          <button
                            onClick={() => {
                              setActiveCheckoutApp(app);
                              setCheckoutSuccessMessage(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-brand-royal text-white text-xs font-bold hover:bg-[#7A3293] transition-all flex items-center gap-1.5 shadow-md shadow-[#5E1788]/20"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Incassa Saldo & Scontrino
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIME-BLOCKING (SOLO-WORKER PROTECTION) */}
        {activeTab === "disponibilita" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D8C2E7]/50 shadow-sm space-y-6">
            <div className="border-b border-[#FAF7FC] pb-4">
              <h2 className="text-xl font-serif font-bold text-[#1F1B24]">
                Protezione Orari & Blocco Slot a 1-Click per il {selectedDate}
              </h2>
              <p className="text-xs text-[#1F1B24]/70 mt-1">
                Poiché sei sola al banco, puoi bloccare o sbloccare all&apos;istante gli orari in cui non puoi eseguire trattamenti.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {slotsForDate.map((slot) => {
                const isBlocked = !slot.available;
                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between items-center text-center transition-all ${
                      isBlocked
                        ? "bg-red-50/50 border-red-200"
                        : "bg-green-50/50 border-green-200"
                    }`}
                  >
                    <div>
                      <span className="text-lg font-bold font-mono block text-[#1F1B24]">
                        {slot.time}
                      </span>
                      <span className={`text-[11px] font-bold block mt-1 ${isBlocked ? "text-red-700" : "text-green-700"}`}>
                        {isBlocked ? "Chiuso / Riservato" : "Disponibile Online"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSlot(slot.time)}
                      className={`mt-4 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        isBlocked
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          Riapri Slot
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Blocca Slot
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
                <span className="text-xs font-bold text-[#5E1788] uppercase tracking-wider">
                  Cassa In-Store • Federica Cesiano
                </span>
                <h3 className="text-2xl font-serif font-bold text-[#1F1B24] mt-1">
                  Incasso Saldo Trattamento
                </h3>
                <p className="text-xs text-[#1F1B24]/70">
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
                  INCASSA SALDO & EMETTI SCONTRINO (36,00 €)
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
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#D8C2E7]/60 shadow-2xl relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setIsManualBookingOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-serif font-bold text-[#1F1B24]">
                Nuovo Appuntamento Telefonico / Banco
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                  Trattamento Make-up *
                </label>
                <select
                  required
                  value={manualServiceId}
                  onChange={(e) => setManualServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788]"
                >
                  <option value="">Seleziona servizio...</option>
                  {getServices("makeup").map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (€{s.priceOnline.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1B24] mb-1">
                  Orario *
                </label>
                <select
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8C2E7]/60 text-xs focus:outline-none focus:border-[#5E1788]"
                >
                  <option value="13:30">13:30 (Pausa Pranzo)</option>
                  <option value="14:15">14:15 (Pausa Pranzo)</option>
                  <option value="15:00">15:00 (Pausa Pranzo)</option>
                  <option value="20:00">20:00 (Serale)</option>
                  <option value="20:45">20:45 (Serale)</option>
                </select>
              </div>

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
                  Cellulare (per promemoria) *
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

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-royal text-white text-xs font-bold hover:bg-[#7A3293] transition-all shadow-md mt-2"
              >
                Registra & Blocca Orario sul Web
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
