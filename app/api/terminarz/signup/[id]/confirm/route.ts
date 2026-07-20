import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { normalizeTransportFromBody, validateTransportBody, type SignupTransportRow } from "@/lib/transport";
import {
  assertMatchOpenForSignup,
  tryIncrementMatchSignedUp,
  decrementMatchSignedUp,
  type MatchSignupRow,
} from "@/lib/match-signup";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function parseTransportBody(raw: unknown): SignupTransportRow | { error: string } {
  if (raw === null || typeof raw !== "object") {
    return { error: "Brak danych transportu" };
  }
  const o = raw as Record<string, unknown>;
  if (!("drivesCar" in o) || typeof o.drivesCar !== "boolean") {
    return { error: "Pole drivesCar jest wymagane" };
  }
  const err = validateTransportBody({
    drivesCar: o.drivesCar,
    canTakePassengers: typeof o.canTakePassengers === "boolean" ? o.canTakePassengers : undefined,
    needsTransport: typeof o.needsTransport === "boolean" ? o.needsTransport : undefined,
  });
  if (err) return { error: err };
  return normalizeTransportFromBody({
    drivesCar: o.drivesCar,
    canTakePassengers: typeof o.canTakePassengers === "boolean" ? o.canTakePassengers : undefined,
    needsTransport: typeof o.needsTransport === "boolean" ? o.needsTransport : undefined,
  });
}

/** Promocja zapisu wstępnego («jeszcze nie wiem» / «nie biorę udziału») na pełny zapis z transportem. */
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

  let rawBody: unknown = {};
  try {
    rawBody = await req.json();
  } catch {
    rawBody = {};
  }
  const tr = parseTransportBody(rawBody);
  if ("error" in tr && typeof tr.error === "string") {
    return NextResponse.json({ error: tr.error }, { status: 400 });
  }
  const transport = tr as SignupTransportRow;

  const db = await getDb();
  const match = (await db.prepare("SELECT * FROM matches WHERE id = ?").get(mid)) as MatchSignupRow | undefined;
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
         SET commitment = 1, drives_car = ?, can_take_passengers = ?, needs_transport = ?
         WHERE user_id = ? AND match_id = ?`
      )
      .run(
        transport.drives_car,
        transport.can_take_passengers,
        transport.needs_transport,
        gate.session.userId,
        mid
      );
  } catch (e) {
    await decrementMatchSignedUp(db, mid);
    throw e;
  }

  await logActivity(
    gate.session.userId,
    `Potwierdził udział w meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
  );

  return NextResponse.json({ ok: true });
}
