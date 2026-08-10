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
  AdminCard,
  adminEmptyStateClass,
  adminFieldClass,
  adminInnerPanelClass,
} from "@/components/admin-ui";
import type { WalletTransactionRow } from "@/lib/wallet";
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
  currentUserId: number | null;
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
        badgeClass: "border-emerald-300/40 bg-emerald-500/20 text-emerald-100",
        borderClass: "border-l-emerald-400",
      };
    case "match_charge":
      return {
        label: amount < 0 ? "Opłata za mecz" : "Zwrot / uznanie meczu",
        Icon: ArrowUpRight,
        badgeClass: "border-red-300/40 bg-red-500/20 text-red-100",
        borderClass: "border-l-red-400",
      };
    case "adjustment":
      return {
        label: amount > 0 ? "Zwrot / uznanie" : "Korekta (obciążenie)",
        Icon: SlidersHorizontal,
        badgeClass: "border-amber-300/40 bg-amber-500/20 text-amber-100",
        borderClass: "border-l-amber-400",
      };
    case "transfer":
      return {
        label: amount > 0 ? "Przelew otrzymany" : "Przelew wysłany",
        Icon: ArrowLeftRight,
        badgeClass: "border-sky-300/40 bg-sky-500/20 text-sky-100",
        borderClass: "border-l-sky-400",
      };
    default:
      return {
        label: String(tx.kind),
        Icon: SlidersHorizontal,
        badgeClass: "border-white/25 bg-white/10 text-emerald-100",
        borderClass: "border-l-white/40",
      };
  }
}

function walletKindLabel(kind: WalletTransactionRow["wallet_kind"] | null | undefined) {
  if (kind === "operator") return "Online (HotPay)";
  return "Gotówka / BLIK";
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
      <p className="mt-4 flex items-center gap-2 text-sm pitch-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Wczytywanie historii…
      </p>
    );
  }

  if (transactions.length === 0) {
    return <p className={cn(adminEmptyStateClass, "mt-4")}>Brak operacji na koncie.</p>;
  }

  const filters: { id: HistoryFilter; label: string }[] = [
    { id: "all", label: "Wszystkie" },
    { id: "deposit", label: "Doładowania" },
    { id: "match_charge", label: "Mecze" },
    { id: "transfer", label: "Przelewy" },
    { id: "adjustment", label: "Korekty / zwroty" },
  ];

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
                filter === f.id
                  ? "bg-[var(--mundial-gold,#c9a227)] text-[var(--mundial-navy,#0a1628)] ring-white/40"
                  : "bg-black/20 text-emerald-100/85 ring-white/20 hover:bg-white/10"
              )}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-80">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <p className="text-xs tabular-nums pitch-muted">
          Załadowano {transactions.length}
          {total > transactions.length ? ` z ${total}` : ""} wpisów
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj w notatce, meczu, zawodniku…"
        className={cn(adminFieldClass, "w-full rounded-xl px-3 py-2 text-sm outline-none")}
      />

      <div className="overflow-hidden rounded-xl border border-white/25 bg-black/15">
        <div className="flex items-center justify-between gap-2 border-b border-white/20 bg-black/20 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/85">
            Lista transakcji
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-emerald-100/80 ring-1 ring-white/20">
            {filtered.length}
            {filtered.length !== transactions.length ? ` / ${transactions.length}` : ""}
          </span>
        </div>

        <div
          className="hidden grid-cols-[minmax(0,1.6fr)_5.5rem_5.5rem_5.5rem] gap-3 border-b border-white/15 bg-black/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100/60 sm:grid"
          aria-hidden
        >
          <span>Operacja i szczegóły</span>
          <span className="text-right">Data</span>
          <span className="text-right">Zmiana</span>
          <span className="text-right">Saldo</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm pitch-muted">Brak wpisów dla wybranego filtra.</p>
        ) : (
          <ul className="max-h-[70vh] divide-y divide-white/15 overflow-y-auto">
            {filtered.map((tx) => {
              const amount = Number(tx.amount_pln ?? 0);
              const balanceAfter = Number(tx.balance_after_pln ?? 0);
              const isPositive = amount > 0;
              const isNegative = amount < 0;
              const { date, time } = formatTxDateParts(tx.created_at);
              const meta = walletTxMeta(tx);
              const Icon = meta.Icon;
              const match = matchLabel(tx);
              const related = relatedUserLabel(tx);
              const isTest = Boolean(tx.is_test);

              return (
                <li
                  key={tx.id}
                  className={cn("border-l-4 bg-black/20 px-4 py-3", meta.borderClass)}
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_5.5rem_5.5rem_5.5rem] sm:items-start">
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
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-emerald-100/85 ring-1 ring-white/15">
                          {walletKindLabel(tx.wallet_kind)}
                        </span>
                        {isTest ? (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100 ring-1 ring-amber-300/30">
                            Test
                          </span>
                        ) : null}
                        <span className="text-[11px] tabular-nums text-emerald-100/50">#{tx.id}</span>
                        <span className="text-[11px] tabular-nums text-emerald-100/70 sm:hidden">
                          {date}
                          {time ? ` · ${time}` : ""}
                        </span>
                      </div>

                      {tx.note ? (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-snug text-emerald-50/95">
                          {tx.note}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-sm text-emerald-100/45">Bez notatki</p>
                      )}

                      <div className="mt-2 flex flex-col gap-0.5 text-xs pitch-muted">
                        {match ? (
                          <p>
                            <span className="font-semibold text-emerald-100/85">Mecz:</span> {match}
                          </p>
                        ) : null}
                        {related ? (
                          <p>
                            <span className="font-semibold text-emerald-100/85">
                              {amount > 0 ? "Od:" : "Do:"}
                            </span>{" "}
                            {related}
                            {tx.related_user_id ? (
                              <span className="tabular-nums text-emerald-100/50"> (#{tx.related_user_id})</span>
                            ) : null}
                          </p>
                        ) : null}
                        {tx.deposit_request_id ? (
                          <p>
                            <span className="font-semibold text-emerald-100/85">Wniosek wpłaty:</span> #
                            {tx.deposit_request_id}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-medium tabular-nums text-white">{date}</p>
                      {time ? <p className="mt-0.5 text-xs tabular-nums pitch-muted">{time}</p> : null}
                    </div>

                    <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100/60 sm:hidden">
                        Zmiana
                      </span>
                      <p
                        className={cn(
                          "text-base font-bold tabular-nums leading-none",
                          isPositive && "text-emerald-300",
                          isNegative && "text-red-300",
                          !isPositive && !isNegative && "text-white"
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatWalletPln(amount)}
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100/60 sm:hidden">
                        Saldo
                      </span>
                      <div>
                        <p className="text-sm font-semibold tabular-nums text-white">
                          {formatWalletPln(balanceAfter)}
                        </p>
                        <p className="mt-0.5 hidden text-[10px] uppercase tracking-wide text-emerald-100/45 sm:block">
                          po operacji
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasMore && onLoadMore ? (
        <div className="flex justify-center pt-1">
          <Button type="button" variant="gold" size="sm" disabled={loadingMore} onClick={() => onLoadMore()}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Załaduj starsze wpisy
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

  async function refreshWallet() {
    setWalletLoading(true);
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
        showError(extractApiErrorMessage(json?.error, "Nie udało się wczytać salda"), "Portfel");
        return;
      }
      setWalletBalancePln(Number(json?.balance_pln ?? 0));
      setAdminBalancePln(Number(json?.admin_balance_pln ?? 0));
      setOperatorBalancePln(Number(json?.operator_balance_pln ?? 0));
      setWalletTransactions(Array.isArray(json?.transactions) ? json.transactions : []);
      setTransactionsTotal(Number(json?.transactions_total ?? 0));
      setHasMore(Boolean(json?.transactions_has_more));
    } catch {
      showError("Błąd sieci", "Portfel");
    } finally {
      setWalletLoading(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const topupAmountParsed = Number.parseFloat(topupAmount.replace(",", "."));
  const allowTopup = showTopup && hotpayEnabled;

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
                variant="gold"
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
                  <p
                    className={cn(
                      "mt-0.5 text-sm font-bold tabular-nums",
                      adminBalancePln < 0
                        ? "text-red-200"
                        : adminBalancePln > 0
                          ? "text-emerald-100"
                          : "text-white/70"
                    )}
                  >
                    {formatWalletPln(adminBalancePln)}
                  </p>
                </div>
                <div className="border-l border-white/15 pl-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/60">Płatności online</p>
                  <p
                    className={cn(
                      "mt-0.5 text-sm font-bold tabular-nums",
                      operatorBalancePln < 0
                        ? "text-red-200"
                        : operatorBalancePln > 0
                          ? "text-emerald-100"
                          : "text-white/70"
                    )}
                  >
                    {formatWalletPln(operatorBalancePln)}
                  </p>
                </div>
              </div>
            )}

            {allowTopup && walletBalancePln !== null && walletBalancePln < 0 ? (
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
            ) : allowTopup ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label
                    htmlFor="player-topup-amount"
                    className="text-xs font-semibold uppercase tracking-wide text-white/70"
                  >
                    Kwota (PLN)
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
        </PitchCard>
      ) : (
        <div
          className={cn(
            adminInnerPanelClass,
            "flex flex-wrap items-center justify-between gap-3",
            walletBalancePln != null && walletBalancePln < 0 && "border-red-300/40",
            walletBalancePln != null && walletBalancePln > 0 && "border-emerald-300/35"
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">Saldo</p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold tabular-nums text-white",
                walletBalancePln != null && walletBalancePln < 0 && "text-red-200",
                walletBalancePln != null && walletBalancePln > 0 && "text-emerald-100"
              )}
            >
              {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
            </p>
          </div>
          <Button type="button" variant="gold" disabled={walletLoading} onClick={() => void refreshWallet()}>
            {walletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Odśwież
          </Button>
        </div>
      )}

      <AdminCard
        title="Historia salda"
        description="Wszystkie doładowania, opłaty meczów, przelewy, zwroty i korekty — z saldem po każdej operacji. Najnowsze na górze."
        headerExtra={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
            <Wallet className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
          </div>
        }
      >
        <WalletBalanceHistory
          loading={walletLoading}
          transactions={walletTransactions}
          total={transactionsTotal}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={() => void loadMoreTransactions()}
        />
      </AdminCard>

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
