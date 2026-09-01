"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import type { SiteMode } from "@/lib/site-mode";
import { cn } from "@/lib/utils";

export type ShellNavItem = {
  href: string;
  label: string;
  visible: boolean;
  icon: LucideIcon;
};

export type ShellAccount = {
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
};

function navItemActive(pathname: string | null, href: string) {
  return pathname === href || (href !== "/" && Boolean(pathname?.startsWith(`${href}/`)));
}

function MobileNavLink({
  item,
  active,
  onNavigate,
}: {
  item: ShellNavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "awp-focus-ring flex min-h-12 touch-manipulation items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "border-transparent bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15"
          : "border-zinc-200/90 bg-white text-zinc-800 shadow-sm hover:border-teal-200 hover:bg-teal-50/80 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-900"
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
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {item.label}
    </Link>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  siteName: string;
  mode: SiteMode | null;
  pathname: string | null;
  isLoggedIn: boolean;
  account: ShellAccount | null;
  visiblePrimary: ShellNavItem[];
  visibleAcademyMore: ShellNavItem[];
  visibleAuth: ShellNavItem[];
  isDarkNow: boolean;
  themeBusy: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSetMode: (mode: SiteMode, options?: { navigateHome?: boolean }) => void;
};

export function SiteMobileNav({
  open,
  onClose,
  titleId,
  siteName,
  mode,
  pathname,
  isLoggedIn,
  account,
  visiblePrimary,
  visibleAcademyMore,
  visibleAuth,
  isDarkNow,
  themeBusy,
  onToggleTheme,
  onLogout,
  onSetMode,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
        aria-label="Zamknij menu"
        onClick={onClose}
      />
      <div
        id="awp-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex w-[min(100%,21.5rem)] flex-col border-l border-zinc-200/90 bg-[#f4f5f7] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">
              {mode === "booking" ? "Rezerwacja" : mode === "academy" ? "Akademia" : "Menu"}
            </p>
            <p id={titleId} className="truncate text-base font-black text-zinc-950 dark:text-white">
              {siteName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="awp-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            aria-label="Zamknij menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3" aria-label="Nawigacja mobilna">
          {isLoggedIn && account ? (
            <Link
              href={mode === "academy" ? "/profil" : "/"}
              onClick={onClose}
              className="mb-3 flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <PlayerAvatar
                photoPath={account.profilePhotoPath}
                firstName={account.firstName}
                lastName={account.lastName}
                size="md"
                ringClassName="ring-2 ring-[var(--mp-teal)]/40"
              />
              <span className="min-w-0 flex-1">
                <PlayerNameStack
                  firstName={account.firstName}
                  lastName={account.lastName}
                  nick={account.zawodnik}
                  primaryClassName="truncate text-sm font-bold text-zinc-950 dark:text-white"
                  secondaryClassName="truncate text-xs text-zinc-500"
                />
                {mode === "academy" ? (
                  <span className="mt-0.5 block text-[11px] font-semibold text-[var(--mp-teal-dark)]">Mój profil</span>
                ) : null}
              </span>
            </Link>
          ) : null}

          {mode ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "min-h-11 touch-manipulation rounded-2xl border px-3 py-2.5 text-left text-sm font-bold shadow-sm",
                  mode === "booking"
                    ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white"
                    : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                )}
                onClick={() => {
                  if (mode === "booking") return;
                  onClose();
                  onSetMode("booking", { navigateHome: true });
                }}
              >
                Szukam boiska
              </button>
              <button
                type="button"
                className={cn(
                  "min-h-11 touch-manipulation rounded-2xl border px-3 py-2.5 text-left text-sm font-bold shadow-sm",
                  mode === "academy"
                    ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white"
                    : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                )}
                onClick={() => {
                  if (mode === "academy") return;
                  onClose();
                  onSetMode("academy", { navigateHome: true });
                }}
              >
                Gram z wami
              </button>
            </div>
          ) : null}

          {mode === "academy" ? (
            <>
              <p className="mb-1.5 px-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">
                Główne
              </p>
              <ul className="mb-3 space-y-1">
                {visiblePrimary.map((x) => (
                  <li key={x.href}>
                    <MobileNavLink
                      item={x}
                      active={navItemActive(pathname, x.href)}
                      onNavigate={onClose}
                    />
                  </li>
                ))}
              </ul>
              <p className="mb-1.5 px-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-zinc-400">
                Więcej
              </p>
              <ul className="space-y-1">
                {visibleAcademyMore.map((x) => (
                  <li key={x.href}>
                    <MobileNavLink
                      item={x}
                      active={navItemActive(pathname, x.href)}
                      onNavigate={onClose}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="space-y-1">
              {visiblePrimary.map((x) => (
                <li key={x.href}>
                  <MobileNavLink
                    item={x}
                    active={navItemActive(pathname, x.href)}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          )}

          {!isLoggedIn && visibleAuth.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {visibleAuth.map((x) => (
                <Link
                  key={x.href}
                  href={x.href}
                  onClick={onClose}
                  className={cn(
                    "awp-focus-ring flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition",
                    x.href === "/login"
                      ? "bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15 hover:bg-[var(--mp-teal-dark)]"
                      : "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  )}
                >
                  <x.icon className="h-4 w-4" aria-hidden />
                  {x.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-auto space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <button
              type="button"
              className="awp-focus-ring flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
              onClick={onToggleTheme}
              disabled={themeBusy}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                {isDarkNow ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
              </span>
              {isDarkNow ? "Jasny motyw" : "Ciemny motyw"}
            </button>
            {isLoggedIn ? (
              <button
                type="button"
                className="awp-focus-ring flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <LogOut className="h-4 w-4" aria-hidden />
                </span>
                Wyloguj
              </button>
            ) : null}
          </div>
        </nav>
      </div>
    </div>
  );
}
