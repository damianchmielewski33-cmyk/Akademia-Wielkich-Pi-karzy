"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, Link2, MapPin, Settings, ShieldCheck, UserMinus, UserPlus, Users, Wallet } from "lucide-react";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { PhotoPanel } from "@/components/photo-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pitchPhotoAt } from "@/lib/marketplace-photos";
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
  onCopyPayments?: () => void;
  onOpenPlayers?: () => void;
  archive?: boolean;
  photoSrc?: string;
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
  onCopyPayments,
  onOpenPlayers,
  archive,
  photoSrc,
}: Props) {
  const tone = capacityTone(m.signed_up, m.max_slots);
  const pct = m.max_slots > 0 ? (m.signed_up / m.max_slots) * 100 : 0;
  const cancelled = m.cancelled === 1;
  const src = photoSrc ?? pitchPhotoAt(m.id);

  return (
    <PhotoPanel
      src={src}
      className={cn(
        "flex min-h-[22rem] flex-col transition hover:-translate-y-0.5 hover:shadow-xl",
        cancelled && "opacity-90",
        highlight && "ring-2 ring-[var(--mp-teal)] ring-offset-2 ring-offset-transparent"
      )}
      contentClassName="flex h-full flex-col p-4 sm:p-5"
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 380px"
    >
      <article data-mecz-highlight={highlight ? m.id : undefined} id={`mecz-${m.id}`} className="flex h-full min-w-0 flex-col">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/80">
          {cancelled ? "Anulowany" : past ? "Archiwum" : "Mecz"}
        </span>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl bg-white/95 px-3 py-1.5 text-zinc-900 shadow-md">
              <Calendar className="h-4 w-4 text-[var(--mp-teal-dark)]" aria-hidden />
              <span className="mt-0.5 text-sm font-bold tabular-nums">{m.match_date.slice(5).replace("-", ".")}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {m.match_date.slice(0, 4)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--mp-teal)]" aria-hidden />
                <span className="text-lg font-black tabular-nums text-white drop-shadow-sm">{m.match_time}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {cancelled ? (
                  <Badge className="border-red-300/40 bg-red-500/90 text-white hover:bg-red-500/90">Anulowany</Badge>
                ) : null}
                {past && !archive && !cancelled ? (
                  <Badge variant="outline" className="border-amber-200/50 bg-amber-500/30 text-amber-50">
                    Termin minął
                  </Badge>
                ) : null}
                {archive ? (
                  <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
                    Rozegrany
                  </Badge>
                ) : null}
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

        <div className="mt-4 flex items-start gap-2 text-sm text-white">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mp-teal)]" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium leading-snug drop-shadow-sm">{m.location}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-block text-xs font-semibold text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
            >
              Mapa
            </a>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "full" ? "bg-red-400/90" : tone === "warn" ? "bg-amber-400/90" : "bg-[var(--mp-teal)]"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {onOpenPlayers ? (
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
          ) : null}
          {!past && onCopyInvite ? (
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
          ) : null}
          {isAdmin && !cancelled && onCopyPayments ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn("awp-match-btn awp-match-btn--admin awp-match-btn--compact gap-1.5 font-semibold")}
              onClick={onCopyPayments}
              title="Link z listą zapisanych — składka, przelew na telefon albo płatność przez operatora"
            >
              <Wallet className="h-4 w-4" aria-hidden />
              Opłaty
            </Button>
          ) : null}
          {isAdmin && onManage && !cancelled ? (
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
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-white/20 pt-4 sm:flex-row sm:flex-wrap [&_a]:w-full [&_button]:w-full sm:[&_a]:w-auto sm:[&_button]:w-auto">
          {actions}
        </div>

        {!archive ? (
          <details className="mt-3 rounded-xl border border-white/20 bg-black/20">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--mp-teal)] [&::-webkit-details-marker]:hidden">
              Pogoda — rozwiń
            </summary>
            <div className="border-t border-white/15 px-2 pb-2 pt-1">
              <MatchLocationWeather location={m.location} matchDate={m.match_date} className="mt-0 border-t-0 pt-2" />
            </div>
          </details>
        ) : null}
      </article>
    </PhotoPanel>
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
        <Link href={href}>
          {icon}
          {children}
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="ghost" className={cls} onClick={onClick} disabled={disabled} title={title}>
      {icon}
      {children}
    </Button>
  );
}
