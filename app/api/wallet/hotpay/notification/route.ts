import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import {
  getHotpayConfig,
  isHotpayNotificationIp,
  parseNotificationFormData,
} from "@/lib/hotpay";
import { processHotpayNotification } from "@/lib/hotpay-wallet";

export const runtime = "nodejs";

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  return real || null;
}

/**
 * Webhook HotPay (form-data POST). Adres w panelu:
 * {SITE_URL}/api/wallet/hotpay/notification
 */
export async function POST(req: Request) {
  const config = getHotpayConfig();
  if (!config) {
    return new NextResponse("HotPay not configured", { status: 503 });
  }

  // W produkcji domyślnie wymuszamy whitelist IP HotPay; wyłączenie: HOTPAY_ENFORCE_IP=0
  const enforceIpEnv = process.env.HOTPAY_ENFORCE_IP?.trim();
  const enforceIp =
    enforceIpEnv === "0" || enforceIpEnv?.toLowerCase() === "false"
      ? false
      : enforceIpEnv === "1" || enforceIpEnv?.toLowerCase() === "true"
        ? true
        : process.env.NODE_ENV === "production";
  if (enforceIp) {
    const ip = clientIp(req);
    if (!isHotpayNotificationIp(ip)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new NextResponse("Bad form", { status: 400 });
  }

  const payload = parseNotificationFormData(form);
  if (!payload) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const db = await getDb();
  const result = await processHotpayNotification(
    db,
    payload,
    config.notificationPassword,
    config.sekret
  );

  if (!result.ok) {
    const status =
      result.error === "BAD_HASH" || result.error === "BAD_SEKRET"
        ? 401
        : result.error === "NOT_FOUND"
          ? 404
          : 400;
    return new NextResponse(result.error, { status });
  }

  if (result.outcome === "credited") {
    await logActivity(
      null,
      `HotPay SUCCESS — zaksięgowano ${payload.KWOTA} PLN (zamówienie ${payload.ID_ZAMOWIENIA})`
    );
  }

  return new NextResponse("OK", { status: 200 });
}
