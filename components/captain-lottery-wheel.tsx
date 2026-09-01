"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown } from "lucide-react";
import type { PlayerEntry } from "@/lib/terminarz-shared";
import { modalPanelClass } from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";

const SEGMENT_FILLS = [
  "#0f766e",
  "#00C9B1",
  "#115e59",
  "#14b8a6",
  "#042f2e",
  "#2dd4bf",
  "#0d9488",
  "#5eead4",
  "#134e4a",
  "#99f6e4",
] as const;

const SPIN_DURATION_MS = 4200;
const EXTRA_SPINS = 5;
const SPIN_EASE = "cubic-bezier(0.12, 0.78, 0.08, 1)";

type Props = {
  players: PlayerEntry[];
  spinning: boolean;
  awaitingDraw?: boolean;
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

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

function rotationForWinnerIndex(index: number, total: number, extraSpins: number): number {
  if (total <= 0) return 0;
  const segment = 360 / total;
  const segmentCenter = index * segment + segment / 2;
  return extraSpins * 360 + (360 - segmentCenter);
}

function playerCaption(p: PlayerEntry): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return name || p.zawodnik || "Kapitan";
}

export function CaptainLotteryWheel({
  players,
  spinning,
  awaitingDraw = false,
  onSpinComplete,
  spinToken,
  predeterminedWinners,
  canSpin = false,
  onSpin,
  className,
}: Props) {
  const n = players.length;
  const segmentAngle = n > 0 ? 360 / n : 0;
  const rotationRef = useRef(0);
  const timeoutRef = useRef<number | undefined>(undefined);
  const lastSpinTokenRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [spinMs, setSpinMs] = useState(SPIN_DURATION_MS);
  const [landedWinners, setLandedWinners] = useState<PlayerEntry[] | null>(null);

  const fontSize = labelFontSize(n);
  const labelR = labelRadius(n);
  const lineGap = fontSize * 1.15;
  const segmentFills = SEGMENT_FILLS;
  const pointerColor = "var(--mp-teal)";
  const hubFill = "#0f766e";
  const accent = "#00C9B1";

  const labels = useMemo(
    () => players.map((p) => wheelLabel(p, segmentAngle)),
    [players, segmentAngle]
  );

  const winnerIds = useMemo(
    () => new Set((landedWinners ?? []).map((p) => p.userId)),
    [landedWinners]
  );

  const runSpin = useCallback(() => {
    const winners = predeterminedWinners ?? [];
    if (n === 0 || winners.length === 0) return;
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);

    const reduced = prefersReducedMotion();
    const extra = reduced ? 0 : EXTRA_SPINS;
    const duration = reduced ? 280 : SPIN_DURATION_MS;
    const firstWinner = winners[0];
    const winnerIndex = players.findIndex((p) => p.userId === firstWinner.userId);
    const targetRotation = rotationForWinnerIndex(winnerIndex >= 0 ? winnerIndex : 0, n, extra);
    const from = ((rotationRef.current % 360) + 360) % 360;
    const normalizedTarget = ((targetRotation % 360) + 360) % 360;
    let delta = normalizedTarget - from;
    if (delta <= 0) delta += 360;
    const finalRotation = rotationRef.current + delta + extra * 360;

    rotationRef.current = finalRotation;
    setLandedWinners(null);
    setSpinMs(duration);
    setAnimating(true);
    setRotation(finalRotation);

    timeoutRef.current = window.setTimeout(() => {
      setAnimating(false);
      setLandedWinners(winners);
      onSpinComplete?.(winners);
    }, duration);
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
      setLandedWinners(null);
    }
  }, [spinToken]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const isSpinningWheel = animating;
  const isBusy = awaitingDraw || spinning || animating;

  if (n === 0) {
    return (
      <div
        className={cn(
          modalPanelClass,
          "flex aspect-square w-full max-w-[min(100%,clamp(18rem,82vw,34rem))] items-center justify-center px-6 text-center text-sm text-zinc-600 dark:text-zinc-400",
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
        "relative mx-auto w-full max-w-[min(100%,clamp(18rem,82vw,34rem))] shrink-0",
        className
      )}
    >
      <div
        className={cn(
          modalPanelClass,
          "relative overflow-hidden px-3 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6",
          isSpinningWheel &&
            "ring-2 ring-[var(--mp-teal)]/35 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
        )}
        style={{ ["--awp-lottery-accent" as string]: accent }}
      >
        <p
          className="relative z-10 mb-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)] dark:text-teal-300 sm:mb-4"
        >
          {awaitingDraw ? "Losujemy…" : isSpinningWheel ? "Koło się kręci" : landedWinners ? "Wylosowano" : "Koło fortuny"}
        </p>

        <div className="relative z-10 mx-auto w-full">
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-0.5 sm:-translate-y-1",
              landedWinners && !isSpinningWheel && "awp-lottery-pointer--land"
            )}
            aria-hidden
          >
            <div className="flex flex-col items-center">
              <div
                className="h-0 w-0 border-x-[13px] border-b-[22px] border-x-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] sm:border-x-[16px] sm:border-b-[26px]"
                style={{ borderBottomColor: pointerColor }}
              />
              <div
                className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                style={{ backgroundColor: pointerColor, boxShadow: `0 0 8px ${pointerColor}` }}
              />
            </div>
          </div>

          <div
            className="relative mx-auto aspect-square w-full overflow-hidden rounded-full border border-zinc-200/90 bg-white p-[5px] shadow-[0_12px_40px_-18px_rgba(15,23,42,0.45)] dark:border-zinc-600 dark:bg-zinc-900 sm:p-[6px]"
          >
            <div
              className="relative h-full w-full origin-center rounded-full"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: animating ? `transform ${spinMs}ms ${SPIN_EASE}` : "none",
                willChange: animating ? "transform" : "auto",
              }}
            >
              <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
                <circle cx="100" cy="100" r="99" fill={hubFill} />
                {players.map((player, i) => {
                  const start = i * segmentAngle - 90;
                  const end = (i + 1) * segmentAngle - 90;
                  const startRad = (start * Math.PI) / 180;
                  const endRad = (end * Math.PI) / 180;
                  const x1 = 100 + 98 * Math.cos(startRad);
                  const y1 = 100 + 98 * Math.sin(startRad);
                  const x2 = 100 + 98 * Math.cos(endRad);
                  const y2 = 100 + 98 * Math.sin(endRad);
                  const largeArc = segmentAngle > 180 ? 1 : 0;
                  const isWinner = winnerIds.has(player.userId);
                  const dimOthers = Boolean(landedWinners && !isSpinningWheel);
                  return (
                    <path
                      key={player.userId}
                      d={`M 100 100 L ${x1} ${y1} A 98 98 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segmentFills[i % segmentFills.length]}
                      fillOpacity={dimOthers && !isWinner ? 0.38 : 1}
                      stroke={isWinner && dimOthers ? pointerColor : "rgba(255,255,255,0.5)"}
                      strokeWidth={isWinner && dimOthers ? 2.2 : 1}
                    />
                  );
                })}

                {labels.map((label, i) => {
                  const midAngle = i * segmentAngle + segmentAngle / 2 - 90;
                  const textRotation = midAngle + 90;
                  const dyPrimary = label.secondary ? -twoLineOffset : 0;
                  const isWinner = winnerIds.has(players[i].userId);
                  const dimOthers = Boolean(landedWinners && !isSpinningWheel);
                  return (
                    <text
                      key={players[i].userId}
                      x="100"
                      y="100"
                      transform={`rotate(${textRotation} 100 100) translate(0 -${labelR})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fillOpacity={dimOthers && !isWinner ? 0.45 : 1}
                      fontSize={fontSize}
                      fontWeight={800}
                      style={{
                        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
                        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.55))",
                      }}
                    >
                      <tspan x="0" dy={dyPrimary}>
                        {label.primary}
                      </tspan>
                      {label.secondary ? (
                        <tspan x="0" dy={lineGap}>
                          {label.secondary}
                        </tspan>
                      ) : null}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="absolute left-1/2 top-1/2 z-20 flex h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              {canSpin || isBusy ? (
                <button
                  type="button"
                  disabled={!canSpin || isBusy}
                  onClick={() => onSpin?.()}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-teal-700/20 bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/25 transition-[transform,background-color] duration-200 dark:border-teal-400/25",
                    canSpin && !isBusy && "awp-lottery-hub--ready hover:scale-[1.03] active:scale-[0.97]",
                    isBusy && "cursor-wait"
                  )}
                  aria-label={
                    awaitingDraw
                      ? "Losujemy kapitana"
                      : isSpinningWheel
                        ? "Koło fortuny się kręci"
                        : "Zakręć koło fortuny — losuj kapitana"
                  }
                >
                  {awaitingDraw ? (
                    <span className="px-1 text-center text-[10px] font-extrabold uppercase leading-tight tracking-[0.1em] sm:text-xs">
                      Losujemy
                    </span>
                  ) : isSpinningWheel ? (
                    <span className="px-1 text-center text-[10px] font-extrabold uppercase leading-tight tracking-[0.1em] sm:text-xs">
                      Kręci się
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-extrabold uppercase leading-none tracking-[0.12em] sm:text-sm">
                        Zakręć
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.08em] opacity-90 sm:text-[10px]">
                        kołem
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full border-2 border-zinc-200/90 bg-white shadow-inner dark:border-zinc-600 dark:bg-zinc-900"
                  aria-hidden
                >
                  <Crown
                    className="h-6 w-6 text-[var(--mp-teal)] sm:h-7 sm:w-7"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {landedWinners && landedWinners.length > 0 ? (
          <div
            className="awp-lottery-reveal relative z-10 mt-4 rounded-2xl border border-zinc-200/90 bg-white/95 px-3 py-3 text-center shadow-sm dark:border-zinc-600 dark:bg-zinc-900/80"
            role="status"
          >
            <p
              className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)] dark:text-teal-300"
            >
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {landedWinners.length === 1 ? "Kapitan" : `Kapitanowie (${landedWinners.length})`}
            </p>
            <p className="mt-1.5 text-sm font-extrabold leading-snug text-zinc-950 dark:text-white sm:text-base">
              {landedWinners.map(playerCaption).join(" · ")}
            </p>
          </div>
        ) : (
          <p className="relative z-10 mt-3 text-center text-xs text-zinc-600 dark:text-zinc-400 sm:mt-4 sm:text-sm">
            {n} {n === 1 ? "gracz" : "graczy"} w puli
            {awaitingDraw ? " — chwila, losujemy wynik" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
