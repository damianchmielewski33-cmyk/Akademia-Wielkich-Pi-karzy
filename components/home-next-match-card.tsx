"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Car, Clock, HelpCircle, LayoutGrid, MapPin } from "lucide-react";
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

  const barClass =
    slots.tone === "full" ? "bg-red-400/90" : slots.tone === "warn" ? "bg-amber-400/90" : "bg-white/85";

  return (
    <section
      className="relative mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border-2 border-white/35 text-center shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-950/15"
      aria-labelledby="home-next-match-heading"
    >
      <div className="home-pitch-tile absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-12 w-12 rounded-tr-full border-t-2 border-r-2 border-white/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-12 w-12 rounded-tl-full border-t-2 border-l-2 border-white/45"
        aria-hidden
      />

      <div className="relative px-5 py-5 text-white sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
            <Image
              src="/logo-akademia-crest.png"
              alt=""
              width={128}
              height={128}
              className="h-8 w-8 object-contain drop-shadow"
              sizes="32px"
            />
          </div>
          <h2 id="home-next-match-heading" className="text-xl font-bold tracking-tight drop-shadow-sm sm:text-[1.35rem]">
            Najbliższy mecz
          </h2>
          {when.weekday ? (
            <p className="text-sm font-medium capitalize text-emerald-100/90">{when.weekday}</p>
          ) : null}
        </div>

        <div className="mx-auto flex max-w-sm flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-sm font-semibold tabular-nums backdrop-blur-sm">
            <Calendar className="h-3.5 w-3.5 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
            {when.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-sm font-semibold tabular-nums backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
            {match.match_time}
          </span>
        </div>

        <div className="mx-auto mt-3 flex max-w-md items-start justify-center gap-2 text-sm text-emerald-50/95">
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

        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-white/25 bg-black/10 px-3.5 py-3 backdrop-blur-sm">
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
            <p className="mt-2 text-left text-[11px] font-semibold normal-case tracking-normal text-amber-100/95">
              {tentativeLine}
            </p>
          ) : null}
        </div>

        {isLoggedIn ? (
          signup === "confirmed" ? (
            <div className="mt-4 rounded-xl border border-white/30 bg-white/15 py-3 text-sm font-medium backdrop-blur-sm">
              Jesteś zapisany na ten mecz
            </div>
          ) : signup === "tentative" ? (
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-amber-200/50 bg-amber-500/20 py-2.5 text-sm font-medium backdrop-blur-sm">
                Status: jeszcze nie wiem (bez miejsca w składzie)
              </div>
              {slots.free > 0 ? (
                <Button variant="pitch" className="w-full" onClick={onConfirmFromTentative}>
                  Potwierdzam — wpadam na mecz
                </Button>
              ) : (
                <p className="text-xs text-emerald-100/90">Skład jest pełny — nie możesz teraz potwierdzić udziału.</p>
              )}
            </div>
          ) : signup === "declined" ? (
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-red-200/40 bg-red-950/35 py-2.5 text-sm font-medium backdrop-blur-sm">
                Nie bierzesz udziału w tym terminie (bez miejsca w składzie)
              </div>
              {slots.free > 0 ? (
                <Button variant="pitch" className="w-full" onClick={onConfirmFromTentative}>
                  Zmieniam zdanie — wpadam na mecz
                </Button>
              ) : (
                <p className="text-xs text-emerald-100/90">Skład jest pełny — nie możesz teraz dołączyć do składu.</p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {slots.free > 0 ? (
                <Button variant="pitch" className="w-full" onClick={onSignup}>
                  Zapisz się na mecz
                </Button>
              ) : (
                <p className="text-xs text-emerald-100/90">Skład pełny — możesz oznaczyć wstępne zainteresowanie.</p>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" variant="stadium" className="w-full" disabled={tentativeBusy} onClick={onTentative}>
                  <HelpCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                  Jeszcze nie wiem
                </Button>
                <Button
                  type="button"
                  variant="stadium"
                  className="w-full border-white/25 bg-white/8 text-white/95 hover:bg-white/12"
                  disabled={tentativeBusy}
                  onClick={onDeclined}
                >
                  Nie biorę udziału
                </Button>
              </div>
            </div>
          )
        ) : (
          <Button variant="stadium" className="mt-4 w-full" asChild>
            <Link href="/login">Zaloguj się, aby się zapisać</Link>
          </Button>
        )}

        {isLoggedIn && signup === "confirmed" && (
          <div className="mt-4 space-y-2">
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
                  className="w-full cursor-not-allowed border border-white/25 bg-white/10 font-semibold text-white/70 opacity-80"
                  title="Transport na mecz — dostępny w dniu meczu."
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Car className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    Transport na mecz
                  </span>
                </Button>
                <p id="transport-home-hint" className="text-center text-xs text-emerald-100/85">
                  Przycisk będzie aktywny w dniu meczu (lista kierowców, potrzebujących dojazdu i czat).
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-white/20 pt-4">
          {lineupPublic ? (
            <Button variant="pitch" className="w-full" asChild>
              <Link href="/sklady" className="inline-flex items-center justify-center gap-2">
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                Zobacz składy na mecz
              </Link>
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                disabled
                aria-describedby="sklady-home-hint"
                className="w-full cursor-not-allowed border border-white/25 bg-white/10 font-semibold text-white/70 opacity-80"
                title="Administrator musi najpierw udostępnić składy w panelu admina."
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  Składy na mecz
                </span>
              </Button>
              <p id="sklady-home-hint" className="text-center text-xs text-emerald-100/85">
                Przycisk będzie aktywny, gdy administrator udostępni składy.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
