"use client";

import { useCallback, useState } from "react";
import { LineupPlayerStatsDialog } from "@/components/lineup-player-stats-dialog";
import { PlayerAvatar } from "@/components/player-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSlotStylesAway, getSlotStylesHome } from "@/lib/match-lineup-layout";
import { cn } from "@/lib/utils";

export type LineupPlayer = {
  userId: number;
  displayName: string;
  firstName: string;
  lastName: string;
  zawodnik: string;
  initials: string;
  profilePhotoPath: string | null;
};

type Props = {
  matchDate: string;
  matchTime: string;
  location: string;
  players: LineupPlayer[];
  home: (number | null)[];
  away: (number | null)[];
};

function PitchMarkings() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="pitchGoalNet" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
      </defs>
      {/* Linie boczne i końcowe */}
      <rect
        x="10"
        y="10"
        width="280"
        height="380"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.25"
        rx="3"
      />
      {/* Linia środkowa */}
      <line x1="10" y1="200" x2="290" y2="200" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      {/* Koło środkowe */}
      <circle cx="150" cy="200" r="36" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.75" />
      <circle cx="150" cy="200" r="2.2" fill="rgba(255,255,255,0.65)" />
      {/* Górne pole karne + małe pole bramkowe */}
      <rect
        x="65"
        y="10"
        width="170"
        height="78"
        fill="none"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="1.75"
      />
      <rect
        x="110"
        y="10"
        width="80"
        height="28"
        fill="none"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="1.5"
      />
      {/* Dolne pole karne + małe pole bramkowe */}
      <rect
        x="65"
        y="312"
        width="170"
        height="78"
        fill="none"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="1.75"
      />
      <rect
        x="110"
        y="362"
        width="80"
        height="28"
        fill="none"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="1.5"
      />
      {/* Bramka górna — słupki + poprzeczka + „siatka” */}
      <rect x="118" y="4" width="64" height="14" fill="url(#pitchGoalNet)" stroke="rgba(255,255,255,0.65)" strokeWidth="2" rx="2" />
      <line x1="122" y1="8" x2="122" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="134" y1="8" x2="134" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="146" y1="8" x2="146" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="158" y1="8" x2="158" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="170" y1="8" x2="170" y2="16" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="118" y1="11" x2="182" y2="11" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
      <line x1="118" y1="14" x2="182" y2="14" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      {/* Bramka dolna */}
      <rect x="118" y="382" width="64" height="14" fill="url(#pitchGoalNet)" stroke="rgba(255,255,255,0.65)" strokeWidth="2" rx="2" />
      <line x1="122" y1="384" x2="122" y2="392" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="134" y1="384" x2="134" y2="392" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="146" y1="384" x2="146" y2="392" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="158" y1="384" x2="158" y2="392" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="170" y1="384" x2="170" y2="392" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="118" y1="387" x2="182" y2="387" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
      <line x1="118" y1="390" x2="182" y2="390" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
    </svg>
  );
}

/** Sylwetka koszulki: szeroka, niska (viewBox 100×72) — więcej miejsca na imię i nazwisko. */
const JERSEY_VB = { w: 100, h: 72 };
const JERSEY_CX = JERSEY_VB.w / 2;
const JERSEY_PATH =
  "M 28 15 Q 50 8 72 15 L 81 19 L 96 33 L 87 39 L 79 30 L 79 63 Q 50 70 21 63 L 21 30 L 13 39 L 4 33 L 19 19 Z";

function JerseyToken({
  player,
  team,
  onOpenStats,
}: {
  player: LineupPlayer;
  team: "home" | "away";
  onOpenStats: (userId: number) => void;
}) {
  const gradId = `jersey-grad-${player.userId}-${team}`;
  const fn = player.firstName || player.displayName.split(/\s+/)[0] || "";
  const ln =
    player.lastName ||
    player.displayName
      .split(/\s+/)
      .slice(1)
      .join(" ") ||
    "";
  const label = `${player.displayName}${player.zawodnik ? ` (${player.zawodnik})` : ""}`;

  const isHome = team === "home";
  const g0 = isHome ? "#059669" : "#0ea5e9";
  const g1 = isHome ? "#065f46" : "#1d4ed8";
  const stripe = isHome ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.2)";
  const collar = isHome ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.5)";

  const vb = JERSEY_VB;

  return (
    <button
      type="button"
      className="relative mx-auto aspect-[100/72] w-[clamp(56px,17vw,108px)] max-w-[min(108px,22vw)] shrink-0 cursor-pointer appearance-none border-0 bg-transparent p-0 pt-2 text-left drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-900/40 active:scale-[0.98] sm:w-[clamp(88px,24vw,108px)] sm:max-w-[108px] sm:pt-3"
      aria-label={`Statystyki zawodnika: ${label}`}
      onClick={() => onOpenStats(player.userId)}
    >
      <span className="absolute left-1/2 top-0 z-30 -translate-x-1/2 scale-[0.92] sm:scale-100">
        <PlayerAvatar
          photoPath={player.profilePhotoPath}
          firstName={player.firstName}
          lastName={player.lastName}
          size="xs"
          ringClassName="ring-2 ring-white/90 shadow-sm"
          className="h-6 w-6 text-[9px] sm:h-7 sm:w-7 sm:text-[10px]"
        />
      </span>
      <svg
        className="block size-full"
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={gradId}
            x1={JERSEY_CX}
            y1="6"
            x2={JERSEY_CX}
            y2="68"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={g0} />
            <stop offset="1" stopColor={g1} />
          </linearGradient>
        </defs>
        <path d={JERSEY_PATH} fill={`url(#${gradId})`} stroke="rgba(255,255,255,0.85)" strokeWidth="1.15" strokeLinejoin="round" />
        <path d="M 28 15 Q 50 8 72 15" fill="none" stroke={collar} strokeWidth="1.85" strokeLinecap="round" />
        <path d={`M ${JERSEY_CX} 24 L ${JERSEY_CX} 52`} stroke={stripe} strokeWidth="5" strokeLinecap="round" />
        <path d="M 34 31 L 34 47" stroke={stripe} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <path d="M 66 31 L 66 47" stroke={stripe} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      </svg>
      <div className="pointer-events-none absolute inset-x-[12%] top-[24%] bottom-[16%] flex min-h-0 min-w-0 flex-col items-center justify-center px-1.5 text-center">
        {fn ? (
          <p className="line-clamp-2 w-full min-w-0 max-w-full break-words text-[11px] font-bold leading-tight tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] sm:text-xs">
            {fn}
          </p>
        ) : null}
        {ln ? (
          <p className="line-clamp-2 mt-px w-full min-w-0 max-w-full break-words text-[10px] font-semibold leading-tight text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] sm:text-[11px]">
            {ln}
          </p>
        ) : null}
        {!fn && !ln ? (
          <p className="line-clamp-2 w-full min-w-0 max-w-full break-words text-[10px] font-bold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] sm:text-xs">
            {player.displayName}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function EmptySlotToken({ index, team }: { index: number; team: "home" | "away" }) {
  const isHome = team === "home";
  const vb = JERSEY_VB;
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[100/72] w-[clamp(56px,17vw,108px)] max-w-[min(108px,22vw)] shrink-0 opacity-90 sm:w-[clamp(88px,24vw,108px)] sm:max-w-[108px]",
        isHome ? "text-emerald-100/90" : "text-sky-100/90"
      )}
    >
      <svg
        className="block size-full"
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        aria-hidden
      >
        <path
          d={JERSEY_PATH}
          fill="rgba(0,0,0,0.18)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.15"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-1 text-sm font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]">
        {index + 1}
      </span>
    </div>
  );
}

function TeamHalfReadOnly({
  label,
  team,
  slots,
  slotStyles,
  playerById,
  onOpenStats,
}: {
  label: string;
  team: "home" | "away";
  slots: (number | null)[];
  slotStyles: { top: string; left: string }[];
  playerById: Map<number, LineupPlayer>;
  onOpenStats: (userId: number) => void;
}) {
  return (
    <div className="relative h-full min-h-[112px] sm:min-h-[140px]">
      <p
        className={cn(
          "pointer-events-none absolute left-1 z-10 max-w-[calc(100%-8px)] truncate rounded bg-black/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/95 sm:left-2 sm:px-2 sm:text-[10px]",
          team === "away" ? "top-1 sm:top-2" : "bottom-1 sm:bottom-2"
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
            className="absolute z-20 max-w-[calc(100%+1px)] -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}
          >
            {p ? (
              <JerseyToken player={p} team={team} onOpenStats={onOpenStats} />
            ) : (
              <EmptySlotToken index={i} team={team} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MatchLineupView({ matchDate, matchTime, location, players, home, away }: Props) {
  const playerById = new Map<number, LineupPlayer>();
  for (const p of players) playerById.set(p.userId, p);

  const [statsOpen, setStatsOpen] = useState(false);
  const [statsUserId, setStatsUserId] = useState<number | null>(null);

  const openPlayerStats = useCallback((userId: number) => {
    setStatsUserId(userId);
    setStatsOpen(true);
  }, []);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-3xl">Składy na mecz</h1>
        <p className="mt-1 text-sm text-zinc-600 sm:text-base">
          {matchDate} · {matchTime} · {location}
        </p>
      </div>

      <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Boisko ({home.length + away.length} pól: A {home.length} · B {away.length})
          </CardTitle>
          <CardDescription>
            Drużyna B — góra, drużyna A — dół. Kliknij koszulkę zawodnika, aby zobaczyć statystyki.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 px-2 pb-4 sm:px-4">
          <div
            className="relative mx-auto aspect-[3/4] w-full max-w-[min(100%,32rem)] overflow-hidden rounded-2xl border-2 border-white/40 shadow-inner"
            style={{
              background:
                "linear-gradient(180deg, #14532d 0%, #166534 18%, #15803d 50%, #166534 82%, #14532d 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            }}
          >
            <PitchMarkings />

            <div className="absolute inset-[5.5%] flex flex-col sm:inset-[3.2%]">
              <div className="relative min-h-0 flex-[1_1_50%] min-h-[104px] sm:min-h-0">
                <TeamHalfReadOnly
                  label="Drużyna B"
                  team="away"
                  slots={away}
                  slotStyles={getSlotStylesAway(away.length)}
                  playerById={playerById}
                  onOpenStats={openPlayerStats}
                />
              </div>
              <div className="relative min-h-0 flex-[1_1_50%] min-h-[104px] sm:min-h-0">
                <TeamHalfReadOnly
                  label="Drużyna A"
                  team="home"
                  slots={home}
                  slotStyles={getSlotStylesHome(home.length)}
                  playerById={playerById}
                  onOpenStats={openPlayerStats}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LineupPlayerStatsDialog
        userId={statsUserId}
        open={statsOpen}
        onOpenChange={(open) => {
          setStatsOpen(open);
          if (!open) setStatsUserId(null);
        }}
      />
    </div>
  );
}
