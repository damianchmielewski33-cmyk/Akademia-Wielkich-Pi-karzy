"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, Link2, MapPin, Settings, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PitchCardDecorations, pitchLabelClass, pitchPanelClass } from "@/components/ui/pitch-card";
import { cn } from "@/lib/utils";

type Props = {
  match: MatchRow;
  highlight?: boolean;
  past?: boolean;
  playersData: Record<number, PlayersDataEntry>;
  actions: ReactNode;
  isAdmin?: boolean;
  onManage?: () => void;
  onCopyInvite?: () => void;
  onOpenPlayers?: () => void;
  archive?: boolean;
};

function capacityTone(signed: number, max: number) {
  if (max <= 0) return "neutral" as const;
  const p = (signed / max) * 100;
  if (p >= 100) return "full" as const;
  if (p >= 80) return "warn" as const;
  return "ok" as const;
}

export function TerminarzMatchCard({
  match: m,
  highlight,
  past,
  playersData,
  actions,
  isAdmin,
  onManage,
  onCopyInvite,
  onOpenPlayers,
  archive,
}: Props) {
  const tone = capacityTone(m.signed_up, m.max_slots);
  const pct = m.max_slots > 0 ? (m.signed_up / m.max_slots) * 100 : 0;
  const cancelled = m.cancelled === 1;

  return (
    <article
      data-mecz-highlight={highlight ? m.id : undefined}
      className={cn(
        "pitch-card home-pitch-tile group relative flex flex-col transition-shadow hover:shadow-xl",
        cancelled && "opacity-90",
        highlight && "ring-2 ring-[var(--mundial-gold,#f5c518)] ring-offset-2 ring-offset-transparent"
      )}
    >
      <PitchCardDecorations />
      <div className="relative px-4 py-3 sm:px-5">
        <span className={pitchLabelClass}>{cancelled ? "Anulowany" : past ? "Archiwum" : "Mecz"}</span>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl bg-white/15 px-3 py-1.5 backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
              <span className="mt-0.5 text-sm font-bold tabular-nums text-white">{m.match_date.slice(5).replace("-", ".")}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                {m.match_date.slice(0, 4)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
                <span className="text-lg font-bold tabular-nums text-white">{m.match_time}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {cancelled && (
                  <Badge className="border-red-300/40 bg-red-500/90 text-white hover:bg-red-500/90">Anulowany</Badge>
                )}
                {past && !archive && !cancelled && (
                  <Badge variant="outline" className="border-amber-300/50 bg-amber-500/20 text-amber-100">
                    Termin minął
                  </Badge>
                )}
                {archive && (
                  <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                    Rozegrany
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-white">
            <MatchSignupCountsBlock
              matchId={m.id}
              signedUp={m.signed_up}
              maxSlots={m.max_slots}
              playersData={playersData}
              variant="card"
              tone="zinc"
            />
          </div>
        </div>
      </div>

      <div className={cn(pitchPanelClass, "relative mx-4 mb-4 flex flex-1 flex-col px-4 py-4 sm:mx-5 sm:px-5")}>
        <div className="flex items-start gap-2 text-sm text-emerald-50/95">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium leading-snug">{m.location}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
              target="_blank"
              rel="noreferrer"
              className="pitch-link mt-0.5 inline-block text-xs"
            >
              Mapa
            </a>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "full" ? "bg-red-400/90" : tone === "warn" ? "bg-amber-400/90" : "bg-emerald-100"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {onOpenPlayers && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("awp-match-btn awp-match-btn--secondary awp-match-btn--compact gap-1.5 font-medium")}
              onClick={onOpenPlayers}
            >
              <Users className="h-4 w-4" aria-hidden />
              Skład
            </Button>
          )}
          {!past && onCopyInvite && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("awp-match-btn awp-match-btn--secondary awp-match-btn--compact gap-1.5 font-medium")}
              onClick={onCopyInvite}
            >
              <Link2 className="h-4 w-4" aria-hidden />
              Zaproszenie
            </Button>
          )}
          {isAdmin && onManage && !cancelled && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("awp-match-btn awp-match-btn--admin awp-match-btn--compact gap-1.5 font-semibold")}
              onClick={onManage}
            >
              <Settings className="h-4 w-4" aria-hidden />
              Zarządzaj
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/20 pt-4">{actions}</div>

        {!archive && (
          <details className="pitch-panel mt-3">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--mundial-gold,#f5c518)] [&::-webkit-details-marker]:hidden">
              Pogoda — rozwiń
            </summary>
            <div className="border-t border-white/15 px-2 pb-2 pt-1">
              <MatchLocationWeather location={m.location} className="mt-0 border-t-0 pt-2" />
            </div>
          </details>
        )}
      </div>
    </article>
  );
}

export function TerminarzQuickBtn({
  variant,
  children,
  onClick,
  disabled,
  title,
  href,
}: {
  variant: "primary" | "danger" | "admin" | "outline";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  href?: string;
}) {
  const toneClass =
    variant === "primary"
      ? "awp-match-btn--primary"
      : variant === "danger"
        ? "awp-match-btn--danger"
        : variant === "admin"
          ? "awp-match-btn--admin"
          : "awp-match-btn--secondary";
  const cls = cn("awp-match-btn awp-match-btn--compact gap-1.5 font-semibold", toneClass);
  const icon =
    variant === "primary" ? (
      <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
    ) : variant === "danger" ? (
      <UserMinus className="h-4 w-4 shrink-0" aria-hidden />
    ) : variant === "admin" ? (
      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
    ) : null;

  if (href) {
    return (
      <Button type="button" size="sm" variant="ghost" className={cls} asChild>
        <Link href={href}>{icon}{children}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled}
      title={title}
      className={cls}
      onClick={onClick}
    >
      {icon}
      {children}
    </Button>
  );
}
