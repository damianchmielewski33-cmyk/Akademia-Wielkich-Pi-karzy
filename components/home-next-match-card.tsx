"use client";

import Link from "next/link";
import { Calendar, Car, Clock, HelpCircle, KeyRound, LayoutGrid, MapPin } from "lucide-react";
import { SiteAssetImage } from "@/components/site-asset-image";
import { Button } from "@/components/ui/button";
import {
  PitchCard,
  pitchLabelClass,
  pitchPanelClass,
  pitchSecondaryBtnClass,
} from "@/components/ui/pitch-card";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { cn } from "@/lib/utils";
import type { MatchRow } from "@/lib/db";

type SignupState = "none" | "tentative" | "confirmed" | "declined";

type Props = {
  match: MatchRow;
  tentativeLine: string;
  lineupPublic: boolean;
  signup: SignupState;
  transportActive: boolean;
  isLoggedIn: boolean;
  tentativeBusy: boolean;
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

export function HomeNextMatchCard({
  match,
  tentativeLine,
  lineupPublic,
  signup,
  transportActive,
  isLoggedIn,
  tentativeBusy,
  onSignup,
  onTentative,
  onDeclined,
  onConfirmFromTentative,
}: Props) {
  const when = formatMatchWhen(match.match_date, match.match_time);
  const slots = slotMeta(match.signed_up, match.max_slots);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;
  const gatePin = match.gate_pin?.trim() ?? "";

  const barClass =
    slots.tone === "full" ? "bg-red-400/90" : slots.tone === "warn" ? "bg-amber-400/90" : "bg-emerald-100";

  return (
    <PitchCard
      as="section"
      className="mx-auto mt-8 max-w-2xl"
      contentClassName="px-5 py-5 sm:px-6 sm:py-6"
      aria-labelledby="home-next-match-heading"
    >
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className={pitchLabelClass}>Kolejny termin</span>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
            <SiteAssetImage
              asset="logo_crest"
              alt=""
              width={128}
              height={128}
              className="h-8 w-8 drop-shadow"
              sizes="32px"
            />
          </div>
          <h2 id="home-next-match-heading" className="text-xl font-bold tracking-tight drop-shadow-sm sm:text-[1.35rem]">
            Najbliższy mecz
          </h2>
          {when.weekday ? <p className="text-sm font-medium capitalize text-emerald-100/90">{when.weekday}</p> : null}
        </div>

        <div className={cn(pitchPanelClass, "mx-auto max-w-md px-3.5 py-3.5")}>
          <span className={cn(pitchLabelClass, "mb-2.5 block text-center")}>Termin i miejsce</span>
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
          <div className="mx-auto mt-3 flex max-w-sm items-start justify-center gap-2 text-sm text-emerald-50/95">
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
          <MatchLocationWeather
            location={match.location}
            matchDate={match.match_date}
            className="mx-auto max-w-sm"
          />
        </div>

        {gatePin && signup === "confirmed" ? (
          <div className={cn(pitchPanelClass, "mx-auto mt-3 max-w-md px-3.5 py-3")}>
            <span className={cn(pitchLabelClass, "mb-2 block text-center")}>Wejście na boisko</span>
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35">
                <KeyRound className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100/85">PIN do bramy</p>
                <p className="text-2xl font-bold tabular-nums tracking-[0.2em] text-white drop-shadow-sm">{gatePin}</p>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-emerald-100/85">
              Wpisz ten kod na bramie, aby wejść na boisko.
            </p>
          </div>
        ) : null}

        <div className={cn(pitchPanelClass, "mx-auto mt-3 max-w-md px-3.5 py-3")}>
          <span className={cn(pitchLabelClass, "mb-2 block")}>Skład</span>
          <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
            <span>
              {match.signed_up}/{match.max_slots} zapisanych
            </span>
            {slots.tone === "full" ? (
              <span className="text-red-200">Pełny skład</span>
            ) : slots.free > 0 ? (
              <span className="normal-case tracking-normal text-emerald-100/90">
                {slots.free} {slots.free === 1 ? "miejsce" : slots.free < 5 ? "miejsca" : "miejsc"}
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
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
        </div>

        <div className="mx-auto mt-4 max-w-md space-y-2.5">
          <span className={cn(pitchLabelClass, "block text-center")}>Zapis na mecz</span>

          {isLoggedIn ? (
            signup === "confirmed" ? (
              <div className={cn(pitchPanelClass, "py-3 text-center text-sm font-medium")}>Jesteś zapisany na ten mecz</div>
            ) : signup === "tentative" ? (
              <>
                <div className={cn(pitchPanelClass, "border-amber-200/40 bg-amber-500/15 py-2.5 text-center text-sm font-medium")}>
                  Status: jeszcze nie wiem (bez miejsca w składzie)
                </div>
                {slots.free > 0 ? (
                  <Button variant="pitch" className="w-full" onClick={onConfirmFromTentative}>
                    Potwierdzam — wpadam na mecz
                  </Button>
                ) : (
                  <p className="text-center text-xs text-emerald-100/90">
                    Skład jest pełny — nie możesz teraz potwierdzić udziału.
                  </p>
                )}
              </>
            ) : signup === "declined" ? (
              <>
                <div className={cn(pitchPanelClass, "border-red-200/35 bg-red-950/25 py-2.5 text-center text-sm font-medium")}>
                  Nie bierzesz udziału w tym terminie (bez miejsca w składzie)
                </div>
                {slots.free > 0 ? (
                  <Button variant="pitch" className="w-full" onClick={onConfirmFromTentative}>
                    Zmieniam zdanie — wpadam na mecz
                  </Button>
                ) : (
                  <p className="text-center text-xs text-emerald-100/90">
                    Skład jest pełny — nie możesz teraz dołączyć do składu.
                  </p>
                )}
              </>
            ) : (
              <>
                {slots.free > 0 ? (
                  <Button variant="pitch" className="w-full" onClick={onSignup}>
                    Zapisz się na mecz
                  </Button>
                ) : (
                  <p className="text-center text-xs text-emerald-100/90">
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
            <Button variant="pitch" className="w-full" asChild>
              <Link href="/login">Zaloguj się, aby się zapisać</Link>
            </Button>
          )}
        </div>

        {isLoggedIn && signup === "confirmed" && (
          <div className="mx-auto mt-4 max-w-md space-y-2">
            <span className={cn(pitchLabelClass, "block text-center")}>Transport</span>
            {transportActive ? (
              <Button variant="pitch" className="w-full" asChild>
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
                <p id="transport-home-hint" className="text-center text-xs text-emerald-100/85">
                  Przycisk będzie aktywny w dniu meczu (lista kierowców, potrzebujących dojazdu i czat).
                </p>
              </>
            )}
          </div>
        )}

        <div className="mx-auto mt-4 max-w-md space-y-2 border-t border-white/20 pt-4">
          <span className={cn(pitchLabelClass, "block text-center")}>Składy</span>
          {lineupPublic ? (
            <Button variant="pitch" className="w-full" asChild>
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
              <p id="sklady-home-hint" className="text-center text-xs text-emerald-100/85">
                Przycisk będzie aktywny, gdy administrator udostępni składy.
              </p>
            </>
          )}
        </div>
    </PitchCard>
  );
}
