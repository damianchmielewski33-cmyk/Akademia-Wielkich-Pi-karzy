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
import { HotpayPayButtons } from "@/components/hotpay-pay-buttons";
import { MatchCartPayPanel } from "@/components/match-cart-pay-panel";
import { PayMatchButton } from "@/components/pay-match-button";
import { SiteAssetImage } from "@/components/site-asset-image";
import {
  TransferRecipientPicker,
  type TransferRecipient,
} from "@/components/transfer-recipient-picker";
import { AppModal } from "@/components/ui/app-modal";
import { extractApiErrorMessage, useAppMessage } from "@/components/ui/app-message-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PitchCard, pitchLabelClass, pitchPanelClass } from "@/components/ui/pitch-card";
import type { WalletTransactionRow } from "@/lib/wallet";
import { cn } from "@/lib/utils";

export type WalletMeTransaction = WalletTransactionRow & { balance_after_pln: number };

type WalletDepositPending = {
  id: number;
  amount_pln: number;
  status: string;
  note: string | null;
  created_at: string;
  player_declared_at: string | null;
};

type Props = {
  currentUserId: number | null;
  blikPhoneDisplay: string;
  defaultMatchFeePln: number | null;
  playerLabel: string;
  hotpayEnabled: boolean;
  compact?: boolean;
  refreshKey?: number;
  /** Prefill koszyka z URL (?mecz=). */
  initialMatchId?: number | null;
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
  currentUserId,
  blikPhoneDisplay,
  defaultMatchFeePln,
  playerLabel,
  hotpayEnabled,
  compact = false,
  refreshKey = 0,
  initialMatchId = null,
  className,
}: Props) {
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletMeTransaction[]>([]);
  const [walletPending, setWalletPending] = useState<WalletDepositPending[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(!hotpayEnabled);

  const [transferRecipient, setTransferRecipient] = useState<TransferRecipient | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const { showError, showSuccess, MessageModal } = useAppMessage();

  async function refreshWallet() {
    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/me");
      const json = (await res.json().catch(() => null)) as {
        balance_pln?: unknown;
        transactions?: WalletMeTransaction[];
        pending?: WalletDepositPending[];
        error?: unknown;
      } | null;
      if (!res.ok) {
        showError(extractApiErrorMessage(json?.error, "Nie udało się wczytać salda"), "Portfel");
        return;
      }
      setWalletBalancePln(Number(json?.balance_pln ?? 0));
      setWalletTransactions(Array.isArray(json?.transactions) ? json.transactions : []);
      setWalletPending(Array.isArray(json?.pending) ? json.pending : []);
    } catch {
      showError("Błąd sieci", "Portfel");
    } finally {
      setWalletLoading(false);
    }
  }

  async function submitDeposit() {
    const amount = Number.parseFloat(depositAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      showError("Podaj poprawną kwotę wpłaty", "Wpłata BLIK");
      return;
    }
    setDepositSubmitting(true);
    try {
      const res = await fetch("/api/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_pln: amount, note: depositNote.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        showError(extractApiErrorMessage(data.error, "Nie udało się zgłosić wpłaty"), "Wpłata BLIK");
        return;
      }
      showSuccess("Wpłata zgłoszona — administrator ją zaksięguje po otrzymaniu przelewu", "Wpłata BLIK");
      setDepositAmount("");
      setDepositNote("");
      await refreshWallet();
    } catch {
      showError("Błąd sieci", "Wpłata BLIK");
    } finally {
      setDepositSubmitting(false);
    }
  }

  function openTransferConfirm() {
    if (!transferRecipient) {
      showError("Wybierz odbiorcę z listy podpowiedzi", "Przelew");
      return;
    }
    const amount = Number.parseFloat(transferAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 1) {
      showError("Minimalna kwota przelewu to 1 PLN", "Przelew");
      return;
    }
    if (walletBalancePln != null && amount > walletBalancePln) {
      showError("Kwota przekracza saldo portfela", "Przelew");
      return;
    }
    setTransferConfirmOpen(true);
  }

  async function submitTransfer() {
    if (!transferRecipient) return;
    const amount = Number.parseFloat(transferAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 1) return;

    setTransferSubmitting(true);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: transferRecipient.id,
          amount_pln: amount,
          note: transferNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        setTransferConfirmOpen(false);
        showError(extractApiErrorMessage(data.error, "Nie udało się wykonać przelewu"), "Przelew");
        return;
      }
      setTransferConfirmOpen(false);
      showSuccess(`Przelano ${formatWalletPln(amount)}`, "Przelew");
      setTransferAmount("");
      setTransferNote("");
      setTransferRecipient(null);
      await refreshWallet();
    } catch {
      setTransferConfirmOpen(false);
      showError("Błąd sieci", "Przelew");
    } finally {
      setTransferSubmitting(false);
    }
  }

  useEffect(() => {
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const transferAmountParsed = Number.parseFloat(transferAmount.replace(",", "."));
  const transferRecipientLabel = transferRecipient
    ? [transferRecipient.first_name, transferRecipient.last_name].filter(Boolean).join(" ").trim() ||
      transferRecipient.zawodnik
    : "";

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
                {walletBalancePln === null ? "—" : formatWalletPln(walletBalancePln)}
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

      <HotpayPayButtons
        enabled={hotpayEnabled}
        balancePln={walletBalancePln}
        defaultMatchFeePln={defaultMatchFeePln}
        walletLoading={walletLoading}
      />

      <MatchCartPayPanel
        hotpayEnabled={hotpayEnabled}
        initialMatchId={initialMatchId}
        preferUserId={currentUserId}
        onPaid={() => void refreshWallet()}
      />

      <div className={contentPanelClass}>
        <button
          type="button"
          className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <div>
            <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Zaawansowane</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {hotpayEnabled
                ? "BLIK na telefon i przelew do innego gracza."
                : "BLIK / przelew na telefon oraz przelew do innego gracza."}
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">
            {advancedOpen ? "Ukryj" : "Pokaż"}
          </span>
        </button>

        {advancedOpen ? (
          <div className="mt-4 space-y-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <div>
              <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                {hotpayEnabled ? "BLIK (awaryjnie)" : "BLIK / przelew"}
              </h4>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {hotpayEnabled
                  ? "Płatność na telefon — wymaga potwierdzenia przez administratora."
                  : "Skopiuj dane BLIK lub otwórz aplikację banku, potem zgłoś wpłatę."}
              </p>
              <div className="mt-3 space-y-4">
                <PayMatchButton
                  blikPhoneDisplay={blikPhoneDisplay}
                  defaultMatchFeePln={defaultMatchFeePln}
                  balancePln={walletBalancePln}
                  playerLabel={playerLabel}
                />

                <div>
                  <h5 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Zgłoś wpłatę BLIK</h5>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Po wykonaniu przelewu BLIK wpisz kwotę — administrator potwierdzi i zaksięguje ją na Twoim koncie.
                  </p>
                  {walletPending.length > 0 ? (
                    <ul className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm dark:border-amber-800/50 dark:bg-amber-950/30">
                      {walletPending.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap justify-between gap-2 text-amber-950 dark:text-amber-100"
                        >
                          <span>
                            Oczekuje:{" "}
                            <strong className="tabular-nums">{formatWalletPln(Number(p.amount_pln))}</strong>
                            {p.note ? <span className="text-amber-800/80"> — {p.note}</span> : null}
                          </span>
                          <span className="text-xs text-amber-800/70">{formatTxDateParts(p.created_at).date}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="wallet-deposit-amount"
                        className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        Kwota (PLN)
                      </Label>
                      <Input
                        id="wallet-deposit-amount"
                        type="number"
                        min={0.01}
                        step={0.01}
                        className="mt-1"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="np. 50"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="wallet-deposit-note"
                        className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        Notatka (opcjonalnie)
                      </Label>
                      <Input
                        id="wallet-deposit-note"
                        className="mt-1"
                        value={depositNote}
                        onChange={(e) => setDepositNote(e.target.value)}
                        placeholder="np. przelew z mBanku"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="mt-4"
                    variant="pitch"
                    disabled={depositSubmitting || walletLoading}
                    onClick={() => void submitDeposit()}
                  >
                    {depositSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Zgłosiłem wpłatę
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                  <ArrowLeftRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
                    Przelew innemu graczowi
                  </h4>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    Prześlij środki z portfela do innego zawodnika akademii (min. 1 PLN).
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <TransferRecipientPicker
                  excludeUserId={currentUserId}
                  selectedId={transferRecipient?.id ?? null}
                  onSelect={setTransferRecipient}
                  disabled={transferSubmitting}
                />
                <div>
                  <Label
                    htmlFor="wallet-transfer-amount"
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    Kwota (PLN)
                  </Label>
                  <Input
                    id="wallet-transfer-amount"
                    type="number"
                    min={1}
                    step={0.01}
                    className="mt-1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="np. 20"
                    disabled={transferSubmitting}
                  />
                  {walletBalancePln != null ? (
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Dostępne:{" "}
                      <span className="font-medium tabular-nums">{formatWalletPln(walletBalancePln)}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <Label
                  htmlFor="wallet-transfer-note"
                  className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  Notatka (opcjonalnie)
                </Label>
                <Input
                  id="wallet-transfer-note"
                  className="mt-1"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="np. zwrot za boisko"
                  disabled={transferSubmitting}
                  maxLength={200}
                />
              </div>
              <Button
                type="button"
                className="mt-4"
                variant="pitch"
                disabled={transferSubmitting || walletLoading}
                onClick={openTransferConfirm}
              >
                Przelej środki
              </Button>
            </div>
          </div>
        ) : null}
      </div>

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
        open={transferConfirmOpen}
        onOpenChange={setTransferConfirmOpen}
        title="Potwierdź przelew"
        description={
          Number.isFinite(transferAmountParsed) && transferRecipientLabel
            ? `Przelejesz ${formatWalletPln(transferAmountParsed)} do: ${transferRecipientLabel}. Tej operacji nie da się cofnąć.`
            : "Sprawdź dane przelewu."
        }
      >
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={transferSubmitting}
            onClick={() => setTransferConfirmOpen(false)}
          >
            Anuluj
          </Button>
          <Button type="button" variant="pitch" disabled={transferSubmitting} onClick={() => void submitTransfer()}>
            {transferSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Potwierdź przelew
          </Button>
        </div>
      </AppModal>
      {MessageModal}
    </div>
  );
}
