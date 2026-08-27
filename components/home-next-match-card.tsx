"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Calendar, Car, Clock, HelpCircle, KeyRound, LayoutGrid, MapPin, Users, Wallet } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MatchSignupsRosterModal } from "@/components/match-signups-roster-modal";
import { SiteAssetImage } from "@/components/site-asset-image";
import { Button } from "@/components/ui/button";
import {
  PitchCard,
  pitchLabelClass,
  pitchPanelClass,
  pitchSecondaryBtnClass,
} from "@/components/ui/pitch-card";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { cn, isValidMatchFee } from "@/lib/utils";
import { formatMatchFeePln, perPersonMatchFeePln } from "@/lib/match-fee";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { PayButton } from "@/components/pay-button";

type SignupState = "none" | "tentative" | "confirmed" | "declined";

type Props = {
  match: MatchRow;
  backgroundSrc?: string;
  photoPool?: string[];
  playersData?: PlayersDataEntry | null;
  tentativeLine: string;
  lineupPublic: boolean;
  signup: SignupState;
  transportActive: boolean;
  hotpayEnabled?: boolean;
  isLoggedIn: boolean;
  tentativeBusy: boolean;
  walletBalancePln?: number | null;
  debtBusy?: boolean;
  onPayDebt?: (amount: number) => void;
  onSignup: () => void;
  onTentative: () => void;
  onDeclined: () => void;
  onConfirmFromTentative: () => void;
};

function formatMatchWhen(isoDate: string, time: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    return { label: `${isoDate} · ${time}`, weekday: "" };
  }
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("pl-PL", { weekday: "long" });
  const label = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  return { label, weekday };
}

function slotMeta(signed: number, max: number) {
  const pct = max > 0 ? Math.min(100, (signed / max) * 100) : 0;
  const free = Math.max(0, max - signed);
  if (max <= 0) return { pct, free, tone: "ok" as const };
  if (signed >= max) return { pct, free, tone: "full" as const };
  if (pct >= 80) return { pct, free, tone: "warn" as const };
  return { pct, free, tone: "ok" as const };
}

function pickPhoto(pool: string[] | undefined, fallback: string, index: number): string {
  const srcs = pool && pool.length > 0 ? pool : [fallback];
  return srcs[index % srcs.length] ?? fallback;
}

function MatchPhotoPanel({
  className,
  children,
}: {
  src?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto mt-3 max-w-md overflow-hidden rounded-xl bg-black/35 px-3.5 py-3.5 text-white ring-1 ring-white/15",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionPanel({
  photoChrome,
  src,
  className,
  children,
}: {
  photoChrome: boolean;
  src: string;
  className?: string;
  children: ReactNode;
}) {
  if (photoChrome) {
    return (
      <MatchPhotoPanel src={src} className={className}>
        {children}
      </MatchPhotoPanel>
    );
  }
  return (
    <div className={cn(pitchPanelClass, "mx-auto mt-3 max-w-md px-3.5 py-3.5 text-white", className)}>{children}</div>
  );
}

export function HomeNextMatchCard({
  match,
  backgroundSrc = "",
  photoPool,
  playersData = null,
  tentativeLine,
  lineupPublic,
  signup,
  transportActive,
  hotpayEnabled = false,
  isLoggedIn,
  tentativeBusy,
  walletBalancePln = null,
  debtBusy = false,
  onPayDebt,
  onSignup,
  onTentative,
  onDeclined,
  onConfirmFromTentative,
}: Props) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const rosterPlayersData = useMemo(
    () => (playersData ? { [match.id]: playersData } : {}),
    [match.id, playersData]
  );
  const when = formatMatchWhen(match.match_date, match.match_time);
  const slots = slotMeta(match.signed_up, match.max_slots);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;
  const gatePin = match.gate_pin?.trim() ?? "";
  const rentalTotal = isValidMatchFee(match.fee_pln) ? match.fee_pln : null;
  const perPersonFee = perPersonMatchFeePln(rentalTotal, match.signed_up);

  const barClass =
    slots.tone === "full" ? "bg-red-400/90" : slots.tone === "warn" ? "bg-amber-400/90" : "bg-emerald-100";
  const photoChrome = Boolean(photoPool && photoPool.length > 0);
  const srcAt = (index: number) => pickPhoto(photoPool, backgroundSrc, index);

  const lightSecondary =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <>
    {photoChrome ? (
      <article
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:hidden dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="home-next-match-heading-mobile"
      >
        <div className="relative h-36 overflow-hidden">
          <MarketplacePitchPhoto src={backgroundSrc} className="z-0" sizes="100vw" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/35 to-black/15" aria-hidden />
          <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-3.5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/80">Najbliższy mecz</p>
            <h2 id="home-next-match-heading-mobile" className="text-xl font-black tracking-tight text-white">
              {when.weekday ? when.weekday.charAt(0).toUpperCase() + when.weekday.slice(1) : "Kolejny termin"}
            </h2>
            <p className="mt-0.5 text-sm font-semibold text-white/90">
              {when.label} · {match.match_time}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4 text-zinc-950 dark:text-zinc-50">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mp-teal-dark)]" aria-hidden />
            <div className="min-w-0">
              <p className="leading-snug">{match.location}</p>
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-[var(--mp-teal-dark)] underline underline-offset-2"
              >
                Mapa
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">Skład</p>
              <p className="mt-0.5 text-base font-black tabular-nums">
                {match.signed_up}/{match.max_slots}
              </p>
              <p className="text-xs text-zinc-500">
                {slots.tone === "full" ? "Pełny" : `${slots.free} wolnych`}
              </p>
            </div>
            {rentalTotal != null ? (
              <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                  {perPersonFee != null ? "Na osobę" : "Wynajem"}
                </p>
                <p className="mt-0.5 text-base font-black tabular-nums">
                  {formatMatchFeePln(perPersonFee ?? rentalTotal)}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">Status</p>
                <p className="mt-0.5 text-sm font-bold">
                  {signup === "confirmed"
                    ? "Zapisany"
                    : signup === "tentative"
                      ? "Nie wiem"
                      : signup === "declined"
                        ? "Nie gram"
                        : "Brak zapisu"}
                </p>
              </div>
            )}
          </div>

          {tentativeLine ? <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{tentativeLine}</p> : null}

          {gatePin && signup === "confirmed" ? (
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
              <KeyRound className="h-5 w-5 shrink-0 text-[var(--mp-teal-dark)]" aria-hidden />
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">PIN do bramy</p>
                <p className="text-xl font-black tabular-nums tracking-[0.16em]">{gatePin}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {isLoggedIn ? (
              signup === "confirmed" ? (
                <p className="rounded-xl bg-teal-50 px-3 py-2.5 text-center text-sm font-semibold text-[var(--mp-teal-dark)] dark:bg-teal-950/40 dark:text-teal-200">
                  Jesteś zapisany
                </p>
              ) : signup === "tentative" ? (
                <>
                  <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">Jeszcze nie wiem — bez miejsca w składzie</p>
                  {slots.free > 0 ? (
                    <Button className="w-full" onClick={onConfirmFromTentative}>
                      Potwierdzam udział
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-zinc-500">Skład pełny — nie możesz teraz potwierdzić.</p>
                  )}
                </>
              ) : signup === "declined" ? (
                <>
                  <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">Nie bierzesz udziału</p>
                  {slots.free > 0 ? (
                    <Button className="w-full" onClick={onConfirmFromTentative}>
                      Zmieniam zdanie — gram
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-zinc-500">Skład pełny — nie możesz dołączyć.</p>
                  )}
                </>
              ) : (
                <>
                  {slots.free > 0 ? (
                    <Button className="w-full" onClick={onSignup}>
                      Zapisz się
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-zinc-500">Skład pełny — możesz oznaczyć zainteresowanie.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={lightSecondary} disabled={tentativeBusy} onClick={onTentative}>
                      Nie wiem
                    </button>
                    <button type="button" className={lightSecondary} disabled={tentativeBusy} onClick={onDeclined}>
                      Nie gram
                    </button>
                  </div>
                </>
              )
            ) : (
              <Button className="w-full" asChild>
                <Link href="/login">Zaloguj się, aby się zapisać</Link>
              </Button>
            )}
          </div>

          {isLoggedIn && hotpayEnabled && walletBalancePln !== null && walletBalancePln < 0 && onPayDebt ? (
            <PayButton
              variant="hero"
              amountPln={walletBalancePln}
              busy={debtBusy}
              fullWidth
              onClick={() => onPayDebt(Math.abs(walletBalancePln))}
            />
          ) : null}

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-2 text-sm font-semibold text-[var(--mp-teal-dark)] dark:border-zinc-800">
            {playersData ? (
              <button type="button" className="underline-offset-2 hover:underline" onClick={() => setRosterOpen(true)}>
                Kto gra
              </button>
            ) : null}
            <Link href="/terminarz" className="underline-offset-2 hover:underline">
              Terminarz
            </Link>
            {isLoggedIn && signup === "confirmed" && transportActive ? (
              <Link href={`/transport/${match.id}`} className="underline-offset-2 hover:underline">
                Transport
              </Link>
            ) : null}
            {lineupPublic ? (
              <Link href="/sklady" className="underline-offset-2 hover:underline">
                Składy
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    ) : null}

    <PitchCard
      as="section"
      variant={photoChrome ? "marketplace" : "pitch"}
      className={cn(
        "mt-0 text-white shadow-lg",
        photoChrome && "home-next-match-card hidden border-0 md:block"
      )}
      contentClassName="px-5 py-5 sm:px-6 sm:py-6"
      aria-labelledby="home-next-match-heading"
    >
        {photoChrome ? (
          <>
            <MarketplacePitchPhoto src={backgroundSrc} className="z-0" sizes="(max-width: 768px) 100vw, 720px" />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-black/55 to-black/75"
              aria-hidden
            />
          </>
        ) : null}
        <div className="relative z-10">
        <div className="mb-3 flex items-center gap-3 text-left sm:mb-4 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 ring-2 ring-white/40 sm:h-12 sm:w-12">
            <SiteAssetImage
              asset="logo_crest"
              alt=""
              width={128}
              height={128}
              className="h-9 w-9 drop-shadow sm:h-10 sm:w-10"
              sizes="40px"
            />
          </div>
          <div className="min-w-0">
            <span className={cn(pitchLabelClass, "text-white/80")}>Kolejny termin</span>
            <h2 id="home-next-match-heading" className="text-lg font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.35rem]">
              Najbliższy mecz
            </h2>
            {when.weekday ? <p className="text-sm font-medium capitalize text-white/80">{when.weekday}</p> : null}
          </div>
        </div>

        <SectionPanel photoChrome={photoChrome} src={srcAt(2)} className="mt-0">
          <span className={cn(pitchLabelClass, "mb-2.5 block text-center text-white/80")}>Termin i miejsce</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-950 shadow-md shadow-emerald-950/20">
              <Calendar className="h-3.5 w-3.5 text-emerald-800" aria-hidden />
              {when.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-950 shadow-md shadow-emerald-950/20">
              <Clock className="h-3.5 w-3.5 text-emerald-800" aria-hidden />
              {match.match_time}
            </span>
          </div>
          <div className="mx-auto mt-3 flex max-w-sm items-start justify-center gap-2 text-sm text-white">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
            <div className="min-w-0 text-left">
              <p className="leading-snug">{match.location}</p>
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
              >
                Mapa
              </Link>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel photoChrome={photoChrome} src={srcAt(3)}>
          <MatchLocationWeather
            location={match.location}
            matchDate={match.match_date}
            className="mx-auto mt-0 max-w-sm border-t-0 pt-0"
          />
        </SectionPanel>

        {rentalTotal != null ? (
          <SectionPanel photoChrome={photoChrome} src={srcAt(4)}>
            <span className={cn(pitchLabelClass, "mb-2 block text-center text-white/80")}>Składka</span>
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35">
                <Wallet className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 text-left">
                {perPersonFee != null ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                      Na osobę
                    </p>
                    <p className="text-2xl font-bold tabular-nums tracking-tight text-white drop-shadow-sm">
                      {formatMatchFeePln(perPersonFee)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                      Wynajem boiska
                    </p>
                    <p className="text-2xl font-bold tabular-nums tracking-tight text-white drop-shadow-sm">
                      {formatMatchFeePln(rentalTotal)}
                    </p>
                  </>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-white/80">
              {perPersonFee != null
                ? `Wynajem ${formatMatchFeePln(rentalTotal)} ÷ ${match.signed_up} ${
                    match.signed_up === 1 ? "osoba" : match.signed_up < 5 ? "osoby" : "osób"
                  }`
                : "Składka na osobę pojawi się po pierwszych zapisach."}
            </p>
          </SectionPanel>
        ) : null}

        {gatePin && signup === "confirmed" ? (
          <SectionPanel photoChrome={photoChrome} src={srcAt(5)}>
            <span className={cn(pitchLabelClass, "mb-2 block text-center text-white/80")}>Wejście na boisko</span>
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35">
                <KeyRound className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">PIN do bramy</p>
                <p className="text-2xl font-bold tabular-nums tracking-[0.2em] text-white drop-shadow-sm">{gatePin}</p>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-white/80">
              Wpisz ten kod na bramie, aby wejść na boisko.
            </p>
          </SectionPanel>
        ) : null}

        <SectionPanel photoChrome={photoChrome} src={srcAt(6)}>
          <span className={cn(pitchLabelClass, "mb-2 block text-white/80")}>Skład</span>
          <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
            <span>
              {match.signed_up}/{match.max_slots} zapisanych
            </span>
            {slots.tone === "full" ? (
              <span className="text-red-200">Pełny skład</span>
            ) : slots.free > 0 ? (
              <span className="normal-case tracking-normal text-white/80">
                {slots.free} {slots.free === 1 ? "miejsce" : slots.free < 5 ? "miejsca" : "miejsc"}
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", barClass)}
              style={{ width: `${slots.pct}%` }}
              role="progressbar"
              aria-valuenow={match.signed_up}
              aria-valuemin={0}
              aria-valuemax={match.max_slots}
              aria-label={`Zapełnienie składu: ${match.signed_up} z ${match.max_slots}`}
            />
          </div>
          {tentativeLine ? (
            <p className="mt-2 text-[11px] font-semibold normal-case tracking-normal text-amber-100/95">
              {tentativeLine}
            </p>
          ) : null}
          {playersData ? (
            <button
              type="button"
              className={cn(pitchSecondaryBtnClass, "mt-3")}
              onClick={() => setRosterOpen(true)}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              Zobacz zapisanych graczy
            </button>
          ) : (
            <p className="mt-3 text-center text-xs font-medium normal-case tracking-normal text-white/75">
              Jeszcze nikt się nie zapisał — bądź pierwszy.
            </p>
          )}
        </SectionPanel>

        <div className="mx-auto mt-4 max-w-md space-y-2.5">
          <span className={cn(pitchLabelClass, "block text-center text-white/85")}>Zapis na mecz</span>

          {isLoggedIn ? (
            signup === "confirmed" ? (
              <SectionPanel photoChrome={photoChrome} src={srcAt(7)} className="mt-0">
                <p className="py-1 text-center text-sm font-medium text-white">Jesteś zapisany na ten mecz</p>
              </SectionPanel>
            ) : signup === "tentative" ? (
              <>
                <SectionPanel photoChrome={photoChrome} src={srcAt(7)} className="mt-0">
                  <p className="py-1 text-center text-sm font-medium text-white">
                    Status: jeszcze nie wiem (bez miejsca w składzie)
                  </p>
                </SectionPanel>
                {slots.free > 0 ? (
                  <Button variant="gold" className="w-full" onClick={onConfirmFromTentative}>
                    Potwierdzam — wpadam na mecz
                  </Button>
                ) : (
                  <p className="text-center text-xs text-white/85">
                    Skład jest pełny — nie możesz teraz potwierdzić udziału.
                  </p>
                )}
              </>
            ) : signup === "declined" ? (
              <>
                <SectionPanel photoChrome={photoChrome} src={srcAt(7)} className="mt-0">
                  <p className="py-1 text-center text-sm font-medium text-white">
                    Nie bierzesz udziału w tym terminie (bez miejsca w składzie)
                  </p>
                </SectionPanel>
                {slots.free > 0 ? (
                  <Button variant="gold" className="w-full" onClick={onConfirmFromTentative}>
                    Zmieniam zdanie — wpadam na mecz
                  </Button>
                ) : (
                  <p className="text-center text-xs text-white/85">
                    Skład jest pełny — nie możesz teraz dołączyć do składu.
                  </p>
                )}
              </>
            ) : (
              <>
                {slots.free > 0 ? (
                  <Button variant="gold" className="w-full" onClick={onSignup}>
                    Zapisz się na mecz
                  </Button>
                ) : (
                  <p className="text-center text-xs text-white/85">
                    Skład pełny — możesz oznaczyć wstępne zainteresowanie.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" className={pitchSecondaryBtnClass} disabled={tentativeBusy} onClick={onTentative}>
                    <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
                    Jeszcze nie wiem
                  </button>
                  <button type="button" className={pitchSecondaryBtnClass} disabled={tentativeBusy} onClick={onDeclined}>
                    Nie biorę udziału
                  </button>
                </div>
              </>
            )
          ) : (
            <Button variant="gold" className="w-full" asChild>
              <Link href="/login">Zaloguj się, aby się zapisać</Link>
            </Button>
          )}
        </div>

        {isLoggedIn && hotpayEnabled && walletBalancePln !== null && walletBalancePln < 0 && onPayDebt ? (
          <div className="mx-auto mt-4 max-w-md space-y-2">
            <span className={cn(pitchLabelClass, "block text-center text-white/85")}>Zaległość</span>
            <PayButton
              variant="hero"
              amountPln={walletBalancePln}
              busy={debtBusy}
              fullWidth
              onClick={() => onPayDebt(Math.abs(walletBalancePln))}
            />
          </div>
        ) : null}

        {isLoggedIn && signup === "confirmed" ? (
          <SectionPanel photoChrome={photoChrome} src={srcAt(8)} className="space-y-2">
            <span className={cn(pitchLabelClass, "block text-center text-white/85")}>Transport</span>
            {transportActive ? (
              <Button variant="gold" className="w-full" asChild>
                <Link href={`/transport/${match.id}`} className="inline-flex items-center justify-center gap-2">
                  <Car className="h-4 w-4 shrink-0" aria-hidden />
                  Transport na mecz
                </Link>
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  aria-describedby="transport-home-hint"
                  className={cn(pitchSecondaryBtnClass, "cursor-not-allowed opacity-70")}
                  title="Transport na mecz — dostępny w dniu meczu."
                >
                  <Car className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  Transport na mecz
                </button>
                <p id="transport-home-hint" className="text-center text-xs text-white/85">
                  Przycisk będzie aktywny w dniu meczu (lista kierowców, potrzebujących dojazdu i czat).
                </p>
              </>
            )}
          </SectionPanel>
        ) : null}

        <SectionPanel photoChrome={photoChrome} src={srcAt(9)} className="space-y-2">
          <span className={cn(pitchLabelClass, "block text-center text-white/85")}>Składy</span>
          {lineupPublic ? (
            <Button variant="gold" className="w-full" asChild>
              <Link href="/sklady" className="inline-flex items-center justify-center gap-2">
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                Zobacz składy na mecz
              </Link>
            </Button>
          ) : (
            <>
              <button
                type="button"
                disabled
                aria-describedby="sklady-home-hint"
                className={cn(pitchSecondaryBtnClass, "cursor-not-allowed opacity-70")}
                title="Administrator musi najpierw udostępnić składy w panelu admina."
              >
                <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Składy na mecz
              </button>
              <p id="sklady-home-hint" className="text-center text-xs text-white/80">
                Przycisk będzie aktywny, gdy administrator udostępni składy.
              </p>
            </>
          )}
        </SectionPanel>
        </div>
    </PitchCard>
    {playersData ? (
      <MatchSignupsRosterModal
        open={rosterOpen}
        onOpenChange={setRosterOpen}
        match={match}
        matchId={match.id}
        playersData={rosterPlayersData}
      />
    ) : null}
    </>
  );
}
