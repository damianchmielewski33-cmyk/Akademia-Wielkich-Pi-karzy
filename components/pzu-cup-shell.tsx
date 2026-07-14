"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CalendarDays, LogIn, LogOut, Trophy, UserPlus, Users } from "lucide-react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { NavigationLoadingOverlay } from "@/components/navigation-loading-overlay";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  siteName: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  account?: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null;
};

function NavLink({ href, children, active }: { href: string; children: ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-sky-500/25 text-white shadow-sm ring-1 ring-sky-300/30"
          : "text-sky-100/90 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}

export function PzuCupShell({ children, siteName, isLoggedIn, isAdmin, account = null }: Props) {
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const navItems = [
    { href: "/pzu-cup", label: "Start" },
    { href: "/pzu-cup/terminarz", label: "Terminarz" },
    { href: "/pzu-cup/pilkarze", label: "Piłkarze" },
    { href: "/pzu-cup/rankingi", label: "Rankingi" },
  ];

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-[#0a1628] via-[#0f2847] to-[#061018]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255,255,255,0.4) 49px, rgba(255,255,255,0.4) 50px)",
        }}
        aria-hidden
      />
      <AnalyticsTracker />
      <NavigationLoadingOverlay />

      <header className="relative z-10 border-b border-sky-400/20 bg-[#0a1628]/90 backdrop-blur-md">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Powrót do Akademii
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300/80">Turniej</p>
              <p className="truncate text-lg font-bold text-white">{siteName}</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} active={pathname === item.href}>
                {item.label}
              </NavLink>
            ))}
            {isLoggedIn ? (
              <>
                {isAdmin ? (
                  <NavLink href="/panel-admina?tab=pzu-cup" active={false}>
                    Admin
                  </NavLink>
                ) : null}
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-sky-100/90 hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Wyloguj
                </button>
              </>
            ) : (
              <NavLink href="/pzu-cup/login" active={pathname === "/pzu-cup/login"}>
                <span className="inline-flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" aria-hidden />
                  Logowanie
                </span>
              </NavLink>
            )}
          </nav>
        </div>

        {isLoggedIn && account ? (
          <div className="border-t border-sky-400/10 bg-sky-950/30 px-4 py-2">
            <div className="container mx-auto flex max-w-6xl items-center gap-3">
              <PlayerAvatar
                photoPath={account.profilePhotoPath}
                firstName={account.firstName}
                lastName={account.lastName}
                size="sm"
              />
              <PlayerNameStack
                firstName={account.firstName}
                lastName={account.lastName}
                nick={account.zawodnik}
                className="text-left text-sm text-sky-100"
              />
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative z-10 flex flex-1 flex-col">{children}</main>

      <footer className="relative z-10 border-t border-sky-400/15 px-4 py-4 text-center text-xs text-sky-200/60">
        {siteName} — osobna baza zawodników i meczów, niezależna od Akademii Wielkich Piłkarzy
      </footer>

      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof CalendarDays;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-sky-400/25 bg-sky-950/40 p-4 text-left shadow-lg transition hover:border-amber-400/40 hover:bg-sky-900/50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="block font-bold text-white group-hover:text-amber-100">{title}</span>
        <span className="mt-0.5 block text-sm text-sky-200/75">{desc}</span>
      </span>
    </Link>
  );
}

export function PzuCupHomeClient({
  siteName,
  siteDescription,
  isLoggedIn,
  firstName,
  lastName,
  zawodnik,
  profilePhotoPath,
}: {
  siteName: string;
  siteDescription: string;
  isLoggedIn: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
}) {
  return (
    <div className="container mx-auto max-w-4xl flex-1 px-4 py-10">
      {isLoggedIn ? (
        <div className="mb-8 flex items-center gap-4">
          <PlayerAvatar
            photoPath={profilePhotoPath}
            firstName={firstName}
            lastName={lastName}
            size="lg"
            className="ring-2 ring-amber-400/50"
          />
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-300/90">Witaj w turnieju</p>
            <h1 className="text-2xl font-bold text-white">{`${firstName} ${lastName}`.trim() || zawodnik}</h1>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-900/50 to-[#0a1628] p-8 text-left shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">PZU Cup</p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{siteName}</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-sky-100/85">{siteDescription}</p>
        <p className="mt-4 text-sm text-sky-200/70">
          To osobna sekcja aplikacji — zawodnicy, mecze i rankingi turnieju nie mieszają się z Akademią.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Tile href="/pzu-cup/terminarz" icon={CalendarDays} title="Terminarz" desc="Mecze turnieju i zapisy" />
        <Tile href="/pzu-cup/pilkarze" icon={Users} title="Piłkarze" desc="Zawodnicy PZU Cup" />
        <Tile href="/pzu-cup/rankingi" icon={Trophy} title="Rankingi" desc="Statystyki turnieju" />
        {!isLoggedIn ? (
          <>
            <Tile href="/pzu-cup/login" icon={LogIn} title="Logowanie" desc="Konto turniejowe" />
            <Tile href="/pzu-cup/register" icon={UserPlus} title="Rejestracja" desc="Dołącz do turnieju" />
          </>
        ) : null}
      </div>
    </div>
  );
}
