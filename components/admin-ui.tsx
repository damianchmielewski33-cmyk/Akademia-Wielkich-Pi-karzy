"use client";

import { useEffect, useMemo, useRef, useState, cloneElement, isValidElement, type ComponentType, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronDown, Loader2, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { PitchCard } from "@/components/ui/pitch-card";
import { SiteSectionHero } from "@/components/site-section-hero";
import { SiteAssetImage } from "@/components/site-asset-image";
import { PhotoPanel } from "@/components/photo-panel";
import { AdminNavTile, adminPhotoIndex } from "@/components/admin-nav-tile";
import { AdminTestModeSidebarButton } from "@/components/admin-test-mode-sidebar-button";
import { AdminOperatorPaymentsSidebarButton } from "@/components/admin-operator-payments-sidebar-button";
import { AdminMarketplaceSidebarButton } from "@/components/admin-marketplace-sidebar-button";
import { MarketplaceSection } from "@/components/marketplace-section";
import { useSiteMode } from "@/components/site-mode";
import { pitchPhotoAt } from "@/lib/marketplace-photos";
import { adminGoldBtnClass } from "@/lib/admin-chrome-button";
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
  desc?: string;
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
  const { marketplaceEnabled } = useSiteMode();

  if (marketplaceEnabled) {
    const Icon = tab.icon;
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          "awp-focus-ring group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
          compact && "w-auto min-w-[11rem] shrink-0",
          active
            ? "border-transparent bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15"
            : "border-zinc-200/90 bg-white text-zinc-800 shadow-sm hover:border-teal-200 hover:bg-teal-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-teal-800 dark:hover:bg-teal-950/40"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            active
              ? "bg-white/20 text-white"
              : "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight tracking-tight">{tab.label}</span>
          {tab.desc && !compact ? (
            <span
              className={cn(
                "mt-0.5 hidden truncate text-xs leading-snug lg:block",
                active ? "text-white/85" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {tab.desc}
            </span>
          ) : null}
        </span>
        <TabBadge tab={tab} />
      </button>
    );
  }

  return (
    <AdminNavTile
      title={tab.label}
      desc={tab.desc}
      icon={tab.icon}
      photoKey={tab.id}
      active={active}
      compact={compact}
      onClick={onSelect}
      badge={<TabBadge tab={tab} />}
      className={compact ? "w-auto min-w-[10.5rem] shrink-0" : undefined}
    />
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
}: AdminShellProps) {
  const router = useRouter();
  const { marketplaceEnabled } = useSiteMode();
  const mainRef = useRef<HTMLElement>(null);
  const accentText = marketplaceEnabled
    ? "text-[var(--mp-teal)]"
    : "text-[var(--mundial-gold,#f5c518)]";
  const isDarkNow =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;

  const activeTabMeta = useMemo(() => {
    for (const g of navGroups) {
      const t = g.items.find((item) => item.id === activeTab);
      if (t) return { group: g, tab: t };
    }
    return null;
  }, [navGroups, activeTab]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of navGroups) {
      if (g.label) init[g.id] = g.items.some((t) => t.id === activeTab);
    }
    return init;
  });

  /** Mobile: menu = lista sekcji; content = ekran wybranej zakładki. */
  const [mobilePhase, setMobilePhase] = useState<"menu" | "content">("content");
  const skipAutoOpenContent = useRef(true);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasTab = new URLSearchParams(window.location.search).has("tab");
    if (!hasTab && window.matchMedia("(max-width: 1023px)").matches) {
      setMobilePhase("menu");
    }
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    if (skipAutoOpenContent.current) {
      skipAutoOpenContent.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobilePhase("content");
    }
  }, [activeTab]);

  function openMobileMenu() {
    setMobilePhase("menu");
  }

  function closeMobileMenu() {
    setMobilePhase("content");
  }

  function selectMobileTab(id: string) {
    onTabChange(id);
    setMobilePhase("content");
  }

  function openDesktopGroup(g: AdminNavGroup) {
    setOpenGroups((prev) => ({ ...prev, [g.id]: true }));
    if (g.items[0]) onTabChange(g.items[0].id);
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

  const showMobileMenu = mobilePhase === "menu";

  return (
    <div
      className={cn(
        "admin-shell flex min-h-dvh min-w-0 flex-col lg:flex-row",
        marketplaceEnabled
          ? "admin-shell--v2 bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
          : "murawa-bg text-white"
      )}
    >
      <aside
        className={cn(
          "relative z-30 shrink-0 lg:w-80 lg:border-b-0 lg:border-r",
          marketplaceEnabled
            ? "border-b border-zinc-200 bg-[#f4f5f7] text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 lg:border-zinc-200 dark:lg:border-zinc-800"
            : "border-b border-white/20 shadow-lg lg:border-white/15",
          showMobileMenu ? "flex min-h-dvh flex-col lg:min-h-0" : undefined,
          !showMobileMenu && "lg:block",
          !showMobileMenu && "hidden lg:block"
        )}
      >
        <div className="relative flex flex-col gap-3 p-3 xs:p-4 lg:sticky lg:top-0 lg:h-dvh lg:max-h-dvh lg:gap-3 lg:overflow-hidden lg:pt-[max(1rem,env(safe-area-inset-top))] lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-2xl border px-3 py-3 lg:hidden",
              marketplaceEnabled
                ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                : "border-white/20 bg-white/10"
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                marketplaceEnabled ? "bg-[var(--mp-teal)] text-white" : "bg-white/15 text-white"
              )}
            >
              <SiteAssetImage
                asset="logo_crest"
                alt=""
                width={128}
                height={128}
                className="h-8 w-8 drop-shadow"
                sizes="32px"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[0.65rem] font-bold uppercase tracking-[0.14em]",
                  marketplaceEnabled ? "text-[var(--mp-teal-dark)]" : "text-[var(--mundial-gold,#f5c518)]"
                )}
              >
                Panel admina
              </p>
              <p
                className={cn(
                  "truncate text-sm font-black",
                  marketplaceEnabled ? "text-zinc-950 dark:text-white" : "text-white"
                )}
              >
                Wybierz sekcję
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  marketplaceEnabled ? "text-zinc-500 dark:text-zinc-400" : "text-white/70"
                )}
              >
                Wybierz, czym chcesz zarządzać.
              </p>
            </div>
            <button
              type="button"
              onClick={closeMobileMenu}
              className={cn(
                "awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full",
                marketplaceEnabled
                  ? "border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  : "border border-white/25 bg-white/10 text-white"
              )}
              aria-label="Zamknij menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="hidden lg:block">
            <PhotoPanel
              src={pitchPhotoAt(0)}
              className={cn(
                "shrink-0 overflow-hidden rounded-3xl",
                marketplaceEnabled && "border border-zinc-200/80 shadow-sm dark:border-zinc-800"
              )}
              contentClassName="flex items-center gap-3 p-4"
              overlayClassName="bg-gradient-to-r from-black/75 via-black/50 to-black/20"
              sizes="320px"
              priority
            >
              <span
                className={cn(
                  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
                  marketplaceEnabled ? "bg-[var(--mp-teal)]" : "bg-white/15 ring-2 ring-white/35"
                )}
              >
                <SiteAssetImage
                  asset="logo_crest"
                  alt=""
                  width={128}
                  height={128}
                  className="h-10 w-10 drop-shadow"
                  sizes="48px"
                />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[0.65rem] font-bold uppercase tracking-[0.16em]",
                    marketplaceEnabled ? "text-[var(--mp-teal)]" : "text-[var(--mundial-gold,#f5c518)]"
                  )}
                >
                  Panel admina{marketplaceEnabled ? " · V2" : ""}
                </p>
                <p className="mt-1 truncate text-lg font-black leading-tight text-white drop-shadow-sm">
                  Sterowanie akademią
                </p>
                <p className="mt-0.5 truncate text-xs text-white/80">Mecze, gracze, portfele i ustawienia.</p>
              </div>
            </PhotoPanel>
          </div>

          {searchSlot ? <div className="relative z-40 shrink-0">{searchSlot}</div> : null}

          <nav
            className="flex min-h-0 flex-1 flex-col gap-3 lg:hidden"
            aria-label="Sekcje panelu admina"
          >
            {navGroups.map((g) => (
              <div key={g.id} className="flex flex-col gap-1.5">
                {g.label ? (
                  <p
                    className={cn(
                      "px-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]",
                      marketplaceEnabled
                        ? "text-[var(--mp-teal-dark)] dark:text-teal-300"
                        : "text-white/70"
                    )}
                  >
                    {g.label}
                  </p>
                ) : null}
                {g.items.map((t) => (
                  <NavTabButton
                    key={t.id}
                    tab={{ ...t, desc: undefined }}
                    active={activeTab === t.id}
                    onSelect={() => selectMobileTab(t.id)}
                  />
                ))}
              </div>
            ))}
          </nav>

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
                    onClick={() => openDesktopGroup(g)}
                    aria-expanded={isOpen}
                    className={cn(
                      "awp-focus-ring flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-sm font-bold uppercase tracking-[0.12em] transition-colors",
                      containsActive
                        ? accentText
                        : marketplaceEnabled
                          ? "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          : "text-white/70 hover:text-white"
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
                    <div className="mt-1 space-y-1.5">
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
          <div
            className={cn(
              "relative z-10 flex shrink-0 flex-col gap-2 border-t pt-3",
              marketplaceEnabled
                ? "border-zinc-200 dark:border-zinc-800"
                : "border-white/20"
            )}
          >
            <div className="flex flex-col gap-1.5">
              <AdminTestModeSidebarButton />
              <AdminMarketplaceSidebarButton />
              <AdminOperatorPaymentsSidebarButton
                active={activeTab === "operator-payments"}
                onOpen={() => {
                  onTabChange("operator-payments");
                  setMobilePhase("content");
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              <AdminNavTile
                title={isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
                desc={isDarkNow ? "Przełącz na jasny interfejs" : "Przełącz na ciemny interfejs"}
                icon={isDarkNow ? Sun : Moon}
                photoKey="theme"
                onClick={() => void toggleTheme()}
              />
              <AdminNavTile
                title="Terminarz"
                desc="Widok gracza — zapisy na mecze"
                icon={Calendar}
                photoKey="terminarz"
                href="/terminarz"
              />
              <AdminNavTile
                title="Strona główna"
                desc="Wróć na start akademii"
                icon={ArrowLeft}
                photoKey="home"
                href="/"
              />
              <AdminNavTile
                title="Wyloguj"
                desc="Zakończ sesję administratora"
                icon={LogOut}
                photoKey="logout"
                onClick={onLogout}
              />
            </div>
          </div>
        </div>
      </aside>

      <main
        ref={mainRef}
        className={cn(
          "relative min-w-0 flex-1",
          showMobileMenu && "hidden lg:block",
          marketplaceEnabled && "bg-zinc-100 dark:bg-zinc-950"
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={220}
            height={220}
            className={cn(
              "absolute -right-16 top-8 h-auto w-[220px] max-w-none sm:top-12",
              marketplaceEnabled ? "opacity-[0.06]" : "opacity-[0.14]"
            )}
          />
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={160}
            height={160}
            className={cn(
              "absolute -left-10 bottom-24 h-auto w-[160px] max-w-none sm:bottom-32",
              marketplaceEnabled ? "opacity-[0.05]" : "opacity-[0.12]"
            )}
          />
        </div>

        <div className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={openMobileMenu}
              className={cn(
                "awp-focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold",
                marketplaceEnabled
                  ? "bg-[var(--mp-teal)] text-white"
                  : "bg-[var(--mundial-gold,#f5c518)] text-[var(--mundial-navy,#0a1628)]"
              )}
            >
              <Menu className="h-4 w-4" aria-hidden />
              Menu
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                {activeTabMeta?.tab.label ?? "Panel"}
              </p>
              {activeTabMeta?.group.label ? (
                <p className="truncate text-xs text-zinc-500">{activeTabMeta.group.label}</p>
              ) : null}
            </div>
            {searchSlot ? (
              <div className="shrink-0">
                {isValidElement(searchSlot)
                  ? cloneElement(searchSlot as ReactElement<{ compact?: boolean }>, { compact: true })
                  : searchSlot}
              </div>
            ) : null}
          </div>
          {activeTabMeta && activeTabMeta.group.items.length > 1 ? (
            <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-3 pb-2 [touch-action:pan-x_pan-y] [scrollbar-width:none]">
              {activeTabMeta.group.items.map((t) => {
                const on = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTabChange(t.id)}
                    className={cn(
                      "awp-focus-ring shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
                      on
                        ? marketplaceEnabled
                          ? "bg-[var(--mp-teal)] text-white"
                          : "bg-[var(--mundial-gold,#f5c518)] text-[var(--mundial-navy,#0a1628)]"
                        : marketplaceEnabled
                          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          : "bg-white/15 text-white"
                    )}
                  >
                    {t.label}
                    {t.badgeCount != null && t.badgeCount > 0 ? ` (${t.badgeCount > 99 ? "99+" : t.badgeCount})` : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div
            className={cn(
              "pointer-events-none absolute right-6 top-16 z-20 flex items-center gap-2 text-sm lg:top-6",
              marketplaceEnabled ? "text-zinc-500" : "text-emerald-100/80"
            )}
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
  const { marketplaceEnabled } = useSiteMode();
  return (
    <div className="mb-4 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
      <SiteSectionHero
        kicker={marketplaceEnabled ? `${kicker} · V2` : kicker}
        title={title}
        subtitle={description}
        showCrest
        size="default"
        align="left"
        className="hidden min-w-0 flex-1 lg:block"
      />
      {children ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:pt-2">{children}</div>
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
  const { marketplaceEnabled } = useSiteMode();

  if (tone === "data") {
    const header =
      title || description || headerExtra ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="pitch-heading text-xl font-black tracking-tight sm:text-2xl">{title}</h2> : null}
            {description ? (
              <p className="admin-data-muted mt-1.5 text-sm leading-relaxed sm:text-base">{description}</p>
            ) : null}
          </div>
          {headerExtra}
        </div>
      ) : null;
    return (
      <section id={id} className={cn("admin-data-card", className)} data-admin-card="">
        {header}
        {children}
      </section>
    );
  }

  if (marketplaceEnabled) {
    return (
      <MarketplaceSection
        id={id}
        title={title}
        description={description}
        headerExtra={headerExtra}
        className={className}
      >
        {children}
      </MarketplaceSection>
    );
  }

  const header =
    title || description || headerExtra ? (
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title ? <h2 className="pitch-heading text-xl font-black tracking-tight sm:text-2xl">{title}</h2> : null}
            {description ? (
              <p className="pitch-muted mt-1.5 hidden text-sm leading-relaxed sm:block sm:text-base">{description}</p>
            ) : null}
        </div>
        {headerExtra}
      </div>
    ) : null;

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
  photoKey,
}: {
  label: string;
  hint: string;
  value: number | string | undefined;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onClick: () => void;
  photoKey?: string;
}) {
  const { marketplaceEnabled } = useSiteMode();
  return (
    <button type="button" onClick={onClick} className="group awp-focus-ring block h-full w-full text-left">
      <div
        className={cn(
          "flex min-h-[5.5rem] flex-col justify-between rounded-2xl border p-4 shadow-sm lg:hidden",
          marketplaceEnabled
            ? "border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            : "border-white/25 bg-black/20 text-white"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold">{label}</p>
            <p className={cn("mt-0.5 text-xs", marketplaceEnabled ? "text-zinc-500" : "text-white/70")}>{hint}</p>
          </div>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              marketplaceEnabled
                ? "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300"
                : "bg-white/15 text-white"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p
          className={cn(
            "mt-2 text-2xl font-black tabular-nums tracking-tight",
            marketplaceEnabled ? "text-[var(--mp-teal-dark)] dark:text-teal-300" : "text-[var(--mundial-gold,#f5c518)]"
          )}
        >
          {value ?? "–"}
        </p>
      </div>
      <div className="hidden lg:block">
      <PhotoPanel
        src={pitchPhotoAt(adminPhotoIndex(photoKey ?? label))}
        className="min-h-[8.5rem] border-2 border-white/30 shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-xl"
        contentClassName="flex min-h-[8.5rem] flex-col justify-between p-5"
        overlayClassName="bg-gradient-to-t from-black/80 via-black/45 to-black/20"
        sizes="(max-width: 768px) 100vw, 360px"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-white drop-shadow-sm sm:text-xl">{label}</p>
            <p className="mt-1 text-sm leading-snug text-emerald-50/90 sm:text-base">{hint}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40">
            <Icon className="h-5 w-5 text-white" aria-hidden />
          </div>
        </div>
        <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-[var(--mundial-gold,#f5c518)] drop-shadow-sm">
          {value ?? "–"}
        </p>
      </PhotoPanel>
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
