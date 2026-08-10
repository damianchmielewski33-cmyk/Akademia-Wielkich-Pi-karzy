import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { AdminCard } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { cn } from "@/lib/utils";

type Props = {
  players: HomeTopPlayer[];
  isLoggedIn: boolean;
};

const rankStyles: Record<
  number,
  { ring: string; badge: string; tile: string; label: string }
> = {
  1: {
    ring: "ring-amber-300/80",
    badge: "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950",
    tile: "home-pitch-tile-gold border-amber-200/50 shadow-amber-950/30",
    label: "1. miejsce",
  },
  2: {
    ring: "ring-zinc-200/80",
    badge: "bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 text-zinc-800",
    tile: "home-pitch-tile border-white/35 shadow-emerald-950/20",
    label: "2. miejsce",
  },
  3: {
    ring: "ring-orange-300/70",
    badge: "bg-gradient-to-br from-orange-300 via-amber-600 to-orange-700 text-white",
    tile: "home-pitch-tile border-orange-200/40 shadow-emerald-950/20",
    label: "3. miejsce",
  },
};

function PodiumCard({ player }: { player: HomeTopPlayer }) {
  const style = rankStyles[player.rank] ?? rankStyles[3];
  const isFirst = player.rank === 1;

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-transform motion-safe:hover:-translate-y-0.5",
        style.tile,
        isFirst ? "sm:min-h-[13.5rem] sm:-translate-y-2" : "sm:min-h-[12rem]"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/45" aria-hidden />
      <div className="relative flex flex-1 flex-col items-center px-4 pb-4 pt-5 text-center sm:px-5 sm:pb-5 sm:pt-6">
        <span
          className={cn(
            "mb-3 inline-flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums shadow-md",
            style.badge
          )}
        >
          #{player.rank}
        </span>
        <PlayerAvatar
          photoPath={player.profilePhotoPath}
          firstName={player.firstName}
          lastName={player.lastName}
          size={isFirst ? "lg" : "md"}
          className={cn("shadow-lg", style.ring)}
        />
        <div className="mt-3 w-full min-w-0">
          <PlayerNameStack
            firstName={player.firstName}
            lastName={player.lastName}
            nick={player.zawodnik}
            className="text-center"
            primaryClassName="text-white font-bold"
            secondaryClassName="text-emerald-100/85"
          />
        </div>
        <p className="mt-3 text-2xl font-extrabold tabular-nums text-white drop-shadow-sm">
          {player.punkty.toFixed(2)}
          <span className="ml-1 text-sm font-semibold text-emerald-100/85">pkt</span>
        </p>
        <p className="mt-1 text-xs text-emerald-100/80">
          {player.goals} goli · {player.assists} asyst
        </p>
        <span className="sr-only">{style.label}</span>
      </div>
    </article>
  );
}

export function HomeTopRankings({ players, isLoggedIn }: Props) {
  if (players.length === 0) return null;

  const ordered =
    players.length >= 3 ? [players[1], players[0], players[2]] : players;

  return (
    <AdminCard
      className="mt-6"
      title="Top 3 rankingu"
      description="Najlepsi zawodnicy według punktów łącznie ze wszystkich meczów."
      headerExtra={
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[var(--mundial-gold)]" strokeWidth={2.25} aria-hidden />
          <Button asChild variant="gold" size="sm">
            <Link href={isLoggedIn ? "/rankingi" : "/login?next=/rankingi"}>
              Pełne rankingi
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      }
    >
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
    </AdminCard>
  );
}
