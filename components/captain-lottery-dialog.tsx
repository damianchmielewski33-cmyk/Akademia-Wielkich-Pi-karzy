"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Link2, Users } from "lucide-react";
import { toast } from "@/lib/app-toast";
import type { MatchRow } from "@/lib/db";
import type { CaptainLotteryEntry } from "@/lib/captain-lottery";
import {
  captainLotteryEntryFromApi,
  captainLotteryPoolFromPlayersData,
  formatCaptainLotteryDrawnAt,
} from "@/lib/captain-lottery";
import type { PlayerEntry, PlayersDataEntry } from "@/lib/terminarz-shared";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LoginForm } from "@/components/login-form";
import { CaptainLotteryWheel } from "@/components/captain-lottery-wheel";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ModalAlert,
  ModalFormSection,
  ModalMatchSummary,
  modalEmptyStateClass,
  modalListClass,
  modalPanelClass,
} from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";
import { appendShareSessionQuery, captainLotteryRelativePath } from "@/lib/share-link";
import { REALMS, type Realm } from "@/lib/realm";

type ApiLottery = Parameters<typeof captainLotteryEntryFromApi>[0];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow | null;
  playersData: PlayersDataEntry | null;
  initialLottery: CaptainLotteryEntry | null;
  lotteryHistory?: CaptainLotteryEntry[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  realm?: Realm;
  onAuthenticated?: () => void;
  onLotteryChange: (matchId: number, lottery: CaptainLotteryEntry | null) => void;
};

function apiToEntry(api: ApiLottery): CaptainLotteryEntry {
  return captainLotteryEntryFromApi(api);
}

function CaptainLotteryHistoryList({ rounds }: { rounds: CaptainLotteryEntry[] }) {
  const completed = rounds.filter((r) => r.hasResults);
  if (completed.length === 0) return null;

  return (
    <ModalFormSection title={`Historia losowań (${completed.length})`}>
      <ul className={cn(modalListClass, "space-y-0 divide-y divide-zinc-200/80 dark:divide-zinc-700/55")}>
        {completed.map((round) => {
          const drawer =
            `${round.drawnByFirstName} ${round.drawnByLastName}`.trim() || round.drawnByZawodnik || "—";
          return (
            <li key={round.id} className="px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--mundial-navy)] dark:text-zinc-100">
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
    </ModalFormSection>
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
    <div className={cn(modalPanelClass, "awp-lottery-reveal space-y-3")} role="status">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)] dark:text-teal-300">
        Wynik losowania · runda {lottery.roundNumber}
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900/70">
        <PlayerAvatar
          photoPath={lottery.drawnByPhoto}
          firstName={lottery.drawnByFirstName}
          lastName={lottery.drawnByLastName}
          size="sm"
          ringClassName="ring-2 ring-[var(--mp-teal)]/50"
        />
        <div className="min-w-0 flex-1 text-sm text-zinc-950 dark:text-zinc-100">
          <p>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Losował: </span>
            {drawerWithNick}
          </p>
          {lottery.drawnAt ? (
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              {formatCaptainLotteryDrawnAt(lottery.drawnAt)}
            </span>
          ) : null}
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
        <Crown className="h-4 w-4 text-[var(--mp-teal)]" aria-hidden />
        {lottery.captains.length === 1
          ? "Kapitan meczu"
          : `Kapitanowie meczu (${lottery.captains.length})`}
      </p>

      <ul className="space-y-2">
        {lottery.captains.map((p, i) => (
          <li
            key={p.userId}
            className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/70"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--mp-teal)] text-xs font-extrabold text-white shadow-sm">
              {i + 1}
            </span>
            <PlayerAvatar
              photoPath={p.profilePhotoPath}
              firstName={p.firstName}
              lastName={p.lastName}
              size="sm"
              ringClassName="ring-2 ring-[var(--mp-teal)]/50"
            />
            <div className="min-w-0 flex-1">
              <PlayerNameStack firstName={p.firstName} lastName={p.lastName} nick={p.zawodnik} />
            </div>
            <Crown className="h-5 w-5 shrink-0 text-[var(--mp-teal)]" aria-hidden />
          </li>
        ))}
      </ul>

      {lottery.locked ? (
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          Losowanie zakończone — administrator może dodać kolejną rundę na terminarzu.
        </p>
      ) : null}
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
    <ModalFormSection
      title="Liczba kapitanów"
      description="Max. 5 kapitanów lub mniej, gdy skład jest mniejszy. Po zakończeniu rundy administrator może dodać kolejne losowanie na terminarzu."
      className={spinning ? "pointer-events-none opacity-60" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label htmlFor="captain-count-slider" className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
          Wybierz liczbę
        </Label>
        <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-3 text-base font-extrabold tabular-nums text-[var(--mp-teal-dark)] shadow-sm dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
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
                ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-400 hover:bg-teal-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
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
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[var(--mp-teal)] dark:bg-zinc-600"
      />
    </ModalFormSection>
  );
}

export function CaptainLotteryDialog({
  open,
  onOpenChange,
  match,
  playersData,
  initialLottery,
  lotteryHistory = [],
  isLoggedIn,
  isAdmin,
  realm = REALMS.ACADEMY,
  onAuthenticated,
  onLotteryChange,
}: Props) {
  const pool = useMemo(() => captainLotteryPoolFromPlayersData(playersData), [playersData]);
  const maxCaptains = Math.min(5, pool.length);
  const [lottery, setLottery] = useState<CaptainLotteryEntry | null>(initialLottery);
  const [history, setHistory] = useState<CaptainLotteryEntry[]>(lotteryHistory);
  const [captainCount, setCaptainCount] = useState(1);
  const [spinToken, setSpinToken] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [awaitingDraw, setAwaitingDraw] = useState(false);
  const [predeterminedWinners, setPredeterminedWinners] = useState<PlayerEntry[] | null>(null);
  const [pendingLottery, setPendingLottery] = useState<CaptainLotteryEntry | null>(null);
  const [loginInline, setLoginInline] = useState(false);
  const wheelWrapRef = useRef<HTMLDivElement>(null);

  const effectiveCount = Math.min(captainCount, maxCaptains || 1);
  const drawBusy = spinning || awaitingDraw;
  const canSpin = pool.length > 0 && !drawBusy && (lottery == null || !lottery.locked);
  const showLotteryLayout = pool.length > 0 || lottery != null || history.some((r) => r.hasResults);

  useEffect(() => {
    if (open) {
      setLottery(initialLottery);
      setHistory(lotteryHistory);
      const count = initialLottery?.captainCount ?? 0;
      setCaptainCount(count > 0 ? count : 1);
    }
  }, [open, initialLottery, lotteryHistory]);

  useEffect(() => {
    if (!drawBusy) return;
    wheelWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [drawBusy]);

  const resetSpinUi = useCallback(() => {
    setSpinToken(0);
    setSpinning(false);
    setAwaitingDraw(false);
    setPredeterminedWinners(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetSpinUi();
      setCaptainCount(1);
      setLoginInline(false);
    }
    onOpenChange(next);
  };

  const handleAuthenticated = () => {
    setLoginInline(false);
    onAuthenticated?.();
  };

  const handleSpin = async () => {
    if (!match || !canSpin) return;
    if (!isLoggedIn) {
      setLoginInline(true);
      return;
    }
    setAwaitingDraw(true);
    try {
      const res = await fetch(`/api/terminarz/match/${match.id}/captain-lottery/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captain_count: effectiveCount }),
      });
      const text = await res.text();
      if (res.status === 401) {
        setAwaitingDraw(false);
        setLoginInline(true);
        return;
      }
      if (!res.ok) {
        try {
          const j = JSON.parse(text) as { error?: string };
          toast.error(typeof j.error === "string" ? j.error : "Nie udało się losować kapitanów.");
        } catch {
          toast.error("Nie udało się losować kapitanów.");
        }
        setAwaitingDraw(false);
        return;
      }
      const data = JSON.parse(text) as { lottery: ApiLottery };
      const entry = apiToEntry(data.lottery);
      setPendingLottery(entry);
      setPredeterminedWinners(entry.captains);
      setAwaitingDraw(false);
      setSpinning(true);
      setSpinToken((t) => t + 1);
    } catch {
      toast.error("Nie udało się losować kapitanów.");
      setAwaitingDraw(false);
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
      void import("@/lib/stadium-sounds").then((m) => m.playStadiumCheer());
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
      size="full"
      title={title}
      description="Zakręć kołem — kapitanowie są losowani spośród graczy z potwierdzonym udziałem."
      icon={<Crown className="h-5 w-5" aria-hidden />}
      headerKicker="Terminarz"
      headerPhotoSeed={match?.id ?? 7}
      preventDismiss={drawBusy || loginInline}
      scrollable
      className="sm:max-w-[min(96vw,68rem)]"
      contentClassName="space-y-4"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={drawBusy || !match}
            className="w-full sm:w-auto"
            onClick={() => void copyLotteryLink()}
          >
            <Link2 className="h-4 w-4" aria-hidden />
            Skopiuj link
          </Button>

          <Button type="button" variant="outline" disabled={drawBusy} onClick={() => handleOpenChange(false)}>
            Zamknij
          </Button>
        </div>
      }
    >
      {match ? (
        <div className="space-y-3">
          <ModalMatchSummary match={match} />
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-[var(--mp-teal-dark)] dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
              <Users className="h-3.5 w-3.5 text-[var(--mp-teal)]" aria-hidden />
              {pool.length} w puli losowania
            </span>
          </div>
        </div>
      ) : null}

      {showLotteryLayout ? (
        <div className="space-y-5">
          {loginInline ? (
            <ModalFormSection
              title="Logowanie"
              description="Wpisz imię, nazwisko i PIN (4–6 cyfr), aby zakręcić koło. Po zalogowaniu wrócisz do losowania."
            >
              <button
                type="button"
                className="text-left text-sm font-medium text-[var(--mundial-navy)] underline-offset-2 hover:underline dark:text-amber-200/90"
                onClick={() => setLoginInline(false)}
              >
                ← Wróć do losowania
              </button>
              <LoginForm
                nextPath={match ? captainLotteryRelativePath(match.id) : "/"}
                embedMode
                realm={realm}
                onAuthenticated={handleAuthenticated}
              />
            </ModalFormSection>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(16.5rem,22rem)] lg:items-start">
              <div ref={wheelWrapRef} className="min-w-0">
                <CaptainLotteryWheel
                  players={pool}
                  spinning={spinning}
                  awaitingDraw={awaitingDraw}
                  spinToken={spinToken}
                  predeterminedWinners={predeterminedWinners}
                  onSpinComplete={handleSpinComplete}
                  canSpin={canSpin}
                  onSpin={() => void handleSpin()}
                  className="lg:max-w-none"
                />
              </div>

              <div className={cn("min-w-0 space-y-4", drawBusy && "max-lg:hidden")}>
                {lottery && !lottery.hasResults && !lottery.locked && !drawBusy && (
                  <ModalAlert tone="warning">
                    <strong className="font-semibold">Runda {lottery.roundNumber}</strong> jest otwarta
                    {pool.length > 0
                      ? " — ustaw liczbę kapitanów i naciśnij Zakręć na kole."
                      : " — czeka na graczy z potwierdzonym «wpadam», zanim ktoś zakręci koło."}
                  </ModalAlert>
                )}

                {!isLoggedIn && !drawBusy && (
                  <ModalAlert tone="info">
                    Ekran losowania i historia są widoczne bez logowania. Zalogowanie jest potrzebne dopiero przy
                    kliknięciu <strong className="font-semibold">Zakręć</strong>.
                  </ModalAlert>
                )}

                {!lottery && !drawBusy && (
                  <ModalAlert tone="info">
                    {isAdmin
                      ? "Brak aktywnego losowania — użyj «Dodaj losowanie» na terminarzu albo zakręć koło (pierwsza runda)."
                      : "Brak aktywnego losowania — poproś administratora o dodanie rundy na terminarzu."}
                  </ModalAlert>
                )}

                {(lottery == null || !lottery.locked) && pool.length > 0 && (
                  <CaptainCountSlider
                    effectiveCount={effectiveCount}
                    maxCaptains={maxCaptains}
                    spinning={drawBusy}
                    onChange={setCaptainCount}
                  />
                )}

                {lottery?.hasResults && !drawBusy ? <CaptainLotterySummary lottery={lottery} /> : null}

                {!drawBusy ? (
                  <CaptainLotteryHistoryList
                    rounds={history.filter((r) => r.hasResults && r.id !== lottery?.id)}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={modalEmptyStateClass}>
          Nikt jeszcze nie potwierdził udziału w tym meczu — kapitanem może być tylko gracz ze statusem «wpadam».
          Administrator może wcześniej dodać rundę losowania na terminarzu.
        </div>
      )}
    </AppModal>
  );
}
