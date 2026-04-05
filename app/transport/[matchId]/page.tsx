import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TransportMatchClient } from "@/components/transport-match-client";
import type { TransportMessageDTO } from "@/components/transport-chat-client";
import { getServerSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import {
  isTransportChatEligible,
  type SignupTransportRow,
  type TransportParticipantDTO,
} from "@/lib/transport";

export const metadata: Metadata = {
  title: "Transport na mecz",
  description: "Koordynacja dojazdu i czat dla zawodników.",
};

export default async function TransportPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId: raw } = await params;
  const matchId = Number(raw);
  if (!Number.isFinite(matchId)) redirect("/");

  const session = await getServerSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/transport/${matchId}`)}`);
  }

  const db = getDb();
  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId) as MatchRow | undefined;
  if (!match) redirect("/");

  const signupRow = db
    .prepare(
      `SELECT drives_car, can_take_passengers, needs_transport FROM match_signups WHERE user_id = ? AND match_id = ?`
    )
    .get(session.userId, matchId) as SignupTransportRow | undefined;

  if (!signupRow) {
    return (
      <div className="container mx-auto max-w-lg flex-1 px-4 py-16 text-center">
        <p className="text-zinc-700">Nie jesteś zapisany na ten mecz.</p>
        <Link href="/terminarz" className="mt-4 inline-block font-medium text-emerald-700 underline">
          Przejdź do terminarza
        </Link>
      </div>
    );
  }

  const eligible = isTransportChatEligible(signupRow);

  const mapParticipant = (r: {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }): TransportParticipantDTO => ({
    userId: r.user_id,
    firstName: r.first_name,
    lastName: r.last_name,
    zawodnik: r.zawodnik,
    profilePhotoPath: r.profile_photo_path,
  });

  const driverRows = db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
         AND ms.drives_car = 1 AND ms.can_take_passengers = 1
       ORDER BY u.first_name COLLATE NOCASE, u.last_name COLLATE NOCASE`
    )
    .all(matchId) as {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }[];

  const riderRows = db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
         AND ms.drives_car = 0 AND ms.needs_transport = 1
       ORDER BY u.first_name COLLATE NOCASE, u.last_name COLLATE NOCASE`
    )
    .all(matchId) as {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }[];

  const driversOffering = driverRows.map(mapParticipant);
  const ridersNeeding = riderRows.map(mapParticipant);

  let initialMessages: TransportMessageDTO[] = [];
  if (eligible && match.played === 0) {
    const rows = db
      .prepare(
        `SELECT m.id, m.body, m.created_at, m.user_id,
                u.first_name AS first_name, u.last_name AS last_name, u.player_alias AS zawodnik
         FROM match_transport_messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.match_id = ?
         ORDER BY m.created_at ASC`
      )
      .all(matchId) as {
      id: number;
      body: string;
      created_at: string;
      user_id: number;
      first_name: string;
      last_name: string;
      zawodnik: string;
    }[];
    initialMessages = rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      zawodnik: r.zawodnik,
    }));
  }

  return (
    <TransportMatchClient
      matchId={matchId}
      matchDate={match.match_date}
      matchTime={match.match_time}
      location={match.location}
      played={match.played === 1}
      eligible={eligible}
      signup={signupRow}
      initialMessages={initialMessages}
      currentUserId={session.userId}
      canEditTransport={match.played === 0}
      driversOffering={driversOffering}
      ridersNeeding={ridersNeeding}
    />
  );
}
