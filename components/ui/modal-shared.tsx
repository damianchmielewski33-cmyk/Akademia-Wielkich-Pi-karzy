"use client";

import type { ReactNode } from "react";
import { Calendar, Clock, Info, Loader2, MapPin, TriangleAlert, Users, XCircle } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { useMarketplacePitchPhotoAt } from "@/components/marketplace-photos-provider";
import { cn } from "@/lib/utils";

export const modalPanelClass =
  "rounded-xl border border-zinc-200/85 bg-zinc-50/75 px-3.5 py-3 shadow-sm shadow-zinc-950/[0.03] dark:border-zinc-700/55 dark:bg-zinc-800/40";

export const modalEmptyStateClass =
  "rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400";

/** Lista w modalu — bez własnego max-h (przewija cały AppModal `scrollable`). */
export const modalListClass =
  "space-y-0 overflow-hidden rounded-xl border border-zinc-200/85 bg-zinc-50/60 dark:border-zinc-700/55 dark:bg-zinc-800/35";

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
  id?: number;
};

export function ModalLoadingRow({ label = "Wczytywanie…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-3 text-sm text-zinc-600 dark:text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--mp-teal)] dark:text-teal-400" aria-hidden />
      {label}
    </div>
  );
}

export function ModalMatchSummary({ match }: { match: MatchLike }) {
  const photo = useMarketplacePitchPhotoAt(match.id ?? match.match_date.length + match.location.length);
  const dateLabel = match.match_date.slice(5).replace("-", ".");
  const year = match.match_date.slice(0, 4);
  const time = match.match_time.length >= 5 ? match.match_time.slice(0, 5) : match.match_time;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="relative min-h-[7.5rem] sm:min-h-[8.5rem]">
        <MarketplacePitchPhoto
          src={photo}
          className="pointer-events-none z-0"
          sizes="(max-width: 640px) 100vw, 560px"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-black/20"
          aria-hidden
        />
        <div className="relative z-10 flex h-full min-h-[7.5rem] flex-wrap items-end gap-3 p-4 sm:min-h-[8.5rem] sm:gap-4 sm:p-5">
          <div className="flex flex-col items-center rounded-xl border border-white/25 bg-black/35 px-3 py-1.5 backdrop-blur-sm">
            <Calendar className="h-4 w-4 text-[var(--mp-teal)]" aria-hidden />
            <span className="mt-0.5 text-sm font-bold tabular-nums text-white">{dateLabel}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{year}</span>
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <div className="flex items-center gap-1.5 text-white">
              <Clock className="h-4 w-4 text-[var(--mp-teal)]" aria-hidden />
              <span className="text-lg font-bold tabular-nums">{time}</span>
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-white/90">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--mp-teal)]" aria-hidden />
              <span className="leading-snug">{match.location}</span>
            </p>
          </div>
          {match.signed_up != null && match.max_slots != null ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-black/35 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              <Users className="h-4 w-4 text-[var(--mp-teal)]" aria-hidden />
              <span className="tabular-nums">
                {match.signed_up}/{match.max_slots}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ModalFormHeader({
  icon,
  title,
  description,
  kicker = "Formularz",
  photoSeed = 2,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  kicker?: string;
  /** Indeks zdjęcia boiska w puli marketplace. */
  photoSeed?: number;
}) {
  const photo = useMarketplacePitchPhotoAt(photoSeed);

  return (
    <div className="awp-modal-form-header awp-modal-form-header--v2 shrink-0">
      <MarketplacePitchPhoto
        src={photo}
        className="pointer-events-none absolute inset-0 z-0"
        sizes="(max-width: 640px) 100vw, 640px"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/55 to-black/30"
        aria-hidden
      />
      <div className="relative z-10 flex items-start gap-3.5 pr-12 text-left">
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
          <h3 className="awp-form-section__title text-[var(--mp-teal-dark)] dark:text-teal-300">{title}</h3>
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
        : "border-teal-200/80 bg-teal-50/80 text-teal-950 dark:border-teal-800/50 dark:bg-teal-950/30 dark:text-teal-100";
  const iconClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-[var(--mp-teal-dark)] dark:text-teal-300";

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
