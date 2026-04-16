"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { NavigationLoadingOverlay } from "@/components/navigation-loading-overlay";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}

export function SiteShell({ children, isLoggedIn, isAdmin, account = null }: Props) {
  const pathname = usePathname();
  const contactEmail = getPublicContactEmailWithFallback();
  const [logoutOpen, setLogoutOpen] = useState(false);
  if (pathname === "/panel-admina" || pathname?.startsWith("/panel-admina")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col text-zinc-900 dark:text-zinc-100">
      <NavigationLoadingOverlay />
      <AnalyticsTracker />
      <header className="relative z-30 border-b border-emerald-950/30 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 28px)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:py-3.5">
          <Link href="/" className="flex items-center gap-3 rounded-xl pr-2 outline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-300">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner ring-1 ring-white/15">
              <Image
              src="/logo-akademia-crest.png"
              alt={SITE_NAME}
              width={160}
              height={160}
              className="h-9 w-9 object-contain"
              priority
              sizes="40px"
            />
            </span>
            <span className="text-left">
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-300/95">
                Akademia
              </span>
              <span className="block text-sm font-semibold leading-snug sm:text-base">Wielkich Piłkarzy</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5" aria-label="Główna nawigacja">
            <NavButton href="/" active={pathname === "/"}>
              Start
            </NavButton>
            <NavButton href="/terminarz" active={pathname === "/terminarz"}>
              Terminarz
            </NavButton>
            {isLoggedIn && (
              <NavButton href="/platnosci" active={pathname === "/platnosci"}>
                Płatności
              </NavButton>
            )}
            <NavButton href="/pilkarze" active={pathname === "/pilkarze"}>
              Piłkarze
            </NavButton>
            <NavButton href="/sklady" active={pathname === "/sklady"}>
              Składy
            </NavButton>
            <NavButton href="/o-nas" active={pathname === "/o-nas"}>
              O nas
            </NavButton>
            <NavButton href="/kontakt" active={pathname === "/kontakt"}>
              Kontakt
            </NavButton>
            {isLoggedIn && account ? (
              <>
                <Link
                  href="/profil"
                  className={cn(
                    "flex max-w-[min(100%,14rem)] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors outline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-300 sm:max-w-[min(100%,15rem)]",
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
                <NavButton href="/statystyki" active={pathname === "/statystyki"}>
                  Statystyki
                </NavButton>
                <NavButton href="/rankingi" active={pathname === "/rankingi"}>
                  Rankingi
                </NavButton>
              </>
            ) : null}
            {isLoggedIn && !account ? (
              <>
                <NavButton href="/profil" active={pathname === "/profil"}>
                  Mój profil
                </NavButton>
                <NavButton href="/statystyki" active={pathname === "/statystyki"}>
                  Statystyki
                </NavButton>
                <NavButton href="/rankingi" active={pathname === "/rankingi"}>
                  Rankingi
                </NavButton>
              </>
            ) : null}
            {isAdmin && (
              <NavButton href="/panel-admina" active={pathname === "/panel-admina"}>
                Panel admina
              </NavButton>
            )}
            {!isLoggedIn ? (
              <>
                <NavButton href="/login" active={pathname === "/login"}>
                  Logowanie
                </NavButton>
                <NavButton href="/register" active={pathname === "/register"}>
                  Rejestracja
                </NavButton>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-100/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                Wyloguj
              </button>
            )}
          </nav>
        </div>
      </header>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wylogować się?</DialogTitle>
            <DialogDescription>Czy na pewno chcesz zakończyć sesję?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Nie
            </Button>
            <Button variant="destructive" asChild>
              <a href="/api/auth/logout">Tak</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={220}
            height={220}
            className="absolute -right-16 top-8 opacity-[0.06] sm:top-12 dark:opacity-[0.04]"
            unoptimized
          />
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={160}
            height={160}
            className="absolute -left-10 bottom-24 opacity-[0.05] sm:bottom-32 dark:opacity-[0.035]"
            unoptimized
          />
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={120}
            height={120}
            className="absolute bottom-8 right-[18%] opacity-[0.04] max-sm:hidden dark:opacity-[0.03]"
            unoptimized
          />
        </div>
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </main>

      <footer className="relative z-20 border-t border-emerald-950/25 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40"
          style={{
            backgroundImage: "url(/pitch-lines.svg)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-akademia-crest.png"
              alt={SITE_NAME}
              width={144}
              height={144}
              className="h-9 w-9 object-contain opacity-90"
              sizes="36px"
            />
            <div>
              <p className="text-sm font-semibold text-white">{SITE_NAME}</p>
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
