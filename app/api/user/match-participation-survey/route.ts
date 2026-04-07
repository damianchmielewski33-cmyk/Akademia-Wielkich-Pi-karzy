import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionForParticipationSurvey } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import {
  PARTICIPATION_SURVEY_KEY,
  hasParticipationSurveyAnswerForKey,
} from "@/lib/match-participation-survey";

export async function GET() {
  const r = await requireSessionForParticipationSurvey();
  if (!r.ok) return r.response;
  const db = await getDb();
  const answered = await hasParticipationSurveyAnswerForKey(db, r.session.userId, PARTICIPATION_SURVEY_KEY);
  if (answered) {
    return NextResponse.json({ pending: false, surveyKey: PARTICIPATION_SURVEY_KEY });
  }
  return NextResponse.json({ pending: true, surveyKey: PARTICIPATION_SURVEY_KEY });
}

const bodySchema = z.object({
  played: z.boolean(),
});

export async function POST(req: Request) {
  const r = await requireSessionForParticipationSurvey();
  if (!r.ok) return r.response;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }
  const db = await getDb();
  const already = await hasParticipationSurveyAnswerForKey(db, r.session.userId, PARTICIPATION_SURVEY_KEY);
  if (already) {
    return NextResponse.json({ ok: true });
  }
  const played = parsed.data.played ? 1 : 0;
  await db
    .prepare(
      `INSERT INTO participation_survey_answer (user_id, survey_key, played) VALUES (?, ?, ?)`
    )
    .run(r.session.userId, PARTICIPATION_SURVEY_KEY, played);
  return NextResponse.json({ ok: true });
}
