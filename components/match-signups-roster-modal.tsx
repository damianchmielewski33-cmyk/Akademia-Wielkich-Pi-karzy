"use client";

import { Users } from "lucide-react";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { AppModal } from "@/components/ui/app-modal";
import { Badge } from "@/components/ui/badge";
import { ModalMatchSummary, modalListClass } from "@/components/ui/modal-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow | null;
  matchId: number;
  playersData: Record<number, PlayersDataEntry>;
};

export function MatchSignupsRosterModal({ open, onOpenChange, match, matchId, playersData }: Props) {
  const data = playersData[matchId];

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      scrollable
      title={data ? `Zapisani – ${data.date} ${data.time}` : "Zapisani na mecz"}
      headerKicker="Terminarz"
      headerPhotoSeed={matchId}
      icon={<Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
      contentClassName="space-y-3"
    >
      {match && data ? (
        <>
          <ModalMatchSummary match={match} />
          <div>
            <MatchSignupCountsBlock
              matchId={matchId}
              signedUp={match.signed_up}
              maxSlots={match.max_slots}
              playersData={playersData}
            />
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              «Jeszcze nie wiem» i «nie biorę udziału» nie zajmują miejsca w składzie.
            </p>
          </div>
          <ul className={modalListClass}>
            {data.players.map((p, i) => (
              <li
                key={`c-${p.userId}-${i}`}
                className={`flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 ${
                  p.paid
                    ? "border-l-4 border-l-green-600 border-b-green-200/80 bg-green-100/90 dark:border-l-green-500 dark:border-b-green-800/50 dark:bg-green-950/45"
                    : "border-l-4 border-l-red-600 border-b-red-200/80 bg-red-100/90 dark:border-l-red-500 dark:border-b-red-800/50 dark:bg-red-950/45"
                }`}
              >
                <PlayerAvatar
                  photoPath={p.profilePhotoPath}
                  firstName={p.firstName}
                  lastName={p.lastName}
                  size="sm"
                  ringClassName={
                    p.paid
                      ? "ring-2 ring-green-600 dark:ring-green-500"
                      : "ring-2 ring-red-600 dark:ring-red-500"
                  }
                />
                <div className="min-w-0 flex-1">
                  <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
                </div>
                {p.paid ? (
                  <Badge className="border-green-700 bg-green-600 text-white shadow-sm dark:border-green-500 dark:bg-green-500 dark:text-green-950">
                    Opłacone
                  </Badge>
                ) : (
                  <Badge className="border-red-700 bg-red-600 text-white shadow-sm dark:border-red-500 dark:bg-red-500 dark:text-red-950">
                    Nieopłacone
                  </Badge>
                )}
              </li>
            ))}
            {data.tentativePlayers.map((p, i) => (
              <li
                key={`t-${p.userId}-${i}`}
                className={`flex flex-wrap items-center gap-2 border-b border-amber-200/80 px-3 py-2.5 text-sm last:border-b-0 dark:border-amber-800/45 ${
                  i % 2 === 0 ? "bg-amber-50/55 dark:bg-amber-950/30" : "bg-amber-100/40 dark:bg-amber-950/40"
                }`}
              >
                <PlayerAvatar
                  photoPath={p.profilePhotoPath}
                  firstName={p.firstName}
                  lastName={p.lastName}
                  size="sm"
                  ringClassName="ring-2 ring-amber-200/90 dark:ring-amber-700/70"
                />
                <div className="min-w-0 flex-1">
                  <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-400 bg-amber-100/90 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100"
                >
                  Jeszcze nie wiem
                </Badge>
              </li>
            ))}
            {data.declinedPlayers.map((p, i) => (
              <li
                key={`d-${p.userId}-${i}`}
                className={`flex flex-wrap items-center gap-2 border-b border-red-200/70 px-3 py-2.5 text-sm last:border-b-0 dark:border-red-900/45 ${
                  i % 2 === 0 ? "bg-red-50/60 dark:bg-red-950/25" : "bg-red-100/35 dark:bg-red-950/35"
                }`}
              >
                <PlayerAvatar
                  photoPath={p.profilePhotoPath}
                  firstName={p.firstName}
                  lastName={p.lastName}
                  size="sm"
                  ringClassName="ring-2 ring-red-200/90 dark:ring-red-800/70"
                />
                <div className="min-w-0 flex-1">
                  <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
                </div>
                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
                  Nie bierze udziału
                </Badge>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </AppModal>
  );
}
