"use client";

import type { ReactNode } from "react";
import { Calendar, Clock, Info, Loader2, MapPin, TriangleAlert, Users, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const modalPanelClass =
  "rounded-2xl border border-zinc-200/85 bg-zinc-50/75 px-4 py-4 shadow-sm shadow-zinc-950/[0.03] dark:border-zinc-700/55 dark:bg-zinc-800/40";

export const modalEmptyStateClass =
  "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400";

export const modalListClass =
  "space-y-0 overflow-y-auto rounded-2xl border border-zinc-200/85 bg-zinc-50/60 dark:border-zinc-700/55 dark:bg-zinc-800/35";

export const modalTabListClass =
  "grid h-auto w-full gap-1 rounded-xl bg-zinc-100/80 p-1 dark:bg-zinc-800/60";

export const modalTabTriggerClass =
  "rounded-lg px-3 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[var(--mundial-navy)] data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-emerald-100 dark:data-[state=inactive]:text-zinc-400";

export const modalFormSectionClass = "awp-form-section";

export const modalFormGridClass = "awp-form-grid-2";

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
      <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
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
        <div className="flex flex-col items-center rounded-xl border border-zinc-200/90 bg-white px-3 py-1.5 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/80">
          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span className="mt-0.5 text-sm font-bold tabular-nums text-[var(--mundial-navy)] dark:text-zinc-100">
            {dateLabel}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {year}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[var(--mundial-navy)] dark:text-zinc-100">
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="text-lg font-bold tabular-nums">{time}</span>
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="leading-snug">{match.location}</span>
          </p>
        </div>
      </div>
      {match.signed_up != null && match.max_slots != null ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--mundial-navy)] dark:border-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-100">
          <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span className="tabular-nums">
            {match.signed_up}/{match.max_slots}
          </span>
          <span className="font-normal text-zinc-500 dark:text-zinc-400">zapisanych</span>
        </div>
      ) : null}
    </div>
  );
}

export function ModalFormHeader({
  icon,
  title,
  description,
  kicker = "Formularz",
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="awp-modal-form-header">
      <div className="relative flex items-start gap-3.5 pr-10 text-left">
        <div className="awp-modal-form-header__icon">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="awp-modal-form-header__kicker">{kicker}</p>
          <h2 className="awp-modal-form-header__title">{title}</h2>
          {description ? <p className="awp-modal-form-header__description">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ModalFormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(modalFormSectionClass, className)}>
      {title ? (
        <div className="mb-3.5">
          <h3 className="awp-form-section__title">{title}</h3>
          {description ? <p className="awp-form-section__description">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
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
  return <ModalFormHeader icon={icon} title={title} description={description} kicker="Powiadomienie" />;
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
    <div className={cn("flex gap-3 rounded-2xl border px-4 py-3 text-sm", styles)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} aria-hidden />
      <div className="leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  );
}
