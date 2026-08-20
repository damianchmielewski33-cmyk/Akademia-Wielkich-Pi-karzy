"use client";

import Link from "next/link";
import { Calendar, Car, Clock, HelpCircle, KeyRound, LayoutGrid, MapPin, Wallet } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
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
import { PayButton } from "@/components/pay-button";
import type { ReactNode } from "react";

type SignupState = "none" | "tentative" | "confirmed" | "declined";

type Props = {
  match: MatchRow;
  backgroundSrc?: string;
  photoPool?: string[];
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
  src,
  className,
  children,
}: {
  src: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto mt-3 max-w-md overflow-hidden rounded-xl px-3.5 py-3.5 text-white shadow-md",
        className
      )}
    >
      <MarketplacePitchPhoto src={src} className="absolute inset-0 z-0 h-full w-full" sizes="(max-width: 768px) 100vw, 420px" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-black/55 to-black/70"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
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

  return (
    <PitchCard
      as="section"
      variant={photoChrome ? "marketplace" : "pitch"}
      className={cn("mt-0 text-white shadow-lg", photoChrome && "home-next-match-card border-0")}
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
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className={cn(pitchLabelClass, "text-white/80")}>Kolejny termin</span>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 ring-2 ring-white/40">
            <SiteAssetImage
              asset="logo_crest"
              alt=""
              width={128}
              height={128}
              className="h-10 w-10 drop-shadow"
              sizes="40px"
            />
          </div>
          <h2 id="home-next-match-heading" className="text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.35rem]">
            Najbliższy mecz
          </h2>
          {when.weekday ? <p className="text-sm font-medium capitalize text-white/80">{when.weekday}</p> : null}
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
  );
}
