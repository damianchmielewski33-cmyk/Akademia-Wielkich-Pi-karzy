"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  HelpCircle,
  LayoutGrid,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { Button } from "@/components/ui/button";
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

function formatMatchDatePl(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    return { dayMonth: isoDate.slice(5).replace("-", "."), year: isoDate.slice(0, 4), weekday: "" };
  }
  const dt = new Date(y, m - 1, d);
  return {
    dayMonth: `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`,
    year: String(y),
    weekday: dt.toLocaleDateString("pl-PL", { weekday: "long" }),
  };
}

function capacityMeta(signed: number, max: number) {
  const free = Math.max(0, max - signed);
  const pct = max > 0 ? Math.min(100, (signed / max) * 100) : 0;
  if (max <= 0) return { free, pct, tone: "neutral" as const, label: "Brak limitu miejsc" };
  if (signed >= max) return { free, pct, tone: "full" as const, label: "Skład pełny" };
  if (pct >= 80) return { free, pct, tone: "warn" as const, label: `Zostało ${free} ${free === 1 ? "miejsce" : free < 5 ? "miejsca" : "miejsc"}` };
  return { free, pct, tone: "ok" as const, label: `Zostało ${free} ${free === 1 ? "miejsce" : free < 5 ? "miejsca" : "miejsc"}` };
}

function SignupStatusBanner({ signup }: { signup: SignupState }) {
  if (signup === "confirmed") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        Jesteś zapisany na ten mecz
      </div>
    );
  }
  if (signup === "tentative") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100">
        <HelpCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        Status: jeszcze nie wiem (bez miejsca w składzie)
      </div>
    );
  }
  if (signup === "declined") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-red-200/70 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100">
        <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        Nie bierzesz udziału w tym terminie
      </div>
    );
  }
  return null;
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
  const date = formatMatchDatePl(match.match_date);
  const capacity = capacityMeta(match.signed_up, match.max_slots);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;

  const barTone =
    capacity.tone === "full"
      ? "bg-red-500"
      : capacity.tone === "warn"
        ? "bg-amber-500"
        : "bg-[var(--mundial-teal,#00a651)]";

  return (
    <section className="mx-auto mt-8 max-w-3xl text-left" aria-labelledby="home-next-match-heading">
      <article
        className={cn(
          "overflow-hidden rounded-2xl border bg-white shadow-lg shadow-emerald-950/10 dark:bg-zinc-900/95",
          capacity.tone === "full"
            ? "border-red-200 dark:border-red-900/45"
            : capacity.tone === "warn"
              ? "border-amber-200 dark:border-amber-900/45"
              : "border-emerald-200/90 dark:border-emerald-800/40"
        )}
      >
        <div className="mundial-card-header px-4 py-4 text-white sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                <Image
                  src="/logo-akademia-crest.png"
                  alt=""
                  width={128}
                  height={128}
                  className="h-7 w-7 object-contain"
                  sizes="28px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mundial-gold,#f5c518)]">
                  Kolejny termin
                </p>
                <h2 id="home-next-match-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
                  Najbliższy mecz
                </h2>
                {date.weekday ? (
                  <p className="mt-0.5 text-sm capitalize text-white/80">{date.weekday}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm ring-1 ring-white/20">
                <Calendar className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
                <span className="mt-1 text-base font-bold tabular-nums leading-none">{date.dayMonth}</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/75">
                  {date.year}
                </span>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
                  <span className="text-2xl font-bold tabular-nums">{match.match_time}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 sm:hidden">
            <Clock className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
            <span className="text-lg font-bold tabular-nums">{match.match_time}</span>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mundial-teal,#00a651)]" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{match.location}</p>
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-900 dark:text-emerald-400 dark:decoration-emerald-400/40 dark:hover:text-emerald-300"
              >
                Otwórz w Google Maps
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3.5 py-3 dark:border-zinc-700/70 dark:bg-zinc-800/50">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden />
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {match.signed_up}/{match.max_slots} zapisanych
                </p>
              </div>
              <p
                className={cn(
                  "text-xs font-medium",
                  capacity.tone === "full"
                    ? "text-red-700 dark:text-red-300"
                    : capacity.tone === "warn"
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-emerald-800 dark:text-emerald-300"
                )}
              >
                {capacity.label}
              </p>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-zinc-200/90 dark:bg-zinc-700/80">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barTone)}
                style={{ width: `${capacity.pct}%` }}
                role="progressbar"
                aria-valuenow={match.signed_up}
                aria-valuemin={0}
                aria-valuemax={match.max_slots}
                aria-label={`Zapełnienie składu: ${match.signed_up} z ${match.max_slots}`}
              />
            </div>
            {tentativeLine ? (
              <p className="mt-2 text-xs font-medium text-amber-800/95 dark:text-amber-200/90">{tentativeLine}</p>
            ) : null}
          </div>

          <MatchLocationWeather location={match.location} className="!mt-0 border-zinc-200/80 dark:border-zinc-700/60" />

          {isLoggedIn && signup !== "none" ? <SignupStatusBanner signup={signup} /> : null}

          {isLoggedIn ? (
            <div className="space-y-2.5">
              {signup === "confirmed" ? null : signup === "tentative" || signup === "declined" ? (
                capacity.free > 0 ? (
                  <Button variant="pitch" className="w-full" onClick={onConfirmFromTentative}>
                    {signup === "declined" ? "Zmieniam zdanie — wpadam na mecz" : "Potwierdzam — wpadam na mecz"}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
                    Skład jest pełny — nie możesz teraz dołączyć do składu.
                  </p>
                )
              ) : (
                <>
                  {capacity.free > 0 ? (
                    <Button variant="pitch" className="w-full" onClick={onSignup}>
                      Zapisz się na mecz
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
                      Skład pełny — możesz oznaczyć wstępne zainteresowanie.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" disabled={tentativeBusy} onClick={onTentative}>
                      <HelpCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                      Jeszcze nie wiem
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      disabled={tentativeBusy}
                      onClick={onDeclined}
                    >
                      Nie biorę udziału
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button variant="pitch" className="w-full" asChild>
              <Link href="/login">Zaloguj się, aby się zapisać</Link>
            </Button>
          )}

          {isLoggedIn && signup === "confirmed" ? (
            <div className="space-y-2 border-t border-zinc-200/80 pt-4 dark:border-zinc-700/60">
              {transportActive ? (
                <Button variant="pitch" className="w-full" asChild>
                  <Link href={`/transport/${match.id}`} className="inline-flex items-center justify-center gap-2">
                    <Car className="h-4 w-4 shrink-0" aria-hidden />
                    Transport na mecz
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    disabled
                    aria-describedby="transport-home-hint"
                    variant="outline"
                    className="w-full cursor-not-allowed opacity-70"
                    title="Transport na mecz — dostępny w dniu meczu."
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <Car className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      Transport na mecz
                    </span>
                  </Button>
                  <p id="transport-home-hint" className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Przycisk będzie aktywny w dniu meczu (lista kierowców, potrzebujących dojazdu i czat).
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-700/60">
            {lineupPublic ? (
              <Button variant="outline" className="w-full border-emerald-300/80 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/40" asChild>
                <Link href="/sklady" className="inline-flex items-center justify-center gap-2">
                  <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                  Zobacz składy na mecz
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  disabled
                  aria-describedby="sklady-home-hint"
                  variant="outline"
                  className="w-full cursor-not-allowed opacity-70"
                  title="Administrator musi najpierw udostępnić składy w panelu admina."
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    Składy na mecz
                  </span>
                </Button>
                <p id="sklady-home-hint" className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Przycisk będzie aktywny, gdy administrator udostępni składy.
                </p>
              </>
            )}
          </div>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/terminarz" className="font-semibold text-emerald-700 underline decoration-emerald-700/30 underline-offset-2 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300">
              Pełny terminarz
            </Link>
            {" · "}
            wszystkie terminy i zapisy
          </p>
        </div>
      </article>
    </section>
  );
}
