"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  Camera,
  Home,
  Info,
  LogIn,
  LogOut,
  Medal,
  Menu,
  MessageCircle,
  Moon,
  Shield,
  Sun,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { AdminHeaderMessagesButton } from "@/components/admin-header-messages-button";
import { NavigationLoadingOverlay } from "@/components/navigation-loading-overlay";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { SiteAssetImage } from "@/components/site-asset-image";
import { useSiteAsset } from "@/components/site-assets-provider";
import { cn } from "@/lib/utils";
import { SITE_NAME, getPublicContactEmailWithFallback } from "@/lib/site";
import { useScreenBlocks } from "@/components/screen-blocks-provider";

type Props = {
  children: ReactNode;
  isLoggedIn: boolean;
  isAdmin: boolean;
  account?: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null;
  adminUnreadMessages?: number;
  siteName?: string;
  contactEmail?: string;
};

type NavItem = {
  href: string;
  label: string;
  visible: boolean;
  icon: typeof Home;
};

function NavButton({
  href,
  children,
  active,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "awp-focus-ring rounded-xl px-3 py-2 text-sm font-semibold transition-[background-color,color,box-shadow]",
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}

export function SiteShell({
  children,
  isLoggedIn,
  isAdmin,
  account = null,
  adminUnreadMessages = 0,
  siteName = SITE_NAME,
  contactEmail: contactEmailProp,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const contactEmail = contactEmailProp ?? getPublicContactEmailWithFallback();
  const pitchLinesBg = useSiteAsset("bg_pitch_lines");
  const { isHiddenHref } = useScreenBlocks();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavTitleId = useId();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileNavOpen]);

  if (pathname === "/panel-admina" || pathname?.startsWith("/panel-admina")) {
    return <>{children}</>;
  }
  if (pathname === "/pzu-cup" || pathname?.startsWith("/pzu-cup")) {
    return <>{children}</>;
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Start", visible: true, icon: Home },
    { href: "/terminarz", label: "Terminarz", visible: true, icon: CalendarDays },
    { href: "/platnosci", label: "Płatności", visible: isLoggedIn, icon: Wallet },
    { href: "/pilkarze", label: "Piłkarze", visible: true, icon: Users },
    { href: "/sklady", label: "Składy", visible: true, icon: Medal },
    { href: "/galeria", label: "Galeria", visible: true, icon: Camera },
    { href: "/statystyki", label: "Statystyki", visible: isLoggedIn, icon: Activity },
    { href: "/rankingi", label: "Rankingi", visible: isLoggedIn, icon: Trophy },
    { href: "/o-nas", label: "O nas", visible: true, icon: Info },
    { href: "/kontakt", label: "Kontakt", visible: true, icon: MessageCircle },
    { href: "/panel-admina", label: "Panel admina", visible: isAdmin, icon: Shield },
    { href: "/login", label: "Logowanie", visible: !isLoggedIn, icon: LogIn },
    { href: "/register", label: "Rejestracja", visible: !isLoggedIn, icon: UserPlus },
  ];

  const visibleNav = navItems.filter((x) => x.visible && !isHiddenHref(x.href));

  const isDarkNow =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;

  async function toggleTheme() {
    if (themeBusy) return;
    const nextTheme = isDarkNow ? "light" : "dark";

    try {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      localStorage.setItem("awp-ui-theme", nextTheme);
    } catch {
      /* ignore */
    }

    if (!isLoggedIn) return;

    setThemeBusy(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_theme: nextTheme }),
      });
      router.refresh();
    } finally {
      setThemeBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip text-zinc-900 dark:text-zinc-100">
      <NavigationLoadingOverlay />
      <AnalyticsTracker />
      <header className="mundial-header relative z-30 border-b border-[var(--mundial-gold)]/30 text-white shadow-lg pt-[env(safe-area-inset-top)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 28px)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 overflow-hidden px-3 py-3 xs:gap-3 xs:px-4 sm:py-3.5">
          <Link
            href="/"
            className="awp-focus-ring flex min-w-0 max-w-[calc(100%-9.75rem)] flex-1 items-center gap-2 rounded-xl pr-1 xs:max-w-[calc(100%-11rem)] xs:gap-2.5 sm:max-w-none sm:flex-none sm:gap-3 sm:pr-2"
          >
            <span className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-[var(--mundial-gold)]/40 xs:h-10 xs:w-10 sm:h-11 sm:w-11">
              <SiteAssetImage
                asset="logo_header"
                alt="Logo"
                width={160}
                height={160}
                className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9"
                priority
                sizes="40px"
              />
            </span>
            <span className="min-w-0 flex-1 overflow-hidden text-left">
              <span className="hidden text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--mundial-gold)] xs:block xs:text-[0.65rem] xs:tracking-[0.2em]">
                Mundial 2026
              </span>
              <span className="block truncate text-sm font-semibold leading-snug xs:text-[0.95rem] sm:text-base">
                <span className="sm:hidden">Akademia WP</span>
                <span className="hidden sm:inline">Akademia Wielkich Piłkarzy</span>
              </span>
            </span>
          </Link>

          <nav className="relative z-[2] flex shrink-0 items-center justify-end gap-1 xs:gap-1.5 sm:gap-2" aria-label="Główna nawigacja">
            {/* Desktop / duży tablet */}
            <div className="hidden flex-wrap items-center justify-end gap-1 lg:flex lg:gap-1.5">
              {isAdmin ? <AdminHeaderMessagesButton initialUnreadCount={adminUnreadMessages} /> : null}

              <button
                type="button"
                onClick={() => void toggleTheme()}
                disabled={themeBusy}
                className={cn(
                  "awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/15",
                  themeBusy && "opacity-70"
                )}
                aria-label={isDarkNow ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
                title={isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
              >
                {isDarkNow ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
              </button>

              {visibleNav
                .filter((x) => !["/login", "/register"].includes(x.href) || !isLoggedIn)
                .map((x) => (
                  <NavButton key={x.href} href={x.href} active={pathname === x.href}>
                    {x.label}
                  </NavButton>
                ))}

              {isLoggedIn && account ? (
                <Link
                  href="/profil"
                  className={cn(
                    "awp-focus-ring flex max-w-[min(100%,15rem)] items-center gap-2 rounded-xl px-2 py-1.5 transition-[background-color,color,box-shadow]",
                    pathname === "/profil"
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                  )}
                  aria-label="Mój profil"
                  title="Mój profil"
                >
                  <PlayerAvatar
                    photoPath={account.profilePhotoPath}
                    firstName={account.firstName}
                    lastName={account.lastName}
                    size="sm"
                    ringClassName="ring-2 ring-white/45"
                  />
                  <div className="min-w-0">
                    <PlayerNameStack
                      firstName={account.firstName}
                      lastName={account.lastName}
                      nick={account.zawodnik}
                      primaryClassName="truncate text-sm font-semibold text-white"
                      secondaryClassName="truncate text-xs text-emerald-200/90"
                    />
                  </div>
                </Link>
              ) : null}

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="awp-focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-emerald-100/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Wyloguj
                </button>
              ) : null}
            </div>

            {/* Mobile / tablet — kompaktowe przyciski, żeby nie nachodziły na logo */}
            <div className="flex items-center gap-1 xs:gap-1.5 lg:hidden">
              {isAdmin ? (
                <AdminHeaderMessagesButton initialUnreadCount={adminUnreadMessages} compact />
              ) : null}

              <button
                type="button"
                onClick={() => void toggleTheme()}
                disabled={themeBusy}
                className={cn(
                  "awp-focus-ring inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/15 xs:h-10 xs:w-10",
                  themeBusy && "opacity-70"
                )}
                aria-label={isDarkNow ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
                title={isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
              >
                {isDarkNow ? <Sun className="h-4 w-4 xs:h-5 xs:w-5" aria-hidden /> : <Moon className="h-4 w-4 xs:h-5 xs:w-5" aria-hidden />}
              </button>

              {isLoggedIn && account ? (
                <Link
                  href="/profil"
                  className={cn(
                    "awp-focus-ring flex touch-manipulation items-center rounded-xl p-0.5 transition-[background-color,color] xs:p-1",
                    pathname === "/profil" ? "bg-white/15 text-white" : "text-emerald-100/90 hover:bg-white/10"
                  )}
                  aria-label="Mój profil"
                  title="Mój profil"
                >
                  <PlayerAvatar
                    photoPath={account.profilePhotoPath}
                    firstName={account.firstName}
                    lastName={account.lastName}
                    size="xs"
                    ringClassName="ring-2 ring-white/45"
                    className="xs:h-8 xs:w-8 xs:text-xs"
                  />
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="awp-focus-ring inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/15 xs:h-10 xs:w-10"
                aria-label="Otwórz menu"
                aria-expanded={mobileNavOpen}
                aria-controls="awp-mobile-nav"
                title="Menu"
              >
                <Menu className="h-4 w-4 xs:h-5 xs:w-5" aria-hidden />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm"
            aria-label="Zamknij menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="awp-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-labelledby={mobileNavTitleId}
            className="absolute inset-y-0 right-0 flex w-[min(100%,20.5rem)] flex-col border-l border-white/15 bg-emerald-950/98 shadow-[-24px_0_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
              <div className="min-w-0">
                <p id={mobileNavTitleId} className="text-sm font-semibold text-white">
                  Menu
                </p>
                <p className="truncate text-xs text-emerald-200/75">{siteName}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="awp-focus-ring inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
                aria-label="Zamknij menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label="Nawigacja mobilna">
              <ul className="space-y-1">
                {visibleNav.map((x) => {
                  const Icon = x.icon;
                  const active = pathname === x.href;
                  return (
                    <li key={x.href}>
                      <Link
                        href={x.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "awp-focus-ring flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-white/15 text-white shadow-sm ring-1 ring-white/20"
                            : "text-emerald-50/90 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            active ? "bg-white/15 text-[var(--mundial-gold)]" : "bg-white/8 text-emerald-100/90"
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        {x.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {isLoggedIn ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    className="awp-focus-ring flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-50/90 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setMobileNavOpen(false);
                      setLogoutOpen(true);
                    }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/8">
                      <LogOut className="h-4 w-4" aria-hidden />
                    </span>
                    Wyloguj
                  </button>
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}

      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />

      <main className="relative flex flex-1 flex-col pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.75rem))] sm:pb-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={220}
            height={220}
            className="absolute -right-16 top-8 h-auto w-[220px] max-w-none opacity-[0.14] sm:top-12 dark:opacity-[0.12]"
          />
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={160}
            height={160}
            className="absolute -left-10 bottom-24 h-auto w-[160px] max-w-none opacity-[0.12] sm:bottom-32 dark:opacity-[0.1]"
          />
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={120}
            height={120}
            className="absolute bottom-8 right-[18%] h-auto w-[120px] max-w-none opacity-[0.1] max-sm:hidden dark:opacity-[0.08]"
          />
        </div>
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </main>

      <footer className="relative z-20 border-t border-emerald-950/25 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50 pb-[env(safe-area-inset-bottom)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40"
          style={{
            backgroundImage: `url("${pitchLinesBg.replace(/"/g, "%22")}")`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center sm:flex-row sm:justify-between sm:gap-2 sm:text-left">
          <div className="flex max-w-full flex-col items-center gap-3 sm:flex-row sm:items-center">
            <SiteAssetImage
              asset="logo_crest"
              alt={siteName}
              width={144}
              height={144}
              className="h-9 w-9 opacity-90"
              sizes="36px"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{siteName}</p>
              <p className="text-xs text-emerald-200/80">Terminarz, statystyki i społeczność na boisku</p>
              <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-emerald-200/85 sm:justify-start">
                <Link href="/o-nas" className="font-medium underline-offset-2 hover:underline">
                  O nas i zasady
                </Link>
                {contactEmail ? (
                  <>
                    <span aria-hidden className="text-emerald-200/40">
                      ·
                    </span>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="break-all font-medium underline-offset-2 hover:underline"
                    >
                      {contactEmail}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <p className="text-xs text-emerald-200/70">© {new Date().getFullYear()} · Gra z pasją</p>
        </div>
      </footer>
    </div>
  );
}
