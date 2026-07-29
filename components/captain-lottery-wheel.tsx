"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerEntry } from "@/lib/terminarz-shared";
import { cn } from "@/lib/utils";

/** Paleta segmentów — murawa, złoto mundialu, odcienie zieleni. */
const SEGMENT_FILLS = [
  "#065f46",
  "#047857",
  "#0d9488",
  "#059669",
  "#b45309",
  "#047857",
  "#0f766e",
  "#ca8a04",
  "#064e3b",
  "#d97706",
] as const;

const SPIN_DURATION_MS = 4800;

type Props = {
  players: PlayerEntry[];
  spinning: boolean;
  onSpinComplete?: (winners: PlayerEntry[]) => void;
  spinToken: number;
  predeterminedWinners?: PlayerEntry[] | null;
  canSpin?: boolean;
  onSpin?: () => void;
  className?: string;
};

type WheelLabel = {
  primary: string;
  secondary?: string;
};

function truncateLabel(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function wheelLabel(player: PlayerEntry, segmentAngle: number): WheelLabel {
  const fn = (player.firstName || "").trim();
  const ln = (player.lastName || "").trim();
  const nick = (player.zawodnik || "").trim();
  const maxChars = segmentAngle >= 40 ? 14 : segmentAngle >= 28 ? 11 : segmentAngle >= 20 ? 9 : 7;

  if (fn && ln) {
    return {
      primary: truncateLabel(fn, maxChars),
      secondary: truncateLabel(ln, maxChars),
    };
  }
  if (fn) return { primary: truncateLabel(fn, maxChars + 2) };
  if (ln) return { primary: truncateLabel(ln, maxChars + 2) };
  if (nick) return { primary: truncateLabel(nick, maxChars + 2) };
  return { primary: player.initials || "?" };
}

function labelFontSize(count: number): number {
  if (count <= 4) return 13;
  if (count <= 6) return 11.5;
  if (count <= 8) return 10;
  if (count <= 10) return 8.8;
  if (count <= 14) return 7.6;
  if (count <= 18) return 6.8;
  return 6;
}

function labelRadius(count: number): number {
  if (count <= 6) return 64;
  if (count <= 10) return 67;
  if (count <= 14) return 69;
  return 71;
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
  spinning,
  onSpinComplete,
  spinToken,
  predeterminedWinners,
  canSpin = false,
  onSpin,
  className,
}: Props) {
  const n = players.length;
  const segmentAngle = n > 0 ? 360 / n : 0;
  const spinLayerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const lastSpinTokenRef = useRef(0);

  const fontSize = labelFontSize(n);
  const labelR = labelRadius(n);
  const lineGap = fontSize * 1.15;

  const labels = useMemo(
    () => players.map((p) => wheelLabel(p, segmentAngle)),
    [players, segmentAngle]
  );

  const runSpin = useCallback(() => {
    const winners = predeterminedWinners ?? [];
    if (n === 0 || winners.length === 0) return;
    const firstWinner = winners[0];
    const winnerIndex = players.findIndex((p) => p.userId === firstWinner.userId);
    const targetRotation = rotationForWinnerIndex(winnerIndex >= 0 ? winnerIndex : 0, n);
    const from = rotationRef.current % 360;
    const normalizedTarget = targetRotation % 360;
    let delta = normalizedTarget - from;
    if (delta <= 0) delta += 360;
    const finalRotation = rotationRef.current + delta + 6 * 360;

    rotationRef.current = finalRotation;
    setAnimating(true);
    setRotation(finalRotation);

    window.setTimeout(() => {
      setAnimating(false);
      onSpinComplete?.(winners);
    }, SPIN_DURATION_MS);
  }, [n, players, onSpinComplete, predeterminedWinners]);

  useEffect(() => {
    if (!spinning || spinToken === 0 || spinToken === lastSpinTokenRef.current) return;
    if (!predeterminedWinners?.length) return;
    lastSpinTokenRef.current = spinToken;
    runSpin();
  }, [spinning, spinToken, runSpin, predeterminedWinners]);

  useEffect(() => {
    if (spinToken === 0) {
      lastSpinTokenRef.current = 0;
      rotationRef.current = 0;
      setRotation(0);
      setAnimating(false);
    }
  }, [spinToken]);

  const isActive = animating || spinning;

  if (n === 0) {
    return (
      <div
        className={cn(
          "flex aspect-square w-full max-w-[min(100%,clamp(18rem,80vw,32rem))] items-center justify-center rounded-2xl border border-dashed border-emerald-700/40 bg-emerald-950/30 px-6 text-center text-sm text-emerald-100/80",
          className
        )}
      >
        Brak graczy biorących udział w meczu
      </div>
    );
  }

  const twoLineOffset = labels.some((l) => l.secondary) ? lineGap / 2 : 0;

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[min(100%,clamp(18rem,80vw,32rem))] shrink-0",
        className
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-emerald-700/35 bg-gradient-to-b from-emerald-950 via-[#0a3d32] to-emerald-950 px-3 pb-4 pt-6 shadow-inner shadow-emerald-950/50 sm:px-5 sm:pb-5 sm:pt-7 md:px-6",
          isActive && "ring-2 ring-[var(--mundial-gold,#f5c518)]/40 ring-offset-2 ring-offset-emerald-950"
        )}
      >
        <div className="home-pitch-tile pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--mundial-gold,#f5c518)]/70 to-transparent"
          aria-hidden
        />

        <p className="relative z-10 mb-3 text-center text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--mundial-gold,#f5c518)] sm:mb-4 sm:text-xs">
          Koło fortuny
        </p>

        <div className="relative z-10 mx-auto w-full">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-0.5 sm:-translate-y-1"
            aria-hidden
          >
            <div className="flex flex-col items-center">
              <div
                className="h-0 w-0 border-x-[12px] border-b-[20px] border-x-transparent border-b-[var(--mundial-gold,#f5c518)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] sm:border-x-[15px] sm:border-b-[24px]"
              />
              <div className="h-2 w-2 rounded-full bg-[var(--mundial-gold,#f5c518)] shadow-[0_0_8px_rgba(245,197,24,0.8)] sm:h-2.5 sm:w-2.5" />
            </div>
          </div>

          <div
            className="relative mx-auto aspect-square w-full overflow-hidden rounded-full p-[4px] shadow-[0_0_0_2px_rgba(245,197,24,0.35),0_12px_40px_rgba(0,0,0,0.45)] sm:p-[5px]"
            style={{ contain: "layout paint size" }}
          >
            <div className="absolute inset-[4px] rounded-full bg-emerald-950/80 sm:inset-[5px]" aria-hidden />

            <div
              ref={spinLayerRef}
              className="relative h-full w-full origin-center rounded-full will-change-transform"
              style={{
                transform: `rotate3d(0, 0, 1, ${rotation}deg)`,
                transition: animating
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.85, 0.18, 1)`
                  : "none",
                backfaceVisibility: "hidden",
              }}
            >
              <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
                <circle cx="100" cy="100" r="99" fill="#022c22" />
                <circle
                  cx="100"
                  cy="100"
                  r="98"
                  fill="none"
                  stroke="rgba(245,197,24,0.25)"
                  strokeWidth="1.5"
                />

                {players.map((_, i) => {
                  const start = i * segmentAngle - 90;
                  const end = (i + 1) * segmentAngle - 90;
                  const startRad = (start * Math.PI) / 180;
                  const endRad = (end * Math.PI) / 180;
                  const x1 = 100 + 98 * Math.cos(startRad);
                  const y1 = 100 + 98 * Math.sin(startRad);
                  const x2 = 100 + 98 * Math.cos(endRad);
                  const y2 = 100 + 98 * Math.sin(endRad);
                  const largeArc = segmentAngle > 180 ? 1 : 0;
                  const color = SEGMENT_FILLS[i % SEGMENT_FILLS.length];
                  return (
                    <path
                      key={players[i].userId}
                      d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={color}
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1"
                    />
                  );
                })}

                {labels.map((label, i) => {
                  const midAngle = i * segmentAngle + segmentAngle / 2 - 90;
                  const textRotation = midAngle + 90;
                  const dyPrimary = label.secondary ? -twoLineOffset : 0;

                  return (
                    <text
                      key={players[i].userId}
                      x="100"
                      y="100"
                      transform={`rotate(${textRotation} 100 100) translate(0 -${labelR})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      stroke="#022c22"
                      strokeWidth="0.7"
                      strokeLinejoin="round"
                      paintOrder="stroke fill"
                      fontSize={fontSize}
                      fontWeight={800}
                      style={{ fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}
                    >
                      <tspan x="0" dy={dyPrimary}>{label.primary}</tspan>
                      {label.secondary ? (
                        <tspan x="0" dy={lineGap}>{label.secondary}</tspan>
                      ) : null}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div
              className="absolute left-1/2 top-1/2 z-20 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            >
              {canSpin || spinning ? (
                <button
                  type="button"
                  disabled={!canSpin || spinning}
                  onClick={() => onSpin?.()}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-[var(--mundial-gold,#f5c518)] bg-gradient-to-br from-[var(--mundial-gold,#f5c518)] to-amber-500 text-emerald-950 shadow-[0_4px_14px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform",
                    canSpin && !spinning && "hover:scale-[1.04] active:scale-[0.97]",
                    spinning && "cursor-wait opacity-95"
                  )}
                  aria-label={spinning ? "Kręcimy koło fortuny" : "Zakręć koło fortuny — losuj kapitana"}
                >
                  {spinning ? (
                    <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" aria-hidden />
                  ) : (
                    <>
                      <span className="text-xs font-extrabold uppercase leading-none tracking-[0.12em] sm:text-sm">
                        Losuj
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.08em] opacity-90 sm:text-[10px]">
                        kapitana
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full border-2 border-[var(--mundial-gold,#f5c518)]/80 bg-gradient-to-br from-emerald-900 to-emerald-950 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_0_12px_rgba(245,197,24,0.25)]"
                  aria-hidden
                >
                  <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--mundial-gold,#f5c518)] sm:text-sm">
                    AWP
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="relative z-10 mt-3 text-center text-xs text-emerald-100/75 sm:mt-4 sm:text-sm">
          {n} graczów w puli losowania
        </p>
      </div>
    </div>
  );
}
