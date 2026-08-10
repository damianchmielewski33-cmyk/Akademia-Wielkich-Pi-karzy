import { NextResponse } from "next/server";
import { z } from "zod";
import { addMatchGuest } from "@/lib/add-match-guest";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getHotpayConfig } from "@/lib/hotpay";
import { startHotpayMatchCartPayment } from "@/lib/match-cart-hotpay";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ matchId: string }> };

const bodySchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  player_alias: z.string().min(1).max(120),
  /** Gdy true — po zapisie od razu sesja HotPay na zaliczkę koszyka (gość = płatnik i beneficjent). */
  pay: z.boolean().optional().default(false),
  return_path: z.string().trim().max(512).optional(),
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request, context: RouteContext) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const rl = await checkRateLimitDistributed(
    rateLimitKey("guest_signup", req),
    RATE.guestSignup.limit,
    RATE.guestSignup.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const { matchId: raw } = await context.params;
  const mid = Number(raw);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT id, match_date, played, cancelled FROM matches WHERE id = ?")
    .get(mid)) as { id: number; match_date: string; played: number; cancelled: number } | undefined;

  if (!match) {
    return NextResponse.json({ error: "Mecz nie został znaleziony" }, { status: 404 });
  }

  if (match.cancelled === 1) {
    return NextResponse.json({ error: "Nie można zapisać gościa na anulowany mecz." }, { status: 400 });
  }

  if (match.match_date < todayISO() || match.played === 1) {
    return NextResponse.json(
      { error: "Nie można zapisać gościa na mecz po terminie lub rozegrany." },
      { status: 400 }
    );
  }

  const { first_name, last_name, player_alias, pay, return_path } = parsed.data;

  if (pay) {
    const appSettings = await getAppSettings(db);
    if (!getHotpayConfig() || !appSettings.hotpay_enabled) {
      return NextResponse.json(
        { error: "Płatności online są niedostępne. Zapisz się bez opłaty albo skontaktuj się z organizatorem." },
        { status: 503 }
      );
    }
  }

  const result = await addMatchGuest({
    matchId: mid,
    firstName: first_name,
    lastName: last_name,
    playerAlias: player_alias,
    actorUserId: null,
    activityMessage: `Gość ${first_name.trim()} ${last_name.trim()} (${player_alias.trim()}) zapisał się przez link zaproszenia na mecz id ${mid}`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!pay) {
    return NextResponse.json({
      ok: true,
      user_id: result.userId,
      message: "Gość zapisany na mecz",
    });
  }

  const payerLabel =
    [first_name.trim(), last_name.trim()].filter(Boolean).join(" ") || player_alias.trim();
  const hotpay = await startHotpayMatchCartPayment({
    payerUserId: result.userId,
    matchId: mid,
    beneficiaryUserIds: [result.userId],
    returnPath: return_path?.startsWith("/") ? return_path : `/zaproszenie/${mid}`,
    payerLabel,
  });

  if (!hotpay.ok) {
    // Gość już zapisany — nie cofamy zapisu; klient pokaże sukces + informację o płatności.
    return NextResponse.json({
      ok: true,
      user_id: result.userId,
      message: "Gość zapisany na mecz",
      pay_error: hotpay.error,
    });
  }

  return NextResponse.json({
    ok: true,
    user_id: result.userId,
    method: "hotpay",
    url: hotpay.url,
    session_id: hotpay.session_id,
    cart_id: hotpay.cart_id,
    amount_pln: hotpay.amount_pln,
    message: "Gość zapisany — przekierowanie do płatności",
  });
}
