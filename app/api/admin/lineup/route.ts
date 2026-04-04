import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const slotRow = z.union([z.number().int().positive(), z.null()]);

const putBodySchema = z.object({
  match_id: z.coerce.number().int().positive(),
  home: z.array(slotRow).length(7),
  away: z.array(slotRow).length(7),
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type MatchListRow = {
  id: number;
  match_date: string;
  match_time: string;
  location: string;
  lineup_public: number;
};

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const wantedId = url.searchParams.get("matchId");
  const parsedWanted = wantedId != null && wantedId !== "" ? Number(wantedId) : NaN;

  const db = getDb();
  const today = todayIso();

  const matchList = db
    .prepare(
      `SELECT id, match_date, match_time, location, lineup_public
       FROM matches
       WHERE played = 0 AND match_date >= ?
       ORDER BY match_date ASC, match_time ASC`
    )
    .all(today) as MatchListRow[];

  const selected =
    Number.isFinite(parsedWanted) && matchList.some((m) => m.id === parsedWanted)
      ? matchList.find((m) => m.id === parsedWanted)!
      : matchList[0] ?? null;

  if (!selected) {
    return NextResponse.json({
      matches: matchList.map((m) => ({
        id: m.id,
        date: m.match_date,
        time: m.match_time,
        location: m.location,
        lineupPublic: m.lineup_public === 1,
      })),
      selectedMatchId: null,
      match: null,
      players: [] as {
        userId: number;
        displayName: string;
        zawodnik: string;
        initials: string;
      }[],
      home: Array(7).fill(null),
      away: Array(7).fill(null),
    });
  }

  const playersRaw = db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(selected.id) as { user_id: number; first_name: string; last_name: string; zawodnik: string }[];

  const players = playersRaw.map((p) => {
    const fn = (p.first_name || "").trim();
    const ln = (p.last_name || "").trim();
    let initials = "";
    if (fn) initials += fn[0];
    if (ln) initials += ln[0];
    return {
      userId: p.user_id,
      displayName: `${fn} ${ln}`.trim() || p.zawodnik || "Zawodnik",
      zawodnik: p.zawodnik || "",
      initials: initials.toUpperCase(),
    };
  });

  const lineupRows = db
    .prepare(
      `SELECT team, slot_index, user_id FROM match_lineup_slots WHERE match_id = ?`
    )
    .all(selected.id) as { team: string; slot_index: number; user_id: number }[];

  const home: (number | null)[] = Array(7).fill(null);
  const away: (number | null)[] = Array(7).fill(null);
  for (const row of lineupRows) {
    if (row.slot_index < 0 || row.slot_index > 6) continue;
    if (row.team === "home") home[row.slot_index] = row.user_id;
    else if (row.team === "away") away[row.slot_index] = row.user_id;
  }

  return NextResponse.json({
    matches: matchList.map((m) => ({
      id: m.id,
      date: m.match_date,
      time: m.match_time,
      location: m.location,
      lineupPublic: m.lineup_public === 1,
    })),
    selectedMatchId: selected.id,
    match: {
      id: selected.id,
      date: selected.match_date,
      time: selected.match_time,
      location: selected.location,
      lineupPublic: selected.lineup_public === 1,
    },
    players,
    home,
    away,
  });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = putBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { match_id, home, away } = parsed.data;

  const db = getDb();
  const today = todayIso();

  const match = db
    .prepare(
      `SELECT id, match_date, match_time, location FROM matches
       WHERE id = ? AND played = 0 AND match_date >= ?`
    )
    .get(match_id, today) as { id: number; match_date: string; match_time: string; location: string } | undefined;

  if (!match) {
    return NextResponse.json({ error: "Mecz niedostępny lub nie nadaje się do składu" }, { status: 400 });
  }

  const signedUp = new Set(
    (
      db
        .prepare(`SELECT user_id FROM match_signups WHERE match_id = ?`)
        .all(match_id) as { user_id: number }[]
    ).map((r) => r.user_id)
  );

  const assigned: number[] = [];
  for (const uid of [...home, ...away]) {
    if (uid === null) continue;
    if (!signedUp.has(uid)) {
      return NextResponse.json(
        { error: "W składzie są zawodnicy, którzy nie są zapisani na ten mecz" },
        { status: 400 }
      );
    }
    assigned.push(uid);
  }
  const unique = new Set(assigned);
  if (unique.size !== assigned.length) {
    return NextResponse.json({ error: "Ten sam zawodnik nie może być na dwóch pozycjach" }, { status: 400 });
  }

  const del = db.prepare("DELETE FROM match_lineup_slots WHERE match_id = ?");
  const ins = db.prepare(
    "INSERT INTO match_lineup_slots (match_id, team, slot_index, user_id) VALUES (?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    del.run(match_id);
    for (let i = 0; i < 7; i++) {
      const hu = home[i];
      if (hu != null) ins.run(match_id, "home", i, hu);
      const au = away[i];
      if (au != null) ins.run(match_id, "away", i, au);
    }
  });
  tx();

  logActivity(
    gate.session.userId,
    `Zapisano składy 7v7: mecz ${match.match_date} ${match.match_time} (${match.location}), id ${match_id}`
  );

  return NextResponse.json({ status: "ok" });
}
