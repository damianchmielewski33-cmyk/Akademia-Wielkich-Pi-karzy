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

/** Sylwetka koszulki (viewBox 80×64) — inicjały na koszulce, imię i nazwisko na tabliczce pod spodem. */
const JERSEY_VB = { w: 80, h: 64 };
const JERSEY_CX = JERSEY_VB.w / 2;
const JERSEY_PATH =
  "M 22 12 Q 40 6 58 12 L 65 15 L 76 26 L 69 31 L 63 24 L 63 54 Q 40 60 17 54 L 17 24 L 11 31 L 4 26 L 15 15 Z";

const JERSEY_THEME = {
  home: {
    g0: "#10b981",
    g1: "#047857",
    accent: "rgba(255,255,255,0.28)",
    collar: "rgba(255,255,255,0.65)",
    badge: "border-emerald-400/35 bg-emerald-950/92",
    nick: "text-emerald-200/90",
  },
  away: {
    g0: "#38bdf8",
    g1: "#1d4ed8",
    accent: "rgba(255,255,255,0.26)",
    collar: "rgba(255,255,255,0.62)",
    badge: "border-sky-400/35 bg-slate-950/92",
    nick: "text-sky-200/90",
  },
} as const;

function JerseySvg({
  team,
  gradId,
  variant,
}: {
  team: "home" | "away";
  gradId: string;
  variant: "filled" | "empty";
}) {
  const theme = JERSEY_THEME[team];
  const vb = JERSEY_VB;

  return (
    <svg
      className="block size-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
      viewBox={`0 0 ${vb.w} ${vb.h}`}
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1={JERSEY_CX} y1="4" x2={JERSEY_CX} y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor={variant === "filled" ? theme.g0 : "rgba(0,0,0,0.22)"} />
          <stop offset="1" stopColor={variant === "filled" ? theme.g1 : "rgba(0,0,0,0.32)"} />
        </linearGradient>
      </defs>
      <path
        d={JERSEY_PATH}
        fill={`url(#${gradId})`}
        stroke={variant === "filled" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)"}
        strokeWidth="1.2"
        strokeDasharray={variant === "empty" ? "3 2.5" : undefined}
        strokeLinejoin="round"
      />
      {variant === "filled" ? (
        <>
          <path d="M 22 12 Q 40 6 58 12" fill="none" stroke={theme.collar} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 28 18 L 52 18" stroke={theme.accent} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M 24 22 L 24 34" stroke={theme.accent} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 56 22 L 56 34" stroke={theme.accent} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}

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
  const theme = JERSEY_THEME[team];
  const initials =
    player.initials ||
    `${fn.trim()[0] ?? ""}${ln.trim()[0] ?? ""}`.toUpperCase() ||
    "?";
  const shortLabel =
    fn && ln ? `${fn} ${ln.trim()[0]}.` : fn || ln || player.displayName;

  return (
    <button
      type="button"
      title={label}
      className="group relative mx-auto flex w-[2.25rem] max-w-[2.375rem] shrink-0 cursor-pointer touch-manipulation flex-col items-center gap-px appearance-none border-0 bg-transparent p-0 text-left transition-transform hover:z-50 hover:scale-[1.04] focus:outline-none focus-visible:z-50 focus-visible:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-1 focus-visible:ring-offset-emerald-900/50 active:scale-[0.97] xs:w-[2.625rem] xs:max-w-[2.75rem] sm:w-[4.75rem] sm:max-w-[5rem] sm:gap-0.5 sm:focus-visible:ring-offset-2"
      aria-label={`Statystyki zawodnika: ${label}`}
      onClick={() => onOpenStats(player.userId)}
    >
      {/* Większy obszar dotyku na małych ekranach (min. ~44px) */}
      <span className="absolute -inset-1.5 z-0 sm:-inset-1" aria-hidden />

      <span className="relative z-20 -mb-1.5 hidden shrink-0 sm:-mb-2 sm:block">
        <PlayerAvatar
          photoPath={player.profilePhotoPath}
          firstName={player.firstName}
          lastName={player.lastName}
          size="xs"
          ringClassName="ring-2 ring-white shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
          className="h-6 w-6 text-[9px] transition-transform group-hover:scale-105 sm:h-7 sm:w-7 sm:text-[10px]"
        />
      </span>

      <div className="relative z-10 aspect-[80/64] w-full">
        <JerseySvg team={team} gradId={gradId} variant="filled" />
        <span className="pointer-events-none absolute inset-x-0 top-[36%] text-center text-[8px] font-black tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] xs:text-[9px] sm:text-xs">
          {initials}
        </span>
      </div>

      <div
        className={cn(
          "pointer-events-none relative z-10 w-full min-w-0 rounded border px-0.5 py-px text-center shadow-[0_2px_6px_rgba(0,0,0,0.5)] backdrop-blur-sm sm:rounded-md sm:px-1 sm:py-0.5",
          theme.badge
        )}
      >
        {/* Mobile: jedna linia — imię + inicjał nazwiska */}
        <p className="truncate text-[7px] font-bold leading-tight text-white xs:text-[8px] sm:hidden">{shortLabel}</p>
        {/* Desktop: pełne imię i nazwisko */}
        <div className="hidden min-w-0 sm:block">
          {fn ? (
            <p className="truncate text-[9px] font-bold leading-tight text-white sm:text-[10px]">{fn}</p>
          ) : null}
          {ln ? (
            <p className="truncate text-[8px] font-semibold leading-tight text-zinc-100 sm:text-[9px]">{ln}</p>
          ) : null}
          {!fn && !ln ? (
            <p className="truncate text-[9px] font-bold leading-tight text-white sm:text-[10px]">{player.displayName}</p>
          ) : null}
          {player.zawodnik ? (
            <p className={cn("truncate text-[7px] font-medium leading-tight sm:text-[8px]", theme.nick)}>
              {player.zawodnik}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function EmptySlotToken({ index, team }: { index: number; team: "home" | "away" }) {
  const gradId = `jersey-empty-${team}-${index}`;
  return (
    <div className="relative mx-auto flex w-[2.25rem] max-w-[2.375rem] shrink-0 flex-col items-center gap-px opacity-85 xs:w-[2.625rem] xs:max-w-[2.75rem] sm:w-[4.75rem] sm:gap-0.5">
      <div className="aspect-[80/64] w-full">
        <JerseySvg team={team} gradId={gradId} variant="empty" />
      </div>
      <div className="w-full rounded border border-white/25 bg-black/45 px-0.5 py-px text-center sm:rounded-md sm:px-1 sm:py-0.5">
        <p className="text-[7px] font-semibold uppercase tracking-wide text-white/70 xs:text-[8px] sm:text-[9px]">Wolne</p>
        <p className="text-[9px] font-bold text-white/90 sm:text-[11px]">{index + 1}</p>
      </div>
    </div>
  );
}

function TeamHalfSlots({
  team,
  slots,
  slotStyles,
  playerById,
  onOpenStats,
  className,
}: {
  team: "home" | "away";
  slots: (number | null)[];
  slotStyles: { top: string; left: string }[];
  playerById: Map<number, LineupPlayer>;
  onOpenStats: (userId: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-0", className)}>
      {slots.map((uid, i) => {
        const pos = slotStyles[i] ?? { top: "50%", left: "50%" };
        const p = uid != null ? playerById.get(uid) : undefined;
        return (
          <div
            key={`${team}-${i}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 hover:z-40 focus-within:z-40"
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

function TeamHalfReadOnly({
  label,
  team,
  slots,
  playerById,
  onOpenStats,
}: {
  label: string;
  team: "home" | "away";
  slots: (number | null)[];
  playerById: Map<number, LineupPlayer>;
  onOpenStats: (userId: number) => void;
}) {
  const getStyles = team === "away" ? getSlotStylesAway : getSlotStylesHome;

  return (
    <div className="relative h-full min-h-[128px] xs:min-h-[140px] sm:min-h-[140px]">
      <p
        className={cn(
          "pointer-events-none absolute left-0.5 z-10 max-w-[calc(100%-4px)] truncate rounded bg-black/25 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white/95 xs:left-1 xs:px-1.5 xs:text-[9px] sm:left-2 sm:px-2 sm:text-[10px]",
          team === "away" ? "top-0.5 xs:top-1 sm:top-2" : "bottom-0.5 xs:bottom-1 sm:bottom-2"
        )}
      >
        {label}
      </p>
      {/* ≤359px — najmniejsze telefony */}
      <TeamHalfSlots
        team={team}
        slots={slots}
        slotStyles={getStyles(slots.length, "xs")}
        playerById={playerById}
        onOpenStats={onOpenStats}
        className="block xs:hidden"
      />
      {/* 360–639px */}
      <TeamHalfSlots
        team={team}
        slots={slots}
        slotStyles={getStyles(slots.length, "compact")}
        playerById={playerById}
        onOpenStats={onOpenStats}
        className="hidden xs:block sm:hidden"
      />
      {/* ≥640px */}
      <TeamHalfSlots
        team={team}
        slots={slots}
        slotStyles={getStyles(slots.length, "default")}
        playerById={playerById}
        onOpenStats={onOpenStats}
        className="hidden sm:block"
      />
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
    <div className="min-w-0 space-y-3 overflow-x-hidden sm:space-y-4">
      <div className="text-center sm:text-left">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold uppercase tracking-wide text-emerald-950 dark:text-emerald-100 xs:text-2xl sm:text-3xl">
          Ten mecz
        </h2>
        <p className="mt-1 text-xs leading-snug text-zinc-600 xs:text-sm sm:text-base">
          <span className="whitespace-nowrap">{matchDate} · {matchTime}</span>
          <span className="mx-1 hidden sm:inline">·</span>
          <span className="mt-0.5 block break-words sm:mt-0 sm:inline">{location}</span>
        </p>
      </div>

      <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="space-y-1 px-3 pb-2 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-sm leading-snug sm:text-base">
            Boisko ({home.length + away.length} pól: A {home.length} · B {away.length})
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed sm:text-sm">
            <span className="sm:hidden">B — góra, A — dół. Dotknij zawodnika po statystyki.</span>
            <span className="hidden sm:inline">
              Drużyna B — góra, drużyna A — dół. Kliknij zawodnika (koszulka lub tabliczka z imieniem), aby zobaczyć statystyki.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 px-1 pb-3 pt-0 xs:px-2 sm:px-4 sm:pb-4">
          <div
            className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,32rem)] overflow-hidden rounded-xl border-2 border-white/40 shadow-inner xs:aspect-[3/5] xs:rounded-2xl sm:aspect-[3/4]"
            style={{
              background:
                "linear-gradient(180deg, #14532d 0%, #166534 18%, #15803d 50%, #166534 82%, #14532d 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
            }}
          >
            <PitchMarkings />

            <div className="absolute inset-[3.5%] flex flex-col xs:inset-[4%] sm:inset-[3.2%]">
              <div className="relative min-h-0 flex-[1_1_50%] min-h-[120px] xs:min-h-[128px] sm:min-h-0">
                <TeamHalfReadOnly
                  label="Drużyna B"
                  team="away"
                  slots={away}
                  playerById={playerById}
                  onOpenStats={openPlayerStats}
                />
              </div>
              <div className="relative min-h-0 flex-[1_1_50%] min-h-[120px] xs:min-h-[128px] sm:min-h-0">
                <TeamHalfReadOnly
                  label="Drużyna A"
                  team="home"
                  slots={home}
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
