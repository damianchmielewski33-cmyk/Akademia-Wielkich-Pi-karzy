import { NextResponse } from "next/server";
import { z } from "zod";
import { getScreenFromPathname, normalizeAnalyticsPathname } from "@/lib/analytics-screen";
import { isAdsensePathAllowed } from "@/lib/adsense";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  pathname: z.string().min(1).max(512),
  visitorId: z.string().min(8).max(80),
  slotId: z.string().min(1).max(64),
  placement: z.enum(["footer", "inline", "popup"]).default("footer"),
  fillStatus: z.enum(["pending", "filled", "unfilled"]).default("pending"),
});

const BOT_UA_RE =
  /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|wget|curl|python-requests|scrapy|pingdom|uptimerobot/i;

function looksLikeBot(req: Request): boolean {
  const ua = req.headers.get("user-agent")?.trim() ?? "";
  if (!ua || ua.length < 8) return true;
  return BOT_UA_RE.test(ua);
}

export async function POST(req: Request) {
  const rl = checkRateLimit(
    rateLimitKey("ad-impression", req),
    RATE.adImpression.limit,
    RATE.adImpression.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  if (looksLikeBot(req)) {
    return new NextResponse(null, { status: 204 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const pathname = normalizeAnalyticsPathname(parsed.data.pathname);
  if (!isAdsensePathAllowed(pathname)) {
    return new NextResponse(null, { status: 204 });
  }

  const visitorId = parsed.data.visitorId.trim().slice(0, 80);
  const slotId = parsed.data.slotId.trim().slice(0, 64);
  const placement = parsed.data.placement;
  const fillStatus = parsed.data.fillStatus;
  const screen = getScreenFromPathname(pathname);
  if (!screen) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getServerSession();
  const db = await getDb();
  let userId: number | null =
    session && !session.needsPinSetup && !session.pinChangePending ? session.userId : null;
  if (userId !== null) {
    const row = (await db.prepare("SELECT 1 AS ok FROM users WHERE id = ?").get(userId)) as
      | { ok: number }
      | undefined;
    if (!row) userId = null;
  }

  const createdAt = new Date().toISOString();

  if (fillStatus === "filled" || fillStatus === "unfilled") {
    const recentSince = new Date(Date.now() - 60_000).toISOString();
    const pending = (await db
      .prepare(
        `SELECT id FROM ad_impressions
         WHERE visitor_id = ? AND pathname = ? AND slot_id = ? AND placement = ?
           AND fill_status = 'pending' AND created_at >= ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(visitorId, pathname, slotId, placement, recentSince)) as { id: number } | undefined;

    if (pending) {
      await db
        .prepare(`UPDATE ad_impressions SET fill_status = ? WHERE id = ?`)
        .run(fillStatus, pending.id);
      return new NextResponse(null, { status: 204 });
    }
  }

  if (fillStatus === "pending") {
    const dedupeSince = new Date(Date.now() - 4000).toISOString();
    const recent = (await db
      .prepare(
        `SELECT 1 AS ok FROM ad_impressions
         WHERE visitor_id = ? AND pathname = ? AND slot_id = ? AND placement = ?
           AND created_at >= ?
         LIMIT 1`
      )
      .get(visitorId, pathname, slotId, placement, dedupeSince)) as { ok: number } | undefined;
    if (recent) {
      return new NextResponse(null, { status: 204 });
    }
  }

  await db
    .prepare(
      `INSERT INTO ad_impressions
         (slot_id, screen_key, pathname, user_id, visitor_id, created_at, placement, fill_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(slotId, screen.key, pathname, userId, visitorId, createdAt, placement, fillStatus);

  return new NextResponse(null, { status: 204 });
}
