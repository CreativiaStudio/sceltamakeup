import {
  NotificationTemplateType,
  QueuedWhatsAppMessage,
  WhatsAppQueueState,
  WhatsAppSessionStatus,
  EnqueueWhatsAppInput,
} from "@/types/notification";

const STORAGE_QUEUE_KEY = "scelta_makeup_whatsapp_queue_v1";
const STORE_PHONE = "+39 3XX XXXXXXX"; // In attivazione
const STORE_ADDRESS = "Via dei Pellegrini 28/29, 80132 Napoli";

// Anti-Ban Human Pacing Jitter: Strictly between 20 and 45 seconds
export function calculateJitter(): number {
  return Math.floor(Math.random() * (45 - 20 + 1)) + 20;
}

// Dynamic Variation Engine Seeds
const GREETINGS = ["Gentile", "Cara", "Buongiorno", "Ciao"];
const SIGNOFFS = [
  "Federica Cesiano — Scelta Makeup",
  "Un caro saluto, Federica — Scelta Makeup Boutique",
  "Ti aspetto con gioia, Federica Cesiano",
  "Con affetto, Federica — Scelta Makeup",
];

const PRE_TREATMENT_TIPS: Record<string, string[]> = {
  cerimonia: [
    "💡 Consiglio per la seduta: indossa una camicia o abito aperto sul davanti per non rovinare il make-up al cambio.",
    "💡 Consiglio di bellezza: idrata bene le labbra la sera precedente con un balsamo nutriente.",
  ],
  giorno: [
    "💡 Consiglio per la seduta: una pelle ben detersa e idratata prima dell'appuntamento garantisce una base ancora più radiosa e levigata.",
    "💡 Consiglio di bellezza: se usi lenti a contatto, ti consigliamo di applicarle prima della seduta.",
  ],
  sposa: [
    "💡 Consiglio per la seduta: porta con te foto dell'abito e dei dettagli dell'acconciatura per accordare perfettamente le tonalità.",
    "💡 Consiglio di bellezza: evita trattamenti esfolianti aggressivi nelle 48h precedenti la seduta.",
  ],
  armocromia: [
    "💡 Consiglio per la seduta: ti consigliamo di presentarti a viso completamente struccato per una perfetta analisi cromatica con i drappi.",
  ],
  default: [
    "💡 Consiglio di bellezza: concediti un momento di totale relax, utilizzeremo prodotti e pennelli igienizzati a ogni seduta.",
    "💡 Consiglio Scelta Makeup: bevi molta acqua prima del trattamento per mantenere la pelle naturalmente luminosa.",
  ],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sanitizePhoneNumber(phone: string): string {
  if (!phone) return STORE_PHONE;
  let clean = phone.replace(/[\s\-\(\)\.]/g, "");
  if (!clean.startsWith("+")) {
    if (clean.startsWith("00")) {
      clean = "+" + clean.slice(2);
    } else if (clean.startsWith("39") && clean.length > 10) {
      clean = "+" + clean;
    } else {
      clean = "+39" + clean;
    }
  }
  return clean;
}

function generateSimpleChecksum(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  const randomSalt = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `sha256_${hex}${randomSalt}`;
}

export function formatWhatsAppTemplate(
  type: NotificationTemplateType,
  context: Record<string, unknown> = {}
): { text: string; checksum: string; jitter: number } {
  const greeting = pickRandom(GREETINGS);
  const signOff = pickRandom(SIGNOFFS);
  const jitter = calculateJitter();

  const customerName = (context.customerName as string) || "Gentile Cliente";
  const serviceName = (context.serviceName as string) || "Make-up Evento & Cerimonia";
  const bookingDate = (context.bookingDate as string) || new Date().toISOString().split("T")[0];
  const bookingTime = (context.bookingTime as string) || "13:30";
  const operatorName = (context.operatorName as string) || "Federica Cesiano";
  const bookingCode =
    (context.bookingCode as string) ||
    `SC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  const priceList = (context.priceList as number) ?? 50.0;
  const discountOnline = (context.discountOnline as number) ?? 5.0;
  const depositPaid = (context.depositPaid as number) ?? 9.0;
  const balanceDue = (context.balanceDue as number) ?? 36.0;
  const durationMinutes = (context.durationMinutes as number) ?? 60;

  // Determine tip based on service name
  const serviceLower = serviceName.toLowerCase();
  let tipCategory = "default";
  if (serviceLower.includes("sposa")) tipCategory = "sposa";
  else if (serviceLower.includes("cerimonia") || serviceLower.includes("evento")) tipCategory = "cerimonia";
  else if (serviceLower.includes("giorno") || serviceLower.includes("glow")) tipCategory = "giorno";
  else if (serviceLower.includes("armo") || serviceLower.includes("shade")) tipCategory = "armocromia";

  const preTreatmentTip = pickRandom(PRE_TREATMENT_TIPS[tipCategory] || PRE_TREATMENT_TIPS.default);

  let text = "";

  switch (type) {
    case "booking_confirmation": {
      text = `🌸 *SCELTA MAKEUP — Conferma Prenotazione* 🌸

${greeting} *${customerName}*,
abbiamo il piacere di confermarti la riservazione del tuo trattamento:

✨ *Servizio:* ${serviceName}
📅 *Data:* ${bookingDate}
⏰ *Orario:* ${bookingTime}
👩‍🎨 *Professionista:* ${operatorName}
📍 *Boutique:* ${STORE_ADDRESS}
🔖 *Codice Prenotazione:* ${bookingCode}

💳 *Riepilogo Tariffa Trasparente:*
• Prezzo di Listino: €${priceList.toFixed(2)}
• Vantaggio Esclusivo Online (-10%): -€${discountOnline.toFixed(2)}
• Quota di Conferma Versata (20%): €${depositPaid.toFixed(2)} (Incassata)
👉 *Saldo Residuo in Boutique (80%): €${balanceDue.toFixed(2)}*
(Potrai saldare comodamente in negozio con Carta/POS myPOS o Contanti)

🌿 *Consiglio di Bellezza Scelta Makeup:*
${preTreatmentTip}

Per qualsiasi esigenza puoi rispondere direttamente a questo messaggio.
A presto in Boutique!
*${signOff}*`;
      break;
    }

    case "booking_reminder_24h": {
      text = `🌸 *SCELTA MAKEUP — Il tuo appuntamento di bellezza è domani* 🌸

${greeting} *${customerName}*,
ti ricordiamo il tuo trattamento esclusivo fissato per domani:

✨ *${serviceName}*
📅 *Domani:* ${bookingDate} alle ore *${bookingTime}*
📍 *Dove siamo:* Scelta Makeup, ${STORE_ADDRESS}
🗺️ *Mappa e Indicazioni:* https://maps.google.com/?q=Via+dei+Pellegrini+28+Napoli

💄 *Piccolo Vademecum per il tuo Servizio:*
• Ti consigliamo di presentarti a viso ben deterso e idratato, preferibilmente privo di make-up.
• Ti invitiamo alla puntualità: la tua professionista è riservata esclusivamente a te per ${durationMinutes} minuti.

🌸 *Politica di Flessibilità & Disdetta:*
Come da condizioni di riservazione esclusiva, puoi modificare o cancellare l'appuntamento senza costi fino a 24h prima dell'orario fissato.

Ti chiediamo la gentilezza di confermare la tua presenza rispondendo con un semplice *CONFERMO* a questo messaggio.
Non vediamo l'ora di accoglierti!
*${signOff}*`;
      break;
    }

    case "order_placed": {
      const orderNumber = (context.orderNumber as string) || "SC-ORD-2026-0001";
      const deliveryMethod = (context.deliveryMethod as string) || "shipping";
      const itemsListFormatted =
        (context.itemsListFormatted as string) ||
        "• Rossetto Iconico Diego dalla Palma (01 Rosso Rubino) x1\n• Fondotinta Anti-Età RVB LAB (12 Warm Beige) x1";
      const orderTotal = (context.orderTotal as number) ?? 60.5;

      if (deliveryMethod === "boutique") {
        text = `✨ *SCELTA MAKEUP — Ordine Confermato per Ritiro in Store* ✨

${greeting} *${customerName}*,
il tuo ordine *#${orderNumber}* è in preparazione!

🛍️ *Articoli:*
${itemsListFormatted}

📍 *Ritiro Gratuito in Boutique:*
• Sede: ${STORE_ADDRESS}
• Orari di apertura: Lun - Sab 09:30 - 13:30 / 16:30 - 20:00
• Campioncini di benvenuto: Inclusi nel tuo pacchetto ✨
💰 *Totale Pagato:* €${orderTotal.toFixed(2)}

Ti avviseremo con un messaggio non appena il tuo pacchetto sarà pronto al banco.
*${signOff}*`;
      } else {
        const shippingAddress = (context.shippingAddress as string) || "Via Chiaia 142";
        const shippingCity = (context.shippingCity as string) || "Napoli";
        const shippingCap = (context.shippingCap as string) || "80121";

        text = `✨ *SCELTA MAKEUP — Il tuo ordine cosmetico è confermato!* ✨

${greeting} *${customerName}*,
grazie per aver scelto Scelta Makeup! Abbiamo registrato il tuo ordine *#${orderNumber}*.

🛍️ *Articoli Selezionati:*
${itemsListFormatted}

📦 *Riepilogo Spedizione:*
• Modalità: Corriere Espresso Tracciato 24/48h
• Spedizione a: ${shippingAddress}, ${shippingCity} (${shippingCap})
• Campioncini Alta Gamma: 2 Omaggio inclusi nel pacchetto ✨
💰 *Totale Ordine:* €${orderTotal.toFixed(2)}

Riceverai a breve una notifica con il codice di tracciamento non appena il corriere prenderà in carico la tua scatola profumata.

Per assistenza ordini: rispondi direttamente a questo messaggio WhatsApp.
*${signOff}*`;
      }
      break;
    }

    case "manual_test":
    default: {
      const uniqueToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toLocaleTimeString("it-IT");
      text = `⚡ *SCELTA MAKEUP — Test Pacing Umano Anti-Ban* ⚡

${greeting} *${customerName}*,
questo è un messaggio di test del motore anti-ban con pacing umano a velocità controllata.

⏱️ *Jitter applicato:* ${jitter} secondi
🔖 *Token Unico:* ${uniqueToken}
⏰ *Timestamp:* ${timestamp}
${preTreatmentTip}

*${signOff}*`;
      break;
    }
  }

  const checksum = generateSimpleChecksum(text);
  return { text, checksum, jitter };
}

// Generate a valid luxury vector QR code SVG string
export function generateMockQrSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" width="100%" height="100%">
  <rect width="260" height="260" fill="#FFFFFF" rx="16" />
  <!-- Corner Position Finder 1 (Top-Left) -->
  <rect x="20" y="20" width="60" height="60" rx="8" fill="#5E1788" />
  <rect x="30" y="30" width="40" height="40" rx="4" fill="#FFFFFF" />
  <rect x="40" y="40" width="20" height="20" rx="2" fill="#7A3293" />
  <!-- Corner Position Finder 2 (Top-Right) -->
  <rect x="180" y="20" width="60" height="60" rx="8" fill="#5E1788" />
  <rect x="190" y="30" width="40" height="40" rx="4" fill="#FFFFFF" />
  <rect x="200" y="40" width="20" height="20" rx="2" fill="#7A3293" />
  <!-- Corner Position Finder 3 (Bottom-Left) -->
  <rect x="20" y="180" width="60" height="60" rx="8" fill="#5E1788" />
  <rect x="30" y="190" width="40" height="40" rx="4" fill="#FFFFFF" />
  <rect x="40" y="200" width="20" height="20" rx="2" fill="#7A3293" />
  <!-- QR Data Matrix Dots -->
  <rect x="95" y="25" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="115" y="25" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="135" y="25" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="155" y="25" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="95" y="45" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="135" y="45" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="155" y="45" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="95" y="65" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="115" y="65" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="135" y="65" width="10" height="10" rx="2" fill="#5E1788" />
  <!-- Center Column Grid -->
  <rect x="25" y="95" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="45" y="95" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="65" y="95" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="25" y="115" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="45" y="115" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="65" y="115" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="25" y="135" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="45" y="135" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="65" y="135" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="25" y="155" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="65" y="155" width="10" height="10" rx="2" fill="#7A3293" />
  <!-- Bottom-Right Section -->
  <rect x="95" y="185" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="115" y="185" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="135" y="185" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="155" y="185" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="175" y="185" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="195" y="185" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="215" y="185" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="235" y="185" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="95" y="205" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="135" y="205" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="155" y="205" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="175" y="205" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="215" y="205" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="235" y="205" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="95" y="225" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="115" y="225" width="10" height="10" rx="2" fill="#D462A6" />
  <rect x="155" y="225" width="10" height="10" rx="2" fill="#7A3293" />
  <rect x="195" y="225" width="10" height="10" rx="2" fill="#5E1788" />
  <rect x="235" y="225" width="10" height="10" rx="2" fill="#7A3293" />
  <!-- Central Luxury Monogram Badge -->
  <circle cx="130" cy="130" r="32" fill="#FFFFFF" stroke="#D8C2E7" stroke-width="2" />
  <circle cx="130" cy="130" r="26" fill="#5E1788" />
  <text x="130" y="137" fill="#FFFFFF" font-family="serif" font-size="20" font-weight="bold" text-anchor="middle">S</text>
</svg>`;
}

// Initial demo history for realistic initial admin state
const INITIAL_DEMO_HISTORY: QueuedWhatsAppMessage[] = [
  {
    id: "wa-msg-demo-1",
    recipientPhone: "+39 333 456 7890",
    recipientName: "Chiara Rossi",
    templateType: "booking_confirmation",
    messageText: `🌸 *SCELTA MAKEUP — Conferma Prenotazione* 🌸\n\nGentile *Chiara Rossi*,\nabbiamo il piacere di confermarti la riservazione del tuo trattamento:\n\n✨ *Servizio:* Make-up Evento & Cerimonia\n📅 *Data:* Oggi\n⏰ *Orario:* 13:30\n👩‍🎨 *Professionista:* Federica Cesiano\n📍 *Boutique:* Via dei Pellegrini 28/29, 80132 Napoli\n🔖 *Codice Prenotazione:* SC-260906-FC11\n\n💳 *Riepilogo:* Acconto versato €9.00 | Saldo in boutique €36.00\n\nA presto in Boutique!\n*Federica Cesiano — Scelta Makeup*`,
    checksum: "sha256_demo_a1b2c3d4",
    scheduledAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    sentAt: new Date(Date.now() - 3600000 * 2 + 28000).toISOString(),
    jitterDelaySeconds: 28,
    status: "sent",
  },
  {
    id: "wa-msg-demo-2",
    recipientPhone: "+39 349 765 4321",
    recipientName: "Giulia Moretti",
    templateType: "order_placed",
    messageText: `✨ *SCELTA MAKEUP — Il tuo ordine cosmetico è confermato!* ✨\n\nCara *Giulia Moretti*,\ngrazie per aver scelto Scelta Makeup! Ordine #SC-ORD-2026-0001 confermato con corriere espresso tracciato 24/48h e 2 omaggi inclusi ✨.\n\n*Federica Cesiano — Scelta Makeup*`,
    checksum: "sha256_demo_e5f6g7h8",
    scheduledAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    sentAt: new Date(Date.now() - 3600000 * 1 + 34000).toISOString(),
    jitterDelaySeconds: 34,
    status: "sent",
  },
];

// In-memory state singleton for real-time reactivity
class WhatsAppQueueManager {
  private sessionStatus: WhatsAppSessionStatus = "open";
  private connectedNumber: string = STORE_PHONE;
  private qrCodeSvg: string = generateMockQrSvg();
  private isProcessing: boolean = false;
  private activeItem: QueuedWhatsAppMessage | null = null;
  private countdownSeconds: number = 0;
  private queue: QueuedWhatsAppMessage[] = [];
  private history: QueuedWhatsAppMessage[] = [...INITIAL_DEMO_HISTORY];
  private totalSent: number = INITIAL_DEMO_HISTORY.length;
  private totalFailed: number = 0;
  private listeners: Set<(state: WhatsAppQueueState) => void> = new Set();
  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.sessionStatus) this.sessionStatus = parsed.sessionStatus;
        if (Array.isArray(parsed.queue)) this.queue = parsed.queue;
        if (Array.isArray(parsed.history)) this.history = parsed.history;
        if (typeof parsed.totalSent === "number") this.totalSent = parsed.totalSent;
        if (typeof parsed.totalFailed === "number") this.totalFailed = parsed.totalFailed;
      }
    } catch (e) {
      console.error("Failed to load WhatsApp queue from storage", e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_QUEUE_KEY,
        JSON.stringify({
          sessionStatus: this.sessionStatus,
          queue: this.queue,
          history: this.history,
          totalSent: this.totalSent,
          totalFailed: this.totalFailed,
        })
      );
    } catch (e) {
      console.error("Failed to save WhatsApp queue to storage", e);
    }
  }

  public getState(): WhatsAppQueueState {
    return {
      sessionStatus: this.sessionStatus,
      connectedNumber: this.connectedNumber,
      qrCodeSvg: this.qrCodeSvg,
      isProcessing: this.isProcessing,
      activeItem: this.activeItem,
      countdownSeconds: this.countdownSeconds,
      queue: [...this.queue],
      history: [...this.history],
      totalSent: this.totalSent,
      totalFailed: this.totalFailed,
    };
  }

  public subscribe(callback: (state: WhatsAppQueueState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error("Error in WhatsApp queue listener:", err);
      }
    });
    this.saveToStorage();
  }

  public setSessionStatus(status: WhatsAppSessionStatus): void {
    this.sessionStatus = status;
    if (status === "connecting") {
      this.qrCodeSvg = generateMockQrSvg();
    }
    this.notify();
  }

  public enqueueMessage(input: EnqueueWhatsAppInput): QueuedWhatsAppMessage {
    const { text, checksum, jitter } = input.customText
      ? {
          text: input.customText,
          checksum: generateSimpleChecksum(input.customText),
          jitter: calculateJitter(),
        }
      : formatWhatsAppTemplate(input.templateType, {
          customerName: input.recipientName,
          ...input.context,
        });

    const sanitizedPhone = sanitizePhoneNumber(input.recipientPhone);

    const message: QueuedWhatsAppMessage = {
      id: `wa-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      recipientPhone: sanitizedPhone,
      recipientName: input.recipientName,
      templateType: input.templateType,
      messageText: text,
      checksum,
      scheduledAt: new Date().toISOString(),
      jitterDelaySeconds: jitter,
      status: "queued",
      metadata: input.context,
    };

    this.queue.push(message);
    this.notify();

    // Trigger queue processing in background
    this.processQueue();

    return message;
  }

  public triggerManualTest(type: NotificationTemplateType = "manual_test"): QueuedWhatsAppMessage {
    return this.enqueueMessage({
      recipientPhone: STORE_PHONE,
      recipientName: "Test Federica",
      templateType: type,
      context: {
        customerName: "Federica Cesiano (Test)",
        serviceName: "Make-up Evento & Cerimonia",
        bookingDate: "Oggi",
        bookingTime: "13:30",
        priceList: 50.0,
        discountOnline: 5.0,
        priceOnline: 45.0,
        depositPaid: 9.0,
        balanceDue: 36.0,
      },
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const current = this.queue.shift()!;
    current.status = "processing";
    this.activeItem = current;
    this.countdownSeconds = current.jitterDelaySeconds;
    this.notify();

    // Start countdown timer
    await new Promise<void>((resolve) => {
      if (this.timerInterval) clearInterval(this.timerInterval);

      this.timerInterval = setInterval(() => {
        this.countdownSeconds--;
        if (this.countdownSeconds <= 0) {
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
          resolve();
        } else {
          this.notify();
        }
      }, 1000);
    });

    // Execute send (Live Evolution API or Realistic Mock)
    try {
      const liveEvolutionUrl = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
      const liveEvolutionKey = process.env.EVOLUTION_API_KEY;

      if (liveEvolutionUrl && liveEvolutionKey) {
        // Live Evolution API invocation
        const response = await fetch(`${liveEvolutionUrl}/message/sendText/scelta-makeup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: liveEvolutionKey,
          },
          body: JSON.stringify({
            number: current.recipientPhone.replace("+", ""),
            text: current.messageText,
            delay: 1200,
          }),
        });

        if (!response.ok) {
          throw new Error(`Evolution API error: ${response.statusText}`);
        }
      } else {
        // Realistic simulation latency
        await new Promise((r) => setTimeout(r, 350));
      }

      current.status = "sent";
      current.sentAt = new Date().toISOString();
      this.totalSent++;
    } catch (error) {
      current.status = "failed";
      current.errorMessage = error instanceof Error ? error.message : "Errore sconosciuto Evolution API";
      this.totalFailed++;
    }

    this.history.unshift(current);
    this.activeItem = null;
    this.countdownSeconds = 0;
    this.isProcessing = false;
    this.notify();

    // If there are more items waiting, proceed to the next item
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  public clearQueue(): void {
    this.queue = [];
    this.notify();
  }

  public clearHistory(): void {
    this.history = [];
    this.notify();
  }
}

// Global singleton instance
const queueManager = new WhatsAppQueueManager();

export function enqueueWhatsAppMessage(input: EnqueueWhatsAppInput): QueuedWhatsAppMessage {
  return queueManager.enqueueMessage(input);
}

export function getWhatsAppQueueState(): WhatsAppQueueState {
  return queueManager.getState();
}

export function subscribeToWhatsAppQueue(
  callback: (state: WhatsAppQueueState) => void
): () => void {
  return queueManager.subscribe(callback);
}

export const onQueueUpdate = subscribeToWhatsAppQueue;

export function triggerManualTestMessage(
  type: NotificationTemplateType = "manual_test"
): QueuedWhatsAppMessage {
  return queueManager.triggerManualTest(type);
}

export function setWhatsAppSessionStatus(status: WhatsAppSessionStatus): void {
  queueManager.setSessionStatus(status);
}

export function clearWhatsAppQueue(): void {
  queueManager.clearQueue();
}

export function clearWhatsAppHistory(): void {
  queueManager.clearHistory();
}
