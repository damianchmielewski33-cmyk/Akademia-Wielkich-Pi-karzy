import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getDb, type MatchRow } from "@/lib/db";
import { MatchLineupView, type LineupPlayer } from "@/components/match-lineup-view";

export const metadata: Metadata = {
  title: "Składy",
  description: "Publiczne ustawienia drużyn na mecze akademii.",
};

type PageProps = { searchParams: Promise<{ m?: string }> };

export default async function SkladyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const db = await getDb();

  const publicMatches = await db
    .prepare(
      `SELECT * FROM matches WHERE lineup_public = 1
       ORDER BY match_date DESC, match_time DESC`
    )
    .all() as MatchRow[];

  const nextUpcomingAny = await db
    .prepare(
      `SELECT * FROM matches
       WHERE datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date ASC, match_time ASC
       LIMIT 1`
    )
    .get() as MatchRow | undefined;

  if (publicMatches.length === 0) {
    if (nextUpcomingAny) {
      return (
        <div className="container mx-auto max-w-lg flex-1 px-4 py-8 sm:py-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-emerald-950">Składy jeszcze niewidoczne</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Administrator nie udostępnił jeszcze składów na najbliższy mecz. Wróć później albo sprawdź stronę główną.
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-800">
              {nextUpcomingAny.match_date} · {nextUpcomingAny.match_time}
            </p>
            <p className="text-sm text-zinc-600">{nextUpcomingAny.location}</p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline">
              Strona główna
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="container mx-auto max-w-lg flex-1 px-4 py-8 sm:py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-emerald-950">Brak publicznych składów</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Nie ma zaplanowanych meczów ani opublikowanych składów. Gdy pojawią się terminy, wróć do tej strony.
          </p>
          <Link href="/terminarz" className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline">
            Terminarz
          </Link>
        </div>
      </div>
    );
  }

  const defaultUpcoming = await db
    .prepare(
      `SELECT id FROM matches WHERE lineup_public = 1
       AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date ASC, match_time ASC
       LIMIT 1`
    )
    .get() as { id: number } | undefined;

  const defaultLatest = await db
    .prepare(
      `SELECT id FROM matches WHERE lineup_public = 1
       ORDER BY match_date DESC, match_time DESC
       LIMIT 1`
    )
    .get() as { id: number };

  const parsed = sp.m ? Number.parseInt(sp.m, 10) : NaN;
  const ids = new Set(publicMatches.map((x) => x.id));
  const selectedId =
    Number.isFinite(parsed) && ids.has(parsed) ? parsed : (defaultUpcoming?.id ?? defaultLatest.id);

  const navMatches = [...publicMatches].sort((a, b) => {
    const da = `${a.match_date} ${a.match_time}`;
    const db_ = `${b.match_date} ${b.match_time}`;
    return da.localeCompare(db_);
  });

  return (
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-sm font-medium text-emerald-800 hover:underline">
          ← Strona główna
        </Link>
        {navMatches.length > 1 && (
          <p className="text-xs text-zinc-500 sm:text-right">Wybierz mecz, żeby zobaczyć składy z archiwum.</p>
        )}
      </div>

      {navMatches.length > 1 && (
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Wybór meczu">
          {navMatches.map((m) => {
            const active = m.id === selectedId;
            return (
              <Link
                key={m.id}
                href={`/sklady?m=${m.id}`}
                scroll={false}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50/80"
                )}
              >
                {m.match_date} · {m.match_time.slice(0, 5)}
              </Link>
            );
          })}
        </nav>
      )}

      <SkladyContent matchId={selectedId} />
    </div>
  );
}

async function SkladyContent({ matchId }: { matchId: number }) {
  const db = await getDb();

  const row = await db
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
        Ten mecz nie ma już publicznych składów.{" "}
        <Link href="/sklady" className="font-semibold text-emerald-700 underline">
          Wróć do listy
        </Link>
      </p>
    );
  }

  const playersRaw = await db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik,
              u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(matchId) as {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }[];

  const players: LineupPlayer[] = playersRaw.map((p) => {
    const fn = (p.first_name || "").trim();
    const ln = (p.last_name || "").trim();
    let initials = "";
    if (fn) initials += fn[0];
    if (ln) initials += ln[0];
    return {
      userId: p.user_id,
      displayName: `${fn} ${ln}`.trim() || p.zawodnik || "Zawodnik",
      firstName: fn,
      lastName: ln,
      zawodnik: p.zawodnik || "",
      initials: initials.toUpperCase(),
      profilePhotoPath: p.profile_photo_path ?? null,
    };
  });

  const lineupRows = await db
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
    <MatchLineupView
      matchDate={row.match_date}
      matchTime={row.match_time}
      location={row.location}
      players={players}
      home={home}
      away={away}
    />
  );
}
