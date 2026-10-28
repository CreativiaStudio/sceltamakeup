/**
 * Scelta Makeup — API Codici Sconto, Coupon & Smart Link
 * Module: app/api/coupons/route.ts
 *
 * GET    /api/coupons                → lista coupon (anti-cache)
 * GET    /api/coupons?code=DIEGO10   → validazione rapida di un codice per il client
 * POST   /api/coupons                → crea/aggiorna un coupon { coupon: PromoCoupon }
 * DELETE /api/coupons?id=...         → elimina coupon
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCentralCoupons,
  saveCentralCoupon,
  deleteCentralCoupon,
} from "@/lib/serverCouponStore";
import { PromoCoupon } from "@/types/coupon";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_CACHE_HEADERS });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get("code");

  try {
    const coupons = await getCentralCoupons({ fresh: true });

    if (code) {
      const match = coupons.find(
        (c) => c.code.toUpperCase() === code.trim().toUpperCase()
      );
      if (!match) {
        return json({ success: false, error: "Codice promo non trovato." }, 404);
      }
      return json({ success: true, coupon: match });
    }

    return json({ success: true, coupons });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore lettura coupon";
    return json({ success: false, error: msg }, 500);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Body JSON non valido." }, 400);
  }

  const coupon = (body as any)?.coupon as PromoCoupon | undefined;
  if (!coupon || !coupon.code || !coupon.name) {
    return json(
      { success: false, error: "Dati coupon incompleti ('code' e 'name' obbligatori)." },
      400
    );
  }

  try {
    const updatedList = await saveCentralCoupon(coupon);
    return json({ success: true, coupons: updatedList });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore salvataggio coupon";
    return json({ success: false, error: msg }, 500);
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return json({ success: false, error: "Parametro 'id' mancante." }, 400);
  }

  try {
    const updatedList = await deleteCentralCoupon(id);
    return json({ success: true, coupons: updatedList });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore eliminazione coupon";
    return json({ success: false, error: msg }, 500);
  }
}
