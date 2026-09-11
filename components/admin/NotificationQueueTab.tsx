"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import {
  MessageSquare,
  Smartphone,
  QrCode,
  RefreshCw,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Monitor,
  Sparkles,
  ShieldCheck,
  Layers,
  Radio,
  Trash2,
  Eye,
  X,
  Info,
} from "lucide-react";
import {
  WhatsAppQueueState,
  QueuedWhatsAppMessage,
  NotificationTemplateType,
  EmailDispatchResult,
} from "@/types/notification";
import {
  subscribeToWhatsAppQueue,
  getWhatsAppQueueState,
  triggerManualTestMessage,
  setWhatsAppSessionStatus,
  clearWhatsAppHistory,
} from "@/lib/whatsappQueueService";
import {
  renderEmailTemplate,
  calculateBookingFinancials,
  sendResendEmail,
  getDispatchedEmailsLog,
  clearDispatchedEmailsLog,
} from "@/lib/resendService";

export default function NotificationQueueTab() {
  const [queueState, setQueueState] = useState<WhatsAppQueueState>(() => getWhatsAppQueueState());
  const [emailLogs, setEmailLogs] = useState<EmailDispatchResult[]>(() => getDispatchedEmailsLog());
  const [, startTransition] = useTransition();

  // Selected Email Preview State
  const [emailPreviewTab, setEmailPreviewTab] = useState<"booking_confirmation" | "booking_reminder_24h" | "order_placed">("booking_confirmation");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<QueuedWhatsAppMessage | EmailDispatchResult | null>(null);

  // Filter channel for the table
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "email">("all");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSendingEmailTest, setIsSendingEmailTest] = useState<boolean>(false);

  // Subscribe to real-time WhatsApp queue updates
  useEffect(() => {
    const unsubscribe = subscribeToWhatsAppQueue((state) => {
      startTransition(() => {
        setQueueState(state);
      });
    });
    return () => unsubscribe();
  }, []);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback(null);
    }, 4500);
  };

  // WhatsApp connection toggles
  const handleToggleConnection = () => {
    if (queueState.sessionStatus === "open") {
      setWhatsAppSessionStatus("close");
      showFeedback("Sessione WhatsApp boutique disconnessa.");
    } else if (queueState.sessionStatus === "close") {
      setWhatsAppSessionStatus("connecting");
      showFeedback("Nuova sessione QR generata in attesa di scansione.");
    } else {
      setWhatsAppSessionStatus("open");
      showFeedback("Dispositivo collegato con successo! Sessione WhatsApp attiva.");
    }
  };

  const handleRegenerateQr = () => {
    setWhatsAppSessionStatus("connecting");
    showFeedback("Nuovo codice QR generato. Scansiona con il telefono del negozio.");
  };

  // Single test triggers
  const handleTestWhatsApp = (type: NotificationTemplateType = "manual_test") => {
    const msg = triggerManualTestMessage(type);
    showFeedback(`Messaggio accodato! Jitter assegnato: ${msg.jitterDelaySeconds}s. Pacing anti-ban attivo.`);
  };

  const handleTestEmail = async () => {
    setIsSendingEmailTest(true);
    try {
      const { subject, html } = renderEmailTemplate(emailPreviewTab, {
        customerName: "Federica Cesiano (Test)",
        serviceName: "Make-up Evento e Cerimonia",
        priceList: 50.0,
      });

      const result = await sendResendEmail({
        to: "boutique@sceltamakeup.it",
        recipientName: "Federica Cesiano",
        templateType: emailPreviewTab,
        subject,
        html,
      });

      setEmailLogs(getDispatchedEmailsLog());
      showFeedback(`Email di test inviata con successo (${result.simulated ? "Simulazione Realistica" : "Resend Cloud"} - ID: ${result.id || "ok"})!`);
    } catch {
      showFeedback("Errore durante l'invio dell'email di test.");
    } finally {
      setIsSendingEmailTest(false);
    }
  };

  const handleClearHistory = () => {
    clearWhatsAppHistory();
    clearDispatchedEmailsLog();
    setEmailLogs([]);
    showFeedback("Cronologia notifiche azzerata con successo.");
  };

  // Financial calculations for the preview callout
  const previewFinancials = useMemo(() => {
    return calculateBookingFinancials(50.0);
  }, []);

  // Generated email preview HTML
  const renderedPreview = useMemo(() => {
    return renderEmailTemplate(emailPreviewTab, {
      customerName: "Chiara Rossi",
      serviceName: "Make-up Evento e Cerimonia",
      bookingCode: "SC-2026-0907",
      bookingDate: "15 Settembre 2026",
      bookingTime: "13:30",
      operatorName: "Federica Cesiano",
      durationMinutes: 60,
      priceList: 50.0,
      financials: previewFinancials,
      balanceDue: previewFinancials.balanceDue,
      orderNumber: "SC-ORD-2026-0001",
      orderTotal: 60.5,
    });
  }, [emailPreviewTab, previewFinancials]);
  // Combined messages for table
  interface UnifiedTableRow {
    id: string;
    channel: "whatsapp" | "email";
    recipient: string;
    phoneOrEmail: string;
    templateType: NotificationTemplateType;
    status: "queued" | "processing" | "sent" | "failed";
    scheduledOrSentAt: string;
    jitterSeconds?: number;
    countdownRemaining?: number;
    rawItem: QueuedWhatsAppMessage | EmailDispatchResult;
  }

  const tableRows: UnifiedTableRow[] = useMemo(() => {
    const rows: UnifiedTableRow[] = [];

    // 1. WhatsApp Active Item
    if (queueState.activeItem) {
      rows.push({
        id: queueState.activeItem.id,
        channel: "whatsapp",
        recipient: queueState.activeItem.recipientName,
        phoneOrEmail: queueState.activeItem.recipientPhone,
        templateType: queueState.activeItem.templateType,
        status: "processing",
        scheduledOrSentAt: queueState.activeItem.scheduledAt,
        jitterSeconds: queueState.activeItem.jitterDelaySeconds,
        countdownRemaining: queueState.countdownSeconds,
        rawItem: queueState.activeItem,
      });
    }

    // 2. WhatsApp Pending Queue
    queueState.queue.forEach((item) => {
      rows.push({
        id: item.id,
        channel: "whatsapp",
        recipient: item.recipientName,
        phoneOrEmail: item.recipientPhone,
        templateType: item.templateType,
        status: "queued",
        scheduledOrSentAt: item.scheduledAt,
        jitterSeconds: item.jitterDelaySeconds,
        rawItem: item,
      });
    });

    // 3. WhatsApp History
    queueState.history.forEach((item) => {
      rows.push({
        id: item.id,
        channel: "whatsapp",
        recipient: item.recipientName,
        phoneOrEmail: item.recipientPhone,
        templateType: item.templateType,
        status: item.status,
        scheduledOrSentAt: item.sentAt || item.scheduledAt,
        jitterSeconds: item.jitterDelaySeconds,
        rawItem: item,
      });
    });

    // 4. Email Dispatches
    emailLogs.forEach((item, index) => {
      rows.push({
        id: item.id || `email-log-${index}`,
        channel: "email",
        recipient: item.recipientName,
        phoneOrEmail: item.recipientEmail,
        templateType: item.templateType,
        status: item.success ? "sent" : "failed",
        scheduledOrSentAt: item.sentAt,
        rawItem: item,
      });
    });

    if (channelFilter === "whatsapp") {
      return rows.filter((r) => r.channel === "whatsapp");
    }
    if (channelFilter === "email") {
      return rows.filter((r) => r.channel === "email");
    }
    return rows;
  }, [queueState, emailLogs, channelFilter]);

  // Active Pacing Progress calculation
  const pacingProgressPercent = useMemo(() => {
    if (!queueState.isProcessing || !queueState.activeItem) return 0;
    const totalJitter = queueState.activeItem.jitterDelaySeconds || 30;
    const remaining = queueState.countdownSeconds;
    const elapsed = Math.max(0, totalJitter - remaining);
    return Math.min(100, Math.round((elapsed / totalJitter) * 100));
  }, [queueState.isProcessing, queueState.activeItem, queueState.countdownSeconds]);

  const templateTypeLabel = (type: NotificationTemplateType) => {
    switch (type) {
      case "booking_confirmation":
        return "Conferma Booking";
      case "booking_reminder_24h":
        return "Promemoria 24h";
      case "order_placed":
        return "Conferma Ordine";
      case "manual_test":
      default:
        return "Test Sistema";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification Banner */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1F1B24] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#D8C2E7]/40 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-[#D462A6]" />
          <span className="text-xs font-semibold">{actionFeedback}</span>
        </div>
      )}

      {/* Header Banner & Live Status Metrics */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D8C2E7]/50 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#5E1788]/5 via-[#D8C2E7]/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E1788]/10 text-xs font-bold text-[#5E1788]">
              <Radio className="w-3.5 h-3.5 text-[#D462A6] animate-pulse" />
              Centro Notifiche & Pacing Anti-Ban WhatsApp • Resend Email
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1B24]">
              Monitor Trasmissioni & Sessione Boutique
            </h2>
            <p className="text-xs text-[#1F1B24]/70 max-w-2xl leading-relaxed">
              Protezione integrale anti-ban per il numero di Federica con ritardo naturale controllato (20–45s) e anteprima visuale ad alta fedeltà delle comunicazioni di lusso.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center min-w-[320px]">
            <div className="bg-[#FAF7FC] p-3 rounded-2xl border border-[#D8C2E7]/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Stato WA</span>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  queueState.sessionStatus === "open"
                    ? "bg-emerald-500 ring-4 ring-emerald-100"
                    : queueState.sessionStatus === "connecting"
                    ? "bg-amber-500 ring-4 ring-amber-100"
                    : "bg-rose-500 ring-4 ring-rose-100"
                }`} />
                <span className="text-xs font-bold text-[#1F1B24] capitalize">
                  {queueState.sessionStatus === "open" ? "Attivo" : queueState.sessionStatus === "connecting" ? "In Pairing" : "Offline"}
                </span>
              </div>
            </div>

            <div className="bg-[#FAF7FC] p-3 rounded-2xl border border-[#D8C2E7]/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">In Coda WA</span>
              <span className="text-lg font-serif font-bold text-[#5E1788] mt-0.5 block">
                {queueState.queue.length + (queueState.activeItem ? 1 : 0)}
              </span>
            </div>

            <div className="bg-[#FAF7FC] p-3 rounded-2xl border border-[#D8C2E7]/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">WA Inviati</span>
              <span className="text-lg font-serif font-bold text-emerald-600 mt-0.5 block">
                {queueState.totalSent}
              </span>
            </div>

            <div className="bg-[#FAF7FC] p-3 rounded-2xl border border-[#D8C2E7]/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Email Resend</span>
              <span className="text-lg font-serif font-bold text-[#7A3293] mt-0.5 block">
                {emailLogs.length}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* TOP GRID: Session Status & Queue Pacing Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARD 1: WHATSAPP CONNECTION STATUS (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#D8C2E7]/50 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#5E1788]/10 flex items-center justify-center text-[#5E1788]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1F1B24]">
                    WhatsApp Store Boutique
                  </h3>
                  <span className="text-[11px] text-gray-500 block">
                    Evolution API • Sessione Negozio
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center">
                {queueState.sessionStatus === "open" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    🟢 Connesso
                  </span>
                )}
                {queueState.sessionStatus === "connecting" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    🟡 In Connessione
                  </span>
                )}
                {queueState.sessionStatus === "close" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    🔴 Disconnesso
                  </span>
                )}
              </div>
            </div>

            {/* Store Phone Info */}
            <div className="p-4 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Numero Ufficiale Registrato
                </span>
                <span className="text-sm font-bold font-mono text-[#5E1788] mt-0.5 block">
                  {queueState.connectedNumber}
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Boutique Scelta Makeup • Napoli
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Canale</span>
                <span className="text-xs font-bold text-emerald-600">Transazionale 1-a-1</span>
              </div>
            </div>
          </div>

          {/* QR Code / Connection Visualizer */}
          <div className="p-5 rounded-2xl bg-white border border-[#D8C2E7]/60 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
            {queueState.sessionStatus === "connecting" ? (
              <>
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-inner border border-[#D8C2E7]/60 p-2 bg-white flex items-center justify-center">
                  {queueState.qrCodeSvg ? (
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: queueState.qrCodeSvg }}
                    />
                  ) : (
                    <QrCode className="w-24 h-24 text-gray-300 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#5E1788] block">
                    Inquadra il codice con WhatsApp
                  </span>
                  <p className="text-[11px] text-gray-500 max-w-xs">
                    Apri WhatsApp sul telefono del negozio &gt; Dispositivi collegati &gt; Collega un dispositivo.
                  </p>
                </div>
              </>
            ) : queueState.sessionStatus === "open" ? (
              <div className="py-6 space-y-3">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-[#1F1B24]">
                    WhatsApp Store Sincronizzato
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs mt-1">
                    La sessione è attiva. I messaggi partono regolarmente con protezione anti-ban e jitter di 20–45s.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Pacing Naturale Umano Attivo
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-base font-serif font-bold text-[#1F1B24]">
                    Sessione Non Attiva
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs mt-1">
                    Il gestionale non è al momento collegato a WhatsApp. I messaggi verranno trattenuti in coda fino al ripristino.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleRegenerateQr}
              className="py-2.5 px-3 rounded-xl border border-[#D8C2E7] bg-white hover:bg-[#FAF7FC] text-xs font-bold text-[#5E1788] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rigenera QR
            </button>

            <button
              type="button"
              onClick={handleToggleConnection}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                queueState.sessionStatus === "open"
                  ? "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-[#5E1788] text-white hover:bg-[#7A3293]"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {queueState.sessionStatus === "open"
                ? "Simula Disconnessione"
                : "Simula Connessione"}
            </button>
          </div>
        </div>

        {/* CARD 2: REAL-TIME QUEUE MONITOR & PACING BANNER (7 Cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          {/* Active Human-Pacing Countdown Banner */}
          <div className="bg-white rounded-3xl p-6 border border-[#D8C2E7]/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#D462A6]/10 flex items-center justify-center text-[#D462A6]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1F1B24]">
                    Monitor Pacing Anti-Ban Meta
                  </h3>
                  <span className="text-[11px] text-gray-500 block">
                    Jitter casuale obbligatorio 20–45s per messaggio
                  </span>
                </div>
              </div>

              {queueState.isProcessing ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  Pacing in corso
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
                  Coda Pronta
                </span>
              )}
            </div>

            {/* Countdown Highlight Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FAF7FC] via-white to-[#FAF7FC] border border-[#D8C2E7]/60 space-y-3">
              {queueState.isProcessing && queueState.activeItem ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                        Invio Attivo in Trasmissione
                      </span>
                      <h4 className="text-sm font-bold text-[#1F1B24] mt-0.5">
                        Verso: {queueState.activeItem.recipientName} ({queueState.activeItem.recipientPhone})
                      </h4>
                      <span className="text-[11px] text-[#5E1788] block">
                        Template: {templateTypeLabel(queueState.activeItem.templateType)} • Jitter: {queueState.activeItem.jitterDelaySeconds}s
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-3xl sm:text-4xl font-mono font-bold text-[#5E1788]">
                        {queueState.countdownSeconds}s
                      </span>
                      <span className="text-[10px] text-gray-400 block">al rilascio</span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                      <span>Pacing naturale anti-spam</span>
                      <span>{pacingProgressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-[#D8C2E7]/40">
                      <div
                        className="h-full bg-gradient-to-r from-[#5E1788] via-[#7A3293] to-[#D462A6] transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${pacingProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-600 italic bg-white/80 p-2.5 rounded-xl border border-gray-100">
                    ⏳ Prossimo invio tra <strong>{queueState.countdownSeconds}s</strong> (Pacing anti-ban 20-45s attivo). La digitazione e il tempo di attesa simulano un operatore reale al banco.
                  </p>
                </>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1F1B24]">
                      🟢 Coda Inattiva • Nessun messaggio in attesa
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-0.5">
                      Il motore asincrono è pronto. Non appena una cliente prenota online o effettua un ordine cosmetico, il messaggio verrà processato automaticamente con random jitter tra 20s e 45s.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SINGLE TEST DISPATCHER CARD */}
          <div className="bg-white rounded-3xl p-6 border border-[#D8C2E7]/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-[#7A3293]/10 flex items-center justify-center text-[#7A3293]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#1F1B24]">
                    Dispatcher Test Interattivo
                  </h3>
                  <span className="text-[11px] text-gray-500 block">
                    Invia comunicazioni di collaudo e verifica il rispetto del ritardo casuale
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTestWhatsApp("manual_test")}
                className="p-3.5 rounded-2xl border border-[#D8C2E7]/60 bg-white hover:bg-[#FAF7FC] text-left transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#5E1788] group-hover:text-[#7A3293] flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Invia Test WhatsApp (Pacing 20-45s)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono">
                    WA Test
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Accoda un messaggio di prova con token unico e verifica il random jitter.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTestWhatsApp("booking_reminder_24h")}
                className="p-3.5 rounded-2xl border border-[#D8C2E7]/60 bg-white hover:bg-[#FAF7FC] text-left transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#5E1788] group-hover:text-[#7A3293] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Test Promemoria 24h WhatsApp
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono">
                    Booking
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Simula il promemoria il giorno prima con mappa e regole di disdetta &lt;24h.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTestWhatsApp("order_placed")}
                className="p-3.5 rounded-2xl border border-[#D8C2E7]/60 bg-white hover:bg-[#FAF7FC] text-left transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#5E1788] group-hover:text-[#7A3293] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#D462A6]" />
                    Test Conferma Ordine WhatsApp
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono">
                    Shop
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Accoda notifica ordine cosmetico con 2 campioncini omaggio inclusi.
                </p>
              </button>

              <button
                type="button"
                disabled={isSendingEmailTest}
                onClick={handleTestEmail}
                className="p-3.5 rounded-2xl border border-[#5E1788]/30 bg-[#5E1788]/5 hover:bg-[#5E1788]/10 text-left transition-all group shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#5E1788] group-hover:text-[#7A3293] flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#5E1788]" />
                    Invia Test Email Resend
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5E1788] text-white font-mono">
                    Resend
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {isSendingEmailTest ? "Invio in corso..." : "Invia l'anteprima selezionata con Resend via fetch."}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* FULL-WIDTH SECTION: REAL-TIME QUEUE & DISPATCH TABLE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D8C2E7]/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8C2E7]/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#5E1788]" />
              <h3 className="text-lg font-serif font-bold text-[#1F1B24]">
                Registro Canali & Coda Messaggi
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Dettaglio delle comunicazioni in attesa, in corso di pacing o inviate con successo
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex rounded-xl bg-[#FAF7FC] p-1 border border-[#D8C2E7]/50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChannelFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  channelFilter === "all"
                    ? "bg-[#5E1788] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tutti ({tableRows.length})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("whatsapp")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  channelFilter === "whatsapp"
                    ? "bg-[#5E1788] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("email")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  channelFilter === "email"
                    ? "bg-[#5E1788] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Email
              </button>
            </div>

            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              title="Azzera cronologia"
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-[#D8C2E7]/50">
          <table className="w-full text-left text-xs text-[#1F1B24]">
            <thead className="bg-[#FAF7FC] text-gray-500 uppercase tracking-wider font-bold border-b border-[#D8C2E7]/40">
              <tr>
                <th className="py-3.5 px-4">Canale</th>
                <th className="py-3.5 px-4">Destinatario</th>
                <th className="py-3.5 px-4">Template</th>
                <th className="py-3.5 px-4">Orario & Jitter</th>
                <th className="py-3.5 px-4">Stato</th>
                <th className="py-3.5 px-4 text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8C2E7]/30">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                    Nessun messaggio presente nel registro.
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#FAF7FC]/80 transition-colors">
                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      {row.channel === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-[#5E1788] border border-purple-200">
                          <Mail className="w-3 h-3" /> Resend
                        </span>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="py-3.5 px-4 font-medium">
                      <span className="font-bold text-[#1F1B24] block">{row.recipient}</span>
                      <span className="text-[11px] text-gray-500 font-mono block">{row.phoneOrEmail}</span>
                    </td>

                    {/* Template Type */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {templateTypeLabel(row.templateType)}
                      </span>
                    </td>

                    {/* Scheduled / Jitter */}
                    <td className="py-3.5 px-4 text-gray-600">
                      {row.status === "processing" && row.countdownRemaining !== undefined ? (
                        <span className="font-mono text-blue-700 font-bold block animate-pulse">
                          ⏳ {row.countdownRemaining}s rimasti (Jitter: {row.jitterSeconds}s)
                        </span>
                      ) : row.status === "queued" ? (
                        <span className="text-amber-700 block font-medium">
                          Accodato (Jitter {row.jitterSeconds}s)
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500 block">
                          {new Date(row.scheduledOrSentAt).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {row.status === "queued" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          In attesa
                        </span>
                      )}
                      {row.status === "processing" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                          Pacing in corso
                        </span>
                      )}
                      {row.status === "sent" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Consegnato
                        </span>
                      )}
                      {row.status === "failed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Errore
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedMessageDetail(row.rawItem)}
                        className="p-1.5 text-gray-400 hover:text-[#5E1788] hover:bg-[#FAF7FC] rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Visualizza payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL-WIDTH SECTION: LUXURY RESEND EMAIL PREVIEWER COCKPIT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D8C2E7]/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8C2E7]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5E1788]/10 flex items-center justify-center text-[#5E1788]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#1F1B24]">
                Cockpit Anteprima Email Transazionali Resend
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Visualizzatore real-time ad alta fedeltà con design system Scelta Makeup (#5E1788 • #D8C2E7 • #D462A6)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-[#FAF7FC] p-1 border border-[#D8C2E7]/50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewDevice === "desktop"
                    ? "bg-[#5E1788] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop (600px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewDevice === "mobile"
                    ? "bg-[#5E1788] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile (375px)
              </button>
            </div>
          </div>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex gap-2 border-b border-[#D8C2E7]/40 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setEmailPreviewTab("booking_confirmation")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              emailPreviewTab === "booking_confirmation"
                ? "bg-[#5E1788] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🌸 Conferma Prenotazione (-10% & Acconto 20%)
          </button>
          <button
            type="button"
            onClick={() => setEmailPreviewTab("booking_reminder_24h")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              emailPreviewTab === "booking_reminder_24h"
                ? "bg-[#5E1788] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⏰ Promemoria 24h & Disdetta
          </button>
          <button
            type="button"
            onClick={() => setEmailPreviewTab("order_placed")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              emailPreviewTab === "order_placed"
                ? "bg-[#5E1788] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🛍️ Ordine E-Commerce & Campioncini
          </button>
        </div>

        {/* 4-ROW TRANSPARENT FINANCIAL BREAKDOWN CALLOUT */}
        {emailPreviewTab === "booking_confirmation" && (
          <div className="p-5 rounded-2xl bg-[#FAF7FC] border border-[#D8C2E7]/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5E1788]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5E1788]">
                  Formula Finanziaria Trasparente Anti-No Show Scelta Makeup
                </h4>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Invarianza 100% Garantita
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3.5 rounded-xl border border-[#D8C2E7]/40 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">1. Prezzo di Listino</span>
                <span className="text-base font-serif font-bold text-gray-900 mt-1 block">
                  €{previewFinancials.priceList.toFixed(2)}
                </span>
                <span className="text-[9px] text-gray-500 block mt-0.5">Tariffa Store Boutique</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">2. Vantaggio Web (-10%)</span>
                <span className="text-base font-serif font-bold text-emerald-600 mt-1 block">
                  -€{previewFinancials.discountOnline.toFixed(2)}
                </span>
                <span className="text-[9px] text-emerald-600 font-medium block mt-0.5">
                  Prezzo Online: €{previewFinancials.priceOnline.toFixed(2)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#7A3293]/30 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#5E1788] block">3. Acconto Versato (20%)</span>
                <span className="text-base font-serif font-bold text-[#5E1788] mt-1 block">
                  €{previewFinancials.depositPaid.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#5E1788] font-medium block mt-0.5">Incassato Online via Stripe</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#D462A6]/30 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#D462A6] block">4. Saldo Boutique (80%)</span>
                <span className="text-base font-serif font-bold text-[#D462A6] mt-1 block">
                  €{previewFinancials.balanceDue.toFixed(2)}
                </span>
                <span className="text-[9px] text-gray-600 block mt-0.5">myPOS Go 2 / Cassa RT</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-600 text-center bg-white p-2.5 rounded-xl border border-gray-100">
              🔒 <strong>Invarianza Contabile:</strong> Acconto versato (€{previewFinancials.depositPaid.toFixed(2)}) + Saldo dovuto in negozio (€{previewFinancials.balanceDue.toFixed(2)}) = Totale concordato online (€{previewFinancials.priceOnline.toFixed(2)}). Nessun centesimo di scarto.
            </p>
          </div>
        )}

        {/* Email Preview Frame */}
        <div className="bg-[#E5E0EA] p-4 sm:p-8 rounded-3xl flex justify-center items-center overflow-hidden min-h-[620px]">
          <div
            className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 border border-gray-300 w-full ${
              previewDevice === "desktop" ? "max-w-[620px]" : "max-w-[375px]"
            }`}
          >
            {/* Mock Email Client Header */}
            <div className="bg-[#FAF7FC] px-4 py-3 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <div className="space-y-0.5 truncate pr-2">
                <div className="font-bold text-[#1F1B24] truncate">
                  Oggetto: {renderedPreview.subject}
                </div>
                <div className="text-[10px] text-gray-500">
                  Da: Scelta Makeup &lt;onboarding@resend.dev&gt; • A: cliente@sceltamakeup.it
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-mono shrink-0">
                {previewDevice === "desktop" ? "600px" : "375px"}
              </span>
            </div>

            {/* Direct IFrame HTML rendering */}
            <iframe
              title="Resend Luxury Email Preview"
              srcDoc={renderedPreview.html}
              className="w-full h-[640px] border-0 bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      {/* MODAL: MESSAGE DETAIL / CHECKSUM INSPECTOR */}
      {selectedMessageDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#D8C2E7]/60 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedMessageDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-[#5E1788]" />
              <h3 className="text-lg font-serif font-bold text-[#1F1B24]">
                Dettagli Notifica Trasmessa
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {"messageText" in selectedMessageDetail ? (
                // WhatsApp Detail
                <>
                  <div className="p-3 rounded-xl bg-[#FAF7FC] border border-[#D8C2E7]/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Canale & Checksum Antispam</span>
                    <span className="font-bold text-emerald-700 block">WhatsApp Evolution API</span>
                    <span className="font-mono text-[10px] text-[#5E1788] block break-all">
                      {selectedMessageDetail.checksum}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Destinatario</span>
                    <p className="font-bold text-sm text-[#1F1B24]">
                      {selectedMessageDetail.recipientName} ({selectedMessageDetail.recipientPhone})
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Testo Inviato</span>
                    <pre className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-[11px] whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedMessageDetail.messageText}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-gray-600">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Jitter Applicato:</span>
                      <strong className="text-[#5E1788]">{selectedMessageDetail.jitterDelaySeconds} secondi</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Stato:</span>
                      <strong className="capitalize">{selectedMessageDetail.status}</strong>
                    </div>
                  </div>
                </>
              ) : (
                // Email Detail
                <>
                  <div className="p-3 rounded-xl bg-[#FAF7FC] border border-[#D8C2E7]/40 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Canale & ID Resend</span>
                    <span className="font-bold text-[#5E1788] block">Resend Transazionale</span>
                    <span className="font-mono text-[10px] text-gray-600 block">
                      {selectedMessageDetail.id} ({selectedMessageDetail.simulated ? "Simulazione Realistica" : "Live Cloud"})
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Destinatario & Oggetto</span>
                    <p className="font-bold text-sm text-[#1F1B24]">
                      {selectedMessageDetail.recipientName} &lt;{selectedMessageDetail.recipientEmail}&gt;
                    </p>
                    <p className="text-gray-700 font-semibold">
                      {selectedMessageDetail.subject}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Data & Ora Invio</span>
                    <p className="font-mono text-gray-600">
                      {new Date(selectedMessageDetail.sentAt).toLocaleString("it-IT")}
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMessageDetail(null)}
              className="w-full py-2.5 rounded-xl bg-[#5E1788] text-white text-xs font-bold hover:bg-[#7A3293] transition-all cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
