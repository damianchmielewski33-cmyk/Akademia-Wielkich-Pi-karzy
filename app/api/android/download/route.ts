import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

function apkUrl(): string {
  return (
    process.env.ANDROID_APK_URL?.trim() ||
    process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() ||
    "https://github.com/damianchmielewski33-cmyk/Akademia-Wielkich-Pi-karzy/releases/latest/download/akademia-wp.apk"
  );
}

/**
 * Start pobierania APK — log w Vercel + activity_log, potem redirect do pliku.
 * Używaj z /pobierz zamiast bezpośredniego linku GitHub.
 */
export async function GET(req: Request) {
  const rl = checkRateLimit(
    rateLimitKey("android-download", req),
    RATE.androidDownload.limit,
    RATE.androidDownload.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const url = new URL(req.url);
  const source = (url.searchParams.get("source") || "pobierz").slice(0, 40);
  const ip = getClientIp(req);
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);
  const target = apkUrl();

  let upstreamOk: boolean | null = null;
  let upstreamStatus: number | null = null;
  let upstreamType: string | null = null;
  let upstreamLen: string | null = null;
  try {
    const head = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": ua || "AWP-Android-Download-Check" },
      cache: "no-store",
    });
    upstreamOk = head.ok;
    upstreamStatus = head.status;
    upstreamType = head.headers.get("content-type");
    upstreamLen = head.headers.get("content-length");
  } catch (e) {
    upstreamOk = false;
    console.error("[android-download] HEAD failed", {
      target,
      ip,
      source,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const session = await getServerSession();
  const userId = session?.userId ?? null;

  console.log("[android-download]", {
    ok: upstreamOk,
    status: upstreamStatus,
    contentType: upstreamType,
    contentLength: upstreamLen,
    source,
    ip,
    userId,
    ua,
    target,
  });

  try {
    const db = await getDb();
    await logActivity(
      userId,
      `Android APK download: source=${source} upstreamOk=${upstreamOk} status=${upstreamStatus} len=${upstreamLen ?? "?"} ip=${ip}`
    );
    await db
      .prepare(
        `INSERT INTO page_views (screen_key, pathname, user_id, visitor_id, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        "android_apk_download",
        `/api/android/download?source=${encodeURIComponent(source)}`,
        userId,
        `apk:${ip}`.slice(0, 80),
        new Date().toISOString()
      );
  } catch (e) {
    console.error("[android-download] db log failed", e);
  }

  // GitHub czasem nie lubi HEAD / zwraca dziwne statusy — nie blokuj pobierania,
  // chyba że wyraźnie brak pliku (404).
  if (upstreamStatus === 404) {
    console.error("[android-download] APK missing (404)", { target, ip, source });
    return NextResponse.json(
      {
        error: "Nie znaleziono APK w GitHub Releases.",
        details: { upstreamStatus, target },
        hint: "Uruchom GitHub Actions → Build Android APK, potem spróbuj ponownie.",
      },
      { status: 502 }
    );
  }

  return NextResponse.redirect(target, 302);
}
