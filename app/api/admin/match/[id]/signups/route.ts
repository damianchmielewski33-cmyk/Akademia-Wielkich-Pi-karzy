import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { removeTemporaryGuestIfPaid } from "@/lib/guest-cleanup";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(_req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = await getDb();
  const exists = await db.prepare("SELECT 1 FROM matches WHERE id = ?").get(mid);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signups = await db
    .prepare(
      `SELECT ms.user_id AS user_id, ms.paid, COALESCE(ms.commitment, 1) AS commitment,
              u.first_name AS first_name, u.last_name AS last_name,
              u.player_alias AS zawodnik, u.profile_photo_path AS profile_photo_path,
              u.is_temporary AS is_temporary
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
       ORDER BY u.is_temporary DESC, ms.commitment DESC, u.first_name, u.last_name`
    )
    .all(mid);

  return NextResponse.json({ signups });
}

const patchSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  paid: z.boolean(),
});

export async function PATCH(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signup = await db
    .prepare("SELECT id FROM match_signups WHERE match_id = ? AND user_id = ?")
    .get(mid, parsed.data.user_id) as { id: number } | undefined;
  if (!signup) {
    return NextResponse.json({ error: "Brak zapisu dla tego zawodnika" }, { status: 404 });
  }

  const paid = parsed.data.paid ? 1 : 0;
  await db.prepare("UPDATE match_signups SET paid = ? WHERE match_id = ? AND user_id = ?").run(
    paid,
    mid,
    parsed.data.user_id
  );

  const who = await db
    .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
    .get(parsed.data.user_id) as { first_name: string; last_name: string } | undefined;

  logActivity(
    gate.session.userId,
    `${paid ? "Oznaczył opłatę" : "Cofnął oznaczenie opłaty"} dla ${who?.first_name ?? "?"} ${who?.last_name ?? "?"} — mecz ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
  );

  if (paid === 1) {
    await removeTemporaryGuestIfPaid({
      userId: parsed.data.user_id,
      matchId: mid,
      actorUserId: gate.session.userId,
    });
  }

  return NextResponse.json({ status: "ok", paid });
}

const postSchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db.prepare("SELECT * FROM matches WHERE id = ?").get(mid)) as
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
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.played === 1 || match.match_date < todayISO()) {
    return NextResponse.json({ error: "Nie można zapisać do meczu po terminie lub rozegranego." }, { status: 400 });
  }

  const uid = parsed.data.user_id;
  const who = (await db
    .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
    .get(uid)) as { first_name: string; last_name: string } | undefined;
  if (!who) return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });

  const existing = (await db
    .prepare("SELECT id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?")
    .get(uid, mid)) as { id: number; commitment: number } | undefined;

  if (existing?.commitment === 1) {
    return NextResponse.json({ ok: true, already: true }, { status: 200 });
  }

  if (match.signed_up >= match.max_slots) {
    return NextResponse.json({ error: "Brak miejsc na ten mecz!" }, { status: 400 });
  }

  if (existing) {
    // "Przywróć" zapis: zamień na commitment=1 i wyczyść transport (admin zapisuje ręcznie — transport ustawia zawodnik).
    await db
      .prepare(
        `UPDATE match_signups
         SET commitment = 1, drives_car = 0, can_take_passengers = 0, needs_transport = 0
         WHERE id = ?`
      )
      .run(existing.id);
  } else {
    await db
      .prepare(
        `INSERT INTO match_signups (user_id, match_id, paid, commitment, drives_car, can_take_passengers, needs_transport)
         VALUES (?, ?, 0, 1, 0, 0, 0)`
      )
      .run(uid, mid);
  }
  await db.prepare("UPDATE matches SET signed_up = signed_up + 1 WHERE id = ?").run(mid);

  logActivity(
    gate.session.userId,
    `Dopisał ręcznie do meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}: ${who.first_name} ${who.last_name} (id ${uid})`
  );

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

export async function DELETE(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT match_date, match_time, location, played FROM matches WHERE id = ?")
    .get(mid)) as { match_date: string; match_time: string; location: string; played: number } | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.played === 1 || match.match_date < todayISO()) {
    return NextResponse.json({ error: "Nie można wypisać z meczu po terminie lub rozegranego." }, { status: 400 });
  }

  const uid = parsed.data.user_id;
  const signup = (await db
    .prepare("SELECT id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?")
    .get(uid, mid)) as { id: number; commitment: number } | undefined;
  if (!signup) return NextResponse.json({ ok: true, missing: true }, { status: 200 });

  await db.prepare("DELETE FROM match_signups WHERE id = ?").run(signup.id);
  if (signup.commitment === 1) {
    await db.prepare("UPDATE matches SET signed_up = signed_up - 1 WHERE id = ? AND signed_up > 0").run(mid);
  }

  const who = (await db
    .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
    .get(uid)) as { first_name: string; last_name: string } | undefined;

  logActivity(
    gate.session.userId,
    `Wypisał ręcznie z meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}: ${who?.first_name ?? "?"} ${who?.last_name ?? "?"} (id ${uid})`
  );

  return NextResponse.json({ ok: true });
}
