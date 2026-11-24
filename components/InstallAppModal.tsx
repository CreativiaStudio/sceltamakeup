"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  PlusSquare,
  Share,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { detectPwaEnvironment, type BeforeInstallPromptEvent, type PwaEnvironment } from "@/lib/pwaUtils";

export type InstallAppMode = "store" | "admin";

interface InstallAppContentProps {
  mode: InstallAppMode;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onTriggerNativeInstall: () => Promise<void>;
  onClose?: () => void;
  compact?: boolean;
}

export function InstallAppContent({
  mode,
  deferredPrompt,
  onTriggerNativeInstall,
  onClose,
  compact = false,
}: InstallAppContentProps) {
  const [env, setEnv] = useState<PwaEnvironment>(() => detectPwaEnvironment());
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    queueMicrotask(() => {
      setEnv(detectPwaEnvironment());
    });
  }, []);

  const targetUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${mode === "admin" ? "/admin" : "/app"}`
      : mode === "admin"
      ? "https://www.sceltamakeup.it/admin"
      : "https://www.sceltamakeup.it/app";

  useEffect(() => {
    if (env.isMobile || env.isStandalone) return;
    let active = true;
    QRCode.toDataURL(targetUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#5E1788", light: "#FFFFFF" },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [env.isMobile, env.isStandalone, targetUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      // Fallback silenzioso
    }
  };

  const handleNativeInstall = async () => {
    setInstalling(true);
    try {
      await onTriggerNativeInstall();
    } finally {
      setInstalling(false);
    }
  };

  const isAdmin = mode === "admin";
  const iconSrc = isAdmin ? "/icons/admin-icon-180.png" : "/icons/apple-touch-icon.png";
  const appTitle = isAdmin ? "Scelta Cockpit" : "Scelta Makeup";
  const subtitle = isAdmin
    ? "Gestionale mobile: ordini, catalogo prodotti, spedizioni, clienti e appuntamenti."
    : "Il tuo Salone sempre con te: ordini, tracking spedizioni, riordino in 1 tap e prenotazioni.";

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {/* Header Anteprima Icona App */}
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#D8C2E7] shadow-md bg-white">
          <Image src={iconSrc} alt={appTitle} fill sizes="64px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D462A6]">
            <Sparkles className="h-3 w-3" />
            <span>{isAdmin ? "App Gestionale Salone" : "App Ufficiale iPhone & Android"}</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1F1B24] leading-tight">
            {appTitle}
          </h3>
          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      {/* Benefici chiari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-[#FAF7FC] px-3 py-2 border border-[#D8C2E7]/40 text-[#1F1B24]">
              <CheckCircle2 className="h-4 w-4 text-[#5E1788] shrink-0" />
              <span>Ordini, catalogo e giacenze in mobilità</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#FAF7FC] px-3 py-2 border border-[#D8C2E7]/40 text-[#1F1B24]">
              <ShieldCheck className="h-4 w-4 text-[#5E1788] shrink-0" />
              <span>Accesso 1 sola volta (resta loggata 6 mesi)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-[#FAF7FC] px-3 py-2 border border-[#D8C2E7]/40 text-[#1F1B24]">
              <CheckCircle2 className="h-4 w-4 text-[#5E1788] shrink-0" />
              <span>Tracking pacchi e area personale</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#FAF7FC] px-3 py-2 border border-[#D8C2E7]/40 text-[#1F1B24]">
              <ShieldCheck className="h-4 w-4 text-[#5E1788] shrink-0" />
              <span>Riordino in 1 tap e prenotazioni Salone</span>
            </div>
          </>
        )}
      </div>

      {/* Stato 1: App già installata */}
      {env.isStandalone && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">App già salvata sulla tua Home!</p>
            <p className="text-emerald-800/90">
              Stai già usando {appTitle} in modalità App a schermo intero.
            </p>
          </div>
        </div>
      )}

      {/* Stato 2: Prompt nativo Android / Chrome disponibile */}
      {!env.isStandalone && deferredPrompt && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleNativeInstall}
            disabled={installing}
            className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#5E1788] to-[#7A3293] hover:from-[#7A3293] hover:to-[#D462A6] text-white text-sm font-bold shadow-lg shadow-[#5E1788]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            <span>{installing ? "Installazione in corso..." : `Installa ${appTitle} ora`}</span>
          </button>
          <p className="text-[11px] text-center text-neutral-500">
            Zero download pesanti dallo store: occupa meno di 1 MB e si aggiorna da sola.
          </p>
        </div>
      )}

      {/* Stato 3: iPhone ma aperto dentro WhatsApp / Instagram / Chrome iOS */}
      {!env.isStandalone && !deferredPrompt && env.isIOS && !env.isSafariIOS && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <ExternalLink className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-bold text-sm">Apri questo link in Safari su iPhone</p>
              <p className="leading-relaxed">
                {env.isInAppBrowser
                  ? "Hai aperto il sito da WhatsApp o Instagram: Apple permette di salvare l'App sulla Home solo da Safari."
                  : env.isChromeIOS
                  ? "Stai usando Chrome su iPhone: per avere l'icona sulla Home apri questo link in Safari."
                  : "Per salvare l'App sulla schermata Home di iPhone è necessario aprire il link in Safari."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-3 px-4 rounded-full bg-[#5E1788] hover:bg-[#7A3293] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" />
                <span>Link copiato! Ora incollalo in Safari</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copia Link per Safari</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-amber-900/80 text-center">
            In Safari tocca poi <strong>Condividi</strong> (quadrato con freccia) →{" "}
            <strong>Aggiungi alla schermata Home</strong>.
          </p>
        </div>
      )}

      {/* Stato 4: iPhone Safari (flusso principale Federica & Clienti iOS) */}
      {!env.isStandalone && !deferredPrompt && env.isIOS && env.isSafariIOS && (
        <div className="rounded-2xl border border-[#D8C2E7] bg-[#FAF7FC] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#5E1788] flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-[#D462A6]" />
            Salva su iPhone in 2 tocchi
          </p>

          <ol className="space-y-2.5 text-xs text-[#1F1B24]">
            <li className="flex items-start gap-3 bg-white rounded-xl p-3 border border-[#D8C2E7]/50">
              <span className="w-6 h-6 rounded-full bg-[#5E1788] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <div className="flex-1 leading-relaxed">
                Tocca il tasto{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-[#5E1788] font-bold">
                  <Share className="h-3.5 w-3.5" />
                  Condividi
                </span>{" "}
                nella barra in basso di Safari.
              </div>
            </li>

            <li className="flex items-start gap-3 bg-white rounded-xl p-3 border border-[#D8C2E7]/50">
              <span className="w-6 h-6 rounded-full bg-[#5E1788] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <div className="flex-1 leading-relaxed">
                Scorri e tocca{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-[#5E1788] font-bold">
                  <PlusSquare className="h-3.5 w-3.5" />
                  Aggiungi alla schermata Home
                </span>{" "}
                e poi <strong>Aggiungi</strong> in alto a destra.
              </div>
            </li>
          </ol>

          {isAdmin ? (
            <div className="rounded-xl bg-white border border-emerald-200 px-3 py-2.5 text-[11px] text-emerald-900 leading-relaxed">
              <strong>Accesso 1 sola volta:</strong> dopo aver aggiunto l&apos;icona, apri{" "}
              <strong>Scelta Cockpit</strong> dalla schermata Home ed entra col PIN una sola volta:
              resterai connessa per 6 mesi.
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-[#D8C2E7]/60 px-3 py-2.5 text-[11px] text-neutral-700 leading-relaxed">
              <strong>Accesso rapido 1 sola volta:</strong> al primo avvio inserisci la tua email e
              l&apos;App ti porta subito nella tua area dedicata senza rifare il login per 6 mesi.
            </div>
          )}
        </div>
      )}

      {/* Stato 5: Android senza deferredPrompt (es. Firefox / browser secondario) */}
      {!env.isStandalone && !deferredPrompt && env.isAndroid && (
        <div className="rounded-2xl border border-[#D8C2E7] bg-[#FAF7FC] p-4 space-y-2.5 text-xs text-[#1F1B24]">
          <p className="font-bold text-[#5E1788] uppercase tracking-wider">
            Salva su Android in 2 tocchi
          </p>
          <p className="leading-relaxed">
            Tocca il menu del browser (<strong>⋮</strong> in alto a destra) e seleziona{" "}
            <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.
          </p>
        </div>
      )}

      {/* Stato 6: Desktop — QR Code per aprire subito da iPhone/Android */}
      {!env.isStandalone && !deferredPrompt && !env.isMobile && (
        <div className="rounded-2xl border border-[#D8C2E7]/80 bg-[#FAF7FC] p-4 flex flex-col sm:flex-row items-center gap-4">
          {qrDataUrl && (
            <div className="p-2 bg-white rounded-2xl border border-[#D8C2E7] shadow-xs shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code per scaricare ${appTitle}`}
                className="w-28 h-28"
              />
            </div>
          )}
          <div className="space-y-2 text-xs text-[#1F1B24] text-center sm:text-left">
            <p className="font-bold text-[#5E1788] text-sm">
              Inquadra con la fotocamera del tuo cellulare
            </p>
            <p className="text-neutral-600 leading-relaxed">
              Apri il link su iPhone (in <strong>Safari</strong>) o Android per salvare{" "}
              <strong>{appTitle}</strong> direttamente sulla schermata Home.
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#D8C2E7] text-[#5E1788] font-semibold hover:bg-purple-50 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Link copiato" : "Copia link"}</span>
            </button>
          </div>
        </div>
      )}

      {onClose && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-neutral-500 hover:text-[#5E1788] transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}

interface InstallAppModalProps {
  isOpen: boolean;
  mode: InstallAppMode;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onTriggerNativeInstall: () => Promise<void>;
  onClose: () => void;
}

export default function InstallAppModal({
  isOpen,
  mode,
  deferredPrompt,
  onTriggerNativeInstall,
  onClose,
}: InstallAppModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1F1B24]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scarica l'App Scelta Makeup"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#D8C2E7]/70 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi finestra installazione App"
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-[#1F1B24] hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <InstallAppContent
          mode={mode}
          deferredPrompt={deferredPrompt}
          onTriggerNativeInstall={onTriggerNativeInstall}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
