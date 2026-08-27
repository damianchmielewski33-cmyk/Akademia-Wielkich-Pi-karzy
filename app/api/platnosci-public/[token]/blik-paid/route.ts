import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { loadPublicShareLink, matchSignupContributionPln } from "@/lib/public-payment-share";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { RATE, rateLimitKey, rateLimitedResponse } from "@/lib/rate-limit";
import { syncPaidFlagWithWallet } from "@/lib/match-paid";

export const runtime = "nodejs";

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

type Ctx = { params: Promise<{ token: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const rl = await checkRateLimitDistributed(
    rateLimitKey("publicBlikPaid", req),
    RATE.publicBlikPaid.limit,
    RATE.publicBlikPaid.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const { token } = await ctx.params;
  const link = await loadPublicShareLink(String(token));
  if (!link || link.kind !== "match_signup_fees" || !link.match_id) {
    return NextResponse.json({ error: "Link jest nieaktywny" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Wybierz zawodnika" }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT id, match_date, match_time, location, fee_pln, signed_up, cancelled FROM matches WHERE id = ?")
    .get(link.match_id)) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        fee_pln: number | null;
        signed_up: number;
        cancelled: number;
      }
    | undefined;
  if (!match || Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Mecz jest niedostępny" }, { status: 400 });
  }

  const signup = (await db
    .prepare(
      `SELECT user_id, paid FROM match_signups
       WHERE match_id = ? AND user_id = ? AND COALESCE(commitment, 1) = 1`
    )
    .get(match.id, parsed.data.user_id)) as { user_id: number; paid: number } | undefined;
  if (!signup) {
    return NextResponse.json({ error: "Ten zawodnik nie jest zapisany na mecz" }, { status: 400 });
  }
  if (Number(signup.paid) === 1) {
    return NextResponse.json({ ok: true, already: true });
  }

  await db
    .prepare(`UPDATE match_signups SET paid = 1 WHERE match_id = ? AND user_id = ?`)
    .run(match.id, parsed.data.user_id);

  const matchLabel = `${match.match_date} ${match.match_time} · ${match.location}`;
  await syncPaidFlagWithWallet(db, {
    matchId: match.id,
    userId: parsed.data.user_id,
    paid: true,
    adminId: 0,
    matchLabel,
    feePln: matchSignupContributionPln(match.fee_pln, Number(match.signed_up) || 0),
  });
  await logActivity(
    parsed.data.user_id,
    `Oznaczył składkę jako opłaconą (przelew BLIK na telefon) — ${matchLabel}`
  );

  return NextResponse.json({ ok: true });
}
