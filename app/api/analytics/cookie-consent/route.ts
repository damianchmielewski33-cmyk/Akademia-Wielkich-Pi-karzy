import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  choice: z.enum(["accept_all", "reject_marketing"]),
  visitorId: z.string().min(8).max(80),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(
    rateLimitKey("cookie-consent", req),
    RATE.adImpression.limit,
    RATE.adImpression.windowMs
  );
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

  const visitorId = parsed.data.visitorId.trim().slice(0, 80);
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const dedupeSince = new Date(Date.now() - 10_000).toISOString();
  const recent = (await db
    .prepare(
      `SELECT 1 AS ok FROM cookie_consent_events
       WHERE visitor_id = ? AND created_at >= ?
       LIMIT 1`
    )
    .get(visitorId, dedupeSince)) as { ok: number } | undefined;
  if (recent) {
    return new NextResponse(null, { status: 204 });
  }

  await db
    .prepare(
      `INSERT INTO cookie_consent_events (choice, visitor_id, created_at) VALUES (?, ?, ?)`
    )
    .run(parsed.data.choice, visitorId, createdAt);

  return new NextResponse(null, { status: 204 });
}
