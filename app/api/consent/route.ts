import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { consentId, visitorId, categories, consentType, timestamp, version } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      // Prova a registrare il consenso nella tabella scelta_cookie_consents se esiste
      try {
        await fetch(`${supabaseUrl}/rest/v1/scelta_cookie_consents`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            consent_id: consentId,
            visitor_id: visitorId,
            categories,
            consent_type: consentType,
            version: version || "1.0",
            created_at: timestamp || new Date().toISOString(),
          }),
        });
      } catch (dbErr) {
        // Fallback silently if table not yet created
      }
    }

    return NextResponse.json({ success: true, consentId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
