"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  User,
  Sparkles,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { createAppointment } from "@/lib/bookingService";
import { enqueueWhatsAppMessage } from "@/lib/whatsappQueueService";
import { sendBookingConfirmationEmail } from "@/lib/resendService";
import type { Appointment } from "@/types/booking";

type VerifyStatus = "loading" | "paid" | "error";

export default function PrenotaSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId!)}`
        );
        const data = await res.json();

        if (!res.ok || data.payment_status !== "paid") {
          if (!cancelled) setStatus("error");
          return;
        }

        const meta = data.metadata || {};
        if (meta.serviceId && meta.date && meta.time && meta.customerEmail) {
          const appt = createAppointment({
            serviceId: meta.serviceId,
            date: meta.date,
            time: meta.time,
            customer: {
              name: meta.customerName || "",
              surname: meta.customerSurname || "",
              phone: meta.customerPhone || "",
              email: meta.customerEmail || "",
              notes: meta.customerNotes || "",
            },
            paymentMethodDeposit: "stripe_card",
          });

          if (!cancelled) setAppointment(appt);

          try {
            enqueueWhatsAppMessage({
              recipientPhone: appt.customer.phone,
              recipientName: `${appt.customer.name} ${appt.customer.surname}`,
              templateType: "booking_confirmation",
              context: {
                customerName: `${appt.customer.name} ${appt.customer.surname}`,
                serviceName: appt.serviceName,
                bookingCode: appt.bookingCode,
                bookingDate: appt.date,
                bookingTime: appt.time,
                operatorName: appt.operatorName,
                durationMinutes: appt.durationMinutes,
                priceList: appt.pricing.priceList,
                discountOnline: appt.pricing.discountOnline,
                priceOnline: appt.pricing.priceOnline,
                depositPaid: appt.pricing.depositPaid,
                balanceDue: appt.pricing.balanceDue,
              },
            });

            sendBookingConfirmationEmail(appt).catch((emailErr) => {
              console.warn("Booking confirmation email dispatch failed:", emailErr);
            });
          } catch (notifErr) {
            console.warn("Failed to enqueue booking notifications:", notifErr);
          }
        }

        if (!cancelled) setStatus("paid");
      } catch (error) {
        console.error("Booking verification error:", error);
        if (!cancelled) setStatus("error");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#FAF7FC] py-16 px-4 gap-4">
        <Loader2 className="h-10 w-10 text-[#5E1788] animate-spin" />
        <p className="text-sm text-neutral-600">Verifica acconto e conferma appuntamento...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7FC] py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-5 border border-[#D8C2E7]/60 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F1B24]">
            Pagamento non verificato
          </h1>
          <p className="text-sm text-neutral-600">
            Non siamo riusciti a confermare il versamento dell&apos;acconto. Se l&apos;importo è stato addebitato, non preoccuparti: contattaci pure su WhatsApp o email per bloccare la seduta.
          </p>
          <Link
            href="/prenota"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5E1788] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
          >
            Torna alle Prenotazioni
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF7FC] py-16 px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-[#D8C2E7]/60 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#7A3293]">
            {appointment ? appointment.bookingCode : "Prenotazione Confermata"}
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1F1B24]">
            Appuntamento Riservato
          </h1>
          <p className="text-sm text-neutral-600 font-light">
            L&apos;acconto del 20% è stato incassato con successo. Abbiamo bloccato la cabina per te nel nostro Salone a Napoli.
          </p>
        </div>

        {appointment && (
          <div className="p-5 rounded-2xl bg-[#FAF7FC] border border-neutral-200 text-left text-xs space-y-3 text-neutral-700">
            <div className="flex items-center gap-2 font-semibold text-[#5E1788]">
              <Sparkles className="h-4 w-4 text-[#D462A6]" />
              {appointment.serviceName}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-neutral-200/60">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <span>{appointment.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                <span>Ore {appointment.time} ({appointment.durationMinutes} min)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <span>{appointment.operatorName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <span>Via dei Pellegrini 28/29</span>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-200/60 space-y-1 text-[11px]">
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Acconto 20% versato online (Stripe):</span>
                <span>€{appointment.pricing.depositPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-800 font-bold">
                <span>Saldo residuo da versare in salone:</span>
                <span>€{appointment.pricing.balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center gap-2 text-left text-xs text-[#5E1788]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#7A3293]" />
          <span>Riceverai un promemoria automatico via WhatsApp e via email prima dell&apos;appuntamento.</span>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-4 rounded-xl bg-[#5E1788] text-white font-medium text-xs tracking-wider uppercase hover:bg-[#7A3293] transition-colors"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
