import { NextResponse } from "next/server";
import { getDb, type AppDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { isTransportChatEligible, type SignupTransportRow } from "@/lib/transport";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ matchId: string }> };

const MAX_LEN = 1500;

async function getEligibleSignup(
  db: AppDb,
  userId: number,
  matchId: number
): Promise<SignupTransportRow | null> {
  const row = (await db
    .prepare(
      `SELECT drives_car, can_take_passengers, needs_transport FROM match_signups WHERE user_id = ? AND match_id = ?`
    )
    .get(userId, matchId)) as SignupTransportRow | undefined;
  return row ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { matchId: raw } = await ctx.params;
  const matchId = Number(raw);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }

  const db = await getDb();
  const match = await db.prepare("SELECT id, played FROM matches WHERE id = ?").get(matchId) as
    | { id: number; played: number }
    | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });
  if (match.played === 1) {
    return NextResponse.json({ error: "Mecz rozegrany — czat niedostępny." }, { status: 400 });
  }

  const signup = await getEligibleSignup(db, gate.session.userId, matchId);
  if (!isTransportChatEligible(signup)) {
    return NextResponse.json({ error: "Brak dostępu do czatu transportowego." }, { status: 403 });
  }

  const rows = await db
    .prepare(
      `SELECT m.id, m.body, m.created_at, m.user_id,
              u.first_name AS first_name, u.last_name AS last_name, u.player_alias AS zawodnik
       FROM match_transport_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.match_id = ?
       ORDER BY m.created_at ASC`
    )
    .all(matchId) as {
    id: number;
    body: string;
    created_at: string;
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
  }[];

  return NextResponse.json({
    messages: rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      zawodnik: r.zawodnik,
    })),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { matchId: raw } = await ctx.params;
  const matchId = Number(raw);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }

  let bodyText = "";
  try {
    const j = (await req.json()) as { body?: unknown };
    bodyText = typeof j.body === "string" ? j.body.trim() : "";
  } catch {
    return NextResponse.json({ error: "Niepoprawny JSON" }, { status: 400 });
  }
  if (!bodyText) {
    return NextResponse.json({ error: "Wiadomość nie może być pusta." }, { status: 400 });
  }
  if (bodyText.length > MAX_LEN) {
    return NextResponse.json({ error: `Maksymalnie ${MAX_LEN} znaków.` }, { status: 400 });
  }

  const db = await getDb();
  const match = await db.prepare("SELECT played FROM matches WHERE id = ?").get(matchId) as { played: number } | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });
  if (match.played === 1) {
    return NextResponse.json({ error: "Mecz rozegrany — czat niedostępny." }, { status: 400 });
  }

  const signup = await getEligibleSignup(db, gate.session.userId, matchId);
  if (!isTransportChatEligible(signup)) {
    return NextResponse.json({ error: "Brak dostępu do czatu transportowego." }, { status: 403 });
  }

  const info = await db
    .prepare(
      `INSERT INTO match_transport_messages (match_id, user_id, body) VALUES (?, ?, ?)`
    )
    .run(matchId, gate.session.userId, bodyText);

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
