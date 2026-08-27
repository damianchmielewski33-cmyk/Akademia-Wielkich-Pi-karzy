import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { startHotpayMatchCartPayment } from "@/lib/match-cart-hotpay";
import {
  loadPublicShareLink,
  matchSignupContributionPln,
} from "@/lib/public-payment-share";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { RATE, rateLimitKey, rateLimitedResponse } from "@/lib/rate-limit";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

type Ctx = { params: Promise<{ token: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const rl = await checkRateLimitDistributed(
    rateLimitKey("hotpayPublicCreate", req),
    RATE.hotpayPublicCreate.limit,
    RATE.hotpayPublicCreate.windowMs
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
    .prepare("SELECT id, fee_pln, signed_up, cancelled FROM matches WHERE id = ?")
    .get(link.match_id)) as
    | { id: number; fee_pln: number | null; signed_up: number; cancelled: number }
    | undefined;
  if (!match || Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Mecz jest niedostępny" }, { status: 400 });
  }

  const user = (await db
    .prepare(
      `SELECT u.id, u.first_name, u.last_name, u.player_alias, ms.paid
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND ms.user_id = ? AND COALESCE(ms.commitment, 1) = 1`
    )
    .get(match.id, parsed.data.user_id)) as
    | { id: number; first_name: string; last_name: string; player_alias: string; paid: number }
    | undefined;
  if (!user) {
    return NextResponse.json({ error: "Ten zawodnik nie jest zapisany na mecz" }, { status: 400 });
  }
  if (Number(user.paid) === 1) {
    return NextResponse.json({ error: "Ta składka jest już opłacona" }, { status: 400 });
  }

  const fee = matchSignupContributionPln(match.fee_pln, Number(match.signed_up) || 0);
  const payerLabel = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.player_alias;
  const started = await startHotpayMatchCartPayment({
    payerUserId: user.id,
    matchId: match.id,
    beneficiaryUserIds: [user.id],
    returnPath: `/platnosci-public/${link.token}`,
    payerLabel,
    logAsPayer: true,
    feePerPersonPln: fee,
  });
  if (!started.ok) {
    return NextResponse.json({ error: started.error }, { status: started.status });
  }
  return NextResponse.json({
    ok: true,
    url: started.url,
    session_id: started.session_id,
    amount_pln: started.amount_pln,
  });
}
