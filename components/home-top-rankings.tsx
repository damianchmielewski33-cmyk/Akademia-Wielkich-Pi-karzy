import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { cn } from "@/lib/utils";

type Props = {
  players: HomeTopPlayer[];
  isLoggedIn: boolean;
};

function PodiumCard({ player }: { player: HomeTopPlayer }) {
  const isFirst = player.rank === 1;

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
        isFirst && "ring-2 ring-[var(--mp-teal)]/40 sm:-translate-y-2"
      )}
    >
      <span className="mx-auto mb-3 inline-flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center rounded-full bg-[var(--mp-teal)] px-2 text-xs font-extrabold tabular-nums text-white">
        #{player.rank}
      </span>
      <PlayerAvatar
        photoPath={player.profilePhotoPath}
        firstName={player.firstName}
        lastName={player.lastName}
        size={isFirst ? "lg" : "md"}
        className="mx-auto shadow-md ring-2 ring-[var(--mp-teal)]/25"
      />
      <div className="mt-3 w-full min-w-0">
        <PlayerNameStack
          firstName={player.firstName}
          lastName={player.lastName}
          nick={player.zawodnik}
          className="text-center"
          primaryClassName="font-bold text-zinc-950 dark:text-white"
          secondaryClassName="text-zinc-500"
        />
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-zinc-950 dark:text-white">
        {player.punkty.toFixed(2)}
        <span className="ml-1 text-sm font-semibold text-zinc-500">pkt</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {player.goals} goli · {player.assists} asyst
      </p>
    </article>
  );
}

export function HomeTopRankings({ players, isLoggedIn }: Props) {
  if (players.length === 0) return null;

  const ordered = players.length >= 3 ? [players[1], players[0], players[2]] : players;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Akademia</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black">
            <Trophy className="h-5 w-5 text-[var(--mp-teal)]" aria-hidden />
            Top 3 rankingu
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Najlepsi zawodnicy według punktów ze wszystkich meczów.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={isLoggedIn ? "/rankingi" : "/login?next=/rankingi"}>
            Pełne rankingi
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
      <div
        className={cn(
          "grid gap-3",
          ordered.length === 1
            ? "grid-cols-1"
            : ordered.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3 sm:items-end"
        )}
      >
        {ordered.map((player) => (
          <PodiumCard key={player.userId} player={player} />
        ))}
      </div>
    </section>
  );
}
