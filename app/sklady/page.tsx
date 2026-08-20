import type { Metadata } from "next";
import Link from "next/link";
import { SkladyClient } from "@/components/sklady-client";
import { MatchLineupView, type LineupPlayer } from "@/components/match-lineup-view";
import { getAppSettings } from "@/lib/app-settings";
import { getDb, type MatchRow } from "@/lib/db";
import { pitchHalfSlotCounts, pitchSlotTotalFromSignupCount } from "@/lib/lineup-pitch-slots";

export const metadata: Metadata = {
  title: "Składy",
  description: "Publiczne ustawienia drużyn na mecze akademii.",
};

type PageProps = { searchParams: Promise<{ m?: string }> };

export default async function SkladyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const db = await getDb();

  const publicMatches = (await db
    .prepare(
      `SELECT * FROM matches WHERE lineup_public = 1
       ORDER BY match_date DESC, match_time DESC`
    )
    .all()) as MatchRow[];

  const nextUpcomingAny = (await db
    .prepare(
      `SELECT * FROM matches
       WHERE datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date ASC, match_time ASC
       LIMIT 1`
    )
    .get()) as MatchRow | undefined;

  if (publicMatches.length === 0) {
    if (nextUpcomingAny) {
      return (
        <SkladyClient
          variant="empty-pending"
          nextUpcoming={{
            match_date: nextUpcomingAny.match_date,
            match_time: nextUpcomingAny.match_time,
            location: nextUpcomingAny.location,
          }}
        />
      );
    }
    return <SkladyClient variant="empty-none" />;
  }

  const defaultUpcoming = (await db
    .prepare(
      `SELECT id FROM matches WHERE lineup_public = 1
       AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date ASC, match_time ASC
       LIMIT 1`
    )
    .get()) as { id: number } | undefined;

  const defaultLatest = (await db
    .prepare(
      `SELECT id FROM matches WHERE lineup_public = 1
       ORDER BY match_date DESC, match_time DESC
       LIMIT 1`
    )
    .get()) as { id: number };

  const parsed = sp.m ? Number.parseInt(sp.m, 10) : NaN;
  const ids = new Set(publicMatches.map((x) => x.id));
  const selectedId =
    Number.isFinite(parsed) && ids.has(parsed) ? parsed : (defaultUpcoming?.id ?? defaultLatest.id);

  const navMatches = [...publicMatches]
    .sort((a, b) => {
      const da = `${a.match_date} ${a.match_time}`;
      const db_ = `${b.match_date} ${b.match_time}`;
      return da.localeCompare(db_);
    })
    .map((m) => ({
      id: m.id,
      match_date: m.match_date,
      match_time: m.match_time,
      location: m.location,
    }));

  const selectedMatch = navMatches.find((m) => m.id === selectedId) ?? navMatches[0]!;
  const nearestId = defaultUpcoming?.id ?? null;

  return (
    <SkladyClient
      variant="list"
      navMatches={navMatches}
      selectedId={selectedId}
      nearestId={nearestId}
      selectedMatch={selectedMatch}
    >
      <SkladyContent matchId={selectedId} />
    </SkladyClient>
  );
}

async function SkladyContent({ matchId }: { matchId: number }) {
  const db = await getDb();
  const appSettings = await getAppSettings(db);
  const pitchLimits = {
    min: appSettings.lineup_pitch_slots_min,
    max: appSettings.lineup_pitch_slots_max,
  };

  const row = (await db
    .prepare(
      "SELECT id, match_date, match_time, location, lineup_public FROM matches WHERE id = ? AND lineup_public = 1"
    )
    .get(matchId)) as
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
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Ten mecz nie ma już publicznych składów.{" "}
        <Link href="/sklady" className="font-semibold text-[var(--mp-teal-dark)] underline dark:text-teal-300">
          Wróć do listy
        </Link>
      </p>
    );
  }

  const playersRaw = (await db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik,
              u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(matchId)) as {
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

  const lineupRows = (await db
    .prepare(`SELECT team, slot_index, user_id FROM match_lineup_slots WHERE match_id = ?`)
    .all(matchId)) as { team: string; slot_index: number; user_id: number }[];

  const signupCount = playersRaw.length;
  const pitchTotal = pitchSlotTotalFromSignupCount(signupCount, pitchLimits);
  const { home: homeSlots, away: awaySlots } = pitchHalfSlotCounts(pitchTotal);

  const home: (number | null)[] = Array(homeSlots).fill(null);
  const away: (number | null)[] = Array(awaySlots).fill(null);
  for (const r of lineupRows) {
    if (r.team === "home") {
      if (r.slot_index >= 0 && r.slot_index < home.length) home[r.slot_index] = r.user_id;
    } else if (r.team === "away") {
      if (r.slot_index >= 0 && r.slot_index < away.length) away[r.slot_index] = r.user_id;
    }
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
