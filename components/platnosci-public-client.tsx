"use client";

import Link from "next/link";
import { CalendarDays, Wallet } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { useMarketplacePitchPhotoAt } from "@/components/marketplace-photos-provider";
import { MarketplaceSection, mpEmptyClass, mpSectionCardClass } from "@/components/payments-card";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { PlatnosciPublicPayButton } from "@/components/platnosci-public-pay-button";
import { SiteSectionHero } from "@/components/site-section-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PayButton } from "@/components/pay-button";
import type { PublicWalletView } from "@/lib/public-payment-share";
import { cn } from "@/lib/utils";
import { MatchSignupFeesList } from "@/components/match-signup-fees-list";
import { formatMatchFeePln } from "@/lib/match-fee";

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

function formatMatchWhen(isoDate: string, time: string) {
  const [y, m, d] = isoDate.split("-");
  const date = y && m && d ? `${d}.${m}.${y}` : isoDate;
  return `${date} · ${time}`;
}

type Props = {
  token: string;
  hotpayEnabled: boolean;
  view: PublicWalletView;
};

export function PlatnosciPublicClient({ token, hotpayEnabled, view }: Props) {
  const light = true;
  const heroPhoto = useMarketplacePitchPhotoAt(4);

  if (view.mode === "signup_fees") {
    const contribution = Number(view.contribution_pln ?? 0);
    const blik = view.blik_phone?.trim() || "";
    return (
      <div className={light ? "relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50" : "container mx-auto max-w-2xl flex-1 space-y-6 px-4 py-10"}>
        {light ? (
          <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
            <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
            <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Opłaty</p>
              <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
                {view.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">{view.subtitle}</p>
            </div>
          </section>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{view.title}</h1>
            <p className="text-sm text-zinc-500">{view.subtitle}</p>
          </>
        )}
        <div className={light ? "relative z-10 mx-auto w-full min-w-0 max-w-2xl space-y-5 px-3 py-8 xs:px-4 sm:py-10" : "space-y-4"}>
          {view.match && contribution > 0 ? (
            <p className={light ? "text-sm text-zinc-600 dark:text-zinc-300" : "text-sm text-zinc-600"}>
              Składka na osobę: <strong>{formatMatchFeePln(contribution)}</strong>
              {typeof view.match.fee_pln === "number" && view.match.fee_pln > 0
                ? ` (wynajem ${formatMatchFeePln(view.match.fee_pln)} podzielony na zapisanych)`
                : ""}
              . Przelew na telefon kopiuje numer BLIK i otwiera bank — wtedy status zmienia się na opłacony. Płatność przez
              stronę (operator) oznacza opłacone po potwierdzeniu wpłaty.
            </p>
          ) : null}
          <MatchSignupFeesList
            token={token}
            rows={view.rows}
            contributionPln={contribution > 0 ? contribution : 25}
            blikPhone={blik}
            hotpayEnabled={hotpayEnabled}
            light={light}
          />
        </div>
      </div>
    );
  }

  const footerLinks = (
    <div className="flex flex-wrap gap-2">
      <Button asChild className={light ? "h-11 rounded-full font-bold" : undefined} variant={light ? "default" : "secondary"}>
        <Link href="/platnosci">Płatności i portfel</Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className={light ? "h-11 rounded-full font-bold" : undefined}
      >
        <Link href="/terminarz">Terminarz</Link>
      </Button>
    </div>
  );

  const matchBlock =
    view.match != null ? (
      light ? (
        <MarketplaceSection
          icon={CalendarDays}
          title="Mecz"
          description={`${formatMatchWhen(view.match.match_date, view.match.match_time)} · ${view.match.location}`}
        >
          {typeof view.match.fee_pln === "number" ? (
            <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-[var(--mp-teal-dark)] dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              Wpisowe: {formatPln(view.match.fee_pln)}
            </span>
          ) : null}
        </MarketplaceSection>
      ) : (
        <Card className="mb-6 overflow-hidden border-emerald-900/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Mecz</CardTitle>
            <CardDescription>
              {formatMatchWhen(view.match.match_date, view.match.match_time)} · {view.match.location}
            </CardDescription>
          </CardHeader>
          {typeof view.match.fee_pln === "number" ? (
            <CardContent>
              <Badge className="border-amber-200 bg-amber-50 text-amber-950">
                Wpisowe: {formatPln(view.match.fee_pln)}
              </Badge>
            </CardContent>
          ) : null}
        </Card>
      )
    ) : null;

  const playerMatchesBlock =
    view.playerMatches && view.playerMatches.length > 0 ? (
      light ? (
        <MarketplaceSection
          title="Rozegrane mecze"
          description="Kwoty naliczone z portfela za każdy mecz."
        >
          <ul className="space-y-2">
            {view.playerMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {formatMatchWhen(m.match_date, m.match_time)} · {m.location}
                </span>
                <span className="font-semibold tabular-nums text-red-600 dark:text-red-300">
                  {m.match_charge_pln != null ? formatPln(-Math.abs(m.match_charge_pln)) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </MarketplaceSection>
      ) : (
        <Card className="mb-6 border-emerald-900/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rozegrane mecze</CardTitle>
            <CardDescription>Kwoty naliczone z portfela za każdy mecz.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {view.playerMatches.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    {formatMatchWhen(m.match_date, m.match_time)} · {m.location}
                  </span>
                  <span className="font-semibold tabular-nums text-red-700 dark:text-red-300">
                    {m.match_charge_pln != null ? formatPln(-Math.abs(m.match_charge_pln)) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )
    ) : null;

  const balancesList =
    view.rows.length === 0 ? (
      <p className={light ? mpEmptyClass : "rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-600"}>
        Brak danych.
      </p>
    ) : (
      <ul className="space-y-3">
        {view.rows.map((p) => {
          const bal = Number(p.balance_pln ?? 0);
          const unpaid = bal < 0;
          const showMatchStatus = view.match != null;
          return (
            <li
              key={p.id}
              className={cn(
                "overflow-hidden rounded-2xl border px-3 py-3",
                light
                  ? unpaid
                    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  : unpaid
                    ? "border-red-500/50 bg-red-950/35"
                    : "border-emerald-400/40 bg-emerald-950/25"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar
                  photoPath={p.profile_photo_path}
                  firstName={p.first_name}
                  lastName={p.last_name}
                  size="sm"
                  className="shrink-0"
                  ringClassName={
                    unpaid
                      ? "ring-2 ring-red-400"
                      : light
                        ? "ring-2 ring-[var(--mp-teal)]/30"
                        : "ring-2 ring-emerald-300/80"
                  }
                />
                <PlayerNameStack
                  firstName={p.first_name}
                  lastName={p.last_name}
                  nick={p.zawodnik}
                  className="min-w-0 flex-1 overflow-hidden"
                  primaryClassName={cn("truncate", light ? "text-zinc-950 dark:text-white" : "text-white")}
                  secondaryClassName={cn(
                    "truncate",
                    light ? "text-zinc-500 dark:text-zinc-400" : "text-white/70"
                  )}
                />
                {showMatchStatus ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      unpaid
                        ? "bg-red-600 text-white"
                        : light
                          ? "bg-[var(--mp-teal)] text-white"
                          : "bg-emerald-500 text-emerald-950"
                    )}
                  >
                    {unpaid ? "Nieopłacony" : "Opłacony"}
                  </span>
                ) : null}
              </div>

              <div
                className={cn(
                  "mt-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-11",
                  light ? "text-zinc-500" : ""
                )}
              >
                {p.match_charge_pln != null ? (
                  <span className={cn("text-xs", light ? "text-zinc-500" : "text-white/75")}>
                    Składka: {formatPln(-Math.abs(p.match_charge_pln))}
                  </span>
                ) : (
                  <span className={cn("text-xs", light ? "text-zinc-500" : "text-white/75")}>Saldo portfela</span>
                )}
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    unpaid
                      ? light
                        ? "text-red-600 dark:text-red-300"
                        : "text-red-200"
                      : light
                        ? "text-[var(--mp-teal-dark)] dark:text-teal-200"
                        : "text-emerald-100"
                  )}
                >
                  {formatPln(bal)}
                </span>
              </div>

              {unpaid ? (
                <div className="mt-3">
                  {hotpayEnabled ? (
                    <PlatnosciPublicPayButton
                      token={token}
                      userId={p.id}
                      amountPln={bal}
                      className="w-full justify-center"
                    />
                  ) : (
                    <PayButton
                      variant="default"
                      amountPln={bal}
                      label="Opłać"
                      href="/platnosci"
                      fullWidth
                    />
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );

  if (light) {
    return (
      <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Portfel</p>
            <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
              {view.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
              {view.subtitle || "Publiczny podgląd sald zawodników."}
            </p>
          </div>
        </section>

        <div className="relative z-10 mx-auto w-full min-w-0 max-w-2xl space-y-5 px-3 py-8 xs:px-4 sm:py-10">
          {matchBlock}
          {playerMatchesBlock}
          <MarketplaceSection
            icon={Wallet}
            title="Salda"
            description={
              view.match
                ? "Zieleń = brak zaległości, czerwień = mecz nieopłacony."
                : "Ujemne saldo oznacza należność do uregulowania."
            }
          >
            {balancesList}
            <div className="mt-5">{footerLinks}</div>
          </MarketplaceSection>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-6 px-4 py-10">
      <SiteSectionHero
        kicker="Portfel"
        title={view.title}
        subtitle={view.subtitle || "Publiczny podgląd sald zawodników."}
        align="center"
      />
      {matchBlock}
      {playerMatchesBlock}
      <Card className="border-emerald-900/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Salda</CardTitle>
          <CardDescription>
            {view.match
              ? "Zieleń = brak zaległości, czerwień = mecz nieopłacony (jest należność na portfelu)."
              : "Ujemne saldo oznacza należność do uregulowania."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balancesList}
          <div className="mt-4">{footerLinks}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PlatnosciPublicInactive({ light }: { light?: boolean }) {
  const isLight = light ?? true;
  const heroPhoto = useMarketplacePitchPhotoAt(4);

  if (isLight) {
    return (
      <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Portfel</p>
            <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
              Podsumowanie płatności
            </h1>
          </div>
        </section>
        <div className="relative z-10 mx-auto w-full max-w-lg px-3 py-8 xs:px-4 sm:py-10">
          <div className={cn(mpSectionCardClass, "text-center")}>
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm">
              <Wallet className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">Link jest nieaktywny</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Poproś administratora o nowy link do podglądu.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild className="h-11 rounded-full font-bold">
                <Link href="/">Strona główna</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full font-bold">
                <Link href="/terminarz">Terminarz</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-10">
      <Card className="border-emerald-900/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Link jest nieaktywny</CardTitle>
          <CardDescription>Poproś administratora o nowy link do podglądu.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/">Strona główna</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/terminarz">Terminarz</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
