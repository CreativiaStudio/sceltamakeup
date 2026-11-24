"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  Sparkles,
  Store,
} from "lucide-react";
import {
  readCustomerSession,
  saveCustomerSession,
  type CustomerSession,
} from "@/lib/customerSession";
import {
  DEFAULT_OPERATOR_LABEL,
  REMOTE_OPERATOR_LABEL,
  setAuditOperatorSession,
} from "@/lib/auditLogger";
import { APP_ROLE_STORAGE_KEY } from "@/lib/pwaUtils";

type LauncherPhase = "checking" | "email" | "admin_pin";

export default function AppLauncherClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceSwitch = searchParams.get("switch") === "1";

  const [phase, setPhase] = useState<LauncherPhase>("checking");
  const [email, setEmail] = useState("");
  const [identifiedEmail, setIdentifiedEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isIdentifying, setIsIdentifying] = useState(false);

  // Stato passo 2 (sblocco gestionale quando l'email è riconosciuta come autorizzata)
  const [authMode, setAuthMode] = useState<"pin" | "password">("pin");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveDestination() {
      // 1. Verifica prioritaria: sessione backend attiva (180 giorni)
      try {
        const adminRes = await fetch("/api/admin/auth", {
          cache: "no-store",
          signal: AbortSignal.timeout(2200),
        });
        if (adminRes.ok) {
          const data = (await adminRes.json().catch(() => null)) as {
            authenticated?: boolean;
          } | null;
          if (data?.authenticated) {
            try {
              localStorage.setItem(APP_ROLE_STORAGE_KEY, "admin");
            } catch {
              // ignore
            }
            if (!cancelled) router.replace("/admin");
            return;
          }
        }
      } catch {
        // Prosegue verso il controllo cliente
      }

      if (!forceSwitch) {
        // 2. Verifica cliente già riconosciuto in locale o su cookie firmato server-side
        let savedRole = "";
        try {
          savedRole = localStorage.getItem(APP_ROLE_STORAGE_KEY) || "";
        } catch {
          savedRole = "";
        }

        const localCustomer = readCustomerSession();
        if (savedRole === "customer" || localCustomer?.email) {
          if (!cancelled) router.replace("/");
          return;
        }

        try {
          const custRes = await fetch("/api/account/session", {
            cache: "no-store",
            signal: AbortSignal.timeout(2200),
          });
          if (custRes.ok) {
            const data = (await custRes.json().catch(() => null)) as {
              session?: CustomerSession | null;
            } | null;
            if (data?.session?.email) {
              saveCustomerSession(data.session);
              try {
                localStorage.setItem(APP_ROLE_STORAGE_KEY, "customer");
              } catch {
                // ignore
              }
              if (!cancelled) router.replace("/");
              return;
            }
          }
        } catch {
          // Prosegue verso la schermata email iniziale
        }
      }

      if (!cancelled) {
        setPhase("email");
      }
    }

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [forceSwitch, router]);

  const handleIdentifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setEmailError("Inserisci un indirizzo email valido.");
      return;
    }

    setIsIdentifying(true);
    setEmailError("");

    try {
      const res = await fetch("/api/app/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned }),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        nextStep?: "store" | "admin_pin";
        customer?: CustomerSession;
      } | null;

      if (!res.ok || !data?.success) {
        setEmailError(data?.error || "Impossibile verificare l'accesso. Riprova.");
        return;
      }

      if (data.nextStep === "admin_pin") {
        setIdentifiedEmail(cleaned);
        setAuthError("");
        setPin("");
        setPassword("");
        setPhase("admin_pin");
        return;
      }

      if (data.customer?.email) {
        saveCustomerSession(data.customer);
      }
      try {
        localStorage.setItem(APP_ROLE_STORAGE_KEY, "customer");
      } catch {
        // ignore
      }
      router.replace("/");
    } catch {
      setEmailError("Connessione non riuscita. Riprova tra qualche istante.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleContinueAsGuest = () => {
    try {
      localStorage.setItem(APP_ROLE_STORAGE_KEY, "customer");
    } catch {
      // ignore
    }
    router.replace("/");
  };

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleAdminUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError("");

    try {
      const payload =
        authMode === "pin" ? { pin, rememberDevice } : { password, rememberDevice };

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (res.ok && data?.success) {
        setAuditOperatorSession(
          authMode === "pin" ? DEFAULT_OPERATOR_LABEL : REMOTE_OPERATOR_LABEL,
          identifiedEmail || "App Mobile Scelta Makeup"
        );
        try {
          localStorage.setItem(APP_ROLE_STORAGE_KEY, "admin");
        } catch {
          // ignore
        }
        router.replace("/admin");
      } else {
        triggerShake();
        setAuthError(data?.error || "Credenziali non corrette");
        if (authMode === "pin") setPin("");
      }
    } catch {
      triggerShake();
      setAuthError("Errore di connessione al server di autenticazione");
      if (authMode === "pin") setPin("");
    } finally {
      setIsAuthenticating(false);
    }
  }, [authMode, identifiedEmail, password, pin, rememberDevice, router, triggerShake]);

  useEffect(() => {
    if (phase === "admin_pin" && authMode === "pin" && pin.length === 4) {
      queueMicrotask(() => {
        void handleAdminUnlock();
      });
    }
  }, [authMode, handleAdminUnlock, phase, pin]);

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF7FC] via-[#FFFFFF] to-[#F4EBF7] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-[#D8C2E7] bg-white shadow-lg">
            <Image
              src="/icons/apple-touch-icon.png"
              alt="Scelta Makeup"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
          <div className="w-7 h-7 border-2 border-[#5E1788] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#5E1788] tracking-widest uppercase">
            Avvio Scelta Makeup...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7FC] via-[#FFFFFF] to-[#F4EBF7] flex flex-col items-center justify-center p-4 sm:p-6">
      <div
        className={`w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#D8C2E7]/70 p-7 sm:p-9 flex flex-col items-center transition-transform duration-300 ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Brand Icon */}
        <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-[#D8C2E7] bg-white shadow-md mb-5">
          <Image
            src="/icons/apple-touch-icon.png"
            alt="Scelta Makeup"
            fill
            sizes="80px"
            className="object-cover"
            priority
          />
        </div>

        {phase === "email" && (
          <div className="w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#D462A6]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Salone &amp; Alta Cosmesi Napoli</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-[#1F1B24]">
                Benvenuta in Scelta Makeup
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600">
                Inserisci la tua email per iniziare
              </p>
            </div>

            {emailError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <form onSubmit={handleIdentifySubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A3293]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmailError("");
                    setEmail(e.target.value);
                  }}
                  placeholder="La tua email..."
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#D8C2E7] bg-[#FAF7FC] text-sm text-[#1F1B24] placeholder:text-neutral-400 focus:outline-none focus:border-[#5E1788] focus:ring-2 focus:ring-[#5E1788]/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isIdentifying}
                className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#D462A6] text-white text-sm font-semibold shadow-lg shadow-[#5E1788]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span>{isIdentifying ? "Accesso in corso..." : "Continua"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="pt-2 border-t border-neutral-100 text-center">
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="text-xs font-semibold text-neutral-500 hover:text-[#5E1788] transition-colors cursor-pointer"
              >
                Continua nello Shop senza accedere
              </button>
            </div>
          </div>
        )}

        {phase === "admin_pin" && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-[#D8C2E7] text-[11px] font-semibold text-[#5E1788] mb-2">
                <Lock className="h-3 w-3" />
                <span>{identifiedEmail}</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#1F1B24]">
                Sblocca Gestione Salone
              </h2>
            </div>

            <div className="flex w-full bg-[#FAF7FC] p-1 rounded-2xl border border-[#E8DEF8] mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("pin");
                  setAuthError("");
                  setPin("");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMode === "pin"
                    ? "bg-[#5E1788] text-white shadow-sm"
                    : "text-gray-600 hover:text-[#5E1788]"
                }`}
              >
                <Store size={14} />
                <span>PIN 4 Cifre</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("password");
                  setAuthError("");
                  setPassword("");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMode === "password"
                    ? "bg-[#5E1788] text-white shadow-sm"
                    : "text-gray-600 hover:text-[#5E1788]"
                }`}
              >
                <KeyRound size={14} />
                <span>Password</span>
              </button>
            </div>

            {authError && (
              <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === "pin" && (
              <div className="w-full flex flex-col items-center">
                <div className="flex items-center gap-4 mb-5">
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

                <div className="grid grid-cols-3 gap-3 w-full max-w-[270px]">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setAuthError("");
                        if (pin.length < 4) setPin((prev) => prev + num);
                      }}
                      disabled={isAuthenticating}
                      className="h-14 rounded-2xl bg-[#FAF7FC] hover:bg-[#F2E4F5] active:bg-[#E2CEE6] text-xl font-bold text-[#1F1B24] border border-[#E8DEF8] transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setAuthError("");
                      setPin("");
                    }}
                    disabled={isAuthenticating}
                    className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    C
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthError("");
                      if (pin.length < 4) setPin((prev) => prev + "0");
                    }}
                    disabled={isAuthenticating}
                    className="h-14 rounded-2xl bg-[#FAF7FC] hover:bg-[#F2E4F5] active:bg-[#E2CEE6] text-xl font-bold text-[#1F1B24] border border-[#E8DEF8] transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthError("");
                      setPin((prev) => prev.slice(0, -1));
                    }}
                    disabled={isAuthenticating}
                    className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-600 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            {authMode === "password" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAdminUnlock();
                }}
                className="w-full space-y-4"
              >
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setAuthError("");
                      setPassword(e.target.value);
                    }}
                    placeholder="Inserisci Password..."
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
                  disabled={isAuthenticating || !password.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#9242AD] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#5E1788]/20 disabled:opacity-50 cursor-pointer"
                >
                  {isAuthenticating ? "Verifica in corso..." : "Accedi"}
                </button>
              </form>
            )}

            <label className="mt-5 w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#FAF7FC] border border-[#E8DEF8] text-xs text-[#1F1B24] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="h-4 w-4 rounded accent-[#5E1788] cursor-pointer"
              />
              <span className="font-medium">
                Resta connessa su questo dispositivo{" "}
                <span className="text-[#5E1788] font-semibold">(6 mesi)</span>
              </span>
            </label>

            <button
              type="button"
              onClick={() => {
                setPhase("email");
                setAuthError("");
                setPin("");
                setPassword("");
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-[#5E1788] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Cambia email</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
