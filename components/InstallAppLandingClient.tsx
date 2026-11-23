"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Package, Sparkles } from "lucide-react";
import { InstallAppContent } from "@/components/InstallAppModal";
import type { BeforeInstallPromptEvent } from "@/lib/pwaUtils";

declare global {
  interface Window {
    __sceltaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export default function InstallAppLandingClient() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__sceltaDeferredInstallPrompt) {
      const savedPrompt = window.__sceltaDeferredInstallPrompt;
      queueMicrotask(() => setDeferredPrompt(savedPrompt));
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const handleTriggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-[75vh] bg-brand-soft py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E1788] hover:text-[#7A3293] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Torna allo Shop Scelta Makeup</span>
        </Link>

        <div className="bg-white rounded-3xl border border-[#D8C2E7]/70 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-[#D8C2E7] text-[11px] font-bold uppercase tracking-widest text-[#5E1788]">
            <Sparkles className="h-3.5 w-3.5 text-[#D462A6]" />
            <span>Salone Napoli • App Ufficiale</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F1B24] leading-tight">
            Salva l&apos;App Scelta Makeup sul tuo cellulare
          </h1>

          <InstallAppContent
            mode="store"
            deferredPrompt={deferredPrompt}
            onTriggerNativeInstall={handleTriggerNativeInstall}
          />

          <div className="pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/account"
              className="flex items-center justify-center gap-2 rounded-full bg-[#FAF7FC] border border-[#D8C2E7] px-4 py-2.5 text-xs font-semibold text-[#5E1788] hover:bg-purple-50 transition-colors"
            >
              <Package className="h-4 w-4" />
              <span>Apri la tua Area Personale</span>
            </Link>
            <Link
              href="/prodotti"
              className="flex items-center justify-center gap-2 rounded-full bg-[#FAF7FC] border border-[#D8C2E7] px-4 py-2.5 text-xs font-semibold text-[#5E1788] hover:bg-purple-50 transition-colors"
            >
              <Heart className="h-4 w-4 text-[#D462A6]" />
              <span>Esplora il Catalogo Beauty</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
