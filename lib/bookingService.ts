import {
  Service,
  Operator,
  TimeSlot,
  Appointment,
  CustomerData,
  ServiceChannel,
} from "@/types/booking";
import { SERVICES, OPERATORS } from "@/data/services";

// Standard solo-worker slots (Outside store counter hours)
// Store opening hours: 09:30 - 14:00 / 16:00 - 19:30
// Dedicated makeup slots: Lunch break (14:00 - 16:00) & Evening (19:30 - 21:00)
export const DEFAULT_SOLO_WORKER_SLOTS = [
  "14:00",
  "14:45",
  "15:30",
  "19:30",
  "20:15",
];

// Agenda boutique full-day slots (09:30 - 20:30)
export const AGENDA_BOUTIQUE_SLOTS = [
  "09:30",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:15",
  "15:00",
  "16:30",
  "17:30",
  "18:30",
  "19:30",
  "20:00",
  "20:30",
];

const STORAGE_APPOINTMENTS_KEY = "scelta_makeup_appointments_v2";
const STORAGE_BLOCKED_SLOTS_KEY = "scelta_makeup_blocked_slots_v1";

// Clean production state: zero fake demo appointments
const INITIAL_DEMO_APPOINTMENTS: Appointment[] = [];

export function getServices(channel?: ServiceChannel): Service[] {
  if (!channel) return SERVICES.filter((s) => s.active);
  return SERVICES.filter((s) => s.channel === channel && s.active);
}

export function getAllServicesWithFuture(): Service[] {
  return SERVICES;
}

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getOperators(channel?: ServiceChannel): Operator[] {
  if (!channel) return OPERATORS;
  return OPERATORS.filter((o) => o.channel === channel);
}

// LocalStorage helpers
function getStoredAppointments(): Appointment[] {
  if (typeof window === "undefined") return INITIAL_DEMO_APPOINTMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_APPOINTMENTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_APPOINTMENTS_KEY, JSON.stringify(INITIAL_DEMO_APPOINTMENTS));
      return INITIAL_DEMO_APPOINTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_APPOINTMENTS;
  }
}

function saveStoredAppointments(list: Appointment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_APPOINTMENTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Error saving appointments to localStorage", e);
  }
}

function getStoredBlockedSlots(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_BLOCKED_SLOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredBlockedSlots(map: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_BLOCKED_SLOTS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Error saving blocked slots to localStorage", e);
  }
}

export function getAvailableSlots(dateStr: string): TimeSlot[] {
  const appointments = getStoredAppointments().filter(
    (a) => a.date === dateStr && a.status !== "cancelled"
  );
  const blockedMap = getStoredBlockedSlots();
  const blockedForDate = blockedMap[dateStr] || [];

  return DEFAULT_SOLO_WORKER_SLOTS.map((time) => {
    const isBooked = appointments.some((a) => a.time === time);
    const isBlocked = blockedForDate.includes(time);
    const available = !isBooked && !isBlocked;

    let reason: string | undefined;
    if (isBooked) reason = "Già riservato";
    if (isBlocked) reason = "Riservato in boutique";

    return {
      id: `${dateStr}_${time}`,
      time,
      available,
      reason,
      isOutsideStoreHours: true,
    };
  });
}

export interface AgendaSlotDetails {
  time: string;
  appointments: Appointment[];
  isBlocked: boolean;
}

export function getAgendaSlots(
  dateStr: string,
  operatorId?: string
): AgendaSlotDetails[] {
  const allAppointments = getStoredAppointments().filter(
    (a) => a.date === dateStr && a.status !== "cancelled"
  );
  const filteredAppointments =
    !operatorId || operatorId === "all"
      ? allAppointments
      : allAppointments.filter((a) => a.operatorId === operatorId);

  const blockedMap = getStoredBlockedSlots();
  const blockedForDate = blockedMap[dateStr] || [];

  const allTimesSet = new Set<string>([
    ...AGENDA_BOUTIQUE_SLOTS,
    ...filteredAppointments.map((a) => a.time),
  ]);
  const sortedTimes = Array.from(allTimesSet).sort();

  return sortedTimes.map((time) => {
    const slotAppointments = filteredAppointments.filter((a) => a.time === time);
    const isBlocked = blockedForDate.includes(time);

    return {
      time,
      appointments: slotAppointments,
      isBlocked,
    };
  });
}

export function createAppointment(data: {
  serviceId: string;
  date: string;
  time: string;
  customer: CustomerData;
  paymentMethodDeposit?:
    | "stripe_card"
    | "apple_pay"
    | "google_pay"
    | "klarna"
    | "paypal"
    | "scalapay";
  operatorId?: string;
}): Appointment {
  const service = getServiceById(data.serviceId);
  if (!service) throw new Error("Servizio non trovato");

  let operator = OPERATORS[0];
  if (data.operatorId) {
    const found = OPERATORS.find((o) => o.id === data.operatorId);
    if (found) {
      operator = found;
    } else {
      operator = OPERATORS.find((o) => o.channel === service.channel && o.active) || OPERATORS[0];
    }
  } else {
    operator = OPERATORS.find((o) => o.channel === service.channel && o.active) || OPERATORS[0];
  }

  const now = new Date();
  const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const dateFormatted = data.date.replace(/-/g, "").slice(2);
  const bookingCode = `SC-${dateFormatted}-${codeSuffix}`;

  const newAppointment: Appointment = {
    id: `app-${Date.now()}-${codeSuffix.toLowerCase()}`,
    bookingCode,
    serviceId: service.id,
    serviceName: service.name,
    channel: service.channel,
    operatorId: operator.id,
    operatorName: operator.name,
    durationMinutes: service.durationMinutes,
    date: data.date,
    time: data.time,
    customer: data.customer,
    pricing: {
      priceList: service.priceList,
      discountOnline: service.discountOnline,
      priceOnline: service.priceOnline,
      depositPaid: service.depositAmount,
      balanceDue: service.balanceAmount,
    },
    status: "confirmed",
    paymentMethodDeposit: data.paymentMethodDeposit || "stripe_card",
    createdAt: now.toISOString(),
  };

  const list = getStoredAppointments();
  list.unshift(newAppointment);
  saveStoredAppointments(list);

  return newAppointment;
}

export function getAllAppointments(): Appointment[] {
  return getStoredAppointments();
}

export function getAppointmentById(id: string): Appointment | undefined {
  return getStoredAppointments().find((a) => a.id === id);
}

export function getAppointmentByCode(code: string): Appointment | undefined {
  return getStoredAppointments().find(
    (a) => a.bookingCode.toUpperCase() === code.toUpperCase()
  );
}

// 1-Click In-Store Balance Clearance
export function markAppointmentPaid(
  appointmentId: string,
  method: "mypos_card" | "cash"
): { success: boolean; appointment: Appointment; receiptXml: string } {
  const list = getStoredAppointments();
  const index = list.findIndex((a) => a.id === appointmentId);
  if (index === -1) throw new Error("Appuntamento non trovato");

  const app = list[index];
  const receiptNum = `RT-${Date.now().toString().slice(-4)}`;

  const updated: Appointment = {
    ...app,
    status: "completed_paid",
    paymentMethodBalance: method,
    cassaReceiptPrinted: true,
    cassaReceiptNumber: receiptNum,
    completedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveStoredAppointments(list);

  // Generate XML for Epson FP-81II RT printer over HTTP (fpmate.cgi)
  const receiptXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <printerFiscalReceipt>
      <beginFiscalReceipt operator="1" />
      <printRecItem operator="1" description="${app.serviceName.slice(0, 22)}" quantity="1" unitPrice="${app.pricing.balanceDue.toFixed(2)}" department="1" />
      <printRecTotal operator="1" description="${method === "mypos_card" ? "CARTA" : "CONTANTI"}" payment="${app.pricing.balanceDue.toFixed(2)}" />
      <endFiscalReceipt operator="1" />
    </printerFiscalReceipt>
  </soapenv:Body>
</soapenv:Envelope>`;

  return { success: true, appointment: updated, receiptXml };
}

// 1-Click Slot Toggle for Federica
export function toggleSlotBlock(dateStr: string, timeStr: string): boolean {
  const map = getStoredBlockedSlots();
  const current = map[dateStr] || [];
  let isBlockedNow = false;

  if (current.includes(timeStr)) {
    map[dateStr] = current.filter((t) => t !== timeStr);
    isBlockedNow = false;
  } else {
    map[dateStr] = [...current, timeStr];
    isBlockedNow = true;
  }

  saveStoredBlockedSlots(map);
  return isBlockedNow;
}

export function isSlotBlocked(dateStr: string, timeStr: string): boolean {
  const map = getStoredBlockedSlots();
  return (map[dateStr] || []).includes(timeStr);
}
