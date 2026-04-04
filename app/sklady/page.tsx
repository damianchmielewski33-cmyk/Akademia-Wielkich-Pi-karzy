import Link from "next/link";
import { getDb, type MatchRow } from "@/lib/db";
import { MatchLineupView, type LineupPlayer } from "@/components/match-lineup-view";

export default async function SkladyPage() {
  const db = getDb();
  const nextMatch = db
    .prepare(
      "SELECT * FROM matches WHERE match_date >= date('now') ORDER BY match_date, match_time LIMIT 1"
    )
    .get() as MatchRow | undefined;

  return (
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 sm:py-10">
      {!nextMatch ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-emerald-950">Brak nadchodzącego meczu</h1>
          <p className="mt-2 text-sm text-zinc-600">Gdy pojawi się termin w terminarzu, wróć tutaj po udostępnieniu składów.</p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline">
            Wróć na stronę główną
          </Link>
        </div>
      ) : nextMatch.lineup_public !== 1 ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-emerald-950">Składy jeszcze niewidoczne</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Administrator nie udostępnił jeszcze składów na najbliższy mecz. Obserwuj stronę główną — przycisk „Zobacz składy” stanie się aktywny po publikacji.
          </p>
          <p className="mt-4 text-sm font-medium text-zinc-800">
            {nextMatch.match_date} · {nextMatch.match_time}
          </p>
          <p className="text-sm text-zinc-600">{nextMatch.location}</p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline">
            Strona główna
          </Link>
        </div>
      ) : (
        <SkladyContent matchId={nextMatch.id} />
      )}
    </div>
  );
}

async function SkladyContent({ matchId }: { matchId: number }) {
  const db = getDb();

  const row = db
    .prepare(
      "SELECT id, match_date, match_time, location, lineup_public FROM matches WHERE id = ? AND lineup_public = 1"
    )
    .get(matchId) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        lineup_public: number;
      }
    | undefined;

  if (!row) {
    return (
      <p className="text-center text-sm text-zinc-600">
        Składy nie są już dostępne do podglądu.{" "}
        <Link href="/" className="font-semibold text-emerald-700 underline">
          Strona główna
        </Link>
      </p>
    );
  }

  const playersRaw = db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(matchId) as { user_id: number; first_name: string; last_name: string; zawodnik: string }[];

  const players: LineupPlayer[] = playersRaw.map((p) => {
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
    .prepare(`SELECT team, slot_index, user_id FROM match_lineup_slots WHERE match_id = ?`)
    .all(matchId) as { team: string; slot_index: number; user_id: number }[];

  const home: (number | null)[] = Array(7).fill(null);
  const away: (number | null)[] = Array(7).fill(null);
  for (const r of lineupRows) {
    if (r.slot_index < 0 || r.slot_index > 6) continue;
    if (r.team === "home") home[r.slot_index] = r.user_id;
    else if (r.team === "away") away[r.slot_index] = r.user_id;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm font-medium text-emerald-800 hover:underline">
          ← Strona główna
        </Link>
      </div>
      <MatchLineupView
        matchDate={row.match_date}
        matchTime={row.match_time}
        location={row.location}
        players={players}
        home={home}
        away={away}
      />
    </div>
  );
}
