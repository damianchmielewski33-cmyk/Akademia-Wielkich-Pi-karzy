"use client";

import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { AppModal } from "@/components/ui/app-modal";
import { Badge } from "@/components/ui/badge";
import { ModalMatchSummary, modalListClass } from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";

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
          <ul className={cn(modalListClass, "max-h-[min(24rem,55vh)]")}>
            {data.players.map((p, i) => (
              <li
                key={`c-${p.userId}-${i}`}
                className={`flex flex-wrap items-center gap-2 border-b border-emerald-100/90 px-3 py-2.5 text-sm last:border-b-0 dark:border-emerald-800/50 ${
                  i % 2 === 0 ? "bg-white/60 dark:bg-zinc-900/40" : "bg-emerald-50/40 dark:bg-emerald-950/30"
                }`}
              >
                <PlayerAvatar
                  photoPath={p.profilePhotoPath}
                  firstName={p.firstName}
                  lastName={p.lastName}
                  size="sm"
                  ringClassName="ring-2 ring-emerald-200/90 dark:ring-emerald-700/80"
                />
                <div className="min-w-0 flex-1">
                  <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
                </div>
                {p.paid ? (
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100">
                    Opłacone
                  </Badge>
                ) : (
                  <Badge variant="secondary">Do zapłaty</Badge>
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
