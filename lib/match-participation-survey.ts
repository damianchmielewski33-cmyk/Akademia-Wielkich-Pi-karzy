import type { AppDb } from "@/lib/db";
import type { MatchRow } from "@/lib/db";

/** Mecz spoza terminarza (brak wiersza w `matches`) — ankieta + statystyki tylko po `survey_key`. */
export const PARTICIPATION_SURVEY_KEY = "2026-03-27-blizne";

/** Mecz z 27.03 o 20:30 — ankieta udziału (Tak/Nie). */
export const PARTICIPATION_SURVEY_MATCH_DATE = "2026-03-27";
export const PARTICIPATION_SURVEY_MATCH_TIME = "20:30";
export const PARTICIPATION_SURVEY_LOCATION =
  "Batalionów Chłopskich 106, 05-082 Blizne Łaszczyńskiego";

export const PARTICIPATION_SURVEY_QUESTION =
  "Czy grałeś w meczu 27.03 o 20:30 pod adresem Batalionów Chłopskich 106, 05-082 Blizne Łaszczyńskiego?";

/** Wiersz do wyświetlenia formularza statystyk (bez rekordu w `matches`). */
export function getStandaloneSurveyMatchRow(): MatchRow {
  return {
    id: 0,
    match_date: PARTICIPATION_SURVEY_MATCH_DATE,
    match_time: PARTICIPATION_SURVEY_MATCH_TIME,
    location: PARTICIPATION_SURVEY_LOCATION,
    max_slots: 0,
    signed_up: 0,
    played: 1,
    lineup_public: 0,
  };
}

export async function hasParticipationSurveyAnswerForKey(
  db: AppDb,
  userId: number,
  surveyKey: string
): Promise<boolean> {
  const row = (await db
    .prepare(
      `SELECT 1 AS ok FROM participation_survey_answer WHERE user_id = ? AND survey_key = ? LIMIT 1`
    )
    .get(userId, surveyKey)) as { ok: number } | undefined;
  return Boolean(row);
}

/** Czy użytkownik zadeklarował udział (Tak) — wymagane przed zapisem statystyk poza bazą. */
export async function participationSurveyPlayedYes(
  db: AppDb,
  userId: number,
  surveyKey: string
): Promise<boolean> {
  const row = (await db
    .prepare(
      `SELECT played FROM participation_survey_answer WHERE user_id = ? AND survey_key = ?`
    )
    .get(userId, surveyKey)) as { played: number } | undefined;
  return row !== undefined && row.played === 1;
}
