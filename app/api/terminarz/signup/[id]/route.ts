import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { normalizeTransportFromBody, validateTransportBody, type SignupTransportRow } from "@/lib/transport";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseCommitment(raw: unknown): "tentative" | "confirmed" | "declined" {
  if (raw === null || typeof raw !== "object") return "confirmed";
  const o = raw as Record<string, unknown>;
  if (o.commitment === "tentative") return "tentative";
  if (o.commitment === "declined") return "declined";
  return "confirmed";
}

function parseTransportBody(raw: unknown): SignupTransportRow | { error: string } {
  if (raw === null || typeof raw !== "object") {
    return { drives_car: 0, can_take_passengers: 0, needs_transport: 0 };
  }
  const o = raw as Record<string, unknown>;
  if (!("drivesCar" in o) || typeof o.drivesCar !== "boolean") {
    return { drives_car: 0, can_take_passengers: 0, needs_transport: 0 };
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

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }
  const db = await getDb();
  const match = await db.prepare("SELECT * FROM matches WHERE id = ?").get(mid) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        signed_up: number;
        max_slots: number;
        played: number;
      }
    | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });

  if (match.match_date < todayISO() || match.played === 1) {
    return NextResponse.json(
      { error: "Nie można zapisać się na mecz po terminie lub rozegrany." },
      { status: 400 }
    );
  }

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

  const tr = parseTransportBody(rawBody);
  if ("error" in tr && typeof tr.error === "string") {
    return NextResponse.json({ error: tr.error }, { status: 400 });
  }
  const transport = tr as SignupTransportRow;

  await db
    .prepare(
      `INSERT INTO match_signups (user_id, match_id, paid, commitment, drives_car, can_take_passengers, needs_transport)
       VALUES (?, ?, 0, 1, ?, ?, ?)`
    )
    .run(
      gate.session.userId,
      mid,
      transport.drives_car,
      transport.can_take_passengers,
      transport.needs_transport
    );
  await db.prepare("UPDATE matches SET signed_up = signed_up + 1 WHERE id = ?").run(mid);

  await logActivity(
    gate.session.userId,
    `Zapisał się na mecz ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
  );

  return NextResponse.json({ ok: true });
}
