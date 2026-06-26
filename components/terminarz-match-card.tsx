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
        "group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-md transition-shadow hover:shadow-lg dark:bg-zinc-900/90",
        cancelled
          ? "border-red-300/80 opacity-90 dark:border-red-800/60"
          : tone === "full"
            ? "border-red-200 dark:border-red-900/50"
            : tone === "warn"
              ? "border-amber-200 dark:border-amber-900/50"
              : "border-emerald-200/80 dark:border-emerald-800/40",
        highlight && "ring-2 ring-[var(--mundial-gold,#f5c518)] ring-offset-2 dark:ring-offset-zinc-950"
      )}
    >
      <div
        className={cn(
          "relative px-4 py-3 sm:px-5",
          cancelled
            ? "bg-gradient-to-r from-red-700 to-red-800 text-white"
            : "mundial-card-header text-white"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl bg-white/15 px-3 py-1.5 backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
              <span className="mt-0.5 text-sm font-bold tabular-nums">{m.match_date.slice(5).replace("-", ".")}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                {m.match_date.slice(0, 4)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
                <span className="text-lg font-bold tabular-nums">{m.match_time}</span>
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
          <div className="text-right">
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

      <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
        <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mundial-teal,#00a651)]" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium leading-snug">{m.location}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-block text-xs font-medium text-[var(--mundial-teal,#00a651)] underline-offset-2 hover:underline"
            >
              Mapa
            </a>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "full" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-[var(--mundial-teal,#00a651)]"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {onOpenPlayers && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onOpenPlayers}>
              <Users className="h-4 w-4" aria-hidden />
              Skład
            </Button>
          )}
          {!past && onCopyInvite && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onCopyInvite}>
              <Link2 className="h-4 w-4" aria-hidden />
              Zaproszenie
            </Button>
          )}
          {isAdmin && onManage && !cancelled && (
            <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={onManage}>
              <Settings className="h-4 w-4" aria-hidden />
              Zarządzaj
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200/80 pt-4 dark:border-zinc-700/80">{actions}</div>

        {!archive && (
          <details className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-700/60 dark:bg-zinc-800/40">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
              Pogoda — rozwiń
            </summary>
            <div className="border-t border-zinc-200/70 px-2 pb-2 pt-1 dark:border-zinc-700/60">
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
  const cls =
    variant === "primary"
      ? "gap-1.5 bg-[var(--mundial-teal,#00a651)] hover:bg-[var(--mundial-teal-dark,#008c44)]"
      : variant === "danger"
        ? "gap-1.5 border-red-200 text-red-800 hover:bg-red-50 dark:border-red-800 dark:text-red-200"
        : variant === "admin"
          ? "gap-1.5"
          : "gap-1.5";
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
      <Button type="button" size="sm" variant="outline" className={cls} asChild>
        <Link href={href}>{icon}{children}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={variant === "primary" ? "default" : variant === "admin" ? "secondary" : "outline"}
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
