"use client";

import React from "react";
import Link from "next/link";
import {
  Printer,
  ExternalLink,
  Lock,
  DollarSign,
  ArrowRight,
} from "lucide-react";

export default function AppointmentsBridgeTab() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#5E1788] to-[#7A3293] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-[#D8C2E7] border border-white/20">
              Modulo Ufficiale Salone & Cassa RT
            </span>
            <span className="text-xs text-[#D8C2E7]/90 font-medium">
              Epson FP-81II RT XML • Multi-Operatrice • Giornata 09:30-20:30 • Saldi 80%
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            Agenda Appuntamenti Multi-Operatrice & Cassa RT
          </h1>
          <p className="text-xs text-[#D8C2E7] max-w-xl mt-1">
            Gestione integrata per <strong>Federica Cesiano</strong> (Postazione Trucco Negozio) e <strong>Futura Collega</strong> (Cabina Estetica Privata), con scontrini fiscali telematici e incasso saldo.
          </p>
        </div>

        <Link
          href="/admin/appuntamenti"
          className="px-5 py-3 rounded-xl bg-white text-[#5E1788] hover:bg-[#D8C2E7] text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <span>Apri Gestionale Cassa Completo</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#5E1788]/10 text-[#5E1788] flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#1F1B24]">
            Registratore Telematico ePOS XML
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Generatore istantaneo di tracciati SOAP XML conformi Epson FP-81II RT (IP 192.168.68.63 fpmate.cgi) con scorporo IVA ventilata e invio telematico.
          </p>
          <Link
            href="/admin/appuntamenti"
            className="text-xs text-[#5E1788] font-semibold hover:underline flex items-center gap-1 pt-1"
          >
            <span>Emetti scontrino RT</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#D462A6] flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#1F1B24]">
            Incasso Saldi in Salone (80%)
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Dopo il 20% di acconto online (Stripe), incassa il restante 80% direttamente al banco salone con POS myPOS Go 2 o Contanti.
          </p>
          <Link
            href="/admin/appuntamenti"
            className="text-xs text-[#5E1788] font-semibold hover:underline flex items-center gap-1 pt-1"
          >
            <span>Vedi incassi odierni</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7A3293] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#1F1B24]">
            Agenda Oraria 09:30-20:30 & Multi-Operatrice
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Pianificazione oraria con filtri rapidi tra Federica e Cabina Estetica, prenotazione al volo e blocco 1-click degli slot orari.
          </p>
          <Link
            href="/admin/appuntamenti"
            className="text-xs text-[#5E1788] font-semibold hover:underline flex items-center gap-1 pt-1"
          >
            <span>Gestisci disponibilità orari</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Embedded Live Frame preview of /admin/appuntamenti */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-700">
              Sessione Attiva Gestionale Appuntamenti & Cassa
            </span>
          </div>

          <Link
            href="/admin/appuntamenti"
            className="text-xs text-[#5E1788] font-medium hover:underline flex items-center gap-1"
          >
            <span>Espandi a Schermo Intero</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="w-full h-[720px] bg-white">
          <iframe
            src="/admin/appuntamenti"
            title="Gestionale Appuntamenti Scelta Makeup"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
