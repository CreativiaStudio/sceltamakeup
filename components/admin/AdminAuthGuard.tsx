"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Lock, KeyRound, ShieldAlert, ArrowLeft, Eye, EyeOff, Store } from "lucide-react";
import {
  DEFAULT_OPERATOR_LABEL,
  REMOTE_OPERATOR_LABEL,
  setAuditOperatorSession,
  setupGlobalErrorTelemetry,
} from "@/lib/auditLogger";

const STORAGE_AUTH_KEY = "scelta_admin_unlocked_session";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"pin" | "password">("pin");
  const [pin, setPin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  // Verifica sessione all'avvio
  useEffect(() => {
    async function checkAuth() {
      // 1. Controlla prima lo storage di sessione locale
      const localUnlocked = sessionStorage.getItem(STORAGE_AUTH_KEY);
      if (localUnlocked === "true") {
        setIsAuthenticated(true);
        return;
      }

      // 2. Controlla il cookie di sessione HTTP
      try {
        const res = await fetch("/api/admin/auth");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            sessionStorage.setItem(STORAGE_AUTH_KEY, "true");
            setIsAuthenticated(true);
            return;
          }
        }
      } catch {
        // Ignora
      }

      setIsAuthenticated(false);
    }

    checkAuth();
  }, []);

  // Telemetria Scatola Nera: qualunque eccezione runtime non gestita sul
  // dispositivo della cliente (laptop salone YASHI) viene catturata e inviata
  // automaticamente alla Scatola Nera, così Mario interviene prima della segnalazione.
  useEffect(() => {
    const teardown = setupGlobalErrorTelemetry();
    return teardown;
  }, []);

  const handleKeyPress = (digit: string) => {
    setErrorMsg("");
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg("");
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg("");
    setPin("");
  };

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleLogin = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = mode === "pin" ? { pin } : { password };
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem(STORAGE_AUTH_KEY, "true");
        // Scatola nera: attribuisce correttamente gli eventi successivi.
        // PIN cassa → operatore del banco salone; Password Master → admin remoto.
        setAuditOperatorSession(
          mode === "pin" ? DEFAULT_OPERATOR_LABEL : REMOTE_OPERATOR_LABEL,
          mode === "pin" ? "YASHI (Laptop Salone)" : "Browser Amministratore"
        );
        setIsAuthenticated(true);
        setPin("");
        setPassword("");
      } else {
        triggerShake();
        setErrorMsg(data.error || "Credenziali non corrette");
        if (mode === "pin") setPin("");
      }
    } catch {
      triggerShake();
      setErrorMsg("Errore di connessione al server");
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, pin, password, triggerShake]);

  // Invio automatico del PIN appena si raggiungono 4 cifre
  useEffect(() => {
    if (pin.length === 4 && mode === "pin") {
      // Flusso di autenticazione asincrono volutamente innescato al completamento del PIN.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleLogin();
    }
  }, [pin, mode, handleLogin]);

  const handleLock = async () => {
    sessionStorage.removeItem(STORAGE_AUTH_KEY);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // Ignora
    }
    setIsAuthenticated(false);
    setPin("");
    setPassword("");
  };

  // Schermata di caricamento iniziale
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#FAF7FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#5E1788] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#5E1788] tracking-wider uppercase">
            Verifica Sicurezza Cockpit...
          </span>
        </div>
      </div>
    );
  }

  // Se autenticato, mostra il cockpit con il tasto rapido di blocco schermo
  if (isAuthenticated) {
    return (
      <div className="relative">
        {/* Floating Lock Cockpit Bar (in alto a destra) */}
        <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-2 bg-[#1F1B24]/90 hover:bg-[#1F1B24] text-white backdrop-blur-md px-3.5 py-2 rounded-full text-xs font-semibold shadow-lg hover:shadow-xl transition-all border border-white/10 cursor-pointer"
            title="Blocca immediatamente il cockpit quando ti allontani dalla cassa"
          >
            <Lock size={14} className="text-[#D462A6]" />
            <span className="hidden sm:inline">Blocca Cockpit</span>
          </button>
        </div>
        {children}
      </div>
    );
  }

  // SCHERMATA DI BLOCCO / ACCESSO PROTETTO
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7FC] via-[#F4EBF7] to-[#E9D7EE] flex flex-col items-center justify-center p-4">
      <div
        className={`w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#5E1788]/20 p-8 flex flex-col items-center transition-transform duration-300 ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5E1788] to-[#7A3293] flex items-center justify-center shadow-lg shadow-[#5E1788]/30 mb-4 text-white">
          <Lock size={28} />
        </div>

        <h2 className="font-serif text-2xl font-bold text-[#1F1B24] text-center tracking-tight">
          Cockpit Scelta Makeup
        </h2>
        <p className="text-xs text-gray-500 text-center uppercase tracking-widest mt-1 mb-6">
          Accesso Riservato • Via dei Pellegrini, Napoli
        </p>

        {/* Modalità: PIN Cassa vs Password Master */}
        <div className="flex w-full bg-[#FAF7FC] p-1 rounded-2xl border border-[#E8DEF8] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("pin");
              setErrorMsg("");
              setPin("");
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "pin"
                ? "bg-[#5E1788] text-white shadow-sm"
                : "text-gray-600 hover:text-[#5E1788]"
            }`}
          >
            <Store size={14} />
            <span>PIN Cassa Salone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("password");
              setErrorMsg("");
              setPassword("");
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === "password"
                ? "bg-[#5E1788] text-white shadow-sm"
                : "text-gray-600 hover:text-[#5E1788]"
            }`}
          >
            <KeyRound size={14} />
            <span>Password Master</span>
          </button>
        </div>

        {/* MESSAGGIO ERRORE */}
        {errorMsg && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODALITÀ PIN CASSA */}
        {mode === "pin" && (
          <div className="w-full flex flex-col items-center">
            {/* 4 Sfere PIN */}
            <div className="flex items-center gap-4 mb-6">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                      filled
                        ? "bg-[#5E1788] border-[#5E1788] scale-110 shadow-md shadow-[#5E1788]/30"
                        : "border-gray-300 bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            {/* Tastierino Numerico Touch Luxury */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  disabled={isSubmitting}
                  className="h-14 rounded-2xl bg-[#FAF7FC] hover:bg-[#F2E4F5] active:bg-[#E2CEE6] text-xl font-bold text-[#1F1B24] border border-[#E8DEF8] transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                C
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                disabled={isSubmitting}
                className="h-14 rounded-2xl bg-[#FAF7FC] hover:bg-[#F2E4F5] active:bg-[#E2CEE6] text-xl font-bold text-[#1F1B24] border border-[#E8DEF8] transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                disabled={isSubmitting}
                className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-600 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                ⌫
              </button>
            </div>

            <p className="text-[11px] text-gray-600 mt-6 text-center font-medium">
              Inserisci il PIN 4 cifre assegnato al salone per sbloccare la cassa
            </p>
          </div>
        )}

        {/* MODALITÀ PASSWORD MASTER */}
        {mode === "password" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="w-full space-y-4"
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setErrorMsg("");
                  setPassword(e.target.value);
                }}
                placeholder="Inserisci Master Password..."
                className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-gray-200 focus:border-[#5E1788] focus:ring-2 focus:ring-[#5E1788]/20 outline-none text-sm transition-all bg-[#FAF7FC]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#9242AD] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#5E1788]/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Verifica in corso..." : "Accedi al Cockpit"}
            </button>
          </form>
        )}

        {/* Link di Ritorno */}
        <div className="mt-8 pt-6 border-t border-gray-100 w-full text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#5E1788] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Torna all&apos;E-commerce pubblico</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
