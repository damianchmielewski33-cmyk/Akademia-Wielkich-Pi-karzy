import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteSectionHero } from "@/components/site-section-hero";
import { loadPublicShareLink, loadPublicWalletRows } from "@/lib/public-payment-share";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayButton } from "@/components/pay-button";
import { PlatnosciPublicPayButton } from "@/components/platnosci-public-pay-button";
import { PlatnosciPublicPaymentReturn } from "@/components/platnosci-public-payment-return";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { isHotpayConfigured } from "@/lib/hotpay";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Podsumowanie płatności",
  description: "Publiczny podgląd sald zawodników (link od administratora).",
};

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

function formatMatchWhen(isoDate: string, time: string) {
  const [y, m, d] = isoDate.split("-");
  const date = y && m && d ? `${d}.${m}.${y}` : isoDate;
  return `${date} · ${time}`;
}

export default async function PlatnosciPublicPage(ctx: Ctx) {
  const { token } = await ctx.params;
  const link = await loadPublicShareLink(String(token));

  if (!link) {
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

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  const hotpayEnabled = isHotpayConfigured() && appSettings.hotpay_enabled;
  const view = await loadPublicWalletRows(link);

  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-6 px-4 py-10">
      <Suspense fallback={null}>
        <PlatnosciPublicPaymentReturn />
      </Suspense>

      <SiteSectionHero
        kicker="Portfel"
        title={view.title}
        subtitle={view.subtitle ?? "Publiczny podgląd sald zawodników."}
        align="center"
      />

      {view.match ? (
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
      ) : null}

      {view.playerMatches && view.playerMatches.length > 0 ? (
        <Card className="mb-6 border-emerald-900/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rozegrane mecze</CardTitle>
            <CardDescription>Kwoty naliczone z portfela za każdy mecz.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {view.playerMatches.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
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
      ) : null}

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
          {view.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-600">Brak danych.</p>
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
                      "overflow-hidden rounded-xl border px-3 py-3",
                      unpaid
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
                            : "ring-2 ring-emerald-300/80"
                        }
                      />
                      <PlayerNameStack
                        firstName={p.first_name}
                        lastName={p.last_name}
                        nick={p.zawodnik}
                        className="min-w-0 flex-1 overflow-hidden"
                        primaryClassName="truncate text-white"
                        secondaryClassName="truncate text-white/70"
                      />
                      {showMatchStatus ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                            unpaid
                              ? "bg-red-600 text-white"
                              : "bg-emerald-500 text-emerald-950"
                          )}
                        >
                          {unpaid ? "Nieopłacony" : "Opłacony"}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-11">
                      {p.match_charge_pln != null ? (
                        <span className="text-xs text-white/75">
                          Składka: {formatPln(-Math.abs(p.match_charge_pln))}
                        </span>
                      ) : (
                        <span className="text-xs text-white/75">Saldo portfela</span>
                      )}
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          unpaid ? "text-red-200" : "text-emerald-100"
                        )}
                      >
                        {formatPln(bal)}
                      </span>
                    </div>

                    {unpaid ? (
                      <div className="mt-3">
                        {hotpayEnabled ? (
                          <PlatnosciPublicPayButton
                            token={link.token}
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
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/platnosci">Płatności i portfel</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/terminarz">Terminarz</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
