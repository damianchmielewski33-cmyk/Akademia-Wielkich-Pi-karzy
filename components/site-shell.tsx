"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SITE_NAME, getPublicContactEmail } from "@/lib/site";

type Props = {
  children: ReactNode;
  isLoggedIn: boolean;
  isAdmin: boolean;
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

export function SiteShell({ children, isLoggedIn, isAdmin }: Props) {
  const pathname = usePathname();
  const contactEmail = getPublicContactEmail();
  if (pathname === "/panel-admina" || pathname?.startsWith("/panel-admina")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col text-zinc-900">
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
              src="/logo-akademia.svg"
              alt={SITE_NAME}
              width={40}
              height={40}
              className="h-9 w-9"
              priority
              unoptimized
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
            <NavButton href="/pilkarze" active={pathname === "/pilkarze"}>
              Piłkarze
            </NavButton>
            <NavButton href="/sklady" active={pathname === "/sklady"}>
              Składy
            </NavButton>
            {isLoggedIn && (
              <>
                <NavButton href="/statystyki" active={pathname === "/statystyki"}>
                  Statystyki
                </NavButton>
                <NavButton href="/rankingi" active={pathname === "/rankingi"}>
                  Rankingi
                </NavButton>
              </>
            )}
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
              <a
                href="/api/auth/logout"
                className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-100/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                Wyloguj
              </a>
            )}
          </nav>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={220}
            height={220}
            className="absolute -right-16 top-8 opacity-[0.06] sm:top-12"
            unoptimized
          />
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={160}
            height={160}
            className="absolute -left-10 bottom-24 opacity-[0.05] sm:bottom-32"
            unoptimized
          />
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={120}
            height={120}
            className="absolute bottom-8 right-[18%] opacity-[0.04] max-sm:hidden"
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
              src="/logo-akademia.svg"
              alt={SITE_NAME}
              width={36}
              height={36}
              className="h-9 w-9 opacity-90"
              unoptimized
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
