"use client";

import Link from "next/link";
import { SiteAssetImage } from "@/components/site-asset-image";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, LogIn, SlidersHorizontal, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { PayMatchButton } from "@/components/pay-match-button";
import { PitchCard, PitchPageHero, pitchLabelClass, pitchPanelClass } from "@/components/ui/pitch-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WalletTransactionRow } from "@/lib/wallet";

export type PlatnosciUserLite = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type WalletMeTransaction = WalletTransactionRow & { balance_after_pln: number };

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  blikPhoneDisplay: string;
  defaultMatchFeePln: number | null;
  playerLabel: string;
};

const contentPanelClass =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5";

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

function formatTxDateParts(raw: string) {
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const dt = new Date(normalized);
  if (Number.isNaN(dt.getTime())) return { date: raw, time: "" };
  return {
    date: dt.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: dt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
  };
}

function walletTxMeta(kind: WalletTransactionRow["kind"]) {
  switch (kind) {
    case "deposit":
      return {
        label: "Wpłata",
        Icon: ArrowDownLeft,
        badgeClass:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200",
        borderClass: "border-l-emerald-500",
      };
    case "match_charge":
      return {
        label: "Mecz",
        Icon: ArrowUpRight,
        badgeClass: "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-200",
        borderClass: "border-l-red-500",
      };
    case "adjustment":
      return {
        label: "Korekta",
        Icon: SlidersHorizontal,
        badgeClass:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200",
        borderClass: "border-l-amber-500",
      };
    default:
      return {
        label: kind,
        Icon: SlidersHorizontal,
        badgeClass: "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        borderClass: "border-l-zinc-400",
      };
  }
}

function WalletBalanceHistory({
  loading,
  transactions,
}: {
  loading: boolean;
  transactions: WalletMeTransaction[];
}) {
  if (loading && transactions.length === 0) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Wczytywanie historii…
      </p>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400">
        Brak operacji na koncie.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/80">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
          Ostatnie operacje
        </p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600 ring-1 ring-emerald-900/10 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-emerald-100/10">
          {transactions.length}
        </span>
      </div>

      <div
        className="hidden grid-cols-[minmax(0,1.4fr)_5.5rem_5.5rem_5.5rem] gap-3 border-b border-zinc-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400 sm:grid"
        aria-hidden
      >
        <span>Operacja</span>
        <span className="text-right">Data</span>
        <span className="text-right">Zmiana</span>
        <span className="text-right">Saldo</span>
      </div>

      <ul className="max-h-[52vh] divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-700">
        {transactions.map((tx) => {
          const amount = Number(tx.amount_pln ?? 0);
          const balanceAfter = Number(tx.balance_after_pln ?? 0);
          const isPositive = amount > 0;
          const isNegative = amount < 0;
          const { date, time } = formatTxDateParts(tx.created_at);
          const meta = walletTxMeta(tx.kind);
          const Icon = meta.Icon;

          return (
            <li
              key={tx.id}
              className={cn("border-l-4 bg-white px-4 py-3 dark:bg-zinc-900/70", meta.borderClass)}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_5.5rem_5.5rem] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        meta.badgeClass
                      )}
                    >
                      <Icon className="h-3 w-3 shrink-0" aria-hidden />
                      {meta.label}
                    </span>
                    <span className="text-[11px] tabular-nums text-zinc-500 sm:hidden">
                      {date}
                      {time ? ` · ${time}` : ""}
                    </span>
                  </div>
                  {tx.note ? (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-zinc-700 dark:text-zinc-300">{tx.note}</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-zinc-400 dark:text-zinc-500">—</p>
                  )}
                </div>

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{date}</p>
                  {time ? <p className="mt-0.5 text-xs tabular-nums text-zinc-500">{time}</p> : null}
                </div>

                <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">Zmiana</span>
                  <p
                    className={cn(
                      "text-base font-bold tabular-nums leading-none",
                      isPositive && "text-emerald-700 dark:text-emerald-300",
                      isNegative && "text-red-700 dark:text-red-300",
                      !isPositive && !isNegative && "text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {formatPln(amount)}
                  </p>
                </div>

                <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">Saldo</span>
                  <div>
                    <p className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatPln(balanceAfter)}
                    </p>
                    <p className="mt-0.5 hidden text-[10px] uppercase tracking-wide text-zinc-400 sm:block">po operacji</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PlatnosciClient({
  isLoggedIn,
  isAdmin,
  blikPhoneDisplay,
  defaultMatchFeePln,
  playerLabel,
}: Props) {
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletMeTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);

  async function refreshWallet() {
    if (!isLoggedIn) return;
    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/me");
      const json = (await res.json().catch(() => null)) as {
        balance_pln?: unknown;
        transactions?: WalletMeTransaction[];
        error?: unknown;
      } | null;
      if (!res.ok) {
        const msg = json?.error;
        toast.error(typeof msg === "string" ? msg : "Nie udało się wczytać salda");
        return;
      }
      setWalletBalancePln(Number(json?.balance_pln ?? 0));
      setWalletTransactions(Array.isArray(json?.transactions) ? json.transactions : []);
    } catch {
      toast.error("Błąd sieci");
    } finally {
      setWalletLoading(false);
    }
  }

  useEffect(() => {
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
      <PitchPageHero
        title="Płatności"
        subtitle={
          isAdmin
            ? "Salda portfeli, doładowania po przelewie i korekty — w stylu reszty akademii."
            : isLoggedIn
              ? "Twoje aktualne saldo portfela i historia operacji."
              : "Zaloguj się, aby zobaczyć saldo portfela."
        }
      />

      <div className="mt-10 text-left">
        {!isLoggedIn ? (
          <PitchCard className="mx-auto max-w-md" contentClassName="px-5 py-6 text-center sm:px-6">
            <div className="flex flex-col items-center gap-2">
              <span className={pitchLabelClass}>Portfel</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
                <LogIn className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">Zaloguj się</h2>
              <p className="text-sm text-emerald-100/90">Po zalogowaniu zobaczysz saldo swojego portfela.</p>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild variant="pitch">
                <Link href="/login">Logowanie</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15">
                <Link href="/register">
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                  Rejestracja
                </Link>
              </Button>
            </div>
          </PitchCard>
        ) : isAdmin ? (
          <div className="mx-auto max-w-4xl space-y-4">
            <PayMatchButton
              blikPhoneDisplay={blikPhoneDisplay}
              defaultMatchFeePln={defaultMatchFeePln}
              balancePln={walletBalancePln}
              playerLabel={playerLabel}
            />
            <AdminWalletsSaldoSection embedded showPublicLinks showTopUp />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            <PitchCard contentClassName="px-5 py-5 sm:px-6 sm:py-6">
              <div className="mb-4 flex flex-col items-center gap-2 text-center">
                <span className={pitchLabelClass}>Twój portfel</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
                  <SiteAssetImage
                    asset="logo_crest"
                    alt=""
                    width={128}
                    height={128}
                    className="h-8 w-8 drop-shadow"
                    sizes="32px"
                  />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-2xl">Saldo konta</h2>
                <p className="text-sm text-emerald-100/90">Aktualny stan portfela i szybki podgląd.</p>
              </div>

              <div
                className={cn(
                  pitchPanelClass,
                  "flex flex-wrap items-center justify-between gap-3 px-4 py-4",
                  walletBalancePln != null && walletBalancePln < 0 && "border-red-300/40 bg-red-950/30",
                  walletBalancePln != null && walletBalancePln > 0 && "border-emerald-300/35 bg-emerald-500/15"
                )}
              >
                <div>
                  <p className={pitchLabelClass}>Saldo</p>
                  <p
                    className={cn(
                      "mt-1 text-3xl font-bold tabular-nums text-white",
                      walletBalancePln == null && "text-white/75",
                      walletBalancePln != null && walletBalancePln < 0 && "text-red-200",
                      walletBalancePln != null && walletBalancePln > 0 && "text-emerald-100"
                    )}
                  >
                    {walletBalancePln === null ? "—" : formatPln(walletBalancePln)}
                  </p>
                  {walletBalancePln != null && walletBalancePln < 0 ? (
                    <p className="mt-1 text-xs font-medium text-red-200">Niedopłata do uregulowania</p>
                  ) : walletBalancePln != null && walletBalancePln > 0 ? (
                    <p className="mt-1 text-xs font-medium text-emerald-100">Nadwyżka na koncie</p>
                  ) : null}
                </div>
                <Button type="button" variant="pitch" disabled={walletLoading} onClick={() => void refreshWallet()}>
                  {walletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Odśwież
                </Button>
              </div>
            </PitchCard>

            <PayMatchButton
              blikPhoneDisplay={blikPhoneDisplay}
              defaultMatchFeePln={defaultMatchFeePln}
              balancePln={walletBalancePln}
              playerLabel={playerLabel}
            />

            <div className={contentPanelClass}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                  <Wallet className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold tracking-tight text-emerald-950 dark:text-emerald-100">Historia salda</h3>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    Wpłaty, rozliczenia meczów i korekty — najnowsze operacje na górze listy.
                  </p>
                </div>
              </div>
              <WalletBalanceHistory loading={walletLoading} transactions={walletTransactions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
