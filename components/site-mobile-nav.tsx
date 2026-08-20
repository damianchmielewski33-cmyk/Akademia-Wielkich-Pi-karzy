"use client";

import Link from "next/link";
import { LogOut, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import type { SiteMode } from "@/lib/site-mode";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
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
  light,
  onNavigate,
}: {
  item: ShellNavItem;
  active: boolean;
  light?: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "awp-focus-ring flex min-h-12 touch-manipulation items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors",
        light
          ? cn(
              "rounded-2xl",
              active
                ? "bg-white text-[var(--mp-teal-dark)] shadow-sm ring-1 ring-[var(--mp-teal)]/30 dark:bg-zinc-900"
                : "bg-white/80 text-zinc-800 hover:bg-white dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
            )
          : cn("rounded-xl", active ? "bg-white/15 text-[var(--mundial-gold)]" : "text-white/90 hover:bg-white/10")
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          light
            ? active
              ? "bg-[var(--mp-teal)] text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            : active
              ? "bg-[var(--mundial-gold)]/20 text-[var(--mundial-gold)]"
              : "bg-white/10 text-white/85"
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
  stadium: boolean;
  marketplaceEnabled: boolean;
  mode: SiteMode | null;
  pathname: string | null;
  isLoggedIn: boolean;
  account: ShellAccount | null;
  visiblePrimary: ShellNavItem[];
  visibleAcademyMore: ShellNavItem[];
  visibleAuth: ShellNavItem[];
  visibleMobile: ShellNavItem[];
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
  stadium,
  marketplaceEnabled,
  mode,
  pathname,
  isLoggedIn,
  account,
  visiblePrimary,
  visibleAcademyMore,
  visibleAuth,
  visibleMobile,
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
        className={cn("absolute inset-0 backdrop-blur-sm", stadium ? "bg-black/50" : "bg-zinc-950/45")}
        aria-label="Zamknij menu"
        onClick={onClose}
      />
      <div
        id="awp-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(100%,21.5rem)] flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          stadium
            ? "border-l border-white/15 bg-[var(--mundial-navy)] text-white"
            : "border-l border-zinc-200/80 bg-[#f4f5f7] dark:border-zinc-800 dark:bg-zinc-950"
        )}
      >
        {stadium ? (
          <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3.5">
            <div className="min-w-0">
              <p id={titleId} className="text-sm font-semibold text-white">
                Menu
              </p>
              <p className="truncate text-xs text-white/70">{siteName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="awp-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white"
              aria-label="Zamknij menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="relative shrink-0 overflow-hidden">
            <div className="relative h-[7.75rem]">
              <MarketplacePitchPhoto
                src={mode === "booking" ? MARKETPLACE_PITCH_PHOTOS[0] : MARKETPLACE_PITCH_PHOTOS[3]}
                className="z-0"
                sizes="360px"
              />
              <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
              <div className="relative z-10 flex h-full items-start justify-between gap-3 px-4 pb-4 pt-3.5">
                <div className="min-w-0 self-end">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/80">
                    {mode === "booking" ? "Rezerwacja boisk" : mode === "academy" ? "Akademia" : "Menu"}
                  </p>
                  <p id={titleId} className="mt-1 truncate text-lg font-black text-white">
                    {siteName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="awp-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/30"
                  aria-label="Zamknij menu"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        )}

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3" aria-label="Nawigacja mobilna">
          {!stadium && isLoggedIn && account ? (
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

          {!stadium && marketplaceEnabled && mode ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "overflow-hidden rounded-2xl border text-left shadow-sm transition touch-manipulation",
                  mode === "booking"
                    ? "border-[var(--mp-teal)] ring-2 ring-[var(--mp-teal)]/25"
                    : "border-zinc-200 dark:border-zinc-700"
                )}
                onClick={() => {
                  if (mode === "booking") return;
                  onClose();
                  onSetMode("booking", { navigateHome: true });
                }}
              >
                <span className="relative block h-14 w-full bg-zinc-200">
                  <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[0]} sizes="160px" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 right-2 text-[11px] font-black text-white">
                    Szukam boiska
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  "overflow-hidden rounded-2xl border text-left shadow-sm transition touch-manipulation",
                  mode === "academy"
                    ? "border-[var(--mp-teal)] ring-2 ring-[var(--mp-teal)]/25"
                    : "border-zinc-200 dark:border-zinc-700"
                )}
                onClick={() => {
                  if (mode === "academy") return;
                  onClose();
                  onSetMode("academy", { navigateHome: true });
                }}
              >
                <span className="relative block h-14 w-full bg-zinc-200">
                  <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[3]} sizes="160px" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 right-2 text-[11px] font-black text-white">
                    Gram z wami
                  </span>
                </span>
              </button>
            </div>
          ) : null}

          {stadium && marketplaceEnabled && mode ? (
            <button
              type="button"
              className="mb-3 w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-3 text-left text-sm font-semibold text-white"
              onClick={() => {
                onClose();
                onSetMode(mode === "booking" ? "academy" : "booking", { navigateHome: true });
              }}
            >
              {mode === "booking" ? "Przełącz: Gram z wami" : "Przełącz: Szukam boiska"}
              <span className="mt-0.5 block text-xs font-normal text-white/70">
                {mode === "booking" ? "Terminarz akademii i składy" : "Rezerwacja boisk online"}
              </span>
            </button>
          ) : null}

          {!stadium && mode === "academy" ? (
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
                      light
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
                      light
                      onNavigate={onClose}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="space-y-1">
              {(stadium ? visibleMobile : visiblePrimary).map((x) => (
                <li key={x.href}>
                  <MobileNavLink
                    item={x}
                    active={navItemActive(pathname, x.href)}
                    light={!stadium}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          )}

          {!stadium && !isLoggedIn && visibleAuth.length > 0 ? (
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

          <div
            className={cn(
              "mt-auto space-y-1 border-t pt-3",
              stadium ? "border-white/15" : "border-zinc-200 dark:border-zinc-800"
            )}
          >
            {!stadium ? (
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
            ) : null}
            {isLoggedIn ? (
              <button
                type="button"
                className={cn(
                  "awp-focus-ring flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
                  stadium
                    ? "text-white/90 hover:bg-white/10"
                    : "bg-white text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                )}
                onClick={() => {
                  onClose();
                  onLogout();
                }}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    stadium ? "bg-white/10" : "bg-zinc-100 dark:bg-zinc-800"
                  )}
                >
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
