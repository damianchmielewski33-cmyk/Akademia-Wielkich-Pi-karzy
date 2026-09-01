"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { AndroidAppBanner } from "@/components/android-app-banner";
import { AdminHeaderMessagesButton } from "@/components/admin-header-messages-button";
import { GymBratCrossLink } from "@/components/gymbrat-cross-link";
import { SisterSiteArrivalBanner } from "@/components/sister-site-arrival-banner";
import { NavigationLoadingOverlay } from "@/components/navigation-loading-overlay";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { SiteAssetImage } from "@/components/site-asset-image";
import { SiteMobileNav, type ShellNavItem } from "@/components/site-mobile-nav";
import { AdsenseSlot } from "@/components/adsense-slot";
import { CookieConsentFooterLink } from "@/components/cookie-consent-footer-link";
import { StadiumSoundsToggle } from "@/components/stadium-sounds";
import { isAdsenseInlinePath } from "@/lib/adsense";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";
import { useScreenBlocks } from "@/components/screen-blocks-provider";
import { useSiteMode } from "@/components/site-mode";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Camera,
  Home,
  Info,
  LogIn,
  Medal,
  Menu,
  MessageCircle,
  Moon,
  MapPin,
  Shield,
  Store,
  Sun,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

type Props = {
  children: ReactNode;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isVenuePartner?: boolean;
  account?: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null;
  adminUnreadMessages?: number;
  siteName?: string;
};

type NavItem = ShellNavItem;

function NavLink({
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
        "awp-focus-ring rounded-lg px-2.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] transition-colors",
        active
          ? "text-[var(--mp-teal-dark)]"
          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
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
  isVenuePartner = false,
  account = null,
  adminUnreadMessages = 0,
  siteName = SITE_NAME,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { isHiddenHref } = useScreenBlocks();
  const { mode, setMode } = useSiteMode();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [academyOpen, setAcademyOpen] = useState(false);
  const mobileNavTitleId = useId();

  useEffect(() => {
    setMobileNavOpen(false);
    setAcademyOpen(false);
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
  if (pathname === "/gymbrat" || pathname?.startsWith("/gymbrat")) {
    return <>{children}</>;
  }

  const bookingNav: NavItem[] = [
    { href: "/", label: "Start", visible: true, icon: Home },
    { href: "/obiekty", label: "Znajdź boisko", visible: true, icon: MapPin },
    { href: "/rezerwacje", label: "Moje rezerwacje", visible: true, icon: ClipboardCheck },
    { href: "/dla-obiektow", label: "Dla obiektów", visible: !isVenuePartner, icon: Store },
    { href: "/partner", label: "Mój obiekt", visible: isVenuePartner, icon: Building2 },
    { href: "/panel-admina", label: "Panel admina", visible: isAdmin, icon: Shield },
  ];

  const academyPrimaryNav: NavItem[] = [
    { href: "/", label: "Start", visible: true, icon: Home },
    { href: "/terminarz", label: "Terminarz", visible: true, icon: CalendarDays },
    { href: "/platnosci", label: "Płatności", visible: isLoggedIn, icon: Wallet },
    { href: "/pilkarze", label: "Piłkarze", visible: true, icon: Users },
  ];

  const academyMoreNav: NavItem[] = [
    { href: "/sklady", label: "Składy", visible: true, icon: Medal },
    { href: "/galeria", label: "Galeria", visible: true, icon: Camera },
    { href: "/statystyki", label: "Statystyki", visible: isLoggedIn, icon: Activity },
    { href: "/rankingi", label: "Rankingi", visible: isLoggedIn, icon: Trophy },
    { href: "/blog", label: "Blog", visible: true, icon: BookOpen },
    { href: "/o-nas", label: "O nas", visible: true, icon: Info },
    { href: "/kontakt", label: "Kontakt", visible: true, icon: MessageCircle },
    { href: "/panel-admina", label: "Panel admina", visible: isAdmin, icon: Shield },
  ];

  const authNav: NavItem[] = [
    { href: "/login", label: "Logowanie", visible: !isLoggedIn, icon: LogIn },
    { href: "/register", label: "Rejestracja", visible: !isLoggedIn, icon: UserPlus },
  ];

  const visiblePrimary = (
    mode === "academy" ? academyPrimaryNav : mode === "booking" ? bookingNav : []
  ).filter((x) => x.visible && !isHiddenHref(x.href));
  const visibleAcademyMore = academyMoreNav.filter((x) => x.visible && !isHiddenHref(x.href));
  const visibleAuth = authNav.filter((x) => x.visible && !isHiddenHref(x.href));

  const isDarkNow =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false;

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

  const themeButton = (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      disabled={themeBusy}
      className={cn(
        "awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors",
        "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        themeBusy && "opacity-70"
      )}
      aria-label={isDarkNow ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
    >
      {isDarkNow ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );

  const soundsToggle = (
    <StadiumSoundsToggle
      compact
      className={cn(
        "h-10 w-10 justify-center border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      )}
    />
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-[var(--background)] text-zinc-900 dark:text-zinc-100">
      <NavigationLoadingOverlay />
      <AnalyticsTracker />
      <div className="sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        {mode === "academy" ? <AndroidAppBanner /> : null}
        {mode === "academy" ? (
          <Suspense fallback={null}>
            <SisterSiteArrivalBanner />
          </Suspense>
        ) : null}
        <header
          className={cn(
            "relative z-30 mp-header text-zinc-900 dark:text-zinc-50"
          )}
        >
          <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 xs:px-4 sm:py-3.5">
            <Link
              href="/"
              className="awp-focus-ring flex min-w-0 items-center gap-2.5 rounded-xl pr-1"
            >
              <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--mp-teal)] shadow-sm">
                <SiteAssetImage
                  asset="logo_header"
                  alt="Logo"
                  width={160}
                  height={160}
                  className="h-8 w-8 drop-shadow-sm"
                  priority
                  sizes="40px"
                />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-black tracking-tight text-zinc-950 dark:text-white sm:text-base">
                  <span className="sm:hidden">{mode === "booking" ? "Boiska" : "Akademia WP"}</span>
                  <span className="hidden sm:inline">{siteName}</span>
                </span>
                <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)] xs:block">
                  {mode === "academy" ? "Akademia" : mode === "booking" ? "Rezerwacja boisk" : "\u00a0"}
                </span>
              </span>
            </Link>

            <nav className="relative z-[2] flex shrink-0 items-center justify-end gap-1" aria-label="Główna nawigacja">
              <div className="hidden items-center gap-0.5 lg:flex">
                {isAdmin ? <AdminHeaderMessagesButton initialUnreadCount={adminUnreadMessages} /> : null}

                {visiblePrimary.map((x) => (
                  <NavLink
                    key={x.href}
                    href={x.href}
                    active={pathname === x.href || (x.href !== "/" && pathname?.startsWith(`${x.href}/`))}
                  >
                    {x.label}
                  </NavLink>
                ))}

                {mode === "academy" ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAcademyOpen((open) => !open)}
                    className={cn(
                      "awp-focus-ring inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em]",
                      academyOpen
                        ? "text-[var(--mp-teal-dark)]"
                        : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    )}
                    aria-expanded={academyOpen}
                  >
                    Więcej
                    <ChevronDown className={cn("h-3.5 w-3.5 transition", academyOpen && "rotate-180")} aria-hidden />
                  </button>
                  {academyOpen ? (
                    <div
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      {visibleAcademyMore.map((x) => (
                        <Link
                          key={x.href}
                          href={x.href}
                          onClick={() => setAcademyOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          <x.icon className="h-4 w-4 text-[var(--mp-teal-dark)]" aria-hidden />
                          {x.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
                ) : null}

                {mode ? (
                  <button
                    type="button"
                    onClick={() => setMode(mode === "booking" ? "academy" : "booking", { navigateHome: true })}
                    className="awp-focus-ring ml-1 rounded-full border border-zinc-200 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-600 hover:border-[var(--mp-teal)] hover:text-[var(--mp-teal-dark)] dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {mode === "booking" ? "Gram z wami" : "Szukam boiska"}
                  </button>
                ) : null}

                {themeButton}
                {soundsToggle}

                {isLoggedIn && account && mode === "academy" ? (
                  <Link
                    href="/profil"
                    className={cn(
                      "awp-focus-ring ml-1 flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-zinc-200 px-2 py-1.5 transition-colors hover:border-zinc-300 dark:border-zinc-700",
                      pathname === "/profil" && "border-[var(--mp-teal)]"
                    )}
                    aria-label="Mój profil"
                    title="Mój profil"
                  >
                    <PlayerAvatar
                      photoPath={account.profilePhotoPath}
                      firstName={account.firstName}
                      lastName={account.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-[var(--mp-teal)]/40"
                    />
                    <PlayerNameStack
                      firstName={account.firstName}
                      lastName={account.lastName}
                      nick={account.zawodnik}
                      primaryClassName="truncate text-sm font-semibold text-zinc-900 dark:text-white"
                      secondaryClassName="truncate text-xs text-zinc-500"
                    />
                  </Link>
                ) : isLoggedIn && account ? (
                  <span className="ml-1 flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-zinc-200 px-2 py-1.5 dark:border-zinc-700">
                    <PlayerAvatar
                      photoPath={account.profilePhotoPath}
                      firstName={account.firstName}
                      lastName={account.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-[var(--mp-teal)]/40"
                    />
                    <span className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                      {`${account.firstName} ${account.lastName}`.trim()}
                    </span>
                  </span>
                ) : (
                  visibleAuth.map((x) => (
                    <Link
                      key={x.href}
                      href={x.href}
                      className={cn(
                        "awp-focus-ring ml-1 rounded-full px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em]",
                        x.href === "/login"
                          ? "bg-[var(--mp-teal)] text-white hover:bg-[var(--mp-teal-dark)]"
                          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300"
                      )}
                    >
                      {x.label}
                    </Link>
                  ))
                )}

                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => setLogoutOpen(true)}
                    className="awp-focus-ring rounded-lg px-2.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Wyloguj
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5 lg:hidden">
                {isAdmin ? <AdminHeaderMessagesButton initialUnreadCount={adminUnreadMessages} compact /> : null}
                {themeButton}
                {soundsToggle}
                {isLoggedIn && account && mode === "academy" ? (
                  <Link
                    href="/profil"
                    className="awp-focus-ring flex items-center rounded-full p-0.5"
                    aria-label="Mój profil"
                    title="Mój profil"
                  >
                    <PlayerAvatar
                      photoPath={account.profilePhotoPath}
                      firstName={account.firstName}
                      lastName={account.lastName}
                      size="xs"
                      ringClassName="ring-2 ring-[var(--mp-teal)]/40"
                    />
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  aria-label="Otwórz menu"
                  aria-expanded={mobileNavOpen}
                  aria-controls="awp-mobile-nav"
                  title="Menu"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </nav>
          </div>
        </header>
      </div>

      <SiteMobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        titleId={mobileNavTitleId}
        siteName={siteName}
        mode={mode}
        pathname={pathname}
        isLoggedIn={isLoggedIn}
        account={account}
        visiblePrimary={visiblePrimary}
        visibleAcademyMore={visibleAcademyMore}
        visibleAuth={visibleAuth}
        isDarkNow={isDarkNow}
        themeBusy={themeBusy}
        onToggleTheme={() => void toggleTheme()}
        onLogout={() => setLogoutOpen(true)}
        onSetMode={setMode}
      />

      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />

      <main className="relative flex flex-1 flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
        {isAdsenseInlinePath(pathname) ? (
          <AdsenseSlot placement="inline" className="relative z-10" label="Reklama" />
        ) : null}
        <AdsenseSlot placement="footer" className="relative z-10 mt-auto" />
      </main>

      <footer className="mp-footer relative z-20 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <SiteAssetImage
              asset="logo_crest"
              alt={siteName}
              width={144}
              height={144}
              className="h-12 w-12"
              sizes="48px"
            />
            <p className="mt-4 text-sm font-semibold text-white">{siteName}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {mode === "academy"
                ? "Terminarz akademii, składy i społeczność."
                : mode === "booking"
                  ? "Rezerwuj boiska online — hale i orliki."
                  : "Dwa osobne miejsca: rezerwacja boisk albo akademia."}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white">
              {mode === "academy" ? "Akademia" : mode === "booking" ? "Dla Ciebie" : "Wybierz"}
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-300">
              {mode === "academy" ? (
                <>
                  <Link href="/terminarz" className="hover:text-white">Terminarz</Link>
                  {isLoggedIn ? <Link href="/platnosci" className="hover:text-white">Płatności</Link> : null}
                  <Link href="/pilkarze" className="hover:text-white">Piłkarze</Link>
                  <Link href="/rankingi" className="hover:text-white">Rankingi</Link>
                </>
              ) : mode === "booking" ? (
                <>
                  <Link href="/obiekty" className="hover:text-white">Znajdź boisko</Link>
                  {isLoggedIn ? <Link href="/rezerwacje" className="hover:text-white">Moje rezerwacje</Link> : null}
                  {isVenuePartner ? <Link href="/partner" className="hover:text-white">Mój obiekt</Link> : null}
                  <Link href="/dla-obiektow" className="hover:text-white">Dla obiektów</Link>
                </>
              ) : null}
              {mode ? (
                <button
                  type="button"
                  className="text-left hover:text-white"
                  onClick={() => setMode(mode === "academy" ? "booking" : "academy", { navigateHome: true })}
                >
                  {mode === "academy" ? "Szukam boiska" : "Gram z wami"}
                </button>
              ) : null}
            </div>
          </div>
          {mode === "academy" ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white">
              Więcej
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-300">
              <Link href="/sklady" className="hover:text-white">Składy</Link>
              <Link href="/galeria" className="hover:text-white">Galeria</Link>
              <Link href="/blog" className="hover:text-white">Blog</Link>
              <Link href="/o-nas" className="hover:text-white">O nas</Link>
            </div>
          </div>
          ) : null}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white">Kontakt</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-300">
              <Link href="/kontakt" className="hover:text-white">Kontakt</Link>
              <Link href="/faq" className="hover:text-white">FAQ</Link>
              <Link href="/regulamin" className="hover:text-white">Regulamin</Link>
              <Link href="/polityka-prywatnosci" className="hover:text-white">Polityka prywatności</Link>
              <Link href="/cookies" className="hover:text-white">Cookies</Link>
              <CookieConsentFooterLink />
              {mode === "academy" ? <GymBratCrossLink variant="footer" /> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-zinc-500">
            © {new Date().getFullYear()} {siteName}
          </p>
        </div>
      </footer>
    </div>
  );
}
