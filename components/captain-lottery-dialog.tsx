"use client";

import { useCallback, useMemo, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import type { MatchRow } from "@/lib/db";
import type { PlayerEntry, PlayersDataEntry } from "@/lib/terminarz-shared";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { CaptainLotteryWheel } from "@/components/captain-lottery-wheel";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow | null;
  playersData: PlayersDataEntry | null;
};

function allSignedUpPlayers(data: PlayersDataEntry | null): PlayerEntry[] {
  if (!data) return [];
  return [...data.players, ...data.tentativePlayers, ...data.declinedPlayers];
}

export function CaptainLotteryDialog({ open, onOpenChange, match, playersData }: Props) {
  const pool = useMemo(() => allSignedUpPlayers(playersData), [playersData]);
  const maxCaptains = Math.min(5, pool.length);
  const [captainCount, setCaptainCount] = useState(1);
  const [spinToken, setSpinToken] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winners, setWinners] = useState<PlayerEntry[]>([]);

  const effectiveCount = Math.min(captainCount, maxCaptains || 1);

  const resetState = useCallback(() => {
    setSpinToken(0);
    setSpinning(false);
    setWinners([]);
    setCaptainCount(1);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const handleSpin = () => {
    if (pool.length === 0 || spinning) return;
    setWinners([]);
    setSpinning(true);
    setSpinToken((t) => t + 1);
  };

  const handleSpinComplete = (picked: PlayerEntry[]) => {
    setSpinning(false);
    setWinners(picked);
  };

  const title = match
    ? `Losuj kapitana — ${match.match_date} ${match.match_time}`
    : "Losuj kapitana";

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      title={title}
      description={
        match
          ? `${match.location} · na kole widoczni są wszyscy zapisani zawodnicy (${pool.length})`
          : undefined
      }
      icon={<Crown className="h-5 w-5" aria-hidden />}
      headerKicker="Terminarz"
      preventDismiss={spinning}
      contentClassName="space-y-5"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={spinning} onClick={() => handleOpenChange(false)}>
            Zamknij
          </Button>
          <Button
            type="button"
            disabled={pool.length === 0 || spinning}
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={handleSpin}
          >
            {spinning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Kręcimy…
              </>
            ) : (
              "Zagręć"
            )}
          </Button>
        </div>
      }
    >
      {pool.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Na ten mecz nikt nie jest jeszcze zapisany — dodaj zawodników do składu, zanim losujesz kapitanów.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="captain-count-slider" className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Liczba kapitanów
              </Label>
              <span
                className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg bg-emerald-700 px-2.5 py-1 text-sm font-bold tabular-nums text-white"
                aria-live="polite"
              >
                {effectiveCount}
              </span>
            </div>
            <input
              id="captain-count-slider"
              type="range"
              min={1}
              max={maxCaptains}
              step={1}
              value={effectiveCount}
              disabled={spinning}
              onChange={(e) => setCaptainCount(Number(e.target.value))}
              className={cn(
                "mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-emerald-700 dark:bg-zinc-600",
                spinning && "opacity-60"
              )}
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Wybierz od 1 do {maxCaptains} kapitanów (max. 5 lub mniej, gdy skład jest mniejszy).
            </p>
          </div>

          <CaptainLotteryWheel
            players={pool}
            captainCount={effectiveCount}
            spinning={spinning}
            spinToken={spinToken}
            onSpinComplete={handleSpinComplete}
          />

          {winners.length > 0 && !spinning && (
            <div
              className="rounded-xl border-2 border-[var(--mundial-gold,#f5c518)] bg-emerald-50/90 px-4 py-3 dark:bg-emerald-950/40"
              role="status"
            >
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
                {winners.length === 1 ? "Kapitan meczu" : `Kapitanowie meczu (${winners.length})`}
              </p>
              <ul className="mt-3 space-y-2">
                {winners.map((p, i) => (
                  <li
                    key={p.userId}
                    className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-zinc-900/50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--mundial-gold,#f5c518)] text-xs font-bold text-emerald-950">
                      {i + 1}
                    </span>
                    <PlayerAvatar
                      photoPath={p.profilePhotoPath}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-emerald-300/80 dark:ring-emerald-600/80"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
                    </div>
                    <Crown className="h-5 w-5 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </AppModal>
  );
}
