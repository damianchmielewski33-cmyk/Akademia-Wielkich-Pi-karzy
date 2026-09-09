import type { Metadata } from "next";
import Link from "next/link";
import { SkladyClient } from "@/components/sklady-client";
import { MatchLineupView } from "@/components/match-lineup-view";
import { getDb, type MatchRow } from "@/lib/db";
import { getMatchLineupViewData } from "@/lib/match-lineup-data";

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
  const row = await getMatchLineupViewData(db, matchId, { requirePublic: true });

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

  return (
    <MatchLineupView
      matchDate={row.matchDate}
      matchTime={row.matchTime}
      location={row.location}
      players={row.players}
      home={row.home}
      away={row.away}
    />
  );
}
