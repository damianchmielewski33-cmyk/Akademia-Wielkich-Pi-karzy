import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaptainLotteryPageClient } from "@/components/captain-lottery-page-client";
import { getServerSession } from "@/lib/auth";
import {
  buildCaptainLotteryEntry,
  CAPTAIN_LOTTERY_SELECT_SQL,
  type CaptainLotteryRow,
} from "@/lib/captain-lottery";
import { getDb, type MatchRow } from "@/lib/db";
import { parseRealm, realmTerminarzPath } from "@/lib/realm";
import {
  buildPlayersData,
  type SignupRow,
} from "@/lib/terminarz-shared";

type PageProps = {
  params: Promise<{ matchId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchId: raw } = await params;
  const matchId = Number.parseInt(raw, 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return { title: "Losowanie kapitanów" };
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(matchId)) as Pick<MatchRow, "match_date" | "match_time" | "location"> | undefined;

  if (!match) {
    return { title: "Losowanie kapitanów" };
  }

  return {
    title: "Losowanie kapitanów",
    description: `Koło fortuny — losowanie kapitanów na mecz ${match.match_date} ${match.match_time} (${match.location}).`,
  };
}

export default async function CaptainLotteryPage({ params }: PageProps) {
  const { matchId: raw } = await params;
  const matchId = Number.parseInt(raw, 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    notFound();
  }

  const db = await getDb();
  const session = await getServerSession();

  const match = (await db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId)) as
    | (MatchRow & { realm?: string | null })
    | undefined;
  if (!match) notFound();

  const signups = (await db
    .prepare(
      `SELECT ms.match_id, ms.paid, COALESCE(ms.commitment, 1) AS commitment,
              u.id AS user_id, u.first_name, u.last_name,
              u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
       ORDER BY u.first_name ASC`
    )
    .all(matchId)) as SignupRow[];

  const playersData = buildPlayersData([match], signups);
  const pool = playersData[matchId]?.players ?? [];

  const lotteryRows = (await db
    .prepare(`${CAPTAIN_LOTTERY_SELECT_SQL} WHERE l.match_id = ? ORDER BY l.round_number DESC`)
    .all(matchId)) as CaptainLotteryRow[];

  const history = lotteryRows.map((row) => buildCaptainLotteryEntry(row, pool));
  const initialLottery = history[0] ?? null;

  const realm = parseRealm(match.realm);
  const terminarzPath = realmTerminarzPath(realm);

  return (
    <div className="awp-page awp-page--default min-h-[50vh]">
      <CaptainLotteryPageClient
        match={match}
        playersData={playersData[matchId] ?? { players: [], tentativePlayers: [], declinedPlayers: [] }}
        initialLottery={initialLottery}
        lotteryHistory={history}
        isLoggedIn={Boolean(session)}
        isAdmin={session?.isAdmin ?? false}
        realm={realm}
        terminarzPath={terminarzPath}
      />
    </div>
  );
}
