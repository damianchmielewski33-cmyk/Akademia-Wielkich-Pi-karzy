"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Apple,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  PieChart,
  TrendingDown,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { releaseDocumentScrollLock } from "@/lib/document-scroll";
import { cn } from "@/lib/utils";

export type HomeStartSectionId =
  | "macros"
  | "meals"
  | "targets"
  | "weekly-deficit"
  | "check-in"
  | "last-workout"
  | "trend";

type TileDef = {
  id: HomeStartSectionId;
  title: string;
  subtitle: string;
  icon: typeof Apple;
};

export function HomeStartPanels({
  subtitleMacros,
  subtitleMeals,
  subtitleTargets,
  subtitleWeeklyDeficit,
  subtitleCheckIn,
  subtitleLastWorkout,
  subtitleTrend,
  showTrend,
  macrosPanel,
  mealsPanel,
  targetsPanel,
  weeklyDeficitPanel,
  checkInPanel,
  lastWorkoutPanel,
  trendPanel,
}: {
  subtitleMacros: string;
  subtitleMeals: string;
  subtitleTargets: string;
  subtitleWeeklyDeficit: string;
  subtitleCheckIn: string;
  subtitleLastWorkout: string;
  subtitleTrend: string;
  showTrend: boolean;
  macrosPanel: ReactNode;
  mealsPanel: ReactNode;
  targetsPanel: ReactNode;
  weeklyDeficitPanel: ReactNode;
  checkInPanel: ReactNode;
  lastWorkoutPanel: ReactNode;
  trendPanel: ReactNode;
}) {
  const tiles: TileDef[] = useMemo(
    () => [
      {
        id: "macros",
        title: "Wartości odżywcze na dziś",
        subtitle: subtitleMacros,
        icon: Apple,
      },
      {
        id: "meals",
        title: "Twoje posiłki",
        subtitle: subtitleMeals,
        icon: UtensilsCrossed,
      },
      {
        id: "targets",
        title: "Realizacja celów",
        subtitle: subtitleTargets,
        icon: PieChart,
      },
      {
        id: "weekly-deficit",
        title: "Deficyt tygodnia",
        subtitle: subtitleWeeklyDeficit,
        icon: TrendingDown,
      },
      {
        id: "check-in",
        title: "Check-in dnia",
        subtitle: subtitleCheckIn,
        icon: HeartPulse,
      },
      {
        id: "last-workout",
        title: "Ostatni trening",
        subtitle: subtitleLastWorkout,
        icon: Dumbbell,
      },
      ...(showTrend
        ? [
            {
              id: "trend" as const,
              title: "Trend treningów",
              subtitle: subtitleTrend,
              icon: Activity,
            },
          ]
        : []),
    ],
    [
      showTrend,
      subtitleLastWorkout,
      subtitleMacros,
      subtitleMeals,
      subtitleTargets,
      subtitleWeeklyDeficit,
      subtitleCheckIn,
      subtitleTrend,
    ],
  );

  const [open, setOpen] = useState<HomeStartSectionId | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function closePanel() {
    setOpen(null);
    queueMicrotask(() => releaseDocumentScrollLock());
  }

  const panel =
    open === "macros"
      ? macrosPanel
      : open === "meals"
        ? mealsPanel
        : open === "targets"
          ? targetsPanel
          : open === "weekly-deficit"
            ? weeklyDeficitPanel
            : open === "check-in"
              ? checkInPanel
              : open === "last-workout"
                ? lastWorkoutPanel
                : open === "trend" && showTrend
                  ? trendPanel
                  : null;

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const root = document.documentElement;
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      releaseDocumentScrollLock();
    };
  }, [open]);

  const modal =
    mounted &&
    open &&
    panel &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center md:p-4"
        role="presentation"
      >
        <button
          type="button"
          aria-label="Zamknij panel"
          className="absolute inset-0 z-0 bg-zinc-950/45 backdrop-blur-sm"
          onClick={closePanel}
        />

        <div
          className="relative z-[1] flex max-h-[min(92dvh,920px)] w-full flex-col overflow-hidden rounded-t-[1.35rem] border border-zinc-200 bg-white shadow-2xl md:max-h-[min(85vh,820px)] md:w-[min(560px,94vw)] md:rounded-2xl dark:border-zinc-700 dark:bg-zinc-950"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-start-panel-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 pb-3 pt-4 sm:px-5 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--mp-teal-dark)]">
                Szczegóły
              </p>
              <p
                id="home-start-panel-title"
                className="font-heading mt-1 text-lg font-semibold text-zinc-950 dark:text-white"
              >
                {tiles.find((t) => t.id === open)?.title ?? "Panel"}
              </p>
            </div>
            <button
              type="button"
              className="awp-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              onClick={closePanel}
              aria-label="Zamknij"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch] touch-pan-y sm:px-5 sm:pb-6">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="relative">{panel}</div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <section className="relative space-y-4">
      <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const isOpen = open === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => (isOpen ? closePanel() : setOpen(tile.id))}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              className={cn(
                "awp-focus-ring flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-colors duration-150",
                isOpen
                  ? "border-[var(--mp-teal)] bg-teal-50 shadow-md shadow-teal-950/10 dark:border-teal-500 dark:bg-teal-950/30"
                  : "border-zinc-200 bg-white shadow-sm hover:border-teal-200 hover:bg-teal-50/60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                      isOpen
                        ? "border-transparent bg-[var(--mp-teal)] text-white"
                        : "border-zinc-200 bg-teal-50 text-[var(--mp-teal-dark)] dark:border-zinc-700 dark:bg-teal-950/40 dark:text-teal-300",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="font-heading block text-[14px] font-semibold leading-snug text-zinc-950 sm:text-[15px] dark:text-white">
                      {tile.title}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-zinc-500 sm:line-clamp-none dark:text-zinc-400">
                      {tile.subtitle}
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200",
                    isOpen ? "rotate-180 text-[var(--mp-teal)]" : "",
                  )}
                  aria-hidden
                />
              </div>
            </button>
          );
        })}
      </div>
      {modal}
    </section>
  );
}
