import type { Metadata } from "next";
import Link from "next/link";
import { SiteSectionHero } from "@/components/site-section-hero";
import { loadPublicShareLink, loadPublicWalletRows } from "@/lib/public-payment-share";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayButton } from "@/components/pay-button";
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

  const view = await loadPublicWalletRows(link);

  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-6 px-4 py-10">
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
              {view.match.match_date} · {view.match.match_time} · {view.match.location}
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
                    {m.match_date} · {m.match_time} · {m.location}
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
              ? "Kolor wiersza: intensywna zieleń = opłacony za ten mecz, intensywna czerwień = nieopłacony."
              : "Ujemne saldo oznacza należność do uregulowania."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-600">Brak danych.</p>
          ) : (
            <ul className="max-h-[70vh] space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/20">
              {view.rows.map((p, i) => {
                const bal = Number(p.balance_pln ?? 0);
                const isNegative = bal < 0;
                const isPositive = bal > 0;
                const hasMatchPaid = typeof p.match_paid === "number" || view.match != null;
                const matchPaid = Number(p.match_paid ?? 0) === 1;
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0",
                      hasMatchPaid
                        ? matchPaid
                          ? "border-l-4 border-l-green-600 bg-green-100/95 dark:border-l-green-500 dark:bg-green-950/50"
                          : "border-l-4 border-l-red-600 bg-red-100/95 dark:border-l-red-500 dark:bg-red-950/50"
                        : isNegative
                          ? "border-l-4 border-l-red-600 bg-red-50/95 dark:border-l-red-500 dark:bg-red-950/40"
                          : isPositive
                            ? "border-l-4 border-l-green-600 bg-green-50/95 dark:border-l-green-500 dark:bg-green-950/45"
                            : i % 2 === 0
                              ? "bg-white/60 dark:bg-zinc-900/50"
                              : "bg-emerald-50/40 dark:bg-zinc-900/30"
                    )}
                  >
                    <PlayerAvatar
                      photoPath={p.profile_photo_path}
                      firstName={p.first_name}
                      lastName={p.last_name}
                      size="sm"
                      ringClassName={
                        hasMatchPaid
                          ? matchPaid
                            ? "ring-2 ring-green-600 dark:ring-green-500"
                            : "ring-2 ring-red-600 dark:ring-red-500"
                          : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                    </div>
                    {hasMatchPaid ? (
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
                          matchPaid
                            ? "border-green-700 bg-green-600 dark:border-green-400 dark:bg-green-500 dark:text-green-950"
                            : "border-red-700 bg-red-600 dark:border-red-400 dark:bg-red-500 dark:text-red-950"
                        )}
                      >
                        {matchPaid ? "Opłacony" : "Nieopłacony"}
                      </span>
                    ) : null}
                    {p.match_charge_pln != null ? (
                      <span className="text-xs text-zinc-500">Mecz: {formatPln(-Math.abs(p.match_charge_pln))}</span>
                    ) : null}
                    <span
                      className={cn(
                        "shrink-0 font-semibold tabular-nums",
                        hasMatchPaid
                          ? matchPaid
                            ? "text-green-800 dark:text-green-200"
                            : "text-red-800 dark:text-red-200"
                          : isNegative
                            ? "text-red-700 dark:text-red-200"
                            : "text-green-800 dark:text-green-200"
                      )}
                    >
                      {formatPln(bal)}
                    </span>
                    {isNegative ? (
                      <PayButton
                        variant="default"
                        amountPln={bal}
                        label="Opłać"
                        href="/platnosci"
                        className="shrink-0"
                      />
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
