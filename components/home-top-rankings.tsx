"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { PhotoPanel } from "@/components/photo-panel";
import { useSiteMode } from "@/components/site-mode";
import { Button } from "@/components/ui/button";
import { PitchCard } from "@/components/ui/pitch-card";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { pitchPhotoAt } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

type Props = {
  players: HomeTopPlayer[];
  isLoggedIn: boolean;
  photoPool?: string[];
};

function photoAt(pool: string[] | undefined, index: number) {
  if (pool && pool.length > 0) return pool[index % pool.length] ?? pitchPhotoAt(index);
  return pitchPhotoAt(index);
}

function PodiumCard({
  player,
  photoSrc,
  stadium,
}: {
  player: HomeTopPlayer;
  photoSrc?: string;
  stadium?: boolean;
}) {
  const isFirst = player.rank === 1;
  const onPitch = Boolean(photoSrc) || stadium;

  const body = (
    <>
      <span
        className={cn(
          "mx-auto mb-3 inline-flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums",
          onPitch ? "bg-[var(--mundial-gold,#f5c518)] text-zinc-950" : "bg-[var(--mp-teal)] text-white"
        )}
      >
        #{player.rank}
      </span>
      <PlayerAvatar
        photoPath={player.profilePhotoPath}
        firstName={player.firstName}
        lastName={player.lastName}
        size={isFirst ? "lg" : "md"}
        className="mx-auto shadow-md"
        ringClassName={onPitch ? "ring-2 ring-white/60" : "ring-2 ring-[var(--mp-teal)]/25"}
      />
      <div className="mt-3 w-full min-w-0">
        <PlayerNameStack
          firstName={player.firstName}
          lastName={player.lastName}
          nick={player.zawodnik}
          className="text-center"
          primaryClassName={onPitch ? "font-bold text-white drop-shadow-sm" : "font-bold text-zinc-950 dark:text-white"}
          secondaryClassName={onPitch ? "text-white/75" : "text-zinc-500"}
        />
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-extrabold tabular-nums",
          onPitch ? "text-white drop-shadow-sm" : "text-zinc-950 dark:text-white"
        )}
      >
        {player.punkty.toFixed(2)}
        <span className={cn("ml-1 text-sm font-semibold", onPitch ? "text-white/75" : "text-zinc-500")}>pkt</span>
      </p>
      <p className={cn("mt-1 text-xs", onPitch ? "text-white/80" : "text-zinc-500")}>
        {player.goals} goli · {player.assists} asyst
      </p>
    </>
  );

  if (photoSrc) {
    return (
      <PhotoPanel
        src={photoSrc}
        className={cn("min-h-[16rem]", isFirst && "sm:-translate-y-2")}
        contentClassName="flex min-h-[16rem] flex-col items-center justify-end p-5 text-center"
        overlayClassName="bg-gradient-to-t from-black/80 via-black/40 to-black/15"
        sizes="(max-width: 640px) 100vw, 360px"
      >
        {body}
      </PhotoPanel>
    );
  }

  if (stadium) {
    return (
      <PitchCard
        variant="pitch"
        className={cn("min-h-[16rem]", isFirst && "sm:-translate-y-2")}
        contentClassName="flex min-h-[16rem] flex-col items-center justify-end p-5 text-center"
      >
        {body}
      </PitchCard>
    );
  }

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
        isFirst && "ring-2 ring-[var(--mp-teal)]/40 sm:-translate-y-2"
      )}
    >
      {body}
    </article>
  );
}

export function HomeTopRankings({ players, isLoggedIn, photoPool }: Props) {
  const { marketplaceEnabled } = useSiteMode();
  if (players.length === 0) return null;

  const ordered = players.length >= 3 ? [players[1], players[0], players[2]] : players;
  const withPhotos = Boolean(marketplaceEnabled && photoPool && photoPool.length > 0);
  const stadium = !marketplaceEnabled;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
        <div>
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-[0.16em]",
              stadium ? "text-[var(--mundial-gold)]" : "text-[var(--mp-teal-dark)]"
            )}
          >
            Rankingi
          </p>
          <h2
            className={cn(
              "mt-1 text-xl font-black tracking-tight sm:text-3xl",
              stadium && "text-white drop-shadow-sm"
            )}
          >
            Top 3
          </h2>
          <p className={cn("mt-1 hidden text-sm sm:block", stadium ? "text-white/80" : "text-zinc-500")}>
            Najlepsi zawodnicy według punktów ze wszystkich meczów.
          </p>
        </div>
        <Button asChild variant={stadium ? "pitch" : "outline"} className="hidden md:inline-flex">
          <Link href={isLoggedIn ? "/rankingi" : "/login?next=/rankingi"}>
            Pełne rankingi
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white md:hidden dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {[...players]
          .sort((a, b) => a.rank - b.rank)
          .map((player) => (
            <li key={player.userId} className="flex items-center gap-3 px-3 py-3">
              <span
                className={cn(
                  "w-8 shrink-0 text-sm font-black tabular-nums",
                  stadium ? "text-[var(--mundial-gold)]" : "text-[var(--mp-teal-dark)]"
                )}
              >
                #{player.rank}
              </span>
              <PlayerAvatar
                photoPath={player.profilePhotoPath}
                firstName={player.firstName}
                lastName={player.lastName}
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <PlayerNameStack
                  firstName={player.firstName}
                  lastName={player.lastName}
                  nick={player.zawodnik}
                  primaryClassName="truncate text-sm font-bold text-zinc-950 dark:text-white"
                  secondaryClassName="truncate text-xs text-zinc-500"
                />
              </div>
              <p className="shrink-0 text-sm font-extrabold tabular-nums text-zinc-950 dark:text-white">
                {player.punkty.toFixed(2)}
                <span className="ml-1 text-xs font-semibold text-zinc-400">pkt</span>
              </p>
            </li>
          ))}
        <li>
          <Link
            href={isLoggedIn ? "/rankingi" : "/login?next=/rankingi"}
            className="flex items-center justify-between px-3 py-3 text-sm font-semibold text-[var(--mp-teal-dark)]"
          >
            Pełne rankingi
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </li>
      </ul>
      <div
        className={cn(
          "hidden gap-3 md:grid",
          ordered.length === 1
            ? "grid-cols-1"
            : ordered.length === 2
              ? "grid-cols-2"
              : "grid-cols-3 items-end"
        )}
      >
        {ordered.map((player, i) => (
          <PodiumCard
            key={player.userId}
            player={player}
            stadium={stadium}
            photoSrc={withPhotos ? photoAt(photoPool, i + 12) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
