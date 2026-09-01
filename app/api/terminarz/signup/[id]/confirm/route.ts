import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireUser, requireMatchInApiRealm } from "@/lib/api-helpers";
import {
  assertMatchOpenForSignup,
  tryIncrementMatchSignedUp,
  decrementMatchSignedUp,
  type MatchSignupRow,
} from "@/lib/match-signup";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import { notifyAdminsAboutMatchRosterChange } from "@/lib/match-notifications";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Promocja zapisu wstępnego («jeszcze nie wiem» / «nie biorę udziału») na pełny zapis. */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }

  const realmGate = await requireMatchInApiRealm(req, mid);
  if (!realmGate.ok) return realmGate.response;

  const db = await getDb();
  const match = (await db
    .prepare(
      `SELECT id, match_date, match_time, location, max_slots, signed_up, played, cancelled
       FROM matches WHERE id = ?`
    )
    .get(mid)) as MatchSignupRow | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });

  const openErr = assertMatchOpenForSignup(match);
  if (openErr) return NextResponse.json({ error: openErr }, { status: 400 });

  const row = (await db
    .prepare(
      "SELECT id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?"
    )
    .get(gate.session.userId, mid)) as { id: number; commitment: number } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Nie masz wstępnego zapisu na ten mecz." }, { status: 400 });
  }
  if (row.commitment !== 0 && row.commitment !== 2) {
    return NextResponse.json({ error: "Masz już potwierdzony zapis na ten mecz." }, { status: 400 });
  }
  if (match.signed_up >= match.max_slots) {
    return NextResponse.json({ error: "Brak miejsc na ten mecz!" }, { status: 400 });
  }

  const incremented = await tryIncrementMatchSignedUp(db, mid);
  if (!incremented) {
    return NextResponse.json({ error: "Brak miejsc na ten mecz!" }, { status: 400 });
  }

  try {
    await db
      .prepare(
        `UPDATE match_signups
         SET commitment = 1, drives_car = 0, can_take_passengers = 0, needs_transport = 0
         WHERE user_id = ? AND match_id = ?`
      )
      .run(gate.session.userId, mid);
  } catch (e) {
    await decrementMatchSignedUp(db, mid);
    throw e;
  }

  await logActivity(
    gate.session.userId,
    `Potwierdził udział w meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
  );

  try {
    await notifyAdminsAboutMatchRosterChange({
      action: "signup",
      matchId: mid,
      matchDate: match.match_date,
      matchTime: match.match_time,
      location: match.location,
      playerUserId: gate.session.userId,
    });
  } catch (e) {
    console.error("[terminarz/signup/confirm] notifyAdminsAboutMatchRosterChange:", e);
  }

  return NextResponse.json({ ok: true });
}
