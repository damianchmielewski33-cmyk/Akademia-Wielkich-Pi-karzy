"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, LogOut, Moon, RefreshCw, Sun } from "lucide-react";
import { PitchCard, PitchCardDecorations, pitchLabelClass } from "@/components/ui/pitch-card";
import { SiteSectionHero } from "@/components/site-section-hero";
import { SiteAssetImage } from "@/components/site-asset-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ========== Klasy pomocnicze (tabele, pola) ========== */

export const adminTableShellClass = "admin-table-shell";

export const adminDataTableShellClass = "admin-data-table-shell";

export const adminSearchInputClass =
  "border-white/25 bg-black/15 text-white placeholder:text-emerald-100/45 pl-9 focus-visible:ring-emerald-400/60";

export const adminDataSearchInputClass =
  "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 pl-9 focus-visible:ring-emerald-500/50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500";

export const adminDataOutlineBtnClass =
  "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

export const adminOutlineBtnClass = "border-white/30 bg-black/10 text-white hover:bg-white/15 dark:border-white/20";

export const adminPanelInnerClass = "rounded-xl border border-white/25 bg-black/10 p-4 backdrop-blur-sm sm:p-5";

export const adminEmptyStateClass =
  "rounded-xl border border-dashed border-white/25 bg-black/10 px-4 py-8 text-center text-sm text-emerald-100/75";

export const adminAlertDangerClass =
  "rounded-xl border border-red-300/40 bg-red-950/35 px-4 py-3 text-sm text-red-100 shadow-sm backdrop-blur-sm";

export const adminFieldClass =
  "border-white/25 bg-black/15 text-white placeholder:text-emerald-100/45 focus-visible:ring-emerald-400/60";

export const adminTextareaClass =
  "min-h-[80px] w-full rounded-xl border border-white/25 bg-black/15 px-3 py-2 text-sm text-white placeholder:text-emerald-100/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60";

export const adminInnerPanelClass =
  "rounded-xl border border-white/25 bg-black/10 p-4 backdrop-blur-sm";

export const adminToggleRowClass =
  "flex flex-wrap items-start justify-between gap-4 rounded-xl border border-white/25 bg-black/10 px-4 py-3 backdrop-blur-sm";

export const adminStatusChipClass =
  "rounded-lg border border-white/20 bg-black/10 px-3 py-2 text-sm pitch-muted";

/* ========== Shell ========== */

type AdminTab = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Czerwona kropka bez liczby (np. zgłoszenia PIN). */
  badge?: boolean;
  /** Liczba na czerwonym badge (np. nieprzeczytane wiadomości). */
  badgeCount?: number;
};

type AdminShellProps = {
  tabs: readonly AdminTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  loading?: boolean;
  children: ReactNode;
};

export function AdminShell({
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  loading,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const isDarkNow =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;

  async function toggleTheme() {
    const nextTheme = isDarkNow ? "light" : "dark";
    try {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      localStorage.setItem("awp-ui-theme", nextTheme);
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_theme: nextTheme }),
      }).catch(() => {});
      router.refresh();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen flex-col text-white lg:flex-row">
      <aside className="mundial-header relative z-30 shrink-0 border-b border-[var(--mundial-gold)]/30 shadow-lg lg:w-64 lg:border-b-0 lg:border-r">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 28px)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 p-3 xs:p-4 lg:sticky lg:top-0 lg:max-h-screen lg:gap-5 lg:overflow-y-auto lg:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3 border-b border-white/15 pb-3 lg:pb-4">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-[var(--mundial-gold)]/40 xs:h-11 xs:w-11">
              <SiteAssetImage
                asset="logo_crest"
                alt=""
                width={128}
                height={128}
                className="h-7 w-7 xs:h-8 xs:w-8"
                sizes="32px"
              />
            </span>
            <div className="min-w-0">
              <p className={cn(pitchLabelClass, "text-[0.65rem]")}>Akademia</p>
              <p className="truncate font-semibold leading-tight text-white">Panel administratora</p>
            </div>
          </div>

          <nav
            className="-mx-3 flex gap-2 overflow-x-auto overscroll-x-contain px-3 pb-1 [scrollbar-width:thin] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
            aria-label="Zakładki panelu admina"
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange(t.id)}
                  className={cn(
                    "awp-focus-ring flex shrink-0 touch-manipulation items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-[background-color,color,box-shadow] lg:w-full",
                    active
                      ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                      : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap">
                    {t.label}
                    {t.badgeCount != null && t.badgeCount > 0 ? (
                      <span
                        className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold tabular-nums text-white"
                        title={`${t.badgeCount} nieprzeczytanych`}
                        aria-label={`${t.badgeCount} nieprzeczytanych`}
                      >
                        {t.badgeCount > 99 ? "99+" : t.badgeCount}
                      </span>
                    ) : t.badge ? (
                      <span
                        className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white"
                        title="Zgłoszenia zmiany PIN-u"
                        aria-label="Zgłoszenia zmiany PIN-u"
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap gap-1 border-t border-white/15 pt-3 lg:mt-auto lg:flex-col lg:pt-4">
            <button
              type="button"
              onClick={() => void toggleTheme()}
              className="awp-focus-ring flex min-h-10 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white lg:flex-none"
            >
              {isDarkNow ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              <span className="truncate">{isDarkNow ? "Jasny motyw" : "Ciemny motyw"}</span>
            </button>
            <Link
              href="/terminarz"
              className="awp-focus-ring flex min-h-10 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white lg:flex-none"
            >
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Terminarz</span>
            </Link>
            <Link
              href="/"
              className="awp-focus-ring flex min-h-10 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white lg:flex-none"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Strona główna</span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="awp-focus-ring flex min-h-10 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white lg:flex-none"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Wyloguj
            </button>
          </div>
        </div>
      </aside>

      <main className="relative flex-1 overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={220}
            height={220}
            className="absolute -right-16 top-8 h-auto w-[220px] max-w-none opacity-[0.14] sm:top-12"
          />
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={160}
            height={160}
            className="absolute -left-10 bottom-24 h-auto w-[160px] max-w-none opacity-[0.12] sm:bottom-32"
          />
        </div>

        {loading ? (
          <div
            className="pointer-events-none absolute right-6 top-6 z-20 flex items-center gap-2 text-sm text-emerald-100/80"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Wczytywanie…
          </div>
        ) : null}

        <div className="relative z-10 p-3 xs:p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

/* ========== Toolbar ========== */

export function AdminToolbar({
  title,
  description,
  onReload,
  loading,
  children,
}: {
  title: string;
  description?: string;
  onReload: () => void;
  loading: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <SiteSectionHero
        kicker="Panel admina"
        title={title}
        subtitle={description}
        showCrest={false}
        size="compact"
        align="left"
        className="min-w-0 flex-1 lg:max-w-2xl"
      />
      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-2">
        {children}
        <Button
          type="button"
          variant="stadium"
          size="sm"
          onClick={onReload}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
          Odśwież
        </Button>
      </div>
    </div>
  );
}

/* ========== Karty ========== */

export function AdminCard({
  title,
  description,
  children,
  className,
  headerExtra,
  tone = "pitch",
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  /** `data` — jasny panel pod tabele i wykresy (analityka). */
  tone?: "pitch" | "data";
}) {
  const header =
    title || description || headerExtra ? (
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title ? <h2 className="pitch-heading text-lg font-bold">{title}</h2> : null}
          {description ? (
            <p className={cn("mt-1 text-sm", tone === "data" ? "admin-data-muted" : "pitch-muted")}>
              {description}
            </p>
          ) : null}
        </div>
        {headerExtra}
      </div>
    ) : null;

  if (tone === "data") {
    return (
      <section className={cn("admin-data-card", className)}>
        {header}
        {children}
      </section>
    );
  }

  return (
    <PitchCard className={cn(className)} contentClassName="p-5 sm:p-6">
      {header}
      {children}
    </PitchCard>
  );
}

export function AdminMetricTile({
  label,
  hint,
  value,
  icon: Icon,
  onClick,
}: {
  label: string;
  hint: string;
  value: number | string | undefined;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group awp-focus-ring relative block h-full min-h-[7rem] w-full overflow-hidden rounded-2xl border-2 border-white/30 text-left shadow-md shadow-emerald-950/20 ring-1 ring-emerald-950/10 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <div className="home-pitch-tile absolute inset-0" aria-hidden />
      <PitchCardDecorations />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="mt-0.5 text-xs text-emerald-100/80">{hint}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
            <Icon className="h-5 w-5 text-white" aria-hidden />
          </div>
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-[var(--mundial-gold,#f5c518)]">
          {value ?? "–"}
        </p>
      </div>
    </button>
  );
}

export function AdminTableShell({
  children,
  className,
  tone = "pitch",
}: {
  children: ReactNode;
  className?: string;
  tone?: "pitch" | "data";
}) {
  return (
    <div className={cn(tone === "data" ? adminDataTableShellClass : adminTableShellClass, className)}>
      {children}
    </div>
  );
}
