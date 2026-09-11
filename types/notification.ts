export type NotificationChannel = "whatsapp" | "email";

export type NotificationTemplateType =
  | "booking_confirmation"
  | "booking_reminder_24h"
  | "order_placed"
  | "manual_test";

export type NotificationStatus = "queued" | "processing" | "sent" | "failed";

export type WhatsAppSessionStatus = "open" | "connecting" | "close";

export interface BookingFinancials {
  priceList: number;
  discountOnline: number; // -10% online promotion
  priceOnline: number; // List price minus discount (90%)
  depositPaid: number; // 20% online confirmation deposit
  balanceDue: number; // 80% remaining in-store balance
}

export interface QueuedWhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  templateType: NotificationTemplateType;
  messageText: string;
  checksum: string; // Dynamic checksum/fingerprint preventing Meta deduplication
  scheduledAt: string; // ISO date string
  sentAt?: string;
  jitterDelaySeconds: number; // Mandatory random jitter strictly between 20 and 45 seconds
  status: NotificationStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppQueueState {
  sessionStatus: WhatsAppSessionStatus;
  connectedNumber: string;
  qrCodeSvg?: string;
  isProcessing: boolean;
  activeItem: QueuedWhatsAppMessage | null;
  countdownSeconds: number; // Active countdown remaining until next dispatch
  queue: QueuedWhatsAppMessage[]; // Pending items in FIFO order
  history: QueuedWhatsAppMessage[]; // Processed items (sent or failed)
  totalSent: number;
  totalFailed: number;
}

export interface EmailDispatchResult {
  success: boolean;
  id?: string;
  templateType: NotificationTemplateType;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  html: string;
  simulated: boolean;
  sentAt: string;
  error?: string;
}

export interface EnqueueWhatsAppInput {
  recipientPhone: string;
  recipientName: string;
  templateType: NotificationTemplateType;
  context?: Record<string, unknown>;
  customText?: string;
}

export interface EmailRenderOutput {
  subject: string;
  html: string;
}
