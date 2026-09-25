"use client";

import React from "react";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  Store,
  Check,
  Clock,
} from "lucide-react";
import type { PaymentMethod, DeliveryMethod } from "@/types/order";
import {
  VisaLogo,
  MastercardLogo,
  AmexLogo,
  PostePayLogo,
  ApplePayLogo,
  GooglePayLogo,
  KlarnaLogo,
  PayPalLogo,
  ScalapayLogo,
  StripeSecuredBadge,
} from "@/components/ui/PaymentLogos";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  deliveryMethod: DeliveryMethod;
  total: number;
}

export default function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  deliveryMethod,
  total,
}: PaymentMethodSelectorProps) {
  const installmentAmount = (total / 3).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-[#1F1B24] flex items-center gap-2">
          <span>3. Metodo di Pagamento</span>
        </h2>
        <StripeSecuredBadge />
      </div>

      <div className="space-y-3">
        {/* ================================================================ */}
        {/* 1. CARTA DI CREDITO / DEBITO */}
        {/* ================================================================ */}
        <div
          onClick={() => onSelectMethod("card")}
          className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
            selectedMethod === "card"
              ? "border-[#5E1788] bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 shadow-md shadow-[#5E1788]/10 ring-2 ring-[#5E1788]/20"
              : "border-neutral-200/80 bg-white hover:border-[#D8C2E7] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    selectedMethod === "card"
                      ? "border-[#5E1788] bg-[#5E1788] text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {selectedMethod === "card" && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#1F1B24]">
                    Carta di Credito o Debito
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                    Immediato & Protetto
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Visa, Mastercard, Maestro, Amex, PostePay e ricaricabili
                </p>
              </div>
            </div>

            {/* Brand Logo Row */}
            <div className="flex items-center gap-1.5 shrink-0">
              <VisaLogo className="h-6 w-9 shadow-xs" />
              <MastercardLogo className="h-6 w-9 shadow-xs" />
              <AmexLogo className="h-6 w-9 shadow-xs hidden sm:block" />
              <PostePayLogo className="h-6 w-9 shadow-xs hidden sm:block" />
            </div>
          </div>

          {selectedMethod === "card" && (
            <div className="mt-3 pt-3 border-t border-purple-100 text-xs text-neutral-600 flex items-center gap-2 bg-purple-50/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
              <Lock className="w-3.5 h-3.5 text-[#5E1788] shrink-0" />
              <span>
                Crittografia <strong>Stripe 3D-Secure</strong>. Inserirai i dati della carta in totale sicurezza nel checkout protetto.
              </span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 2. APPLE PAY & GOOGLE PAY */}
        {/* ================================================================ */}
        <div
          onClick={() => onSelectMethod("apple_pay")}
          className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
            selectedMethod === "apple_pay" || selectedMethod === "google_pay"
              ? "border-[#5E1788] bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 shadow-md shadow-[#5E1788]/10 ring-2 ring-[#5E1788]/20"
              : "border-neutral-200/80 bg-white hover:border-[#D8C2E7] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    selectedMethod === "apple_pay" || selectedMethod === "google_pay"
                      ? "border-[#5E1788] bg-[#5E1788] text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {(selectedMethod === "apple_pay" || selectedMethod === "google_pay") && (
                    <Check className="w-3 h-3 stroke-[3]" />
                  )}
                </div>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#1F1B24]">
                    Apple Pay & Google Pay
                  </span>
                  <span className="text-[10px] uppercase font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">
                    1-Click Express
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Paga in 1 tap con Touch ID o Face ID dal tuo smartphone o computer
                </p>
              </div>
            </div>

            {/* Wallet Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              <ApplePayLogo className="h-6 w-10 shadow-xs" />
              <GooglePayLogo className="h-6 w-10 shadow-xs" />
            </div>
          </div>

          {(selectedMethod === "apple_pay" || selectedMethod === "google_pay") && (
            <div className="mt-3 pt-3 border-t border-purple-100 text-xs text-neutral-600 flex items-center gap-2 bg-purple-50/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
              <Sparkles className="w-3.5 h-3.5 text-[#5E1788] shrink-0" />
              <span>
                Il pulsante nativo Apple Pay / Google Pay comparirà automaticamente al checkout protetto.
              </span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 3. KLARNA (PAGA IN 3 RATE) */}
        {/* ================================================================ */}
        <div
          onClick={() => onSelectMethod("klarna")}
          className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
            selectedMethod === "klarna"
              ? "border-[#5E1788] bg-gradient-to-br from-pink-50/30 via-white to-purple-50/20 shadow-md shadow-[#5E1788]/10 ring-2 ring-[#5E1788]/20"
              : "border-neutral-200/80 bg-white hover:border-[#D8C2E7] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    selectedMethod === "klarna"
                      ? "border-[#5E1788] bg-[#5E1788] text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {selectedMethod === "klarna" && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#1F1B24]">Klarna</span>
                  <span className="text-[10px] font-bold text-pink-700 bg-pink-100/70 px-2 py-0.5 rounded-full">
                    3 rate da €{installmentAmount}/mese
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Paga in 3 rate a tasso zero (TAN 0%, TAEG 0%) senza costi aggiuntivi
                </p>
              </div>
            </div>

            {/* Klarna Logo */}
            <div className="shrink-0">
              <KlarnaLogo className="h-6 w-11 shadow-xs" />
            </div>
          </div>

          {selectedMethod === "klarna" && (
            <div className="mt-3 pt-3 border-t border-pink-100 bg-pink-50/20 -mx-4 -mb-4 p-3 rounded-b-2xl">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-pink-100 shadow-2xs">
                  <span className="block text-[10px] text-neutral-400 font-medium">1ª RATA OGGI</span>
                  <span className="font-bold text-[#1F1B24]">€{installmentAmount}</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-pink-100 shadow-2xs">
                  <span className="block text-[10px] text-neutral-400 font-medium">TRA 30 GG</span>
                  <span className="font-bold text-[#1F1B24]">€{installmentAmount}</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-pink-100 shadow-2xs">
                  <span className="block text-[10px] text-neutral-400 font-medium">TRA 60 GG</span>
                  <span className="font-bold text-[#1F1B24]">€{installmentAmount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 4. PAYPAL */}
        {/* ================================================================ */}
        <div
          onClick={() => onSelectMethod("paypal")}
          className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
            selectedMethod === "paypal"
              ? "border-[#5E1788] bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 shadow-md shadow-[#5E1788]/10 ring-2 ring-[#5E1788]/20"
              : "border-neutral-200/80 bg-white hover:border-[#D8C2E7] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    selectedMethod === "paypal"
                      ? "border-[#5E1788] bg-[#5E1788] text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {selectedMethod === "paypal" && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#1F1B24]">PayPal</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Subito o in 3 rate
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Accedi con il tuo account PayPal. Disponibile anche con l&apos;opzione &ldquo;Paga in 3 rate&rdquo;.
                </p>
              </div>
            </div>

            {/* PayPal Logo */}
            <div className="shrink-0">
              <PayPalLogo className="h-6 w-11 shadow-xs" />
            </div>
          </div>

          {selectedMethod === "paypal" && (
            <div className="mt-3 pt-3 border-t border-blue-100 text-xs text-neutral-600 flex items-center gap-2 bg-blue-50/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Copertura totale con <strong>Protezione Acquisti PayPal</strong> e checkout sicuro.
              </span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 5. SCALAPAY (PAGA IN 3 RATE) */}
        {/* ================================================================ */}
        <div
          onClick={() => onSelectMethod("scalapay")}
          className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
            selectedMethod === "scalapay"
              ? "border-[#5E1788] bg-gradient-to-br from-rose-50/30 via-white to-purple-50/20 shadow-md shadow-[#5E1788]/10 ring-2 ring-[#5E1788]/20"
              : "border-neutral-200/80 bg-white hover:border-[#D8C2E7] hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    selectedMethod === "scalapay"
                      ? "border-[#5E1788] bg-[#5E1788] text-white"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {selectedMethod === "scalapay" && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#1F1B24]">Scalapay</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                    3 rate da €{installmentAmount} senza interessi
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Ricevi subito il tuo ordine e paghi in 3 comode rate mensili
                </p>
              </div>
            </div>

            {/* Scalapay Logo */}
            <div className="shrink-0">
              <ScalapayLogo className="h-6 w-11 shadow-xs" />
            </div>
          </div>

          {selectedMethod === "scalapay" && (
            <div className="mt-3 pt-3 border-t border-rose-100 text-xs text-neutral-600 flex items-center gap-2 bg-rose-50/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
              <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>
                Zero costi aggiuntivi. Approvazione immediata con carta di debito, credito o prepagata.
              </span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* 6. PAGA AL RITIRO IN BOUTIQUE A NAPOLI */}
        {/* ================================================================ */}
        {deliveryMethod === "boutique" && (
          <div
            onClick={() => onSelectMethod("boutique")}
            className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
              selectedMethod === "boutique"
                ? "border-[#5E1788] bg-gradient-to-br from-purple-50/40 via-white to-purple-50/20 shadow-md shadow-[#5E1788]/10 ring-2 ring-[#5E1788]/20"
                : "border-neutral-200/80 bg-white hover:border-[#D8C2E7] hover:shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedMethod === "boutique"
                        ? "border-[#5E1788] bg-[#5E1788] text-white"
                        : "border-neutral-300 bg-white"
                    }`}
                  >
                    {selectedMethod === "boutique" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#1F1B24]">
                      Paga al Ritiro in Salone a Napoli
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Zero Commissioni
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Via dei Pellegrini 28/29, Napoli — Saldo con Carta/POS myPOS o Contanti al banco
                  </p>
                </div>
              </div>

              <div className="shrink-0 p-1.5 rounded-lg bg-purple-50 text-[#5E1788]">
                <Store className="h-5 w-5" />
              </div>
            </div>

            {selectedMethod === "boutique" && (
              <div className="mt-3 pt-3 border-t border-purple-100 text-xs text-neutral-600 flex items-center gap-2 bg-purple-50/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
                <Clock className="w-3.5 h-3.5 text-[#5E1788] shrink-0" />
                <span>
                  Il tuo pacchetto verrà preparato e custodito in Salone. Riceverai un WhatsApp appena pronto per il ritiro!
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trust & Security Guarantee Bar */}
      <div className="p-3 rounded-xl bg-[#FAF7FC] border border-[#D8C2E7]/40 flex items-center justify-between gap-3 text-[11px] text-neutral-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Pagamenti protetti con <strong>crittografia bancaria certificata</strong>
          </span>
        </div>
        <span className="text-[#5E1788] font-medium hidden sm:inline">
          100% Soddisfatti o Rimborsati
        </span>
      </div>
    </div>
  );
}
