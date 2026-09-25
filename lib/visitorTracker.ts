/**
 * First-Party Privacy-First Visitor & Telemetry Tracking Engine for Scelta Makeup
 *
 * Compliant with GDPR (EU 2016/679) and ePrivacy.
 * Tracks visits, popular products, and conversions without storing PII.
 */

export interface DailyVisitorStats {
  date: string;
  totalViews: number;
  uniqueVisitors: number;
  productViews: number;
  cartAdditions: number;
  ordersCount: number;
  topPages: Record<string, number>;
  devices: { mobile: number; desktop: number; tablet: number };
  cities: Record<string, number>;
}

/**
 * Client-side visit tracker helper that dispatches to /api/track/visit
 */
export async function trackPageView(path?: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const currentPath = path || window.location.pathname;
    
    // Non tracciare le visite interne al cockpit admin
    if (currentPath.startsWith("/admin") || currentPath.startsWith("/api")) {
      return;
    }

    let visitorId = localStorage.getItem("scelta_visitor_id");
    if (!visitorId) {
      visitorId = "vid_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem("scelta_visitor_id", visitorId);
    }

    const payload = {
      path: currentPath,
      referrer: document.referrer || "direct",
      visitorId,
      screenWidth: window.innerWidth,
      isMobile: window.innerWidth < 768,
      timestamp: new Date().toISOString(),
    };

    // Keepalive fetch garantisce l'invio anche in caso di navigazione rapida
    await fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silently continue
  }
}
