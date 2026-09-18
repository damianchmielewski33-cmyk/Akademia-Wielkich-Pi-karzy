import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { loadPublicShareLink } from "@/lib/public-payment-share";
import { declareBlikPhoneTransfer, loadMatchForSignupFees } from "@/lib/match-signup-blik";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { RATE, rateLimitKey, rateLimitedResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

type Ctx = { params: Promise<{ token: string }> };

/** Publiczne zgłoszenie przelewu BLIK — nie oznacza składki jako opłaconej. */
export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;

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

  const rl = await checkRateLimitDistributed(
    rateLimitKey(`publicBlikPaid:${token}:${parsed.data.user_id}`, req),
    3,
    12 * 60 * 60 * 1000
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const link = await loadPublicShareLink(String(token));
  if (!link || link.kind !== "match_signup_fees" || !link.match_id) {
    return NextResponse.json({ error: "Link jest nieaktywny" }, { status: 404 });
  }

  const db = await getDb();
  const match = await loadMatchForSignupFees(db, link.match_id);
  if (!match || Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Mecz jest niedostępny" }, { status: 400 });
  }

  const result = await declareBlikPhoneTransfer(db, { match, userId: parsed.data.user_id });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    pending: !result.alreadyPaid,
    already: result.alreadyPaid || result.alreadyDeclared,
  });
}
