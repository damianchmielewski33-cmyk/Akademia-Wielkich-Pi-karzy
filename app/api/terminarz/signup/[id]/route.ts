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

function parseCommitment(raw: unknown): "tentative" | "confirmed" | "declined" {
  if (raw === null || typeof raw !== "object") return "confirmed";
  const o = raw as Record<string, unknown>;
  if (o.commitment === "tentative") return "tentative";
  if (o.commitment === "declined") return "declined";
  return "confirmed";
}

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

  let rawBody: unknown = {};
  try {
    rawBody = await req.json();
  } catch {
    rawBody = {};
  }
  const commitment = parseCommitment(rawBody);

  const existing = (await db
    .prepare(
      "SELECT id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?"
    )
    .get(gate.session.userId, mid)) as { id: number; commitment: number } | undefined;

  if (existing) {
    if (existing.commitment === 1) {
      return NextResponse.json({ error: "Już jesteś zapisany na ten mecz!" }, { status: 400 });
    }
    if (commitment === "tentative") {
      if (existing.commitment === 0) {
        return NextResponse.json({ error: "Już jesteś zapisany na ten mecz!" }, { status: 400 });
      }
      if (existing.commitment === 2) {
        await db
          .prepare(
            `UPDATE match_signups SET commitment = 0, drives_car = 0, can_take_passengers = 0, needs_transport = 0
             WHERE user_id = ? AND match_id = ?`
          )
          .run(gate.session.userId, mid);
        await logActivity(
          gate.session.userId,
          `Zmienił «nie biorę udziału» na «jeszcze nie wiem» przy meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
        );
        return NextResponse.json({ ok: true });
      }
    }
    if (commitment === "declined") {
      if (existing.commitment === 2) {
        return NextResponse.json({ ok: true });
      }
      if (existing.commitment === 0) {
        await db
          .prepare(
            `UPDATE match_signups SET commitment = 2, drives_car = 0, can_take_passengers = 0, needs_transport = 0
             WHERE user_id = ? AND match_id = ?`
          )
          .run(gate.session.userId, mid);
        await logActivity(
          gate.session.userId,
          `Zaznaczył «nie biorę udziału» przy meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
        );
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "Już jesteś zapisany na ten mecz!" }, { status: 400 });
  }

  if (commitment === "tentative") {
    await db
      .prepare(
        `INSERT INTO match_signups (user_id, match_id, paid, commitment, drives_car, can_take_passengers, needs_transport)
         VALUES (?, ?, 0, 0, 0, 0, 0)`
      )
      .run(gate.session.userId, mid);
    await logActivity(
      gate.session.userId,
      `Zaznaczył «jeszcze nie wiem» przy meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
    );
    return NextResponse.json({ ok: true });
  }

  if (commitment === "declined") {
    await db
      .prepare(
        `INSERT INTO match_signups (user_id, match_id, paid, commitment, drives_car, can_take_passengers, needs_transport)
         VALUES (?, ?, 0, 2, 0, 0, 0)`
      )
      .run(gate.session.userId, mid);
    await logActivity(
      gate.session.userId,
      `Zaznaczył «nie biorę udziału» przy meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
    );
    return NextResponse.json({ ok: true });
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
        `INSERT INTO match_signups (user_id, match_id, paid, commitment, drives_car, can_take_passengers, needs_transport)
         VALUES (?, ?, 0, 1, 0, 0, 0)`
      )
      .run(gate.session.userId, mid);
  } catch (e) {
    await decrementMatchSignedUp(db, mid);
    throw e;
  }

  await logActivity(
    gate.session.userId,
    `Zapisał się na mecz ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
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
    console.error("[terminarz/signup] notifyAdminsAboutMatchRosterChange:", e);
  }

  return NextResponse.json({ ok: true });
}
