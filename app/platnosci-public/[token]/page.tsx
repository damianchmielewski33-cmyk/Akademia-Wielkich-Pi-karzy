import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Portfele po meczu",
  description: "Publiczny podgląd sald zawodników z ostatniego meczu (dla udostępnienia przez administratora).",
};

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

export default async function PlatnosciPublicPage(ctx: Ctx) {
  const { token } = await ctx.params;
  const db = await getDb();

  const link = (await db
    .prepare(
      `
      SELECT token, kind, created_at, expires_at, revoked_at
      FROM public_share_links
      WHERE token = ?
    `
    )
    .get(String(token))) as
    | { token: string; kind: "last_match_wallets"; created_at: string; expires_at: string | null; revoked_at: string | null }
    | undefined;

  let notExpired = false;
  if (link?.expires_at) {
    const r = (await db
      .prepare("SELECT datetime('now') <= datetime(?) AS ok")
      .get(link.expires_at)) as { ok: number } | undefined;
    notExpired = Number(r?.ok ?? 0) === 1;
  } else {
    notExpired = true;
  }

  const valid = Boolean(link) && link!.kind === "last_match_wallets" && !link!.revoked_at && notExpired;

  if (!valid) {
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

  const lastMatch = (await db
    .prepare(
      `
      SELECT *
      FROM matches
      WHERE datetime(match_date || ' ' || match_time) <= datetime('now', 'localtime')
      ORDER BY match_date DESC, match_time DESC
      LIMIT 1
    `
    )
    .get()) as
    | { id: number; match_date: string; match_time: string; location: string; max_slots: number; signed_up: number; played: number; fee_pln?: number | null }
    | undefined;

  if (!lastMatch) {
    return (
      <div className="container mx-auto max-w-2xl flex-1 px-4 py-10">
        <Card className="border-emerald-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Brak rozegranego meczu</CardTitle>
            <CardDescription>W bazie nie ma jeszcze meczu z datą przeszłą.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/terminarz">Terminarz</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = (await db
    .prepare(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.player_alias AS zawodnik,
        u.profile_photo_path,
        COALESCE(ROUND(SUM(t.amount_pln), 2), 0) AS balance_pln
      FROM match_signups ms
      JOIN users u ON u.id = ms.user_id
      LEFT JOIN wallet_transactions t ON t.user_id = u.id
      WHERE ms.match_id = ?
        AND COALESCE(ms.commitment, 1) = 1
      GROUP BY u.id
      ORDER BY u.first_name, u.last_name
    `
    )
    .all(lastMatch.id)) as {
    id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
    balance_pln: number;
  }[];

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6 text-center">
        <div className="pitch-rule mx-auto mb-4 w-40 opacity-80" />
        <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">Portfele po ostatnim meczu</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Widok publiczny (bez logowania) — tylko zawodnicy zapisani na ostatni mecz.
        </p>
      </div>

      <Card className="mb-6 overflow-hidden border-emerald-900/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Ostatni mecz</CardTitle>
          <CardDescription>
            {lastMatch.match_date} · {lastMatch.match_time} · {lastMatch.location}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Zapisanych: {lastMatch.signed_up}/{lastMatch.max_slots}</Badge>
          {typeof lastMatch.fee_pln === "number" ? (
            <Badge className="border-amber-200 bg-amber-50 text-amber-950">Wpisowe: {formatPln(lastMatch.fee_pln)}</Badge>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-emerald-900/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Saldo zawodników z tego meczu</CardTitle>
          <CardDescription>Saldo portfela może być dodatnie lub ujemne.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/20 px-4 py-8 text-center text-sm text-zinc-600">
              Brak zapisanych zawodników na ten mecz.
            </p>
          ) : (
            <ul className="max-h-[70vh] space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/20">
              {rows.map((p, i) => {
                const bal = Number(p.balance_pln ?? 0);
                const isNegative = bal < 0;
                return (
                <li
                  key={p.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0",
                    isNegative
                      ? "border-l-4 border-l-red-600 bg-red-50/95 dark:border-l-red-500 dark:bg-red-950/40"
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
                    ringClassName={isNegative ? "ring-2 ring-red-300 dark:ring-red-600/60" : "ring-2 ring-emerald-200/90"}
                  />
                  <div className="min-w-0 flex-1">
                    <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                  </div>
                  {isNegative ? (
                    <span
                      className="shrink-0 rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200"
                      title="Saldo ujemne"
                    >
                      Niedopłata
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isNegative ? "text-red-700 dark:text-red-200" : "text-emerald-950 dark:text-emerald-100"
                    )}
                  >
                    {formatPln(bal)}
                  </span>
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

