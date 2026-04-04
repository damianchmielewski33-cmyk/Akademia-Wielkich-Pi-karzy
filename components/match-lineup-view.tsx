import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SLOT_STYLE_AWAY, SLOT_STYLE_HOME } from "@/lib/match-lineup-layout";
import { cn } from "@/lib/utils";

export type LineupPlayer = {
  userId: number;
  displayName: string;
  zawodnik: string;
  initials: string;
};

type Props = {
  matchDate: string;
  matchTime: string;
  location: string;
  players: LineupPlayer[];
  home: (number | null)[];
  away: (number | null)[];
};

function ReadOnlyChip({ player }: { player: LineupPlayer }) {
  const label = player.zawodnik || player.displayName;
  return (
    <div
      className="flex max-w-[140px] select-none items-center gap-2 rounded-lg border border-emerald-200/90 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-emerald-950 shadow-sm"
      title={`${player.displayName}${player.zawodnik ? ` (${player.zawodnik})` : ""}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[0.65rem] font-bold text-white">
        {player.initials || "?"}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function TeamHalfReadOnly({
  label,
  team,
  slots,
  slotStyles,
  playerById,
}: {
  label: string;
  team: "home" | "away";
  slots: (number | null)[];
  slotStyles: { top: string; left: string }[];
  playerById: Map<number, LineupPlayer>;
}) {
  return (
    <div className="relative h-full min-h-[140px]">
      <p
        className={cn(
          "pointer-events-none absolute left-2 z-10 rounded bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/95",
          team === "away" ? "top-2" : "bottom-2"
        )}
      >
        {label}
      </p>
      {slots.map((uid, i) => {
        const pos = slotStyles[i] ?? { top: "50%", left: "50%" };
        const p = uid != null ? playerById.get(uid) : undefined;
        return (
          <div
            key={`${team}-${i}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}
          >
            <div
              className={cn(
                "flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full border-2 border-dashed",
                p ? "border-white/50 bg-white/10" : "border-white/35 bg-black/15"
              )}
            >
              {p ? (
                <ReadOnlyChip player={p} />
              ) : (
                <span className="px-1 text-center text-[10px] font-semibold text-white/80">{i + 1}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MatchLineupView({ matchDate, matchTime, location, players, home, away }: Props) {
  const playerById = new Map<number, LineupPlayer>();
  for (const p of players) playerById.set(p.userId, p);

  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">Składy na mecz</h1>
        <p className="mt-1 text-sm text-zinc-600 sm:text-base">
          {matchDate} · {matchTime} · {location}
        </p>
      </div>

      <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Boisko (7 na drużynę)</CardTitle>
          <CardDescription>Drużyna B — góra, drużyna A — dół.</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-4">
          <div
            className="relative mx-auto aspect-[3/4] w-full max-w-lg overflow-hidden rounded-2xl border-2 border-white/40 shadow-inner"
            style={{
              background:
                "linear-gradient(180deg, #14532d 0%, #166534 18%, #15803d 50%, #166534 82%, #14532d 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            }}
          >
            <div className="pointer-events-none absolute inset-[4%] rounded-xl border border-white/35" />
            <div className="pointer-events-none absolute left-[4%] right-[4%] top-1/2 h-0 -translate-y-1/2 border-t-2 border-white/45" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
            <div className="pointer-events-none absolute bottom-[4%] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white/70" />

            <div className="absolute inset-[4%] flex flex-col">
              <div className="relative min-h-0 flex-[1_1_50%]">
                <TeamHalfReadOnly
                  label="Drużyna B"
                  team="away"
                  slots={away}
                  slotStyles={SLOT_STYLE_AWAY}
                  playerById={playerById}
                />
              </div>
              <div className="relative min-h-0 flex-[1_1_50%]">
                <TeamHalfReadOnly
                  label="Drużyna A"
                  team="home"
                  slots={home}
                  slotStyles={SLOT_STYLE_HOME}
                  playerById={playerById}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
