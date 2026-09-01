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
import { AppModal } from "@/components/ui/app-modal";
import { extractApiErrorMessage, useAppMessage } from "@/components/ui/app-message-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

function parseTxDate(raw: string): Date | null {
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function localDayKey(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayHeading(dayKey: string): string {
  const today = localDayKey(new Date());
  if (dayKey === today) return "Dziś";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === localDayKey(yesterday)) return "Wczoraj";
  const dt = new Date(`${dayKey}T12:00:00`);
  return dt.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTxTime(raw: string): string {
  const dt = parseTxDate(raw);
  if (!dt) return "";
  return dt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
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
  const related = relatedUserLabel(tx);
  switch (tx.kind) {
    case "deposit":
      return {
        title: amount >= 0 ? "Doładowanie" : "Korekta wpłaty",
        Icon: ArrowDownLeft,
      };
    case "match_charge":
      return {
        title: amount < 0 ? "Opłata za mecz" : "Zwrot za mecz",
        Icon: ArrowUpRight,
      };
    case "adjustment":
      return {
        title: amount > 0 ? "Zwrot na konto" : "Korekta salda",
        Icon: SlidersHorizontal,
      };
    case "transfer":
      if (related) {
        return {
          title: amount > 0 ? `Od ${related}` : `Do ${related}`,
          Icon: ArrowLeftRight,
        };
      }
      return {
        title: amount > 0 ? "Przelew otrzymany" : "Przelew wysłany",
        Icon: ArrowLeftRight,
      };
    default:
      return { title: String(tx.kind), Icon: SlidersHorizontal };
  }
}

function txSubtitle(tx: WalletMeTransaction): string | null {
  const time = formatTxTime(tx.created_at);
  const bits: string[] = [];
  if (time) bits.push(time);

  if (tx.kind === "match_charge") {
    const match = matchLabel(tx);
    if (match) bits.push(match);
  } else if (tx.kind === "transfer") {
    const note = tx.note?.trim();
    if (note) bits.push(note.length > 60 ? `${note.slice(0, 60)}…` : note);
  } else {
    const note = tx.note?.trim();
    if (note) bits.push(note.length > 70 ? `${note.slice(0, 70)}…` : note);
    else if (tx.kind === "deposit" && tx.wallet_kind === "operator") bits.push("Płatność online");
    else if (tx.kind === "deposit") bits.push("Gotówka / BLIK u admina");
  }

  return bits.length ? bits.join(" · ") : null;
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
  const light = true;
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter !== "all" && tx.kind !== filter) return false;
      if (!q) return true;
      const meta = walletTxMeta(tx);
      const hay = [tx.note, meta.title, matchLabel(tx), relatedUserLabel(tx), String(tx.match_id ?? "")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, WalletMeTransaction[]>();
    for (const tx of filtered) {
      const dt = parseTxDate(tx.created_at);
      const key = dt ? localDayKey(dt) : "unknown";
      const list = map.get(key);
      if (list) list.push(tx);
      else map.set(key, [tx]);
    }
    return Array.from(map.entries());
  }, [filtered]);

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
              filter === f.id
                ? "bg-[var(--mp-teal)] text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj po meczu, osobie lub notatce…"
        className={cn(
          light ? paymentsFieldClass : cn(adminFieldClass, "w-full rounded-xl px-3 py-2 text-sm outline-none"),
          "h-10"
        )}
      />

      {filtered.length === 0 ? (
        <p className={cn("py-8 text-center text-sm", light ? "text-zinc-500" : "pitch-muted")}>
          Nic nie pasuje do filtra.
        </p>
      ) : (
        <div
          className={cn(
            "max-h-[min(70vh,36rem)] overflow-y-auto overscroll-contain",
            light
              ? "rounded-2xl border border-zinc-200 dark:border-zinc-800"
              : "rounded-2xl border border-white/15 bg-black/15"
          )}
        >
          {groups.map(([dayKey, dayTxs]) => (
            <section key={dayKey}>
              <h3
                className={cn(
                  "sticky top-0 z-[1] px-3 py-2 text-xs font-semibold capitalize",
                  light
                    ? "bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                    : "bg-black/40 text-emerald-100/80 backdrop-blur-sm"
                )}
              >
                {dayKey === "unknown" ? "Bez daty" : formatDayHeading(dayKey)}
              </h3>
              <ul>
                {dayTxs.map((tx, idx) => {
                  const amount = Number(tx.amount_pln ?? 0);
                  const isPositive = amount > 0;
                  const isNegative = amount < 0;
                  const meta = walletTxMeta(tx);
                  const Icon = meta.Icon;
                  const subtitle = txSubtitle(tx);
                  const isTest = Boolean(tx.is_test);

                  return (
                    <li
                      key={tx.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3",
                        idx > 0 && (light ? "border-t border-zinc-100 dark:border-zinc-800" : "border-t border-white/10")
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          light
                            ? isNegative
                              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                              : isPositive
                                ? "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/40 dark:text-teal-200"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
                            : isNegative
                              ? "bg-red-500/20 text-red-200"
                              : isPositive
                                ? "bg-emerald-500/20 text-emerald-200"
                                : "bg-white/10 text-white"
                        )}
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            light ? "text-zinc-950 dark:text-white" : "text-white"
                          )}
                        >
                          {meta.title}
                          {isTest ? (
                            <span
                              className={cn(
                                "ml-1.5 text-[10px] font-bold uppercase tracking-wide",
                                light ? "text-amber-600" : "text-amber-200"
                              )}
                            >
                              Test
                            </span>
                          ) : null}
                        </p>
                        {subtitle ? (
                          <p
                            className={cn(
                              "mt-0.5 truncate text-xs",
                              light ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/65"
                            )}
                          >
                            {subtitle}
                          </p>
                        ) : null}
                      </div>

                      <p
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          isPositive && (light ? "text-[var(--mp-teal-dark)]" : "text-emerald-300"),
                          isNegative && (light ? "text-red-600 dark:text-red-300" : "text-red-300"),
                          !isPositive && !isNegative && (light ? "text-zinc-900 dark:text-white" : "text-white")
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatWalletPln(amount)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasMore && onLoadMore ? (
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={loadingMore}
            onClick={() => onLoadMore()}
          >
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Pokaż starsze
          </Button>
          {total > transactions.length ? (
            <p className={cn("text-[11px] tabular-nums", light ? "text-zinc-400" : "pitch-muted")}>
              Załadowano {transactions.length} z {total}
            </p>
          ) : null}
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
          paymentsInnerPanelClass,
          "px-4 py-4",
          walletBalancePln != null &&
            walletBalancePln < 0 &&
            (walletBalancePln != null &&
            walletBalancePln < 0 &&
            "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"),
          walletBalancePln != null &&
            walletBalancePln > 0 &&
            "border-teal-200 bg-teal-50/80 dark:border-teal-900 dark:bg-teal-950/25"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={"text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]"}>
              Saldo łącznie
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold tabular-nums",
                "text-zinc-950 dark:text-white",
                walletBalancePln == null && ("text-zinc-400"),
                walletBalancePln != null && walletBalancePln < 0 && ("text-red-600 dark:text-red-300"),
                walletBalancePln != null &&
                  walletBalancePln > 0 &&
                  ("text-[var(--mp-teal-dark)]")
              )}
            >
              {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
              {walletLoading ? (
                <Loader2
                  className={cn(
                    "ml-2 inline h-5 w-5 animate-spin",
                    "text-zinc-400"
                  )}
                  aria-hidden
                />
              ) : null}
            </p>
            {walletBalancePln != null && walletBalancePln < 0 ? (
              <p className="mt-1 text-xs font-medium text-red-600">
                Niedopłata do uregulowania
              </p>
            ) : walletBalancePln != null && walletBalancePln > 0 ? (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  "text-[var(--mp-teal-dark)]"
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
              "bg-white dark:bg-zinc-950"
            )}
          >
            <div>
              <p
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  "text-zinc-500"
                )}
              >
                Gotówka / BLIK
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-bold tabular-nums",
                  adminBalancePln < 0
                    ? "text-red-600"
                    : adminBalancePln > 0
                      ? "text-[var(--mp-teal-dark)]"
                      : "text-zinc-500"
                )}
              >
                {formatWalletPln(adminBalancePln)}
              </p>
            </div>
            <div
              className={cn(
                "border-l pl-3",
                "border-zinc-200 dark:border-zinc-700"
              )}
            >
              <p
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  "text-zinc-500"
                )}
              >
                Płatności online
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-bold tabular-nums",
                  operatorBalancePln < 0
                    ? "text-red-600"
                    : operatorBalancePln > 0
                      ? "text-[var(--mp-teal-dark)]"
                      : "text-zinc-500"
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
              "border-zinc-200 dark:border-zinc-700"
            )}
          >
            <p
              className={cn(
                "mb-3 text-sm font-medium",
                "text-red-600"
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
              "border-zinc-200 dark:border-zinc-700"
            )}
          >
            <div className="flex-1">
              <Label
                htmlFor="player-topup-amount"
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  "text-zinc-600 dark:text-zinc-300"
                )}
              >
                Kwota (PLN)
              </Label>
              <input
                id="player-topup-amount"
                type="number"
                min={0.01}
                step={0.01}
                className={cn("mt-1", paymentsFieldClass)}
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
        <div
          className={cn(
            paymentsInnerPanelClass,
            "flex flex-wrap items-center justify-between gap-3",
            walletBalancePln != null && walletBalancePln < 0 && "border-red-300/40",
            walletBalancePln != null && walletBalancePln > 0 && "border-teal-200"
          )}
        >
          <div>
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                "text-[var(--mp-teal-dark)]"
              )}
            >
              Saldo
            </p>
            <p
              className={cn(
                "mt-1 text-3xl font-bold tabular-nums",
                "text-zinc-950 dark:text-white",
                walletBalancePln != null && walletBalancePln < 0 && ("text-red-600"),
                walletBalancePln != null &&
                  walletBalancePln > 0 &&
                  ("text-[var(--mp-teal-dark)]")
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
        title="Historia operacji"
        description="Wpłaty, mecze i przelewy — pogrupowane według dnia. Najnowsze na górze."
        headerExtra={<ChromeIconBadge icon={Wallet} />}
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
