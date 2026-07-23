import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** np. install_failed | download_failed | api_error */
  kind: z.enum(["install_failed", "download_failed", "api_error", "other"]),
  message: z.string().trim().min(1).max(1000),
  phoneModel: z.string().trim().max(120).optional(),
  androidVersion: z.string().trim().max(40).optional(),
  appVersion: z.string().trim().max(40).optional(),
  details: z.string().trim().max(2000).optional(),
});

/**
 * Zgłoszenia błędów instalacji / pobierania / API z telefonu lub klienta WWW.
 * Widoczne w logach Vercel (console) oraz w activity_log.
 */
export async function POST(req: Request) {
  const rl = checkRateLimit(rateLimitKey("client-log", req), RATE.clientLog.limit, RATE.clientLog.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);
  const session = await getServerSession();
  const userId = session?.userId ?? null;
  const d = parsed.data;

  console.error("[client-log]", {
    kind: d.kind,
    message: d.message,
    phoneModel: d.phoneModel,
    androidVersion: d.androidVersion,
    appVersion: d.appVersion,
    details: d.details,
    ip,
    userId,
    ua,
  });

  try {
    await logActivity(
      userId,
      `Client log [${d.kind}]: ${d.message} | phone=${d.phoneModel ?? "?"} android=${d.androidVersion ?? "?"} app=${d.appVersion ?? "?"} ip=${ip}`
    );
    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO page_views (screen_key, pathname, user_id, visitor_id, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        `client_log_${d.kind}`,
        `/api/client-log`,
        userId,
        `log:${ip}`.slice(0, 80),
        new Date().toISOString()
      );
  } catch (e) {
    console.error("[client-log] db failed", e);
  }

  return NextResponse.json({ ok: true });
}
