"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerEntry } from "@/lib/terminarz-shared";
import { cn } from "@/lib/utils";

const WHEEL_COLORS = [
  "#047857",
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
] as const;

const SPIN_DURATION_MS = 4800;

type Props = {
  players: PlayerEntry[];
  captainCount: number;
  spinning: boolean;
  onSpinComplete?: (winners: PlayerEntry[]) => void;
  /** Zewnętrzne wywołanie losowania (przycisk „Zagręć”). */
  spinToken: number;
  className?: string;
};

function shortLabel(p: PlayerEntry): string {
  const nick = (p.zawodnik || "").trim();
  if (nick) return nick.length > 14 ? `${nick.slice(0, 12)}…` : nick;
  const name = `${(p.firstName || "").trim()} ${(p.lastName || "").trim()}`.trim();
  if (name) return name.length > 14 ? `${name.slice(0, 12)}…` : name;
  return p.initials || "?";
}

function pickCaptains(pool: PlayerEntry[], count: number): PlayerEntry[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function rotationForWinnerIndex(index: number, total: number, extraSpins = 6): number {
  if (total <= 0) return 0;
  const segment = 360 / total;
  const segmentCenter = index * segment + segment / 2;
  const base = 360 - segmentCenter;
  return extraSpins * 360 + base;
}

export function CaptainLotteryWheel({
  players,
  captainCount,
  spinning,
  onSpinComplete,
  spinToken,
  className,
}: Props) {
  const n = players.length;
  const segmentAngle = n > 0 ? 360 / n : 0;
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const lastSpinTokenRef = useRef(0);

  const labels = useMemo(() => players.map((p) => shortLabel(p)), [players]);

  const runSpin = useCallback(() => {
    if (n === 0 || captainCount <= 0) return;
    const winners = pickCaptains(players, captainCount);
    const firstWinner = winners[0];
    const winnerIndex = players.findIndex((p) => p.userId === firstWinner.userId);
    const targetRotation = rotationForWinnerIndex(winnerIndex >= 0 ? winnerIndex : 0, n);
    const from = rotation % 360;
    const normalizedTarget = targetRotation % 360;
    let delta = normalizedTarget - from;
    if (delta <= 0) delta += 360;
    const finalRotation = rotation + delta + 6 * 360;

    setAnimating(true);
    setRotation(finalRotation);

    window.setTimeout(() => {
      setAnimating(false);
      onSpinComplete?.(winners);
    }, SPIN_DURATION_MS);
  }, [n, captainCount, players, rotation, onSpinComplete]);

  useEffect(() => {
    if (!spinning || spinToken === 0 || spinToken === lastSpinTokenRef.current) return;
    lastSpinTokenRef.current = spinToken;
    runSpin();
  }, [spinning, spinToken, runSpin]);

  useEffect(() => {
    if (spinToken === 0) {
      lastSpinTokenRef.current = 0;
      setRotation(0);
      setAnimating(false);
    }
  }, [spinToken]);

  if (n === 0) {
    return (
      <div
        className={cn(
          "flex aspect-square max-h-72 w-full items-center justify-center rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400",
          className
        )}
      >
        Brak zapisanych zawodników na ten mecz
      </div>
    );
  }

  return (
    <div className={cn("relative mx-auto w-full max-w-[min(100%,18rem)]", className)}>
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
        aria-hidden
      >
        <div
          className="h-0 w-0 border-x-[14px] border-b-[22px] border-x-transparent border-b-[var(--mundial-gold,#f5c518)] drop-shadow-md"
        />
      </div>

      <div
        ref={wheelRef}
        className="relative aspect-square w-full rounded-full border-4 border-[var(--mundial-gold,#f5c518)] bg-zinc-900 shadow-xl shadow-emerald-950/30"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animating
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.85, 0.18, 1)`
            : "none",
        }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
          {players.map((_, i) => {
            const start = i * segmentAngle - 90;
            const end = (i + 1) * segmentAngle - 90;
            const startRad = (start * Math.PI) / 180;
            const endRad = (end * Math.PI) / 180;
            const x1 = 100 + 100 * Math.cos(startRad);
            const y1 = 100 + 100 * Math.sin(startRad);
            const x2 = 100 + 100 * Math.cos(endRad);
            const y2 = 100 + 100 * Math.sin(endRad);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
            return (
              <path
                key={players[i].userId}
                d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={color}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="0.6"
              />
            );
          })}
        </svg>

        {labels.map((label, i) => {
          const midAngle = i * segmentAngle + segmentAngle / 2 - 90;
          return (
            <div
              key={players[i].userId}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
              style={{
                transform: `rotate(${midAngle + 90}deg)`,
              }}
            >
              <span
                className="absolute left-1/2 top-[14%] max-w-[42%] truncate text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white drop-shadow-sm sm:text-[10px]"
                style={{ transform: "translateX(-50%)" }}
              >
                {label}
              </span>
            </div>
          );
        })}

        <div
          className="absolute left-1/2 top-1/2 z-10 flex h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/50 bg-emerald-950 text-[10px] font-bold uppercase tracking-wider text-[var(--mundial-gold,#f5c518)] shadow-inner sm:text-xs"
        >
          AWP
        </div>
      </div>
    </div>
  );
}
