import { NextResponse } from "next/server";
import { getDbForHotpaySession, getProdDb, logActivity } from "@/lib/db";
import {
  getHotpayConfig,
  isHotpayNotificationIp,
  parseNotificationFormData,
} from "@/lib/hotpay";
import { processHotpayNotification } from "@/lib/hotpay-wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function plain(text: string, status = 200) {
  return new NextResponse(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Webhook HotPay (form-data POST). Adres w panelu:
 * {SITE_URL}/api/wallet/hotpay/notification
 *
 * Status (SUCCESS / PENDING / FAILURE) przychodzi wyłącznie tutaj —
 * ADRES_WWW to tylko powrót przeglądarki, bez wyniku płatności (dokumentacja HotPay).
 *
 * Odpowiedź: plain-text ze STATUS (tak robią działające integracje PL), HTTP 200.
 */
export async function GET() {
  return plain("HotPay notification endpoint OK (użyj POST)");
}

export async function POST(req: Request) {
  const ips = clientIps(req).join("|") || "-";
  const ct = req.headers.get("content-type") ?? "-";
  console.info(`[hotpay/notification] POST received ips=${ips} ct=${ct}`);

  const config = getHotpayConfig();
  if (!config) {
    console.error("[hotpay/notification] not configured");
    return plain("HotPay not configured", 503);
  }

  // Whitelist IP: tylko gdy HOTPAY_ENFORCE_IP=1 (domyślnie WYŁĄCZONA).
  const enforceIpEnv = process.env.HOTPAY_ENFORCE_IP?.trim()?.toLowerCase();
  const enforceIp = enforceIpEnv === "1" || enforceIpEnv === "true";
  if (enforceIp) {
    const list = clientIps(req);
    const allowed = list.some((ip) => isHotpayNotificationIp(ip));
    if (!allowed) {
      console.error("[hotpay/notification] Forbidden IP(s):", list.join(", ") || "(brak)");
      try {
        await logActivity(null, `HotPay webhook FORBIDDEN IP: ${list.join(", ") || "(brak)"}`);
      } catch {
        /* ignore */
      }
      return plain("Forbidden", 403);
    }
  }

  // Parsowanie body — logujemy raw żeby zobaczyć co HotPay faktycznie przesłał.
  let form: FormData;
  let rawText = "";
  try {
    const rawBuf = await req.arrayBuffer();
    rawText = new TextDecoder().decode(rawBuf);
    console.info(`[hotpay/notification] raw body (${rawBuf.byteLength}B): ${rawText.slice(0, 800)}`);

    if (ct.includes("application/x-www-form-urlencoded")) {
      form = new FormData();
      for (const [k, v] of new URLSearchParams(rawText)) {
        form.append(k, v);
      }
    } else {
      const rebuilt = new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: rawBuf,
      });
      form = await rebuilt.formData();
    }
  } catch (err) {
    console.error("[hotpay/notification] body parse failed:", err, "| raw:", rawText.slice(0, 200));
    try {
      await logActivity(null, `HotPay webhook BAD_FORM ips=${ips} raw=${rawText.slice(0, 120)}`);
    } catch {
      /* ignore */
    }
    return plain("Bad form", 400);
  }

  const payload = parseNotificationFormData(form);
  if (!payload) {
    const vals: string[] = [];
    for (const [k, v] of form.entries()) vals.push(`${k}=${String(v).slice(0, 40)}`);
    console.error("[hotpay/notification] MISSING_FIELDS vals=", vals.join(" | "));
    try {
      await logActivity(null, `HotPay webhook MISSING_FIELDS keys=${vals.map((v) => v.split("=")[0]).join(",") || "-"} ips=${ips}`);
    } catch {
      /* ignore */
    }
    return plain("Missing fields", 400);
  }

  console.info(
    `[hotpay/notification] parsed STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} ips=${ips}`
  );

  const db = await getDbForHotpaySession(payload.ID_ZAMOWIENIA);
  // Ślad w panelu admina (Aktywność) — zawsze na PROD, niezależnie od bazy płatności.
  try {
    const prod = await getProdDb();
    await prod
      .prepare("INSERT INTO activity_log (user_id, action) VALUES (?, ?)")
      .run(
        null,
        `HotPay webhook ${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} ips=${ips}`
      );
  } catch {
    await logActivity(
      null,
      `HotPay webhook ${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} ips=${ips}`
    );
  }

  const result = await processHotpayNotification(
    db,
    payload,
    config.notificationPassword,
    config.sekret
  );

  if (!result.ok) {
    console.error(
      `[hotpay/notification] REJECTED STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} error=${result.error} ips=${ips}`
    );
    await logActivity(
      null,
      `HotPay webhook REJECTED ${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} error=${result.error}`
    );
    // Zwracamy 200 + treść błędu tylko dla NOT_FOUND/AMOUNT — żeby HotPay nie zapętlał w nieskończoność
    // przy złym HASH nadal 401 (konfiguracja).
    if (result.error === "BAD_HASH" || result.error === "BAD_SEKRET") {
      return plain(result.error, 401);
    }
    return plain(result.error, 200);
  }

  console.info(
    `[hotpay/notification] SUCCESS STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA} amount=${payload.KWOTA} outcome=${result.outcome}`
  );

  if (result.outcome === "credited") {
    await logActivity(
      null,
      `HotPay SUCCESS — zaksięgowano ${payload.KWOTA} PLN (zamówienie ${payload.ID_ZAMOWIENIA})`
    );
  } else {
    await logActivity(
      null,
      `HotPay webhook OK (${result.outcome}) STATUS=${payload.STATUS} order=${payload.ID_ZAMOWIENIA}`
    );
  }

  // Integracje PL odpowiadają samym STATUS (SUCCESS/FAILURE/PENDING), nie „OK".
  return plain(payload.STATUS.toUpperCase(), 200);
}
