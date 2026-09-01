"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Calendar, Clock, HelpCircle, KeyRound, LayoutGrid, MapPin, Users, Wallet } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MatchSignupsRosterModal } from "@/components/match-signups-roster-modal";
import { SiteAssetImage } from "@/components/site-asset-image";
import { Button } from "@/components/ui/button";
import { mpIconWrapClass, mpInnerPanelClass, mpSectionCardClass } from "@/components/marketplace-section";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { cn, isValidMatchFee } from "@/lib/utils";
import { formatMatchFeePln, perPersonMatchFeePln } from "@/lib/match-fee";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { PayButton } from "@/components/pay-button";

type SignupState = "none" | "tentative" | "confirmed" | "declined";

const labelClass = "text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]";

type Props = {
  match: MatchRow;
  backgroundSrc?: string;
  photoPool?: string[];
  playersData?: PlayersDataEntry | null;
  tentativeLine: string;
  lineupPublic: boolean;
  signup: SignupState;
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

function PhotoPanel({
  src,
  className,
  children,
}: {
  src: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <MarketplacePitchPhoto src={src} className="z-0" sizes="(max-width: 768px) 100vw, 480px" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/50 to-black/70" aria-hidden />
      <div className="relative z-10 p-4 text-white">{children}</div>
    </div>
  );
}

function InfoPanel({
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
      <PhotoPanel src={src} className={cn("mt-3", className)}>
        {children}
      </PhotoPanel>
    );
  }
  return <div className={cn(mpInnerPanelClass, "mt-3", className)}>{children}</div>;
}

export function HomeNextMatchCard({
  match,
  backgroundSrc = "",
  photoPool,
  playersData = null,
  tentativeLine,
  lineupPublic,
  signup,
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
    slots.tone === "full"
      ? "bg-red-500"
      : slots.tone === "warn"
        ? "bg-amber-400"
        : "bg-[var(--mp-teal)]";
  const photoChrome = Boolean(photoPool && photoPool.length > 0);
  const srcAt = (index: number) => pickPhoto(photoPool, backgroundSrc, index);
  const onPhoto = photoChrome;
  const mutedClass = onPhoto ? "text-white/80" : "text-zinc-500 dark:text-zinc-400";
  const bodyClass = onPhoto ? "text-white" : "text-zinc-950 dark:text-white";
  const labelOnPanel = onPhoto ? "text-white/85" : labelClass;

  return (
    <>
      <section
        className={cn(mpSectionCardClass, "relative overflow-hidden p-0")}
        aria-labelledby="home-next-match-heading"
      >
        {backgroundSrc ? (
          <div className="relative h-36 w-full sm:h-44">
            <MarketplacePitchPhoto src={backgroundSrc} className="z-0" sizes="(max-width: 768px) 100vw, 720px" priority />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/70" aria-hidden />
            <div className="relative z-10 flex h-full items-end p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 ring-2 ring-white/40">
                  <SiteAssetImage asset="logo_crest" alt="" width={128} height={128} className="h-9 w-9" sizes="40px" />
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/80">Kolejny termin</p>
                  <h2 id="home-next-match-heading" className="text-lg font-black tracking-tight text-white sm:text-xl">
                    Najbliższy mecz
                  </h2>
                  {when.weekday ? <p className="text-sm font-medium capitalize text-white/80">{when.weekday}</p> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={cn("space-y-0", backgroundSrc ? "p-5 sm:p-6" : "p-5 sm:p-6")}>
          {!backgroundSrc ? (
            <div className="mb-4 flex items-center gap-3">
              <span className={mpIconWrapClass}>
                <Calendar className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className={labelClass}>Kolejny termin</p>
                <h2 id="home-next-match-heading" className="text-lg font-black tracking-tight text-zinc-950 dark:text-white sm:text-xl">
                  Najbliższy mecz
                </h2>
                {when.weekday ? <p className={cn("text-sm font-medium capitalize", mutedClass)}>{when.weekday}</p> : null}
              </div>
            </div>
          ) : null}

          <InfoPanel photoChrome={photoChrome} src={srcAt(2)} className="mt-0">
            <span className={cn("mb-2.5 block text-center", labelOnPanel)}>Termin i miejsce</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold tabular-nums text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-200">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {when.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold tabular-nums text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-200">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {match.match_time}
              </span>
            </div>
            <div className={cn("mx-auto mt-3 flex max-w-sm items-start justify-center gap-2 text-sm", bodyClass)}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mp-teal)]" aria-hidden />
              <div className="min-w-0 text-left">
                <p className="leading-snug">{match.location}</p>
                <Link
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-1 inline-block text-xs font-semibold underline underline-offset-2",
                    onPhoto ? "text-white/85 hover:text-white" : "text-[var(--mp-teal-dark)]"
                  )}
                >
                  Mapa
                </Link>
              </div>
            </div>
          </InfoPanel>

          <InfoPanel photoChrome={photoChrome} src={srcAt(3)}>
            <MatchLocationWeather
              location={match.location}
              matchDate={match.match_date}
              className="mx-auto mt-0 max-w-sm border-t-0 pt-0"
            />
          </InfoPanel>

          {rentalTotal != null ? (
            <InfoPanel photoChrome={photoChrome} src={srcAt(4)}>
              <span className={cn("mb-2 block text-center", labelOnPanel)}>Składka</span>
              <div className="flex items-center justify-center gap-3">
                <span className={onPhoto ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15" : mpIconWrapClass}>
                  <Wallet className={cn("h-5 w-5", onPhoto ? "text-white" : "text-white")} strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0 text-left">
                  <p className={cn("text-[11px] font-semibold uppercase tracking-wide", mutedClass)}>
                    {perPersonFee != null ? "Na osobę" : "Wynajem boiska"}
                  </p>
                  <p className={cn("text-2xl font-bold tabular-nums tracking-tight", bodyClass)}>
                    {formatMatchFeePln(perPersonFee ?? rentalTotal)}
                  </p>
                </div>
              </div>
              <p className={cn("mt-2 text-center text-[11px] leading-snug", mutedClass)}>
                {perPersonFee != null
                  ? `Wynajem ${formatMatchFeePln(rentalTotal)} ÷ ${match.signed_up} ${
                      match.signed_up === 1 ? "osoba" : match.signed_up < 5 ? "osoby" : "osób"
                    }`
                  : "Składka na osobę pojawi się po pierwszych zapisach."}
              </p>
            </InfoPanel>
          ) : null}

          {gatePin && signup === "confirmed" ? (
            <InfoPanel photoChrome={photoChrome} src={srcAt(5)}>
              <span className={cn("mb-2 block text-center", labelOnPanel)}>Wejście na boisko</span>
              <div className="flex items-center justify-center gap-3">
                <span className={onPhoto ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15" : mpIconWrapClass}>
                  <KeyRound className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
                </span>
                <div className="text-left">
                  <p className={cn("text-[11px] font-semibold uppercase tracking-wide", mutedClass)}>PIN do bramy</p>
                  <p className={cn("text-2xl font-bold tabular-nums tracking-[0.2em]", bodyClass)}>{gatePin}</p>
                </div>
              </div>
            </InfoPanel>
          ) : null}

          <InfoPanel photoChrome={photoChrome} src={srcAt(6)}>
            <span className={cn("mb-2 block", labelOnPanel)}>Skład</span>
            <div className={cn("flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider", mutedClass)}>
              <span>
                {match.signed_up}/{match.max_slots} zapisanych
              </span>
              {slots.tone === "full" ? (
                <span className="text-red-500">Pełny skład</span>
              ) : slots.free > 0 ? (
                <span className="normal-case tracking-normal">{slots.free} wolnych miejsc</span>
              ) : null}
            </div>
            <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full", onPhoto ? "bg-white/20" : "bg-zinc-200 dark:bg-zinc-700")}>
              <div className={cn("h-full rounded-full transition-[width] duration-500", barClass)} style={{ width: `${slots.pct}%` }} />
            </div>
            {tentativeLine ? <p className="mt-2 text-[11px] font-semibold text-amber-600 dark:text-amber-300">{tentativeLine}</p> : null}
            {playersData ? (
              <Button type="button" variant="outline" className="mt-3 w-full rounded-full" onClick={() => setRosterOpen(true)}>
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                Zobacz zapisanych graczy
              </Button>
            ) : (
              <p className={cn("mt-3 text-center text-xs font-medium", mutedClass)}>Jeszcze nikt się nie zapisał — bądź pierwszy.</p>
            )}
          </InfoPanel>

          <div className="mt-4 space-y-2.5">
            <span className={cn("block text-center", labelClass)}>Zapis na mecz</span>
            {isLoggedIn ? (
              signup === "confirmed" ? (
                <div className={cn(mpInnerPanelClass, "text-center text-sm font-medium text-zinc-700 dark:text-zinc-200")}>
                  Jesteś zapisany na ten mecz
                </div>
              ) : signup === "tentative" ? (
                <>
                  <div className={cn(mpInnerPanelClass, "text-center text-sm font-medium text-zinc-700 dark:text-zinc-200")}>
                    Status: jeszcze nie wiem (bez miejsca w składzie)
                  </div>
                  {slots.free > 0 ? (
                    <Button className="w-full rounded-full font-bold" onClick={onConfirmFromTentative}>
                      Potwierdzam — wpadam na mecz
                    </Button>
                  ) : (
                    <p className={cn("text-center text-xs", mutedClass)}>Skład jest pełny — nie możesz teraz potwierdzić udziału.</p>
                  )}
                </>
              ) : signup === "declined" ? (
                <>
                  <div className={cn(mpInnerPanelClass, "text-center text-sm font-medium text-zinc-700 dark:text-zinc-200")}>
                    Nie bierzesz udziału w tym terminie
                  </div>
                  {slots.free > 0 ? (
                    <Button className="w-full rounded-full font-bold" onClick={onConfirmFromTentative}>
                      Zmieniam zdanie — wpadam na mecz
                    </Button>
                  ) : (
                    <p className={cn("text-center text-xs", mutedClass)}>Skład jest pełny.</p>
                  )}
                </>
              ) : (
                <>
                  {slots.free > 0 ? (
                    <Button className="w-full rounded-full font-bold" onClick={onSignup}>
                      Zapisz się na mecz
                    </Button>
                  ) : (
                    <p className={cn("text-center text-xs", mutedClass)}>Skład pełny — możesz oznaczyć wstępne zainteresowanie.</p>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" className="rounded-full" disabled={tentativeBusy} onClick={onTentative}>
                      <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
                      Jeszcze nie wiem
                    </Button>
                    <Button type="button" variant="outline" className="rounded-full" disabled={tentativeBusy} onClick={onDeclined}>
                      Nie biorę udziału
                    </Button>
                  </div>
                </>
              )
            ) : (
              <Button className="w-full rounded-full font-bold" asChild>
                <Link href="/login">Zaloguj się, aby się zapisać</Link>
              </Button>
            )}
          </div>

          {isLoggedIn && hotpayEnabled && walletBalancePln != null && walletBalancePln < 0 && onPayDebt ? (
            <div className="mt-4 space-y-2">
              <span className={cn("block text-center", labelClass)}>Zaległość</span>
              <PayButton variant="default" amountPln={walletBalancePln} busy={debtBusy} fullWidth onClick={() => onPayDebt(Math.abs(walletBalancePln))} />
            </div>
          ) : null}

          <InfoPanel photoChrome={photoChrome} src={srcAt(9)} className="space-y-2">
            <span className={cn("block text-center", labelOnPanel)}>Składy</span>
            {lineupPublic ? (
              <Button className="w-full rounded-full font-bold" asChild>
                <Link href="/sklady" className="inline-flex items-center justify-center gap-2">
                  <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                  Zobacz składy na mecz
                </Link>
              </Button>
            ) : (
              <p className={cn("text-center text-xs", mutedClass)}>Składy będą dostępne, gdy administrator je udostępni.</p>
            )}
          </InfoPanel>

          <div className={cn("mt-3 grid gap-2", playersData ? "grid-cols-1 xs:grid-cols-2" : "grid-cols-1")}>
            {playersData ? (
              <Button className="w-full rounded-full font-bold" type="button" onClick={() => setRosterOpen(true)}>
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                Kto gra
              </Button>
            ) : null}
            <Button className="w-full rounded-full font-bold" variant="outline" asChild>
              <Link href="/terminarz" className="inline-flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                Terminarz
              </Link>
            </Button>
          </div>
        </div>
      </section>

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
