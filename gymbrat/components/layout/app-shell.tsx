"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  ChefHat,
  Dumbbell,
  Home,
  LineChart,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Shield,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { releaseDocumentScrollLock } from "@/lib/document-scroll";
import { cn } from "@/lib/utils";
import { CoachChatFab } from "@/components/layout/coach-chat-fab";
import { StartWorkoutFab } from "@/components/layout/start-workout-fab";
import { useI18n } from "@/components/i18n/i18n-provider";
import { AwpCrossLink, AwpHeaderChip } from "@/components/awp-cross-link";
import { SisterSiteArrivalBanner } from "@/components/sister-site-arrival-banner";

function navItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const nav = useMemo(
    () => [
      { href: "/", label: t("nav.start"), icon: Home },
      { href: "/meal-suggestions", label: t("nav.meals"), icon: ChefHat },
      { href: "/workout-plan", label: t("nav.plan"), icon: Dumbbell },
      { href: "/reports", label: t("nav.reports"), icon: BarChart3 },
      { href: "/progress-analysis", label: t("nav.analysis"), icon: LineChart },
      { href: "/workout-history", label: t("nav.history"), icon: ScrollText },
      { href: "/changelog", label: t("nav.news"), icon: Sparkles },
      { href: "/profile", label: t("nav.profile"), icon: User },
    ],
    [t],
  );

  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const reduceFixedBugs = pathname.startsWith("/active-workout");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const mobileNavTitleId = useId();

  useLayoutEffect(() => {
    releaseDocumentScrollLock();
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const root = document.documentElement;
    if (mobileMenuOpen) {
      body.style.overflow = "hidden";
      root.style.overflow = "hidden";
      return;
    }
    body.style.overflow = "";
    root.style.overflow = "";
  }, [mobileMenuOpen]);

  function toggleTheme() {
    setThemeBusy(true);
    try {
      const next = !document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("gymbrat-ui-theme", next ? "dark" : "light");
      setIsDark(next);
    } finally {
      setThemeBusy(false);
    }
  }

  const primaryNav = nav.slice(0, 5);
  const moreNav = nav.slice(5);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[var(--background)] text-zinc-900 dark:text-zinc-100">
      <Suspense fallback={null}>
        <SisterSiteArrivalBanner />
      </Suspense>

      <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mp-header relative z-30 text-zinc-900 dark:text-zinc-50">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
            <Link href="/" className="awp-focus-ring group flex min-w-0 shrink-0 items-center gap-2.5 rounded-xl pr-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mp-teal)] shadow-sm">
                <Dumbbell className="h-5 w-5 text-white" aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-black tracking-tight text-zinc-950 dark:text-white sm:text-base">
                  GymBrat
                </span>
                <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)] xs:block">
                  Trening · AWP
                </span>
              </span>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Główna nawigacja">
              {primaryNav.map((item) => {
                const active = navItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "awp-focus-ring rounded-lg px-2.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "text-[var(--mp-teal-dark)]"
                        : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <AwpHeaderChip />
              {data?.user?.role === "admin" ? (
                <Link
                  href="/admin"
                  className={cn(
                    "awp-focus-ring hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] sm:inline-flex",
                    pathname.startsWith("/admin")
                      ? "border-[var(--mundial-gold)] bg-[var(--mundial-gold)]/90 text-[var(--mundial-navy)]"
                      : "border-zinc-200 text-zinc-600 hover:border-[var(--mp-teal)] hover:text-[var(--mp-teal-dark)] dark:border-zinc-700 dark:text-zinc-300",
                  )}
                >
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Admin
                </Link>
              ) : null}

              <button
                type="button"
                onClick={toggleTheme}
                disabled={themeBusy}
                className={cn(
                  "awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors",
                  "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
                  themeBusy && "opacity-70",
                )}
                aria-label={isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
              >
                {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                aria-label="Otwórz menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="gymbrat-mobile-nav"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>

              <div className="hidden items-center gap-1 lg:flex">
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="awp-focus-ring rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-100"
                >
                  {data?.user?.name ? data.user.name.split(" ")[0] : "Profil"}
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="awp-focus-ring rounded-lg px-2.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                  Wyloguj
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
            aria-label="Zamknij menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="gymbrat-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-labelledby={mobileNavTitleId}
            className="absolute inset-y-0 right-0 flex w-[min(100%,21.5rem)] flex-col border-l border-zinc-200/90 bg-[#f4f5f7] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
              <div className="min-w-0">
                <p id={mobileNavTitleId} className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">
                  Menu
                </p>
                <p className="truncate text-sm font-bold">GymBrat</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
              {nav.map((item) => {
                const active = navItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "awp-focus-ring flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-transparent bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15"
                        : "border-zinc-200/90 bg-white text-zinc-800 shadow-sm hover:border-teal-200 hover:bg-teal-50/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
              {data?.user?.role === "admin" ? (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="awp-focus-ring flex min-h-12 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <Shield className="h-4 w-4" />
                  Panel admina
                </Link>
              ) : null}
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Siostrzana aplikacja
                </p>
                <AwpCrossLink variant="sheet" onClick={() => setMobileMenuOpen(false)} />
              </div>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Wyloguj się
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <main
        key={pathname}
        className={cn(
          "mx-auto min-w-0 w-full max-w-6xl flex-1 overflow-x-clip px-3 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-8 md:pb-8",
          reduceFixedBugs ? "animate-page-enter-opacity" : "animate-page-enter",
        )}
      >
        {children}
        {!reduceFixedBugs ? (
          <div className="mt-10 border-t border-zinc-200 pt-6 md:mt-12 dark:border-zinc-800">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Siostrzana aplikacja
            </p>
            <AwpCrossLink variant="footer" />
          </div>
        ) : null}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
        aria-label="Nawigacja mobilna"
      >
        <div className="mx-auto grid min-w-0 max-w-6xl grid-cols-5 gap-0 px-0.5 py-1.5 sm:gap-0.5 sm:px-2 sm:py-2">
          {primaryNav.map((item) => {
            const active = navItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-center text-[9px] font-semibold leading-tight sm:text-[11px]",
                  active
                    ? "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/40 dark:text-teal-300"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                <item.icon
                  className={cn("h-4 w-4 shrink-0 sm:h-5 sm:w-5", active && "text-[var(--mp-teal)]")}
                />
                <span className="line-clamp-2 max-w-full break-words leading-[1.15]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* moreNav kept for a11y / future desktop overflow */}
      <span className="sr-only">{moreNav.map((n) => n.label).join(", ")}</span>

      <CoachChatFab />
      <StartWorkoutFab />
    </div>
  );
}
