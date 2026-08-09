"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Loader2,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { SiteAssetImage } from "@/components/site-asset-image";
import { AppModal } from "@/components/ui/app-modal";
import { extractApiErrorMessage, useAppMessage } from "@/components/ui/app-message-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PitchCard, pitchLabelClass, pitchPanelClass } from "@/components/ui/pitch-card";
import type { WalletTransactionRow } from "@/lib/wallet";
import { cn } from "@/lib/utils";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";
import { PayButton } from "@/components/pay-button";

export type WalletMeTransaction = WalletTransactionRow & { balance_after_pln: number };

type Props = {
  currentUserId: number | null;
  hotpayEnabled: boolean;
  compact?: boolean;
  refreshKey?: number;
  className?: string;
};

const contentPanelClass =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5";

export function formatWalletPln(n: number) {
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
    case "transfer":
      return {
        label: "Przelew",
        Icon: ArrowLeftRight,
        badgeClass:
          "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-200",
        borderClass: "border-l-sky-500",
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

export function WalletBalanceHistory({
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
                    {formatWalletPln(amount)}
                  </p>
                </div>

                <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">Saldo</span>
                  <div>
                    <p className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                      {formatWalletPln(balanceAfter)}
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

export function PlayerWalletPanel({
  currentUserId: _currentUserId,
  hotpayEnabled,
  compact = false,
  refreshKey = 0,
  className,
}: Props) {
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const [adminBalancePln, setAdminBalancePln] = useState<number | null>(null);
  const [operatorBalancePln, setOperatorBalancePln] = useState<number | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletMeTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupConfirmOpen, setTopupConfirmOpen] = useState(false);
  const { showError, MessageModal } = useAppMessage();
  const { pay: startPayment, busy: topupBusy } = useHotpayPayment();

  async function refreshWallet() {
    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/me");
      const json = (await res.json().catch(() => null)) as {
        balance_pln?: unknown;
        admin_balance_pln?: unknown;
        operator_balance_pln?: unknown;
        transactions?: WalletMeTransaction[];
        error?: unknown;
      } | null;
      if (!res.ok) {
        showError(extractApiErrorMessage(json?.error, "Nie udało się wczytać salda"), "Portfel");
        return;
      }
      setWalletBalancePln(Number(json?.balance_pln ?? 0));
      setAdminBalancePln(Number(json?.admin_balance_pln ?? 0));
      setOperatorBalancePln(Number(json?.operator_balance_pln ?? 0));
      setWalletTransactions(Array.isArray(json?.transactions) ? json.transactions : []);
    } catch {
      showError("Błąd sieci", "Portfel");
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleTopup() {
    const debtAmount =
      walletBalancePln !== null && walletBalancePln < 0 ? Math.abs(walletBalancePln) : null;
    const amount = debtAmount ?? Number.parseFloat(topupAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0.01) {
      showError("Podaj poprawną kwotę doładowania (min. 0,01 PLN)", "Doładowanie");
      return;
    }
    setTopupConfirmOpen(false);
    await startPayment(amount);
  }

  useEffect(() => {
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const topupAmountParsed = Number.parseFloat(topupAmount.replace(",", "."));

  function formatPln(n: number) {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
      Math.round(n * 100) / 100
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!compact ? (
        <PitchCard contentClassName="px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <span className={pitchLabelClass}>Twój portfel</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
              <SiteAssetImage
                asset="logo_crest"
                alt=""
                width={128}
                height={128}
                className="h-10 w-10 drop-shadow"
                sizes="40px"
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-2xl">Saldo konta</h2>
          </div>

          <div
            className={cn(
              pitchPanelClass,
              "px-4 py-4",
              walletBalancePln != null && walletBalancePln < 0 && "border-red-300/40 bg-red-950/30",
              walletBalancePln != null && walletBalancePln > 0 && "border-emerald-300/35 bg-emerald-500/15"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={pitchLabelClass}>Saldo łącznie</p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-bold tabular-nums text-white",
                    walletBalancePln == null && "text-white/75",
                    walletBalancePln != null && walletBalancePln < 0 && "text-red-200",
                    walletBalancePln != null && walletBalancePln > 0 && "text-emerald-100"
                  )}
                >
                  {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
                </p>
                {walletBalancePln != null && walletBalancePln < 0 ? (
                  <p className="mt-1 text-xs font-medium text-red-200">Niedopłata do uregulowania</p>
                ) : walletBalancePln != null && walletBalancePln > 0 ? (
                  <p className="mt-1 text-xs font-medium text-emerald-100">Nadwyżka na koncie</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="pitch"
                size="sm"
                disabled={walletLoading}
                onClick={() => void refreshWallet()}
              >
                {walletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Odśwież
              </Button>
            </div>

            {adminBalancePln !== null && operatorBalancePln !== null && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/8 px-3 py-2.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-white/60">Gotówka / BLIK</p>
                  <p className={cn(
                    "mt-0.5 text-sm font-bold tabular-nums",
                    adminBalancePln < 0 ? "text-red-200" : adminBalancePln > 0 ? "text-emerald-100" : "text-white/70"
                  )}>
                    {formatWalletPln(adminBalancePln)}
                  </p>
                </div>
                <div className="border-l border-white/15 pl-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">Płatności online</p>
                  <p className={cn(
                    "mt-0.5 text-sm font-bold tabular-nums",
                    operatorBalancePln < 0 ? "text-red-200" : operatorBalancePln > 0 ? "text-emerald-100" : "text-white/70"
                  )}>
                    {formatWalletPln(operatorBalancePln)}
                  </p>
                </div>
              </div>
            )}

            {hotpayEnabled && walletBalancePln !== null && walletBalancePln < 0 ? (
              /* Tryb zaległości — jeden klik, kwota z salda */
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-3 text-sm font-medium text-red-200">
                  Zaległość do uregulowania:{" "}
                  <span className="font-bold tabular-nums">{formatPln(Math.abs(walletBalancePln))}</span>
                </p>
                <PayButton
                  variant="hero"
                  amountPln={walletBalancePln}
                  busy={topupBusy}
                  disabled={walletLoading}
                  fullWidth
                  onClick={() => setTopupConfirmOpen(true)}
                />
              </div>
            ) : hotpayEnabled ? (
              /* Tryb doładowania — dowolna kwota */
              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label
                    htmlFor="player-topup-amount"
                    className="text-xs font-semibold uppercase tracking-wide text-white/70"
                  >
                    Kwota doładowania (PLN)
                  </Label>
                  <input
                    id="player-topup-amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-base font-semibold text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15"
                    placeholder="np. 50"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    disabled={topupBusy || walletLoading}
                  />
                </div>
                <PayButton
                  variant="hero"
                  label="Doładuj saldo"
                  busy={topupBusy}
                  disabled={walletLoading}
                  className="sm:min-w-[14rem]"
                  onClick={() => {
                    const amount = Number.parseFloat(topupAmount.replace(",", "."));
                    if (!Number.isFinite(amount) || amount < 0.01) {
                      showError("Podaj poprawną kwotę doładowania (min. 0,01 PLN)", "Doładowanie");
                      return;
                    }
                    setTopupConfirmOpen(true);
                  }}
                />
              </div>
            ) : null}
          </div>
        </PitchCard>
      ) : (
        <div
          className={cn(
            contentPanelClass,
            "flex flex-wrap items-center justify-between gap-3",
            walletBalancePln != null && walletBalancePln < 0 && "border-red-200 dark:border-red-800/50",
            walletBalancePln != null && walletBalancePln > 0 && "border-emerald-200 dark:border-emerald-800/50"
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Saldo</p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold tabular-nums text-emerald-950 dark:text-emerald-100",
                walletBalancePln != null && walletBalancePln < 0 && "text-red-700 dark:text-red-300"
              )}
            >
              {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
            </p>
          </div>
          <Button type="button" variant="outline" disabled={walletLoading} onClick={() => void refreshWallet()}>
            {walletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Odśwież
          </Button>
        </div>
      )}

      <div className={contentPanelClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            <Wallet className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold tracking-tight text-emerald-950 dark:text-emerald-100">Historia salda</h3>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              Wpłaty, przelewy, rozliczenia meczów i korekty — najnowsze operacje na górze listy.
            </p>
          </div>
        </div>
        <WalletBalanceHistory loading={walletLoading} transactions={walletTransactions} />
      </div>

      <AppModal
        open={topupConfirmOpen}
        onOpenChange={setTopupConfirmOpen}
        title={walletBalancePln !== null && walletBalancePln < 0 ? "Opłać zaległość" : "Potwierdź doładowanie"}
        description={
          walletBalancePln !== null && walletBalancePln < 0
            ? `Zostaniesz przekierowany do płatności. Kwota zaległości: ${formatPln(Math.abs(walletBalancePln))}.`
            : Number.isFinite(topupAmountParsed)
              ? `Zostaniesz przekierowany do płatności online. Kwota: ${formatPln(topupAmountParsed)}.`
              : "Sprawdź kwotę doładowania."
        }
      >
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={topupBusy} onClick={() => setTopupConfirmOpen(false)}>
            Anuluj
          </Button>
          <PayButton
            variant="default"
            amountPln={
              walletBalancePln !== null && walletBalancePln < 0
                ? walletBalancePln
                : Number.isFinite(topupAmountParsed) ? topupAmountParsed : null
            }
            label={walletBalancePln !== null && walletBalancePln < 0 ? "Opłać zaległość" : "Doładuj saldo"}
            busy={topupBusy}
            onClick={() => void handleTopup()}
          />
        </div>
      </AppModal>
      {MessageModal}
    </div>
  );
}
