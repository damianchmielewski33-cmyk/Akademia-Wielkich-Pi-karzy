"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronDown, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { PitchCard, PitchCardDecorations, pitchLabelClass } from "@/components/ui/pitch-card";
import { SiteSectionHero } from "@/components/site-section-hero";
import { SiteAssetImage } from "@/components/site-asset-image";
import { AdminTestModeSidebarButton } from "@/components/admin-test-mode-sidebar-button";
import { AdminOperatorPaymentsSidebarButton } from "@/components/admin-operator-payments-sidebar-button";
import { AdminMarketplaceSidebarButton } from "@/components/admin-marketplace-sidebar-button";
import {
  adminChromeBtnActiveClass,
  adminChromeBtnBaseClass,
  adminChromeBtnIdleClass,
  adminGoldBtnClass,
} from "@/lib/admin-chrome-button";
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

export {
  adminChromeBtnActiveClass,
  adminChromeBtnBaseClass,
  adminChromeBtnIdleClass,
  adminGoldBtnActiveClass,
  adminGoldBtnClass,
} from "@/lib/admin-chrome-button";

export const adminOutlineBtnClass = adminGoldBtnClass;

export const adminPanelInnerClass = "rounded-xl border border-white/25 bg-black/10 p-4 backdrop-blur-sm sm:p-5";

export const adminEmptyStateClass =
  "rounded-xl border border-dashed border-white/25 bg-black/10 px-4 py-8 text-center text-sm text-emerald-100/75";

export const adminAlertDangerClass =
  "rounded-xl border border-red-300/40 bg-red-950/35 px-4 py-3 text-sm text-red-100 shadow-sm backdrop-blur-sm";

export const adminFieldClass =
  "border-white/25 bg-black/15 text-white placeholder:text-emerald-100/45 focus-visible:ring-emerald-400/60";

export const adminTextareaClass =
  "min-h-[80px] w-full rounded-xl border border-white/25 bg-black/15 px-3 py-2 text-base text-white placeholder:text-emerald-100/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60";

export const adminInnerPanelClass =
  "rounded-xl border border-white/25 bg-black/10 p-4 backdrop-blur-sm";

export const adminToggleRowClass =
  "flex flex-wrap items-start justify-between gap-4 rounded-xl border border-white/25 bg-black/10 px-4 py-3 backdrop-blur-sm";

export const adminStatusChipClass =
  "rounded-lg border border-white/20 bg-black/10 px-3 py-2 text-sm pitch-muted";

/* ========== Shell ========== */

export type AdminTab = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  /** Czerwona kropka bez liczby (np. zgłoszenia PIN). */
  badge?: boolean;
  /** Liczba na czerwonym badge (np. nieprzeczytane wiadomości). */
  badgeCount?: number;
};

export type AdminNavGroup = {
  id: string;
  /** Brak label = samotna pozycja (np. Przegląd) bez nagłówka kategorii. */
  label?: string;
  items: readonly AdminTab[];
};

type AdminShellProps = {
  navGroups: readonly AdminNavGroup[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  loading?: boolean;
  children: ReactNode;
  /** Wyszukiwarka / skróty — renderowane pod logo. */
  searchSlot?: ReactNode;
  /** Stałe skróty mobilne (np. Wiadomości / Mecze / Ustawienia). */
  mobileShortcuts?: readonly { id: string; label: string; badge?: boolean; badgeCount?: number }[];
};

function tabHasAlert(t: AdminTab) {
  return Boolean(t.badge) || (t.badgeCount != null && t.badgeCount > 0);
}

function TabBadge({ tab }: { tab: AdminTab }) {
  if (tab.badgeCount != null && tab.badgeCount > 0) {
    return (
      <span
        className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold tabular-nums text-white"
        title={`${tab.badgeCount} nieprzeczytanych`}
        aria-label={`${tab.badgeCount} nieprzeczytanych`}
      >
        {tab.badgeCount > 99 ? "99+" : tab.badgeCount}
      </span>
    );
  }
  if (tab.badge) {
    return (
      <span
        className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white"
        title="Zgłoszenia zmiany PIN-u"
        aria-label="Zgłoszenia zmiany PIN-u"
      />
    );
  }
  return null;
}

function AdminChromeIcon({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
        active ? "bg-black/25 ring-white/35" : "bg-black/10 ring-black/20"
      )}
    >
      {children}
    </span>
  );
}

function NavTabButton({
  tab,
  active,
  onSelect,
  compact,
}: {
  tab: AdminTab;
  active: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        adminChromeBtnBaseClass,
        active ? adminChromeBtnActiveClass : adminChromeBtnIdleClass,
        compact ? "w-auto min-w-[7.5rem] shrink-0" : "w-full"
      )}
    >
      <AdminChromeIcon active={active}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </AdminChromeIcon>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="block truncate text-xs font-bold leading-none tracking-tight">{tab.label}</span>
        <TabBadge tab={tab} />
      </span>
    </button>
  );
}

export function AdminShell({
  navGroups,
  activeTab,
  onTabChange,
  onLogout,
  loading,
  children,
  searchSlot,
  mobileShortcuts,
}: AdminShellProps) {
  const router = useRouter();
  const isDarkNow =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;

  const activeGroupId = useMemo(() => {
    for (const g of navGroups) {
      if (g.items.some((t) => t.id === activeTab)) return g.id;
    }
    return navGroups[0]?.id ?? "";
  }, [navGroups, activeTab]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of navGroups) {
      if (g.label) init[g.id] = g.items.some((t) => t.id === activeTab);
    }
    return init;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of navGroups) {
        if (!g.label) continue;
        if (g.items.some((t) => t.id === activeTab)) next[g.id] = true;
      }
      return next;
    });
  }, [activeTab, navGroups]);

  const mobileGroup = useMemo(
    () => navGroups.find((g) => g.id === activeGroupId) ?? navGroups[0],
    [navGroups, activeGroupId]
  );

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
    <div className="murawa-bg flex min-h-screen flex-col text-white lg:flex-row">
      <aside className="mundial-header relative z-30 shrink-0 border-b border-[var(--mundial-gold)]/30 shadow-lg lg:w-72 lg:border-b-0 lg:border-r">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 28px)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 p-3 xs:p-4 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:gap-3 lg:overflow-hidden lg:pt-[max(1rem,env(safe-area-inset-top))] lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex shrink-0 items-center gap-3 border-b border-white/15 pb-3 lg:pb-4">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-[var(--mundial-gold)]/40 xs:h-11 xs:w-11">
              <SiteAssetImage
                asset="logo_crest"
                alt=""
                width={128}
                height={128}
                className="h-9 w-9 drop-shadow xs:h-10 xs:w-10"
                sizes="40px"
              />
            </span>
            <div className="min-w-0">
              <p className={cn(pitchLabelClass, "text-[0.65rem]")}>Akademia</p>
              <p className="truncate font-semibold leading-tight text-white">Panel administratora</p>
            </div>
          </div>

          {searchSlot ? <div className="relative z-40 shrink-0">{searchSlot}</div> : null}

          {/* Mobile: always-visible shortcuts */}
          {mobileShortcuts && mobileShortcuts.length > 0 ? (
            <div className="flex shrink-0 gap-1.5 lg:hidden" aria-label="Szybkie skróty">
              {mobileShortcuts.map((s) => {
                const active = activeTab === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onTabChange(s.id)}
                    className={cn(
                      adminChromeBtnBaseClass,
                      "min-h-9 flex-1 justify-center px-2",
                      active ? adminChromeBtnActiveClass : adminChromeBtnIdleClass
                    )}
                  >
                    <span className="truncate text-xs font-bold leading-none tracking-tight">{s.label}</span>
                    {s.badgeCount != null && s.badgeCount > 0 ? (
                      <span className="inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {s.badgeCount > 99 ? "99+" : s.badgeCount}
                      </span>
                    ) : s.badge ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Mobile: category chips + tabs of active category */}
          <div className="flex shrink-0 flex-col gap-2 lg:hidden">
            <nav
              className="-mx-3 flex gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-0.5 [scrollbar-width:thin]"
              aria-label="Kategorie panelu admina"
            >
              {navGroups.map((g) => {
                const selected = g.id === activeGroupId;
                const groupAlert = g.items.some(tabHasAlert);
                const chipLabel = g.label ?? g.items[0]?.label ?? g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      if (!selected && g.items[0]) onTabChange(g.items[0].id);
                    }}
                    className={cn(
                      adminChromeBtnBaseClass,
                      "w-auto shrink-0 rounded-full px-3",
                      selected ? adminChromeBtnActiveClass : adminChromeBtnIdleClass
                    )}
                  >
                    <span className="truncate text-xs font-bold leading-none tracking-tight">{chipLabel}</span>
                    {groupAlert && !selected ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </nav>
            {mobileGroup ? (
              <nav
                className="-mx-3 flex gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-1 [scrollbar-width:thin]"
                aria-label={mobileGroup.label ? `Zakładki: ${mobileGroup.label}` : "Zakładki panelu admina"}
              >
                {mobileGroup.items.map((t) => (
                  <NavTabButton
                    key={t.id}
                    tab={t}
                    active={activeTab === t.id}
                    onSelect={() => onTabChange(t.id)}
                    compact
                  />
                ))}
              </nav>
            ) : null}
          </div>

          {/* Desktop: collapsible category groups (scroll independently) */}
          <nav
            className="hidden min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] lg:flex"
            aria-label="Zakładki panelu admina"
          >
            {navGroups.map((g) => {
              const isLabeled = Boolean(g.label);
              const isOpen = !isLabeled || openGroups[g.id];
              const containsActive = g.items.some((t) => t.id === activeTab);
              const groupAlert = !isOpen && g.items.some(tabHasAlert);

              if (!isLabeled) {
                return (
                  <div key={g.id} className="mb-1">
                    {g.items.map((t) => (
                      <NavTabButton
                        key={t.id}
                        tab={t}
                        active={activeTab === t.id}
                        onSelect={() => onTabChange(t.id)}
                      />
                    ))}
                  </div>
                );
              }

              return (
                <div key={g.id} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    aria-expanded={isOpen}
                    className={cn(
                      "awp-focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[0.7rem] font-bold uppercase tracking-wider transition-colors",
                      containsActive
                        ? "text-[var(--mundial-gold,#f5c518)]"
                        : "text-emerald-100/55 hover:text-emerald-100/85"
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform",
                        !isOpen && "-rotate-90"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{g.label}</span>
                    {groupAlert ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                    ) : null}
                  </button>
                  {isOpen ? (
                    <div className="mt-0.5 ml-2 space-y-0.5 border-l border-white/10 pl-2">
                      {g.items.map((t) => (
                        <NavTabButton
                          key={t.id}
                          tab={t}
                          active={activeTab === t.id}
                          onSelect={() => onTabChange(t.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          {/* Zawsze widoczne: tryb testowy + rezerwacje + płatności operatora + stopka */}
          <div className="relative z-10 flex shrink-0 flex-col gap-3 border-t border-white/20 pt-3">
            <div className="flex flex-col gap-1.5">
              <AdminTestModeSidebarButton />
              <AdminMarketplaceSidebarButton />
              <AdminOperatorPaymentsSidebarButton
                active={activeTab === "operator-payments"}
                onOpen={() => onTabChange("operator-payments")}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 lg:flex-col">
              <button
                type="button"
                onClick={() => void toggleTheme()}
                className={cn(adminChromeBtnBaseClass, adminChromeBtnIdleClass, "flex-1 lg:flex-none")}
              >
                <AdminChromeIcon>
                  {isDarkNow ? (
                    <Sun className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Moon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  )}
                </AdminChromeIcon>
                <span className="min-w-0 flex-1 truncate text-xs font-bold leading-none tracking-tight">
                  {isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
                </span>
              </button>
              <Link
                href="/terminarz"
                className={cn(adminChromeBtnBaseClass, adminChromeBtnIdleClass, "flex-1 lg:flex-none")}
              >
                <AdminChromeIcon>
                  <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </AdminChromeIcon>
                <span className="min-w-0 flex-1 truncate text-xs font-bold leading-none tracking-tight">
                  Terminarz
                </span>
              </Link>
              <Link
                href="/"
                className={cn(adminChromeBtnBaseClass, adminChromeBtnIdleClass, "flex-1 lg:flex-none")}
              >
                <AdminChromeIcon>
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </AdminChromeIcon>
                <span className="min-w-0 flex-1 truncate text-xs font-bold leading-none tracking-tight">
                  Strona główna
                </span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className={cn(adminChromeBtnBaseClass, adminChromeBtnIdleClass, "flex-1 lg:flex-none")}
              >
                <AdminChromeIcon>
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </AdminChromeIcon>
                <span className="min-w-0 flex-1 truncate text-xs font-bold leading-none tracking-tight">
                  Wyloguj
                </span>
              </button>
            </div>
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
  kicker = "Panel admina",
}: {
  title: string;
  description?: string;
  /** @deprecated Przycisk Odśwież usunięty — dane odświeżają się automatycznie / po akcji. */
  onReload?: () => void;
  loading?: boolean;
  children?: ReactNode;
  kicker?: string;
}) {
  void onReload;
  void loading;
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <SiteSectionHero
        kicker={kicker}
        title={title}
        subtitle={description}
        showCrest={false}
        size="compact"
        align="left"
        variant="stadium"
        className="min-w-0 flex-1 lg:max-w-2xl"
      />
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-2">{children}</div>
      ) : null}
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
  id,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  /** `data` — jasny panel pod tabele i wykresy (analityka). */
  tone?: "pitch" | "data";
  id?: string;
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
      <section id={id} className={cn("admin-data-card", className)}>
        {header}
        {children}
      </section>
    );
  }

  return (
    <PitchCard id={id} variant="pitch" className={cn(className)} contentClassName="p-5 sm:p-6">
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
