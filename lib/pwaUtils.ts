"use client";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export interface PwaEnvironment {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafariIOS: boolean;
  isInAppBrowser: boolean;
  isChromeIOS: boolean;
  isMobile: boolean;
}

const DEFAULT_ENV: PwaEnvironment = {
  isStandalone: false,
  isIOS: false,
  isAndroid: false,
  isSafariIOS: false,
  isInAppBrowser: false,
  isChromeIOS: false,
  isMobile: false,
};

export function detectPwaEnvironment(): PwaEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return DEFAULT_ENV;
  }

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  const navWithStandalone = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    navWithStandalone.standalone === true;

  const isInAppBrowser =
    /WhatsApp|Instagram|FBAN|FBAV|Line\/|TikTok|Snapchat|MicroMessenger/i.test(ua);
  const isChromeIOS = isIOS && /CriOS/i.test(ua);
  const isOtherIOSBrowser = isIOS && /FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);

  const isSafariIOS =
    isIOS &&
    !isInAppBrowser &&
    !isChromeIOS &&
    !isOtherIOSBrowser &&
    /Safari/i.test(ua) &&
    /AppleWebKit/i.test(ua);

  const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);

  return {
    isStandalone,
    isIOS,
    isAndroid,
    isSafariIOS,
    isInAppBrowser,
    isChromeIOS,
    isMobile,
  };
}
