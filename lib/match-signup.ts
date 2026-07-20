import type { AppDb } from "@/lib/db";

export type MatchSignupRow = {
  id: number;
  match_date: string;
  match_time: string;
  location: string;
  signed_up: number;
  max_slots: number;
  played: number;
  cancelled?: number;
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function assertMatchOpenForSignup(
  match: MatchSignupRow,
  opts?: { allowPast?: boolean }
): string | null {
  if (Number(match.cancelled ?? 0) === 1) {
    return "Mecz został anulowany — zapisy są niedostępne.";
  }
  if (!opts?.allowPast && (match.match_date < todayISO() || match.played === 1)) {
    return "Nie można zapisać się na mecz po terminie lub rozegrany.";
  }
  return null;
}

/** Atomowo zwiększa signed_up tylko gdy są wolne miejsca. Zwraca false przy braku miejsc. */
export async function tryIncrementMatchSignedUp(db: AppDb, matchId: number): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE matches SET signed_up = signed_up + 1 WHERE id = ? AND signed_up < max_slots AND COALESCE(cancelled, 0) = 0`
    )
    .run(matchId);
  return Number(r.changes ?? 0) > 0;
}

export async function decrementMatchSignedUp(db: AppDb, matchId: number): Promise<void> {
  await db
    .prepare("UPDATE matches SET signed_up = signed_up - 1 WHERE id = ? AND signed_up > 0")
    .run(matchId);
}
