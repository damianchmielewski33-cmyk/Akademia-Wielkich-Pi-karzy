"use client";

import type { ReactNode } from "react";
import { Calendar, Clock, Info, Loader2, MapPin, TriangleAlert, Users, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const modalPanelClass =
  "rounded-xl border border-emerald-900/10 bg-emerald-50/35 px-4 py-4 dark:border-emerald-800/40 dark:bg-emerald-950/25";

export const modalEmptyStateClass =
  "rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400";

export const modalListClass =
  "space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-950/25";

export const modalTabListClass =
  "grid h-auto w-full gap-1 rounded-xl bg-emerald-100/60 p-1 dark:bg-emerald-950/50";

export const modalTabTriggerClass =
  "rounded-lg px-3 py-2 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 dark:data-[state=inactive]:text-emerald-200/90";

type MatchLike = {
  match_date: string;
  match_time: string;
  location: string;
  signed_up?: number;
  max_slots?: number;
};

export function ModalLoadingRow({ label = "Wczytywanie…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-3 text-sm text-zinc-600 dark:text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin text-emerald-700 dark:text-emerald-400" aria-hidden />
      {label}
    </div>
  );
}

export function ModalMatchSummary({ match }: { match: MatchLike }) {
  const dateLabel = match.match_date.slice(5).replace("-", ".");
  const year = match.match_date.slice(0, 4);
  const time = match.match_time.length >= 5 ? match.match_time.slice(0, 5) : match.match_time;

  return (
    <div className={cn(modalPanelClass, "flex flex-wrap items-center gap-3 sm:gap-4")}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center rounded-xl border border-emerald-900/10 bg-white/80 px-3 py-1.5 shadow-sm dark:border-emerald-800/50 dark:bg-zinc-900/80">
          <Calendar className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden />
          <span className="mt-0.5 text-sm font-bold tabular-nums text-emerald-950 dark:text-emerald-100">{dateLabel}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
            {year}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-emerald-950 dark:text-emerald-100">
            <Clock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden />
            <span className="text-lg font-bold tabular-nums">{time}</span>
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
            <span className="leading-snug">{match.location}</span>
          </p>
        </div>
      </div>
      {match.signed_up != null && match.max_slots != null ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-sm font-semibold text-emerald-900 dark:border-emerald-800/50 dark:bg-zinc-900/70 dark:text-emerald-100">
          <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden />
          <span className="tabular-nums">
            {match.signed_up}/{match.max_slots}
          </span>
          <span className="font-normal text-zinc-500 dark:text-zinc-400">zapisanych</span>
        </div>
      ) : null}
    </div>
  );
}

export function ModalPromptHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="-mx-6 -mt-2 mb-1 border-b border-emerald-100 bg-emerald-50/80 px-6 py-5 dark:border-emerald-800/60 dark:bg-emerald-950/45 sm:-mx-6 sm:px-6">
      <div className="flex items-start gap-3 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm dark:bg-emerald-600">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold leading-snug tracking-tight text-emerald-950 dark:text-emerald-100">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ModalAlert({
  tone,
  children,
  title,
}: {
  tone: "info" | "warning" | "danger";
  children: ReactNode;
  title?: string;
}) {
  const Icon = tone === "danger" ? XCircle : tone === "warning" ? TriangleAlert : Info;
  const styles =
    tone === "danger"
      ? "border-red-200/90 bg-red-50/90 text-red-900 dark:border-red-800/60 dark:bg-red-950/35 dark:text-red-100"
      : tone === "warning"
        ? "border-amber-200/80 bg-amber-50/70 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100"
        : "border-emerald-200/80 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100";
  const iconClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-700 dark:text-emerald-400";

  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} aria-hidden />
      <div className="leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  );
}
