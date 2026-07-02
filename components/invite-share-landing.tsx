"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, HelpCircle, KeyRound, Loader2, LogIn, MapPin, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { LoginForm } from "@/components/login-form";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { Button } from "@/components/ui/button";
import {
  PitchCard,
  PitchPageHero,
  pitchLabelClass,
  pitchPanelClass,
  pitchSecondaryBtnClass,
} from "@/components/ui/pitch-card";
import { terminarzInviteRelativePath } from "@/lib/share-link";
import { cn } from "@/lib/utils";

const contentPanelClass =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-6";

function formatMatchWhen(isoDate: string, time: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    return { label: `${isoDate} · ${time}`, weekday: "" };
  }
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("pl-PL", { weekday: "long" });
  const label = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  return { label, weekday, time };
}

function slotMeta(signed: number, max: number) {
  const pct = max > 0 ? Math.min(100, (signed / max) * 100) : 0;
  const free = Math.max(0, max - signed);
  if (max <= 0) return { pct, free, tone: "ok" as const };
  if (signed >= max) return { pct, free, tone: "full" as const };
  if (pct >= 80) return { pct, free, tone: "warn" as const };
  return { pct, free, tone: "ok" as const };
}

export function InviteMatchCard({
  match,
  playersData,
  showGatePin = false,
}: {
  match: MatchRow;
  playersData: Record<number, PlayersDataEntry>;
  showGatePin?: boolean;
}) {
  const when = formatMatchWhen(match.match_date, match.match_time);
  const slots = slotMeta(match.signed_up, match.max_slots);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;
  const gatePin = match.gate_pin?.trim() ?? "";

  const barClass =
    slots.tone === "full" ? "bg-red-400/90" : slots.tone === "warn" ? "bg-amber-400/90" : "bg-emerald-100";

  return (
    <PitchCard
      as="section"
      className="mx-auto max-w-2xl"
      contentClassName="px-5 py-5 sm:px-6 sm:py-6"
      aria-labelledby="invite-match-heading"
    >
      <p className={pitchLabelClass}>Zaproszenie na mecz</p>
      <h2 id="invite-match-heading" className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
        {when.weekday ? (
          <>
            <span className="capitalize">{when.weekday}</span>
            <span className="mt-0.5 block text-lg font-semibold text-emerald-100/95 sm:text-xl">
              {when.label} · {when.time}
            </span>
          </>
        ) : (
          <span>
            {when.label} · {when.time}
          </span>
        )}
      </h2>

      <div className={cn(pitchPanelClass, "mt-4 space-y-3 p-4")}>
        <div className="flex items-start gap-2.5 text-sm text-white/95">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          <span className="font-semibold leading-snug">{match.location}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-white/80">
            <span>Skład</span>
            <span className="tabular-nums">
              {match.signed_up}/{match.max_slots}
              {slots.free > 0 ? ` · ${slots.free} wolnych` : " · pełny skład"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/25">
            <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${slots.pct}%` }} />
          </div>
        </div>

        <MatchSignupCountsBlock
          matchId={match.id}
          signedUp={match.signed_up}
          maxSlots={match.max_slots}
          playersData={playersData}
          variant="card"
          tone="zinc"
        />

        <a href={mapsUrl} target="_blank" rel="noreferrer" className={pitchSecondaryBtnClass}>
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          Otwórz miejsce w Mapach Google
        </a>
      </div>

      {gatePin && showGatePin ? (
        <div className={cn(pitchPanelClass, "mt-3 flex items-start gap-3 p-4")}>
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          <div className="min-w-0 text-left">
            <p className={cn(pitchLabelClass, "text-[0.65rem]")}>Wejście na boisko</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-white tabular-nums">{gatePin}</p>
            <p className="mt-1 text-xs text-white/75">PIN do bramy przy tym meczu.</p>
          </div>
        </div>
      ) : null}
    </PitchCard>
  );
}

type InviteShareLandingProps = {
  highlightMatchId: number;
  match: MatchRow | null;
  playersData: Record<number, PlayersDataEntry>;
  isLoggedIn: boolean;
  userSignupKind: Record<number, "tentative" | "confirmed" | "declined">;
  inviteLoginInline: boolean;
  setInviteLoginInline: (v: boolean) => void;
  tentativeBusy: boolean;
  onParticipationTak: () => void;
  onParticipationTentative: () => void | Promise<void>;
  onParticipationNie: () => void | Promise<void>;
  onAuthenticated: () => void;
};

export function InviteShareLanding({
  highlightMatchId,
  match,
  playersData,
  isLoggedIn,
  userSignupKind,
  inviteLoginInline,
  setInviteLoginInline,
  tentativeBusy,
  onParticipationTak,
  onParticipationTentative,
  onParticipationNie,
  onAuthenticated,
}: InviteShareLandingProps) {
  const signupToastShownRef = useRef(false);
  const today = new Date().toISOString().slice(0, 10);
  const matchFuture = match != null && match.match_date >= today;
  const signupKind = userSignupKind[highlightMatchId];

  useEffect(() => {
    if (!isLoggedIn || signupToastShownRef.current || !matchFuture) return;
    signupToastShownRef.current = true;
    if (signupKind === "confirmed") {
      toast.info("Jesteś już zapisany na ten mecz.");
    } else if (signupKind === "tentative") {
      toast.info("Masz już status «jeszcze nie wiem». Potwierdź udział poniżej lub w terminarzu.");
    } else if (signupKind === "declined") {
      toast.info("Masz już zaznaczone «nie biorę udziału». Zmień to poniżej, jeśli chcesz grać.");
    }
  }, [isLoggedIn, matchFuture, signupKind]);

  const registerHref =
    highlightMatchId != null
      ? `/register?next=${encodeURIComponent(terminarzInviteRelativePath(highlightMatchId))}`
      : "/register";

  return (
    <div className="awp-card-surface mundial-page-accent space-y-6 pb-2">
      <PitchPageHero
        title="Zaproszenie na mecz"
        subtitle="Akademia Wielkich Piłkarzy — zapisz się na boisko w kilku krokach."
      />

      {!match ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
        >
          Nie znaleziono meczu o tym numerze — mógł zostać usunięty z terminarza.
        </div>
      ) : !matchFuture ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          Ten termin już minął. Sprawdź aktualny terminarz, aby zapisać się na kolejne mecze.
        </div>
      ) : (
        <>
          <InviteMatchCard
            match={match}
            playersData={playersData}
            showGatePin={signupKind === "confirmed"}
          />

          <div className={cn(contentPanelClass, "mx-auto max-w-2xl space-y-4")}>
            {!isLoggedIn ? (
              inviteLoginInline ? (
                <>
                  <div className="space-y-1 text-center sm:text-left">
                    <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-emerald-100">
                      Logowanie
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Wpisz imię, nazwisko i PIN (4–6 cyfr) — tak jak na stronie logowania.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
                    onClick={() => setInviteLoginInline(false)}
                  >
                    ← Wróć
                  </button>
                  <LoginForm
                    nextPath={terminarzInviteRelativePath(highlightMatchId)}
                    embedMode
                    onAuthenticated={onAuthenticated}
                  />
                </>
              ) : (
                <>
                  <div className="space-y-1 text-center sm:text-left">
                    <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-emerald-100">
                      Czy grasz w tym terminie?
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Zaloguj się lub załóż konto, żeby odpowiedzieć: <strong>tak</strong>,{" "}
                      <strong>jeszcze nie wiem</strong> albo <strong>nie biorę udziału</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="pitch" className="flex-1 gap-2" onClick={() => setInviteLoginInline(true)}>
                      <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                      Zaloguj się
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" asChild>
                      <Link href={registerHref}>
                        <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                        Utwórz konto
                      </Link>
                    </Button>
                  </div>
                </>
              )
            ) : signupKind == null ? (
              <>
                <div className="space-y-1 text-center sm:text-left">
                  <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-emerald-100">
                    Czy bierzesz udział?
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Wybierz jedną opcję. Przy odpowiedzi <strong>tak</strong> (gdy są wolne miejsca) wybierzesz też
                    transport.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="pitch" className="w-full" onClick={onParticipationTak}>
                    Tak, biorę udział
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={tentativeBusy}
                    onClick={() => void onParticipationTentative()}
                  >
                    {tentativeBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <HelpCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    )}
                    Jeszcze nie wiem
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-zinc-700 dark:text-zinc-300"
                    disabled={tentativeBusy}
                    onClick={() => void onParticipationNie()}
                  >
                    Nie, nie biorę udziału
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-emerald-100">
                  Twój status na ten mecz
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {signupKind === "confirmed"
                    ? "Jesteś zapisany na ten mecz. Szczegóły i transport znajdziesz w terminarzu."
                    : signupKind === "tentative"
                      ? "Masz status «jeszcze nie wiem». Potwierdź udział w terminarzu, gdy będziesz wiedzieć."
                      : "Zaznaczyłeś «nie biorę udziału». Możesz to zmienić w terminarzu."}
                </p>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href={`/zaproszenie/${highlightMatchId}`}>Wróć do wizytówki meczu</Link>
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href="/terminarz"
          className="inline-flex items-center gap-1.5 font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
        >
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          Pełny terminarz Akademii
        </Link>
      </p>

      <div className="flex justify-center pb-2">
        <Image
          src="/mundial-2026-logo.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 opacity-80"
          unoptimized
          aria-hidden
        />
      </div>
    </div>
  );
}
