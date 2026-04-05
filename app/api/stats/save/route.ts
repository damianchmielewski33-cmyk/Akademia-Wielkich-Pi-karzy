import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  match_id: z.coerce.number().int().positive(),
  goals: z.coerce.number().int().min(0).default(0),
  assists: z.coerce.number().int().min(0).default(0),
  distance: z.coerce.number().min(0).default(0),
  saves: z.coerce.number().int().min(0).default(0),
});

async function parseBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return req.json();
  }
  const fd = await req.formData();
  return {
    match_id: fd.get("match_id"),
    goals: fd.get("goals"),
    assists: fd.get("assists"),
    distance: fd.get("distance"),
    saves: fd.get("saves"),
  };
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return new NextResponse("NOT_LOGGED", { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { match_id, goals, assists, distance, saves } = parsed.data;
  const db = getDb();
  const match = db
    .prepare("SELECT id, played, match_date FROM matches WHERE id = ?")
    .get(match_id) as { id: number; played: number; match_date: string } | undefined;
  if (!match) {
    return NextResponse.json({ error: "Nie znaleziono meczu." }, { status: 404 });
  }
  if (match.played !== 1) {
    return NextResponse.json(
      { error: "Statystyki można dodać dopiero po meczu oznaczonym jako rozegrany." },
      { status: 400 }
    );
  }
  const signup = db
    .prepare("SELECT 1 AS ok FROM match_signups WHERE user_id = ? AND match_id = ?")
    .get(session.userId, match_id) as { ok: number } | undefined;
  if (!signup) {
    return NextResponse.json(
      { error: "Statystyki możesz uzupełnić tylko dla meczów, na które byłeś zapisany." },
      { status: 403 }
    );
  }

  const withinEditWeek = Boolean(
    db
      .prepare(
        "SELECT 1 AS ok FROM matches WHERE id = ? AND played = 1 AND date('now') <= date(match_date, '+7 days')"
      )
      .get(match_id) as { ok: number } | undefined
  );

  const existing = db
    .prepare("SELECT id FROM match_stats WHERE user_id = ? AND match_id = ?")
    .get(session.userId, match_id) as { id: number } | undefined;

  if (existing) {
    if (!withinEditWeek) {
      return NextResponse.json(
        { error: "Minął tydzień od daty meczu — nie możesz już edytować tych statystyk." },
        { status: 403 }
      );
    }
    db.prepare(
      "UPDATE match_stats SET goals = ?, assists = ?, distance = ?, saves = ? WHERE id = ? AND user_id = ?"
    ).run(goals, assists, distance, saves, existing.id, session.userId);
    logActivity(
      session.userId,
      `Zaktualizował własne statystyki za mecz id ${match_id} (bramki: ${goals}, asysty: ${assists}, km: ${distance}, obrony: ${saves})`
    );
    return new NextResponse("OK", { status: 200 });
  }

  if (!withinEditWeek) {
    return NextResponse.json(
      { error: "Minął tydzień od daty meczu — nie możesz już dodać statystyk." },
      { status: 403 }
    );
  }

  db.prepare(
    "INSERT INTO match_stats (user_id, match_id, goals, assists, distance, saves) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(session.userId, match_id, goals, assists, distance, saves);
  logActivity(
    session.userId,
    `Uzupełnił własne statystyki za mecz id ${match_id} (bramki: ${goals}, asysty: ${assists}, km: ${distance}, obrony: ${saves})`
  );
  return new NextResponse("OK", { status: 200 });
}
