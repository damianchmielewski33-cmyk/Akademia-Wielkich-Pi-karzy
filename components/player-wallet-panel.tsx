"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  adminEmptyStateClass,
  adminFieldClass,
} from "@/components/admin-ui";
import {
  ChromeIconBadge,
  PaymentsCard,
  paymentsEmptyClass,
  paymentsFieldClass,
  paymentsInnerPanelClass,
} from "@/components/payments-card";
import { PhotoPanel } from "@/components/photo-panel";
import { useSiteMode } from "@/components/site-mode";
import type { WalletTransactionRow } from "@/lib/wallet";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";
import { PayButton } from "@/components/pay-button";

export type WalletMeTransaction = WalletTransactionRow & {
  balance_after_pln: number;
  is_test?: number | boolean | null;
  match_date?: string | null;
  match_time?: string | null;
  match_location?: string | null;
  match_cancelled?: number | boolean | null;
  related_zawodnik?: string | null;
  related_first_name?: string | null;
  related_last_name?: string | null;
};

type HistoryFilter = "all" | "deposit" | "match_charge" | "transfer" | "adjustment";

type Props = {
  hotpayEnabled: boolean;
  compact?: boolean;
  /** Ukrywa formularz doładowania (np. admin ma już HotpayPayButtons). */
  showTopup?: boolean;
  refreshKey?: number;
  className?: string;
};

const HISTORY_PAGE_SIZE = 100;

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

function relatedUserLabel(tx: WalletMeTransaction): string | null {
  const nick = tx.related_zawodnik?.trim();
  if (nick) return nick;
  const name = [tx.related_first_name, tx.related_last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

function matchLabel(tx: WalletMeTransaction): string | null {
  if (!tx.match_id) return null;
  const parts: string[] = [];
  if (tx.match_date) {
    const d = String(tx.match_date);
    const pretty = /^\d{4}-\d{2}-\d{2}/.test(d)
      ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : d;
    parts.push(pretty);
  }
  if (tx.match_time) parts.push(String(tx.match_time).slice(0, 5));
  if (tx.match_location?.trim()) parts.push(tx.match_location.trim());
  const base = parts.length ? parts.join(" · ") : `Mecz #${tx.match_id}`;
  return tx.match_cancelled ? `${base} (odwołany)` : base;
}

function walletTxMeta(tx: WalletMeTransaction) {
  const amount = Number(tx.amount_pln ?? 0);
  switch (tx.kind) {
    case "deposit":
      return {
        label: amount >= 0 ? "Doładowanie" : "Korekta wpłaty",
        Icon: ArrowDownLeft,
      };
    case "match_charge":
      return {
        label: amount < 0 ? "Opłata za mecz" : "Zwrot / uznanie meczu",
        Icon: ArrowUpRight,
      };
    case "adjustment":
      return {
        label: amount > 0 ? "Zwrot / uznanie" : "Korekta",
        Icon: SlidersHorizontal,
      };
    case "transfer":
      return {
        label: amount > 0 ? "Przelew otrzymany" : "Przelew wysłany",
        Icon: ArrowLeftRight,
      };
    default:
      return { label: String(tx.kind), Icon: SlidersHorizontal };
  }
}

function walletKindLabel(kind: WalletTransactionRow["wallet_kind"] | null | undefined) {
  if (kind === "operator") return "Online";
  return "Gotówka";
}

function txDetailLine(tx: WalletMeTransaction, amount: number): string | null {
  const match = matchLabel(tx);
  if (match) return match;
  const related = relatedUserLabel(tx);
  if (related) return `${amount > 0 ? "Od" : "Do"}: ${related}`;
  const note = tx.note?.trim();
  if (note) return note.length > 90 ? `${note.slice(0, 90)}…` : note;
  return null;
}

export function WalletBalanceHistory({
  loading,
  transactions,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  loading: boolean;
  transactions: WalletMeTransaction[];
  total: number;
  hasMore: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const { marketplaceEnabled } = useSiteMode();
  const light = marketplaceEnabled;
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: transactions.length, deposit: 0, match_charge: 0, transfer: 0, adjustment: 0 };
    for (const tx of transactions) {
      if (tx.kind in c) c[tx.kind as Exclude<HistoryFilter, "all">] += 1;
    }
    return c;
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter !== "all" && tx.kind !== filter) return false;
      if (!q) return true;
      const hay = [
        tx.note,
        tx.kind,
        matchLabel(tx),
        relatedUserLabel(tx),
        String(tx.id),
        String(tx.match_id ?? ""),
        walletKindLabel(tx.wallet_kind),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, filter, query]);

  if (loading && transactions.length === 0) {
    return (
      <p className={cn("mt-4 flex items-center gap-2 text-sm", light ? "text-zinc-500" : "pitch-muted")}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Wczytywanie historii…
      </p>
    );
  }

  if (transactions.length === 0) {
    return <p className={cn(light ? paymentsEmptyClass : adminEmptyStateClass, "mt-4")}>Brak operacji na koncie.</p>;
  }

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: "all", label: "Wszystkie" },
    { id: "deposit", label: "Wpłaty" },
    { id: "match_charge", label: "Mecze" },
    { id: "transfer", label: "Przelewy" },
    { id: "adjustment", label: "Korekty" },
  ];

  return (
    <div className="mt-4 space-y-3">
      <div className="mp-h-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              light
                ? filter === f.id
                  ? "bg-[var(--mp-teal)] text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                : filter === f.id
                  ? "bg-[var(--mundial-gold,#c9a227)] text-[var(--mundial-navy,#0a1628)]"
                  : "bg-black/25 text-emerald-100/85 hover:bg-white/10"
            )}
          >
            {f.label}
            {filter === f.id || f.id === "all" ? (
              <span className="ml-1 tabular-nums opacity-75">{counts[f.id]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj…"
        className={cn(
          light ? paymentsFieldClass : cn(adminFieldClass, "w-full rounded-xl px-3 py-2 text-sm outline-none"),
          "h-10"
        )}
      />

      {filtered.length === 0 ? (
        <p className={cn("py-8 text-center text-sm", light ? "text-zinc-500" : "pitch-muted")}>
          Brak wpisów dla wybranego filtra.
        </p>
      ) : (
        <ul className="max-h-[min(70vh,36rem)] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
          {filtered.map((tx) => {
            const amount = Number(tx.amount_pln ?? 0);
            const balanceAfter = Number(tx.balance_after_pln ?? 0);
            const isPositive = amount > 0;
            const isNegative = amount < 0;
            const { date, time } = formatTxDateParts(tx.created_at);
            const meta = walletTxMeta(tx);
            const Icon = meta.Icon;
            const detail = txDetailLine(tx, amount);
            const isTest = Boolean(tx.is_test);

            return (
              <li
                key={tx.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl px-3 py-3",
                  light
                    ? "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    : "border border-white/15 bg-black/20"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    light
                      ? isNegative
                        ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                        : isPositive
                          ? "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/40 dark:text-teal-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      : isNegative
                        ? "bg-red-500/20 text-red-200"
                        : "bg-white/10 text-white"
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          light ? "text-zinc-950 dark:text-white" : "text-white"
                        )}
                      >
                        {meta.label}
                        {isTest ? (
                          <span
                            className={cn(
                              "ml-2 align-middle text-[10px] font-bold uppercase tracking-wide",
                              light ? "text-amber-600" : "text-amber-200"
                            )}
                          >
                            Test
                          </span>
                        ) : null}
                      </p>
                      <p className={cn("mt-0.5 truncate text-xs", light ? "text-zinc-500" : "text-emerald-100/70")}>
                        {[detail, walletKindLabel(tx.wallet_kind)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums leading-none",
                          isPositive && (light ? "text-[var(--mp-teal-dark)]" : "text-emerald-300"),
                          isNegative && (light ? "text-red-600 dark:text-red-300" : "text-red-300"),
                          !isPositive && !isNegative && (light ? "text-zinc-900 dark:text-white" : "text-white")
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatWalletPln(amount)}
                      </p>
                      <p className={cn("mt-1 text-[11px] tabular-nums", light ? "text-zinc-400" : "text-emerald-100/55")}>
                        {date}
                        {time ? ` ${time}` : ""}
                      </p>
                      <p className={cn("mt-0.5 text-[11px] tabular-nums", light ? "text-zinc-400" : "text-emerald-100/45")}>
                        saldo {formatWalletPln(balanceAfter)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className={cn("text-center text-[11px] tabular-nums", light ? "text-zinc-400" : "pitch-muted")}>
        {filtered.length}
        {filtered.length !== transactions.length ? ` z ${transactions.length}` : ""}
        {total > transactions.length ? ` · łącznie ${total}` : ""}
      </p>

      {hasMore && onLoadMore ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant={light ? "outline" : "gold"}
            size="sm"
            className={light ? "rounded-full" : undefined}
            disabled={loadingMore}
            onClick={() => onLoadMore()}
          >
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Starsze wpisy
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function PlayerWalletPanel({
  hotpayEnabled,
  compact = false,
  showTopup = true,
  refreshKey = 0,
  className,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const [adminBalancePln, setAdminBalancePln] = useState<number | null>(null);
  const [operatorBalancePln, setOperatorBalancePln] = useState<number | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletMeTransaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupConfirmOpen, setTopupConfirmOpen] = useState(false);
  const { showError, MessageModal } = useAppMessage();
  const { pay: startPayment, busy: topupBusy } = useHotpayPayment();

  async function refreshWallet(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) setWalletLoading(true);
    try {
      const res = await fetch(`/api/wallet/me?limit=${HISTORY_PAGE_SIZE}&offset=0`);
      const json = (await res.json().catch(() => null)) as {
        balance_pln?: unknown;
        admin_balance_pln?: unknown;
        operator_balance_pln?: unknown;
        transactions?: WalletMeTransaction[];
        transactions_total?: number;
        transactions_has_more?: boolean;
        error?: unknown;
      } | null;
      if (!res.ok) {
        if (!opts?.quiet) {
          showError(extractApiErrorMessage(json?.error, "Nie udało się wczytać salda"), "Portfel");
        }
        return;
      }
      setWalletBalancePln(Number(json?.balance_pln ?? 0));
      setAdminBalancePln(Number(json?.admin_balance_pln ?? 0));
      setOperatorBalancePln(Number(json?.operator_balance_pln ?? 0));
      setWalletTransactions(Array.isArray(json?.transactions) ? json.transactions : []);
      setTransactionsTotal(Number(json?.transactions_total ?? 0));
      setHasMore(Boolean(json?.transactions_has_more));
    } catch {
      if (!opts?.quiet) showError("Błąd sieci", "Portfel");
    } finally {
      if (!opts?.quiet) setWalletLoading(false);
    }
  }

  async function loadMoreTransactions() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/wallet/me?limit=${HISTORY_PAGE_SIZE}&offset=${walletTransactions.length}`
      );
      const json = (await res.json().catch(() => null)) as {
        transactions?: WalletMeTransaction[];
        transactions_total?: number;
        transactions_has_more?: boolean;
        error?: unknown;
      } | null;
      if (!res.ok) {
        showError(extractApiErrorMessage(json?.error, "Nie udało się doładować historii"), "Portfel");
        return;
      }
      const next = Array.isArray(json?.transactions) ? json.transactions : [];
      setWalletTransactions((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...next.filter((t) => !seen.has(t.id))];
      });
      setTransactionsTotal(Number(json?.transactions_total ?? transactionsTotal));
      setHasMore(Boolean(json?.transactions_has_more));
    } catch {
      showError("Błąd sieci", "Portfel");
    } finally {
      setLoadingMore(false);
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
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshWallet({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshWallet({ quiet: true });
    }, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const topupAmountParsed = Number.parseFloat(topupAmount.replace(",", "."));
  const allowTopup = showTopup && hotpayEnabled;

  function formatPln(n: number) {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
      Math.round(n * 100) / 100
    );
  }

  const balancePanel = (
    <>
      <div
        className={cn(
          marketplaceEnabled ? paymentsInnerPanelClass : pitchPanelClass,
          marketplaceEnabled ? "px-4 py-4" : "px-4 py-4",
          walletBalancePln != null &&
            walletBalancePln < 0 &&
            (marketplaceEnabled
              ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
              : "border-red-300/40 bg-red-950/30"),
          walletBalancePln != null &&
            walletBalancePln > 0 &&
            (marketplaceEnabled
              ? "border-teal-200 bg-teal-50/80 dark:border-teal-900 dark:bg-teal-950/25"
              : "border-emerald-300/35 bg-emerald-500/15")
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={marketplaceEnabled ? "text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]" : pitchLabelClass}>
              Saldo łącznie
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold tabular-nums",
                marketplaceEnabled ? "text-zinc-950 dark:text-white" : "text-white",
                walletBalancePln == null && (marketplaceEnabled ? "text-zinc-400" : "text-white/75"),
                walletBalancePln != null && walletBalancePln < 0 && (marketplaceEnabled ? "text-red-600 dark:text-red-300" : "text-red-200"),
                walletBalancePln != null &&
                  walletBalancePln > 0 &&
                  (marketplaceEnabled ? "text-[var(--mp-teal-dark)]" : "text-emerald-100")
              )}
            >
              {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
              {walletLoading ? (
                <Loader2
                  className={cn(
                    "ml-2 inline h-5 w-5 animate-spin",
                    marketplaceEnabled ? "text-zinc-400" : "text-white/60"
                  )}
                  aria-hidden
                />
              ) : null}
            </p>
            {walletBalancePln != null && walletBalancePln < 0 ? (
              <p className={cn("mt-1 text-xs font-medium", marketplaceEnabled ? "text-red-600" : "text-red-200")}>
                Niedopłata do uregulowania
              </p>
            ) : walletBalancePln != null && walletBalancePln > 0 ? (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  marketplaceEnabled ? "text-[var(--mp-teal-dark)]" : "text-emerald-100"
                )}
              >
                Nadwyżka na koncie
              </p>
            ) : null}
          </div>
        </div>

        {adminBalancePln !== null && operatorBalancePln !== null ? (
          <div
            className={cn(
              "mt-3 grid grid-cols-2 gap-2 rounded-lg px-3 py-2.5",
              marketplaceEnabled ? "bg-white dark:bg-zinc-950" : "bg-white/8"
            )}
          >
            <div>
              <p
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  marketplaceEnabled ? "text-zinc-500" : "text-white/60"
                )}
              >
                Gotówka / BLIK
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-bold tabular-nums",
                  adminBalancePln < 0
                    ? marketplaceEnabled
                      ? "text-red-600"
                      : "text-red-200"
                    : adminBalancePln > 0
                      ? marketplaceEnabled
                        ? "text-[var(--mp-teal-dark)]"
                        : "text-emerald-100"
                      : marketplaceEnabled
                        ? "text-zinc-500"
                        : "text-white/70"
                )}
              >
                {formatWalletPln(adminBalancePln)}
              </p>
            </div>
            <div
              className={cn(
                "border-l pl-3",
                marketplaceEnabled ? "border-zinc-200 dark:border-zinc-700" : "border-white/15"
              )}
            >
              <p
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  marketplaceEnabled ? "text-zinc-500" : "text-white/60"
                )}
              >
                Płatności online
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-bold tabular-nums",
                  operatorBalancePln < 0
                    ? marketplaceEnabled
                      ? "text-red-600"
                      : "text-red-200"
                    : operatorBalancePln > 0
                      ? marketplaceEnabled
                        ? "text-[var(--mp-teal-dark)]"
                        : "text-emerald-100"
                      : marketplaceEnabled
                        ? "text-zinc-500"
                        : "text-white/70"
                )}
              >
                {formatWalletPln(operatorBalancePln)}
              </p>
            </div>
          </div>
        ) : null}

        {allowTopup && walletBalancePln !== null && walletBalancePln < 0 ? (
          <div
            className={cn(
              "mt-4 border-t pt-4",
              marketplaceEnabled ? "border-zinc-200 dark:border-zinc-700" : "border-white/10"
            )}
          >
            <p
              className={cn(
                "mb-3 text-sm font-medium",
                marketplaceEnabled ? "text-red-600" : "text-red-200"
              )}
            >
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
        ) : allowTopup ? (
          <div
            className={cn(
              "mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end",
              marketplaceEnabled ? "border-zinc-200 dark:border-zinc-700" : "border-white/10"
            )}
          >
            <div className="flex-1">
              <Label
                htmlFor="player-topup-amount"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  marketplaceEnabled ? "text-zinc-600 dark:text-zinc-300" : "text-white/70"
                )}
              >
                Kwota (PLN)
              </Label>
              <input
                id="player-topup-amount"
                type="number"
                min={0.01}
                step={0.01}
                className={cn(
                  "mt-1",
                  marketplaceEnabled
                    ? paymentsFieldClass
                    : "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-base font-semibold text-white placeholder-white/40 outline-none focus:border-white/50 focus:bg-white/15"
                )}
                placeholder="np. 50"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                disabled={topupBusy || walletLoading}
              />
            </div>
            <PayButton
              variant="hero"
              label="Zapłać kartą lub Blikiem"
              busy={topupBusy}
              disabled={walletLoading}
              className="sm:min-w-[14rem]"
              onClick={() => {
                const amount = Number.parseFloat(topupAmount.replace(",", "."));
                if (!Number.isFinite(amount) || amount < 0.01) {
                  showError("Podaj poprawną kwotę (min. 0,01 PLN)", "Płatność");
                  return;
                }
                setTopupConfirmOpen(true);
              }}
            />
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {!compact ? (
        marketplaceEnabled ? (
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <PhotoPanel
              src={MARKETPLACE_PITCH_PHOTOS[1]}
              className="min-h-[7.5rem] rounded-none border-0"
              contentClassName="flex min-h-[7.5rem] flex-col justify-end px-5 py-5 sm:px-6"
              sizes="(max-width: 768px) 100vw, 1152px"
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/80">Twój portfel</p>
              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Saldo konta</h2>
            </PhotoPanel>
            <div className="p-5 sm:p-6">{balancePanel}</div>
          </div>
        ) : (
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
            {balancePanel}
          </PitchCard>
        )
      ) : (
        <div
          className={cn(
            marketplaceEnabled ? paymentsInnerPanelClass : "rounded-xl border border-white/25 bg-black/10 p-4 backdrop-blur-sm",
            "flex flex-wrap items-center justify-between gap-3",
            walletBalancePln != null && walletBalancePln < 0 && "border-red-300/40",
            walletBalancePln != null && walletBalancePln > 0 && (marketplaceEnabled ? "border-teal-200" : "border-emerald-300/35")
          )}
        >
          <div>
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                marketplaceEnabled ? "text-[var(--mp-teal-dark)]" : "text-emerald-100/70"
              )}
            >
              Saldo
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold tabular-nums",
                marketplaceEnabled ? "text-zinc-950 dark:text-white" : "text-white",
                walletBalancePln != null && walletBalancePln < 0 && (marketplaceEnabled ? "text-red-600" : "text-red-200"),
                walletBalancePln != null &&
                  walletBalancePln > 0 &&
                  (marketplaceEnabled ? "text-[var(--mp-teal-dark)]" : "text-emerald-100")
              )}
            >
              {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
              {walletLoading ? (
                <Loader2 className="ml-2 inline h-5 w-5 animate-spin text-zinc-400" aria-hidden />
              ) : null}
            </p>
          </div>
        </div>
      )}

      <PaymentsCard
        title="Historia salda"
        description="Wszystkie doładowania, opłaty meczów, przelewy, zwroty i korekty — z saldem po każdej operacji. Najnowsze na górze."
        headerExtra={<ChromeIconBadge icon={Wallet} marketplace={marketplaceEnabled} />}
      >
        <WalletBalanceHistory
          loading={walletLoading}
          transactions={walletTransactions}
          total={transactionsTotal}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={() => void loadMoreTransactions()}
        />
      </PaymentsCard>

      <AppModal
        open={topupConfirmOpen}
        onOpenChange={setTopupConfirmOpen}
        title={walletBalancePln !== null && walletBalancePln < 0 ? "Opłać zaległość" : "Potwierdź płatność"}
        description={
          walletBalancePln !== null && walletBalancePln < 0
            ? `Zostaniesz przekierowany do płatności kartą lub Blikiem. Kwota zaległości: ${formatPln(Math.abs(walletBalancePln))}.`
            : Number.isFinite(topupAmountParsed)
              ? `Zostaniesz przekierowany do płatności kartą lub Blikiem. Kwota: ${formatPln(topupAmountParsed)}.`
              : "Sprawdź kwotę płatności."
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
                : Number.isFinite(topupAmountParsed)
                  ? topupAmountParsed
                  : null
            }
            label={walletBalancePln !== null && walletBalancePln < 0 ? "Opłać zaległość" : "Zapłać kartą lub Blikiem"}
            busy={topupBusy}
            onClick={() => void handleTopup()}
          />
        </div>
      </AppModal>
      {MessageModal}
    </div>
  );
}
