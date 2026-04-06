import { NextResponse } from "next/server";
import { z } from "zod";
import { getScreenFromPathname } from "@/lib/analytics-screen";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  pathname: z.string().min(1).max(512),
  visitorId: z.string().min(8).max(80),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(rateLimitKey("page-view", req), RATE.pageView.limit, RATE.pageView.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

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
  const { pathname, visitorId } = parsed.data;
  const screen = getScreenFromPathname(pathname);
  if (!screen) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getServerSession();
  const db = await getDb();
  let userId: number | null =
    session && !session.needsPinSetup && !session.pinChangePending ? session.userId : null;
  if (userId !== null) {
    const row = await db.prepare("SELECT 1 AS ok FROM users WHERE id = ?").get(userId) as { ok: number } | undefined;
    if (!row) userId = null;
  }

  const createdAt = new Date().toISOString();
  await db.prepare(
    `INSERT INTO page_views (screen_key, pathname, user_id, visitor_id, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(screen.key, pathname.slice(0, 512), userId, visitorId.slice(0, 80), createdAt);

  return new NextResponse(null, { status: 204 });
}
