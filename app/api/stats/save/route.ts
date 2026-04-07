import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { isWithinStatsEditWindow, utcTodayYmd } from "@/lib/match-stats-rules";
import { PARTICIPATION_SURVEY_KEY, participationSurveyPlayedYes } from "@/lib/match-participation-survey";

export const runtime = "nodejs";

const statFields = {
  goals: z.coerce.number().int().min(0).default(0),
  assists: z.coerce.number().int().min(0).default(0),
  distance: z.coerce.number().min(0).default(0),
  saves: z.coerce.number().int().min(0).default(0),
};

const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const bodySchema = z
  .object({
    match_id: z.preprocess(
      (v) => emptyToUndef(v),
      z.coerce.number().int().positive().optional()
    ),
    survey_key: z.preprocess(
      (v) => emptyToUndef(v),
      z.string().min(1).optional()
    ),
    ...statFields,
  })
  .superRefine((val, ctx) => {
    const hasMatch = val.match_id != null && val.match_id > 0;
    const hasSurvey = val.survey_key != null && val.survey_key.length > 0;
    if (hasMatch === hasSurvey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj albo match_id, albo survey_key (nie oba).",
      });
    }
    if (hasSurvey && val.survey_key !== PARTICIPATION_SURVEY_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nieobsługiwany survey_key.",
      });
    }
  });

async function parseBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return req.json();
  }
  const fd = await req.formData();
  return {
    match_id: fd.get("match_id"),
    survey_key: fd.get("survey_key"),
    goals: fd.get("goals"),
    assists: fd.get("assists"),
    distance: fd.get("distance"),
    saves: fd.get("saves"),
  };
}

export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ") || "Bad request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const data = parsed.data;
  const { goals, assists, distance, saves } = data;
  const db = await getDb();

  if (data.survey_key === PARTICIPATION_SURVEY_KEY) {
    const okPlay = await participationSurveyPlayedYes(db, session.userId, PARTICIPATION_SURVEY_KEY);
    if (!okPlay) {
      return NextResponse.json(
        { error: "Najpierw potwierdź w ankiecie, że grałeś w tym meczu (Tak)." },
        { status: 403 }
      );
    }
    /** Wyjątek: mecz spoza terminarza — bez limitu 7 dni od daty (ankieta 27.03). */
    const existing = await db
      .prepare(
        `SELECT 1 AS ok FROM standalone_match_stats WHERE user_id = ? AND survey_key = ?`
      )
      .get(session.userId, PARTICIPATION_SURVEY_KEY) as { ok: number } | undefined;

    if (existing) {
      await db
        .prepare(
          `UPDATE standalone_match_stats SET goals = ?, assists = ?, distance = ?, saves = ?, updated_at = datetime('now') WHERE user_id = ? AND survey_key = ?`
        )
        .run(goals, assists, distance, saves, session.userId, PARTICIPATION_SURVEY_KEY);
    } else {
      await db
        .prepare(
          `INSERT INTO standalone_match_stats (user_id, survey_key, goals, assists, distance, saves) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(session.userId, PARTICIPATION_SURVEY_KEY, goals, assists, distance, saves);
    }
    logActivity(
      session.userId,
      `Uzupełnił statystyki za mecz spoza terminarza (${PARTICIPATION_SURVEY_KEY}, bramki: ${goals}, asysty: ${assists}, km: ${distance}, obrony: ${saves})`
    );
    return new NextResponse("OK", { status: 200 });
  }

  const match_id = data.match_id!;
  const match = (await db
    .prepare("SELECT id, played, match_date FROM matches WHERE id = ?")
    .get(match_id)) as { id: number; played: number; match_date: string } | undefined;
  if (!match) {
    return NextResponse.json({ error: "Nie znaleziono meczu." }, { status: 404 });
  }
  if (match.played !== 1) {
    return NextResponse.json(
      { error: "Statystyki można dodać dopiero po meczu oznaczonym jako rozegrany." },
      { status: 400 }
    );
  }
  const signup = (await db
    .prepare("SELECT 1 AS ok FROM match_signups WHERE user_id = ? AND match_id = ?")
    .get(session.userId, match_id)) as { ok: number } | undefined;
  if (!signup) {
    return NextResponse.json(
      { error: "Statystyki możesz uzupełnić tylko dla meczów, na które byłeś zapisany." },
      { status: 403 }
    );
  }

  const withinEditWeek = isWithinStatsEditWindow(match.match_date, utcTodayYmd());

  const existing = (await db
    .prepare("SELECT id FROM match_stats WHERE user_id = ? AND match_id = ?")
    .get(session.userId, match_id)) as { id: number } | undefined;

  if (existing) {
    if (!withinEditWeek) {
      return NextResponse.json(
        { error: "Minął tydzień od daty meczu — nie możesz już edytować tych statystyk." },
        { status: 403 }
      );
    }
    await db.prepare(
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

  await db.prepare(
    "INSERT INTO match_stats (user_id, match_id, goals, assists, distance, saves) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(session.userId, match_id, goals, assists, distance, saves);
  logActivity(
    session.userId,
    `Uzupełnił własne statystyki za mecz id ${match_id} (bramki: ${goals}, asysty: ${assists}, km: ${distance}, obrony: ${saves})`
  );
  return new NextResponse("OK", { status: 200 });
}
