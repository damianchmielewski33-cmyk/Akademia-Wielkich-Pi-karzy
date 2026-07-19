import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InviteMatchClient } from "@/components/invite-match-client";
import { getServerSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import {
  buildPlayersData,
  userSignupKindMap,
  type SignupRow,
} from "@/lib/terminarz-shared";

type PageProps = {
  params: Promise<{ matchId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchId: raw } = await params;
  const matchId = Number.parseInt(raw, 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return { title: "Zaproszenie na mecz" };
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(matchId)) as Pick<MatchRow, "match_date" | "match_time" | "location"> | undefined;

  if (!match) {
    return { title: "Zaproszenie na mecz" };
  }

  return {
    title: "Zaproszenie na mecz",
    description: `Mecz ${match.match_date} ${match.match_time} — ${match.location}. Zapisz się w Akademii Wielkich Piłkarzy.`,
  };
}

export default async function ZaproszeniePage({ params }: PageProps) {
  const { matchId: raw } = await params;
  const matchId = Number.parseInt(raw, 10);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    notFound();
  }

  const db = await getDb();
  const session = await getServerSession();

  const match = (await db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId)) as MatchRow | undefined;

  const signups = match
    ? ((await db
        .prepare(
          `SELECT ms.match_id, ms.paid, COALESCE(ms.commitment, 1) AS commitment,
                  u.id AS user_id, u.first_name, u.last_name,
                  u.player_alias AS zawodnik, u.profile_photo_path
           FROM match_signups ms
           JOIN users u ON u.id = ms.user_id
           WHERE ms.match_id = ?
           ORDER BY u.first_name ASC`
        )
        .all(matchId)) as SignupRow[])
    : [];

  const playersData = match ? buildPlayersData([match], signups) : {};
  const userSignupKind = userSignupKindMap(signups, session?.zawodnik);

  const matchForClient =
    match && userSignupKind[matchId] === "confirmed"
      ? match
      : match
        ? { ...match, gate_pin: null }
        : null;

  return (
    <div className="awp-page awp-page--default">
      <InviteMatchClient
        matchId={matchId}
        match={matchForClient ?? null}
        playersData={playersData}
        isLoggedIn={Boolean(session)}
        userSignupKind={userSignupKind}
      />
    </div>
  );
}
