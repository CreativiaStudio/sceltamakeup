export type ServiceChannel = "makeup" | "beauty";

export interface Service {
  id: string;
  slug: string;
  name: string;
  channel: ServiceChannel;
  description: string;
  durationMinutes: number;
  priceList: number;
  priceOnline: number; // 10% discount: priceList * 0.9
  discountOnline: number; // priceList * 0.1
  depositPercent: number; // 0.20 (20%)
  depositAmount: number; // priceOnline * 0.20
  balanceAmount: number; // priceOnline - depositAmount (80%)
  active: boolean;
  image: string;
  benefits: string[];
  includes: string[];
  recommendedFor: string;
}

export interface Operator {
  id: string;
  name: string;
  channel: ServiceChannel;
  role: string;
  bio: string;
  avatar: string;
  active: boolean;
}

export interface TimeSlot {
  id: string;
  time: string; // e.g. "13:30", "14:30", "20:00"
  available: boolean;
  reason?: string;
  isOutsideStoreHours?: boolean;
}

export interface CustomerData {
  name: string;
  surname: string;
  phone: string; // WhatsApp number
  email: string;
  notes?: string;
}

export interface BookingPricing {
  priceList: number;
  discountOnline: number;
  priceOnline: number;
  depositPaid: number;
  balanceDue: number;
}

export type AppointmentStatus =
  | "confirmed" // Acconto versato online, attesa in boutique
  | "completed_paid" // Saldo incassato in negozio, scontrino emesso
  | "cancelled" // Annullato entro le 24h
  | "no_show"; // Mancata presentazione

export interface Appointment {
  id: string;
  bookingCode: string; // e.g. "SC-260906-AB12"
  serviceId: string;
  serviceName: string;
  channel: ServiceChannel;
  operatorId: string;
  operatorName: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customer: CustomerData;
  pricing: BookingPricing;
  status: AppointmentStatus;
  paymentMethodDeposit:
    | "stripe_card"
    | "apple_pay"
    | "google_pay"
    | "klarna"
    | "paypal"
    | "scalapay";
  paymentMethodBalance?: "mypos_card" | "cash";
  cassaReceiptPrinted?: boolean;
  cassaReceiptNumber?: string;
  createdAt: string;
  completedAt?: string;
}
