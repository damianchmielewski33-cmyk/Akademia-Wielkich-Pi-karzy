import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { loadPublicShareLink } from "@/lib/public-payment-share";
import { loadMatchForSignupFees, settleBlikPhoneTransfer } from "@/lib/match-signup-blik";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { RATE, rateLimitKey, rateLimitedResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
  outcome: z.enum(["not_received", "underpaid", "received", "overpaid"]).default("received"),
  received_pln: z.coerce.number().finite().optional(),
});

type Ctx = { params: Promise<{ token: string }> };

/** Admin rozlicza przelew BLIK na ekranie linku (brak / za mało / składka / nadpłata). */
export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const rl = await checkRateLimitDistributed(
    rateLimitKey("publicBlikConfirm", req),
    RATE.publicBlikConfirm.limit,
    RATE.publicBlikConfirm.windowMs
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
    return NextResponse.json({ error: "Wybierz zawodnika i wynik przelewu" }, { status: 400 });
  }

  const db = await getDb();
  const match = await loadMatchForSignupFees(db, link.match_id);
  if (!match || Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Mecz jest niedostępny" }, { status: 400 });
  }

  const result = await settleBlikPhoneTransfer(db, {
    match,
    userId: parsed.data.user_id,
    adminId: gate.session.userId,
    outcome: parsed.data.outcome,
    receivedPln: parsed.data.received_pln,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    paid: result.paid,
    received_pln: result.receivedPln,
    wallet_delta_pln: result.walletDeltaPln,
    wallet_balance_pln: result.walletBalancePln,
  });
}
