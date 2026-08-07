import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import { transferWalletFunds } from "@/lib/wallet";

export const runtime = "nodejs";

const postSchema = z.object({
  to_user_id: z.coerce.number().int().positive(),
  amount_pln: z.coerce.number().min(1).max(10000),
  note: z.string().trim().max(200).optional(),
});

/**
 * Przelew środków między portfelami zawodników akademii.
 */
export async function POST(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const rl = checkRateLimit(
    rateLimitKey(`wallet_transfer:${gate.session.userId}`, req),
    RATE.walletTransfer.limit,
    RATE.walletTransfer.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Podaj odbiorcę i kwotę (min. 1 PLN)." }, { status: 400 });
  }

  const result = await transferWalletFunds({
    fromUserId: gate.session.userId,
    toUserId: parsed.data.to_user_id,
    amountPln: parsed.data.amount_pln,
    note: parsed.data.note,
  });

  if (!result.ok) {
    const messages: Record<typeof result.error, string> = {
      SELF_TRANSFER: "Nie możesz przelać środków samemu sobie.",
      INVALID_AMOUNT: "Minimalna kwota przelewu to 1 PLN.",
      RECIPIENT_NOT_FOUND: "Nie znaleziono odbiorcy.",
      INSUFFICIENT_FUNDS: "Niewystarczające saldo na portfelu.",
    };
    const status =
      result.error === "INSUFFICIENT_FUNDS" || result.error === "SELF_TRANSFER" ? 409 : 400;
    return NextResponse.json({ error: messages[result.error], code: result.error }, { status });
  }

  await logActivity(
    gate.session.userId,
    `Przelew portfela: ${result.amount_pln} PLN → user ${parsed.data.to_user_id}`
  );

  return NextResponse.json({
    ok: true,
    amount_pln: result.amount_pln,
    balance_pln: result.balance_pln,
  });
}
