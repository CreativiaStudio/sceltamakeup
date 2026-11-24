"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InstallAppModal, { type InstallAppMode } from "@/components/InstallAppModal";
import {
  APP_ROLE_STORAGE_KEY,
  detectPwaEnvironment,
  type BeforeInstallPromptEvent,
} from "@/lib/pwaUtils";

declare global {
  interface Window {
    __sceltaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export default function PwaManager() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InstallAppMode>("store");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Rete di sicurezza iOS: se l'app standalone viene aperta su "/" al primo avvio
    // senza un ruolo salvato, instrada verso la schermata unificata /app-start.
    const env = detectPwaEnvironment();
    if (env.isStandalone && window.location.pathname === "/") {
      let savedRole = "";
      try {
        savedRole = localStorage.getItem(APP_ROLE_STORAGE_KEY) || "";
      } catch {
        savedRole = "";
      }
      if (!savedRole) {
        router.replace("/app-start");
      }
    }

    // Registrazione Service Worker pass-through (zero cache su dati e API)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignora errori in ambienti che bloccano i SW
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__sceltaDeferredInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__sceltaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsOpen(false);
    };

    const handleOpenModal = (e: Event) => {
      const custom = e as CustomEvent<{ mode?: InstallAppMode }>;
      const requestedMode: InstallAppMode =
        custom.detail?.mode === "admin" || window.location.pathname.startsWith("/admin")
          ? "admin"
          : "store";
      setMode(requestedMode);
      setIsOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("open_install_app_modal", handleOpenModal);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open_install_app_modal", handleOpenModal);
    };
  }, [router]);

  const handleTriggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      window.__sceltaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsOpen(false);
    }
  }, [deferredPrompt]);

  return (
    <InstallAppModal
      isOpen={isOpen}
      mode={mode}
      deferredPrompt={deferredPrompt}
      onTriggerNativeInstall={handleTriggerNativeInstall}
      onClose={() => setIsOpen(false)}
    />
  );
}
