import { NextResponse } from "next/server";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push";

export const runtime = "nodejs";

/** Publiczny klucz VAPID do subscribe w przeglądarce / PWA. */
export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null });
  }
  return NextResponse.json({
    configured: true,
    publicKey: getVapidPublicKey(),
  });
}
