import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import {
  getHotpayConfig,
  isHotpayNotificationIp,
  parseNotificationFormData,
} from "@/lib/hotpay";
import { processHotpayNotification } from "@/lib/hotpay-wallet";

export const runtime = "nodejs";

/** Zbiera IP z nagłówków proxy (Vercel / XFF) — whitelista HotPay może być na dowolnej pozycji. */
function clientIps(req: Request): string[] {
  const ips: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    for (const part of raw.split(",")) {
      const ip = part.trim().replace(/^::ffff:/i, "");
      if (ip) ips.push(ip);
    }
  };
  push(req.headers.get("x-forwarded-for"));
  push(req.headers.get("x-vercel-forwarded-for"));
  push(req.headers.get("x-real-ip"));
  return [...new Set(ips)];
}

/**
 * Webhook HotPay (form-data POST). Adres w panelu:
 * {SITE_URL}/api/wallet/hotpay/notification
 *
 * Status (SUCCESS / PENDING / FAILURE) przychodzi wyłącznie tutaj —
 * ADRES_WWW to tylko powrót przeglądarki, bez wyniku płatności (dokumentacja HotPay).
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
    const ips = clientIps(req);
    const allowed = ips.some((ip) => isHotpayNotificationIp(ip));
    if (!allowed) {
      console.error("[hotpay/notification] Forbidden IP(s):", ips.join(", ") || "(brak)");
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
    console.error("[hotpay/notification] Missing fields");
    return new NextResponse("Missing fields", { status: 400 });
  }

  console.info(
    `[hotpay/notification] STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} ips=${clientIps(req).join("|") || "-"}`
  );

  const db = await getDb();
  const result = await processHotpayNotification(
    db,
    payload,
    config.notificationPassword,
    config.sekret
  );

  if (!result.ok) {
    console.error(
      `[hotpay/notification] rejected STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA} error=${result.error}`
    );
    const status =
      result.error === "BAD_HASH" || result.error === "BAD_SEKRET"
        ? 401
        : result.error === "NOT_FOUND"
          ? 404
          : 400;
    return new NextResponse(result.error, { status });
  }

  console.info(
    `[hotpay/notification] ok STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA} outcome=${result.outcome}`
  );

  if (result.outcome === "credited") {
    await logActivity(
      null,
      `HotPay SUCCESS — zaksięgowano ${payload.KWOTA} PLN (zamówienie ${payload.ID_ZAMOWIENIA})`
    );
  }

  return new NextResponse("OK", { status: 200 });
}
