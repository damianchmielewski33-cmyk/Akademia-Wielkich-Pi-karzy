"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { NavigationLoadingOverlay } from "@/components/navigation-loading-overlay";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { SiteAssetImage } from "@/components/site-asset-image";
import { useSiteAsset } from "@/components/site-assets-provider";
import { cn } from "@/lib/utils";
import { SITE_NAME, getPublicContactEmailWithFallback } from "@/lib/site";

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
  siteName?: string;
  contactEmail?: string;
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
  siteName = SITE_NAME,
  contactEmail: contactEmailProp,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const contactEmail = contactEmailProp ?? getPublicContactEmailWithFallback();
  const pitchLinesBg = useSiteAsset("bg_pitch_lines");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  if (pathname === "/panel-admina" || pathname?.startsWith("/panel-admina")) {
    return <>{children}</>;
  }

  const navItems: Array<{ href: string; label: string; visible: boolean }> = [
    { href: "/", label: "Start", visible: true },
    { href: "/terminarz", label: "Terminarz", visible: true },
    { href: "/platnosci", label: "Płatności", visible: isLoggedIn },
    { href: "/pilkarze", label: "Piłkarze", visible: true },
    { href: "/sklady", label: "Składy", visible: true },
    { href: "/galeria", label: "Galeria", visible: true },
    { href: "/statystyki", label: "Statystyki", visible: isLoggedIn },
    { href: "/rankingi", label: "Rankingi", visible: isLoggedIn },
    { href: "/o-nas", label: "O nas", visible: true },
    { href: "/kontakt", label: "Kontakt", visible: true },
    { href: "/panel-admina", label: "Panel admina", visible: isAdmin },
    { href: "/login", label: "Logowanie", visible: !isLoggedIn },
    { href: "/register", label: "Rejestracja", visible: !isLoggedIn },
  ];

  const isDarkNow =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;

  async function toggleTheme() {
    if (themeBusy) return;
    const nextTheme = isDarkNow ? "light" : "dark";

    // Optymistycznie przełączamy klasę natychmiast (bez "flash").
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
    <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-100">
      <NavigationLoadingOverlay />
      <AnalyticsTracker />
      <header className="mundial-header relative z-30 border-b border-[var(--mundial-gold)]/30 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 28px)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:py-3.5">
          <Link href="/" className="awp-focus-ring flex items-center gap-3 rounded-xl pr-2">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-[var(--mundial-gold)]/40">
              <SiteAssetImage
                asset="logo_header"
                alt="Logo"
                width={160}
                height={160}
                className="h-9 w-9"
                priority
                sizes="40px"
              />
            </span>
            <span className="text-left">
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--mundial-gold)]">
                Mundial 2026
              </span>
              <span className="block text-sm font-semibold leading-snug sm:text-base">Akademia Wielkich Piłkarzy</span>
            </span>
          </Link>

          <nav className="flex items-center justify-end gap-2" aria-label="Główna nawigacja">
            {/* Desktop / tablet */}
            <div className="hidden flex-wrap items-center justify-end gap-1 sm:flex sm:gap-1.5">
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

              {navItems
                .filter((x) => x.visible)
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
                    "awp-focus-ring flex max-w-[min(100%,14rem)] items-center gap-2 rounded-xl px-2 py-1.5 transition-[background-color,color,box-shadow] sm:max-w-[min(100%,15rem)]",
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
                  <div className="hidden min-w-0 sm:block">
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

            {/* Mobile */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => void toggleTheme()}
                disabled={themeBusy}
                className={cn(
                  "awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/15",
                  themeBusy && "opacity-70"
                )}
                aria-label={isDarkNow ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
                title={isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
              >
                {isDarkNow ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
              </button>

              {isLoggedIn && account ? (
                <Link
                  href="/profil"
                  className={cn(
                    "awp-focus-ring flex items-center gap-2 rounded-xl px-2 py-1.5 transition-[background-color,color]",
                    pathname === "/profil" ? "bg-white/15 text-white" : "text-emerald-100/90 hover:bg-white/10"
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
                </Link>
              ) : null}

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/15"
                    aria-label="Otwórz menu"
                    title="Menu"
                  >
                    <Menu className="h-5 w-5" aria-hidden />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={10}
                    className="z-50 min-w-[15rem] overflow-hidden rounded-2xl border border-white/20 bg-emerald-950/95 p-1 text-white shadow-[0_26px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-md"
                  >
                    {navItems
                      .filter((x) => x.visible)
                      .filter((x) => x.href !== "/panel-admina" || isAdmin)
                      .filter((x) => x.href !== "/platnosci" || isLoggedIn)
                      .filter((x) => x.href !== "/statystyki" || isLoggedIn)
                      .filter((x) => x.href !== "/rankingi" || isLoggedIn)
                      .filter((x) => x.href !== "/login" || !isLoggedIn)
                      .filter((x) => x.href !== "/register" || !isLoggedIn)
                      .map((x) => (
                        <DropdownMenu.Item key={x.href} asChild>
                          <Link
                            href={x.href}
                            className={cn(
                              "awp-focus-ring block rounded-xl px-3 py-2 text-sm font-semibold",
                              pathname === x.href ? "bg-white/12 text-white" : "text-emerald-50/90 hover:bg-white/10"
                            )}
                          >
                            {x.label}
                          </Link>
                        </DropdownMenu.Item>
                      ))}

                    {isLoggedIn ? (
                      <>
                        <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                        <DropdownMenu.Item
                          className="awp-focus-ring flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-50/90 hover:bg-white/10"
                          onSelect={(e) => {
                            e.preventDefault();
                            setLogoutOpen(true);
                          }}
                        >
                          <LogOut className="h-4 w-4" aria-hidden />
                          Wyloguj
                        </DropdownMenu.Item>
                      </>
                    ) : null}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </nav>
        </div>
      </header>

      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />

      <main className="relative flex flex-1 flex-col">
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

      <footer className="relative z-20 border-t border-emerald-950/25 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40"
          style={{
            backgroundImage: `url("${pitchLinesBg.replace(/"/g, "%22")}")`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <SiteAssetImage
              asset="logo_crest"
              alt={siteName}
              width={144}
              height={144}
              className="h-9 w-9 opacity-90"
              sizes="36px"
            />
            <div>
              <p className="text-sm font-semibold text-white">{siteName}</p>
              <p className="text-xs text-emerald-200/80">Terminarz, statystyki i społeczność na boisku</p>
              <p className="mt-2 text-xs text-emerald-200/85">
                <Link href="/o-nas" className="font-medium underline-offset-2 hover:underline">
                  O nas i zasady
                </Link>
                {contactEmail ? (
                  <>
                    {" · "}
                    <a href={`mailto:${contactEmail}`} className="font-medium underline-offset-2 hover:underline">
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
