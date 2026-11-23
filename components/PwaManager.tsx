"use client";

import { useCallback, useEffect, useState } from "react";
import InstallAppModal, { type InstallAppMode } from "@/components/InstallAppModal";
import type { BeforeInstallPromptEvent } from "@/lib/pwaUtils";

declare global {
  interface Window {
    __sceltaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InstallAppMode>("store");

  useEffect(() => {
    if (typeof window === "undefined") return;

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
  }, []);

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
