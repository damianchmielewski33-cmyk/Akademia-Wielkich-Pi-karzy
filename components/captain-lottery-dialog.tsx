"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Crown, Link2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import type { MatchRow } from "@/lib/db";
import type { CaptainLotteryEntry } from "@/lib/captain-lottery";
import { captainLotteryEntryFromApi, captainLotteryPoolFromPlayersData, formatCaptainLotteryDrawnAt } from "@/lib/captain-lottery";
import type { PlayerEntry, PlayersDataEntry } from "@/lib/terminarz-shared";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { CaptainLotteryWheel } from "@/components/captain-lottery-wheel";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { modalPanelClass } from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";
import { appendShareSessionQuery, captainLotteryRelativePath } from "@/lib/share-link";

type ApiLottery = Parameters<typeof captainLotteryEntryFromApi>[0];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow | null;
  playersData: PlayersDataEntry | null;
  initialLottery: CaptainLotteryEntry | null;
  lotteryHistory?: CaptainLotteryEntry[];
  isAdmin: boolean;
  onLotteryChange: (matchId: number, lottery: CaptainLotteryEntry | null) => void;
};

function apiToEntry(api: ApiLottery): CaptainLotteryEntry {
  return captainLotteryEntryFromApi(api);
}

function MatchLotteryHeader({ match, poolSize }: { match: MatchRow; poolSize: number }) {
  const dateLabel = match.match_date.slice(5).replace("-", ".");
  const year = match.match_date.slice(0, 4);
  const time = match.match_time.length >= 5 ? match.match_time.slice(0, 5) : match.match_time;

  return (
    <div className={cn(modalPanelClass, "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between")}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center rounded-xl border border-emerald-200/90 bg-white px-3 py-1.5 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/50">
          <Calendar className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          <span className="mt-0.5 text-sm font-bold tabular-nums text-[var(--mundial-navy)] dark:text-emerald-50">
            {dateLabel}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-emerald-300/80">
            {year}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold tabular-nums text-[var(--mundial-navy)] dark:text-emerald-50">{time}</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-sm text-zinc-600 dark:text-emerald-100/85">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-[var(--mundial-gold,#f5c518)]" aria-hidden />
            <span className="leading-snug">{match.location}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          {poolSize} w puli
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950 dark:border-amber-700/45 dark:bg-amber-950/35 dark:text-amber-100">
          <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          Tylko «wpadam»
        </span>
      </div>
    </div>
  );
}

function CaptainLotteryHistoryList({ rounds }: { rounds: CaptainLotteryEntry[] }) {
  const completed = rounds.filter((r) => r.hasResults);
  if (completed.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/70 px-4 py-3 dark:border-zinc-700/55 dark:bg-zinc-900/35">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-400">
        Historia losowań ({completed.length})
      </p>
      <ul className="mt-3 space-y-2">
        {completed.map((round) => {
          const drawer =
            `${round.drawnByFirstName} ${round.drawnByLastName}`.trim() || round.drawnByZawodnik || "—";
          return (
            <li
              key={round.id}
              className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm dark:border-zinc-700/50 dark:bg-zinc-900/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Runda {round.roundNumber}
                </span>
                {round.drawnAt ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatCaptainLotteryDrawnAt(round.drawnAt)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Losował: {drawer}</p>
              <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                {round.captains.map((c) => c.name || c.zawodnik).join(", ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CaptainLotterySummary({ lottery }: { lottery: CaptainLotteryEntry }) {
  const drawerFull = `${lottery.drawnByFirstName} ${lottery.drawnByLastName}`.trim();
  const drawerLabel = drawerFull || lottery.drawnByZawodnik || "—";
  const drawerWithNick =
    drawerFull &&
    lottery.drawnByZawodnik &&
    lottery.drawnByZawodnik !== drawerFull
      ? `${drawerFull} (${lottery.drawnByZawodnik})`
      : drawerLabel;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--mundial-gold,#f5c518)]/45 bg-gradient-to-br from-emerald-50 via-white to-amber-50/60 shadow-md shadow-emerald-900/10 dark:from-emerald-950/80 dark:via-zinc-900/60 dark:to-amber-950/25"
      role="status"
    >
      <div className="border-b border-[var(--mundial-gold,#f5c518)]/30 bg-gradient-to-r from-emerald-800 to-emerald-900 px-4 py-2.5 dark:from-emerald-950 dark:to-emerald-900">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mundial-gold,#f5c518)]">
          Wynik losowania · runda {lottery.roundNumber}
        </p>
      </div>

      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2.5 dark:border-emerald-800/50 dark:bg-emerald-950/40">
          <PlayerAvatar
            photoPath={lottery.drawnByPhoto}
            firstName={lottery.drawnByFirstName}
            lastName={lottery.drawnByLastName}
            size="sm"
            ringClassName="ring-2 ring-[var(--mundial-gold,#f5c518)]/60"
          />
          <div className="min-w-0 flex-1 text-sm text-emerald-950 dark:text-emerald-50">
            <p>
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">Losował: </span>
              {drawerWithNick}
            </p>
            {lottery.drawnAt ? (
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-emerald-300/80">
                {formatCaptainLotteryDrawnAt(lottery.drawnAt)}
              </span>
            ) : null}
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
          <Crown className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          {lottery.captains.length === 1
            ? "Kapitan meczu"
            : `Kapitanowie meczu (${lottery.captains.length})`}
        </p>

        <ul className="mt-3 space-y-2">
          {lottery.captains.map((p, i) => (
            <li
              key={p.userId}
              className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-white px-3 py-2.5 shadow-sm dark:border-emerald-800/45 dark:bg-emerald-950/35"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--mundial-gold,#f5c518)] to-amber-500 text-xs font-extrabold text-emerald-950 shadow-sm"
              >
                {i + 1}
              </span>
              <PlayerAvatar
                photoPath={p.profilePhotoPath}
                firstName={p.firstName}
                lastName={p.lastName}
                size="sm"
                ringClassName="ring-2 ring-emerald-300/80 dark:ring-emerald-600/70"
              />
              <div className="min-w-0 flex-1">
                <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
              </div>
              <Crown className="h-5 w-5 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
            </li>
          ))}
        </ul>

      {lottery.locked ? (
        <p className="mt-3 rounded-lg bg-emerald-100/80 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
          Losowanie zakończone — administrator może dodać kolejną rundę na terminarzu.
        </p>
      ) : null}
      </div>
    </div>
  );
}

function CaptainCountSlider({
  effectiveCount,
  maxCaptains,
  spinning,
  onChange,
}: {
  effectiveCount: number;
  maxCaptains: number;
  spinning: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-emerald-50/40 px-4 py-4 shadow-sm dark:border-zinc-700/55 dark:from-zinc-900/50 dark:to-emerald-950/25",
        spinning && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label htmlFor="captain-count-slider" className="text-sm font-bold text-[var(--mundial-navy)] dark:text-emerald-50">
          Liczba kapitanów
        </Label>
        <span
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-800 px-3 text-base font-extrabold tabular-nums text-white shadow-md shadow-emerald-900/25"
        >
          {effectiveCount}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: maxCaptains }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={spinning}
            onClick={() => onChange(n)}
            className={cn(
              "min-h-9 min-w-9 rounded-lg border text-sm font-bold transition-colors",
              effectiveCount === n
                ? "border-[var(--mundial-gold,#f5c518)] bg-emerald-800 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/50"
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <input
        id="captain-count-slider"
        type="range"
        min={1}
        max={maxCaptains}
        step={1}
        value={effectiveCount}
        disabled={spinning}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[var(--mundial-gold,#f5c518)] dark:bg-zinc-600"
      />
      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Max. 5 kapitanów lub mniej, gdy skład jest mniejszy. Po zakończeniu rundy administrator może dodać kolejne
        losowanie na terminarzu.
      </p>
    </div>
  );
}

export function CaptainLotteryDialog({
  open,
  onOpenChange,
  match,
  playersData,
  initialLottery,
  lotteryHistory = [],
  isAdmin,
  onLotteryChange,
}: Props) {
  const pool = useMemo(() => captainLotteryPoolFromPlayersData(playersData), [playersData]);
  const maxCaptains = Math.min(5, pool.length);
  const [lottery, setLottery] = useState<CaptainLotteryEntry | null>(initialLottery);
  const [history, setHistory] = useState<CaptainLotteryEntry[]>(lotteryHistory);
  const [captainCount, setCaptainCount] = useState(1);
  const [spinToken, setSpinToken] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [predeterminedWinners, setPredeterminedWinners] = useState<PlayerEntry[] | null>(null);
  const [pendingLottery, setPendingLottery] = useState<CaptainLotteryEntry | null>(null);

  const effectiveCount = Math.min(captainCount, maxCaptains || 1);
  const canSpin = pool.length > 0 && !spinning && (lottery == null || !lottery.locked);

  useEffect(() => {
    if (open) {
      setLottery(initialLottery);
      setHistory(lotteryHistory);
      setCaptainCount(initialLottery?.captainCount > 0 ? initialLottery.captainCount : 1);
    }
  }, [open, initialLottery, lotteryHistory]);

  const resetSpinUi = useCallback(() => {
    setSpinToken(0);
    setSpinning(false);
    setPredeterminedWinners(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetSpinUi();
      setCaptainCount(1);
    }
    onOpenChange(next);
  };

  const handleSpin = async () => {
    if (!match || !canSpin) return;
    setSpinning(true);
    try {
      const res = await fetch(`/api/terminarz/match/${match.id}/captain-lottery/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captain_count: effectiveCount }),
      });
      const text = await res.text();
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        try {
          const j = JSON.parse(text) as { error?: string };
          toast.error(typeof j.error === "string" ? j.error : "Nie udało się losować kapitanów.");
        } catch {
          toast.error("Nie udało się losować kapitanów.");
        }
        setSpinning(false);
        return;
      }
      const data = JSON.parse(text) as { lottery: ApiLottery };
      const entry = apiToEntry(data.lottery);
      setPendingLottery(entry);
      setPredeterminedWinners(entry.captains);
      setSpinToken((t) => t + 1);
    } catch {
      toast.error("Nie udało się losować kapitanów.");
      setSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    setSpinning(false);
    if (!match) return;
    const entry = pendingLottery;
    if (entry) {
      setLottery(entry);
      onLotteryChange(match.id, entry);
      setHistory((prev) => {
        const without = prev.filter((x) => x.id !== entry.id);
        return [entry, ...without].sort((a, b) => b.roundNumber - a.roundNumber);
      });
      setPendingLottery(null);
    }
    setPredeterminedWinners(null);
  };

  async function copyLotteryLink() {
    if (!match) return;
    const rel = appendShareSessionQuery(captainLotteryRelativePath(match.id));
    const url = `${window.location.origin}${rel}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano link do losowania kapitanów");
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  }

  const title = "Losowanie kapitanów";

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      size="xl"
      title={title}
      description="Koło fortuny wybiera kapitanów spośród graczy z potwierdzonym udziałem w meczu."
      icon={<Crown className="h-5 w-5" aria-hidden />}
      headerKicker="Koło fortuny"
      preventDismiss={spinning}
      scrollable
      contentClassName="space-y-4"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={spinning || !match}
            className="w-full border-emerald-300 text-emerald-900 hover:bg-emerald-50 sm:w-auto dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
            onClick={() => void copyLotteryLink()}
          >
            <Link2 className="h-4 w-4" aria-hidden />
            Skopiuj link
          </Button>

          <Button type="button" variant="outline" disabled={spinning} onClick={() => handleOpenChange(false)}>
            Zamknij
          </Button>
        </div>
      }
    >
      {match ? <MatchLotteryHeader match={match} poolSize={pool.length} /> : null}

      {pool.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
          Nikt jeszcze nie potwierdził udziału w tym meczu — kapitanem może być tylko gracz ze statusem «wpadam».
        </div>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <div className="space-y-4 min-w-0">
            {lottery && !lottery.hasResults && !lottery.locked && (
              <div className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/35 dark:text-amber-100">
                <strong className="font-semibold">Runda {lottery.roundNumber}</strong> jest otwarta — ustaw liczbę
                kapitanów i naciśnij <strong className="font-semibold">Losuj</strong> na kole fortuny.
              </div>
            )}

            {!lottery && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-300">
                {isAdmin
                  ? "Brak aktywnego losowania — użyj «Dodaj losowanie» na terminarzu albo zakręć koło (pierwsza runda)."
                  : "Brak aktywnego losowania — poproś administratora o dodanie rundy na terminarzu."}
              </div>
            )}

            {(lottery == null || !lottery.locked) && (
              <CaptainCountSlider
                effectiveCount={effectiveCount}
                maxCaptains={maxCaptains}
                spinning={spinning}
                onChange={setCaptainCount}
              />
            )}

            {lottery?.hasResults ? <CaptainLotterySummary lottery={lottery} /> : null}

            <CaptainLotteryHistoryList
              rounds={history.filter((r) => r.hasResults && r.id !== lottery?.id)}
            />
          </div>

          <div className="min-w-0 lg:sticky lg:top-0">
            <CaptainLotteryWheel
              players={pool}
              spinning={spinning}
              spinToken={spinToken}
              predeterminedWinners={predeterminedWinners}
              onSpinComplete={handleSpinComplete}
              canSpin={canSpin}
              onSpin={() => void handleSpin()}
              className="lg:max-w-none"
            />
          </div>
        </div>
      )}
    </AppModal>
  );
}
