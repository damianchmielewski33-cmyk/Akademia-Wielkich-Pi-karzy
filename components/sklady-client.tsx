"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { useMarketplacePitchPhotoAt } from "@/components/marketplace-photos-provider";
import { mpSectionCardClass } from "@/components/payments-card";
import { SiteSectionHero } from "@/components/site-section-hero";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SkladyNavMatch = {
  id: number;
  match_date: string;
  match_time: string;
  location: string;
};

type UpcomingLite = {
  match_date: string;
  match_time: string;
  location: string;
};

type Props =
  | {
      variant: "empty-pending";
      nextUpcoming: UpcomingLite;
    }
  | {
      variant: "empty-none";
    }
  | {
      variant: "list";
      navMatches: SkladyNavMatch[];
      selectedId: number;
      nearestId: number | null;
      selectedMatch: SkladyNavMatch;
      children: ReactNode;
    };

function formatMatchMeta(m: Pick<SkladyNavMatch, "match_date" | "match_time" | "location">) {
  const time = m.match_time.slice(0, 5);
  const loc = m.location?.trim();
  return loc ? `${m.match_date} · ${time} · ${loc}` : `${m.match_date} · ${time}`;
}

function shortLocation(loc: string, max = 18) {
  const t = loc.trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function SkladyClient(props: Props) {
  const light = true;
  const heroPhoto = useMarketplacePitchPhotoAt(3);

  if (props.variant === "empty-pending") {
    return (
      <EmptyShell
        light={light}
        heroPhoto={heroPhoto}
        title="Składy jeszcze niewidoczne"
        subtitle="Składy pojawią się po publikacji przez admina."
      >
        <p className={cn("text-sm", light ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-600 dark:text-zinc-400")}>
          Administrator nie udostępnił jeszcze składów na najbliższy mecz. Wróć później albo sprawdź stronę główną.
        </p>
        <p
          className={cn(
            "mt-4 text-sm font-medium",
            light ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-800 dark:text-zinc-200"
          )}
        >
          {props.nextUpcoming.match_date} · {props.nextUpcoming.match_time}
        </p>
        <p className={cn("text-sm", light ? "text-zinc-500" : "text-zinc-600 dark:text-zinc-400")}>
          {props.nextUpcoming.location}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <EmptyActions light={light} href="/" label="Strona główna" />
          {light ? (
            <Button asChild variant="outline" className="h-11 rounded-full px-6 font-bold">
              <Link href="/terminarz">Terminarz</Link>
            </Button>
          ) : null}
        </div>
      </EmptyShell>
    );
  }

  if (props.variant === "empty-none") {
    return (
      <EmptyShell
        light={light}
        heroPhoto={heroPhoto}
        title="Brak publicznych składów"
        subtitle="Składy pojawią się po publikacji przez admina."
      >
        <p className={cn("text-sm", light ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-600 dark:text-zinc-400")}>
          Nie ma zaplanowanych meczów ani opublikowanych składów. Gdy pojawią się terminy, wróć do tej strony.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <EmptyActions light={light} href="/terminarz" label="Terminarz" />
        </div>
      </EmptyShell>
    );
  }

  const { navMatches, selectedId, nearestId, selectedMatch, children } = props;
  const heroSubtitle = formatMatchMeta(selectedMatch);

  const matchNav =
    navMatches.length > 1 ? (
      <nav
        className={cn(
          "mp-h-scroll -mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible",
          light ? "mb-1" : "mb-8"
        )}
        aria-label="Wybór meczu"
      >
        {navMatches.map((m) => {
          const active = m.id === selectedId;
          const isNearest = nearestId != null && m.id === nearestId;
          const loc = shortLocation(m.location);
          return (
            <Link
              key={m.id}
              href={`/sklady?m=${m.id}`}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                light
                  ? active
                    ? "border-transparent bg-[var(--mp-teal)] text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-200 hover:bg-teal-50/80 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  : active
                    ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50/80"
              )}
            >
              <span>
                {m.match_date} · {m.match_time.slice(0, 5)}
                {loc ? ` · ${loc}` : ""}
              </span>
              {isNearest ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    light
                      ? active
                        ? "bg-white/20 text-white"
                        : "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-200"
                      : active
                        ? "bg-white/20 text-white"
                        : "bg-emerald-50 text-emerald-800"
                  )}
                >
                  Najbliższy
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    ) : null;

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
        <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Akademia</p>
          <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
            Składy
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{heroSubtitle}</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl space-y-5 px-3 py-8 xs:px-4 sm:py-10">
        {matchNav}
        {children}
      </div>
    </div>
  );
}

function EmptyShell({
  light,
  heroPhoto,
  title,
  subtitle,
  children,
}: {
  light: boolean;
  heroPhoto: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (light) {
    return (
      <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Akademia</p>
            <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
              Składy
            </h1>
            {subtitle ? <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">{subtitle}</p> : null}
          </div>
        </section>
        <div className="relative z-10 mx-auto w-full max-w-lg px-3 py-8 xs:px-4 sm:py-10">
          <div className={cn(mpSectionCardClass, "text-center")}>
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm">
              <LayoutGrid className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">{title}</h2>
            <div className="mt-2">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="awp-page max-w-lg">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-xl font-bold text-emerald-950 dark:text-emerald-100">{title}</h1>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function EmptyActions({ light, href, label }: { light: boolean; href: string; label: string }) {
  if (light) {
    return (
      <Button asChild className="h-11 rounded-full px-6 font-bold">
        <Link href={href}>{label}</Link>
      </Button>
    );
  }
  return (
    <Link href={href} className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline dark:text-emerald-400">
      {label}
    </Link>
  );
}
