import { NextResponse } from "next/server";

// Cache in-memory delle statistiche per risposta istantanea nel cockpit admin
interface InMemAnalytics {
  today: string;
  totalViews: number;
  uniqueVisitors: Set<string>;
  pages: Record<string, number>;
  devices: { mobile: number; desktop: number };
  cities: Record<string, number>;
  history: Record<string, { views: number; visitors: number }>;
}

const memoryAnalytics: InMemAnalytics = {
  today: new Date().toISOString().split("T")[0],
  totalViews: 0,
  uniqueVisitors: new Set<string>(),
  pages: {},
  devices: { mobile: 0, desktop: 0 },
  cities: {},
  history: {},
};

export async function POST(req: Request) {
  try {
    const today = new Date().toISOString().split("T")[0];
    if (memoryAnalytics.today !== today) {
      // Archivia il giorno precedente
      memoryAnalytics.history[memoryAnalytics.today] = {
        views: memoryAnalytics.totalViews,
        visitors: memoryAnalytics.uniqueVisitors.size,
      };
      // Reset nuovo giorno
      memoryAnalytics.today = today;
      memoryAnalytics.totalViews = 0;
      memoryAnalytics.uniqueVisitors = new Set<string>();
      memoryAnalytics.pages = {};
      memoryAnalytics.devices = { mobile: 0, desktop: 0 };
      memoryAnalytics.cities = {};
    }

    const body = await req.json();
    const { path, visitorId, isMobile } = body;

    // Cattura header geolocalizzati forniti da Vercel Edge
    const city = req.headers.get("x-vercel-ip-city") || "Napoli e Campania";
    const country = req.headers.get("x-vercel-ip-country") || "IT";

    // Incrementa contatori in memoria
    memoryAnalytics.totalViews += 1;
    if (visitorId) {
      memoryAnalytics.uniqueVisitors.add(visitorId);
    }
    const cleanPath = (path || "/").split("?")[0];
    memoryAnalytics.pages[cleanPath] = (memoryAnalytics.pages[cleanPath] || 0) + 1;

    if (isMobile) {
      memoryAnalytics.devices.mobile += 1;
    } else {
      memoryAnalytics.devices.desktop += 1;
    }

    if (city) {
      memoryAnalytics.cities[city] = (memoryAnalytics.cities[city] || 0) + 1;
    }

    // Salva in background su Supabase se disponibile
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/scelta_daily_analytics`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            date: today,
            total_views: memoryAnalytics.totalViews,
            unique_visitors: memoryAnalytics.uniqueVisitors.size,
            updated_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        // Ignora silenziosamente se la tabella non è ancora pronta
      }
    }

    return NextResponse.json({ success: true, count: memoryAnalytics.totalViews });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  return NextResponse.json({
    date: today,
    totalViews: memoryAnalytics.totalViews,
    uniqueVisitors: memoryAnalytics.uniqueVisitors.size,
    pages: memoryAnalytics.pages,
    devices: memoryAnalytics.devices,
    cities: memoryAnalytics.cities,
    history: memoryAnalytics.history,
  });
}
