"use client";

import { useState } from "react";
import { CreditCard, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestPaymentAmountPln } from "@/lib/bank-payment-link";
import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  balancePln: number | null;
  defaultMatchFeePln: number | null;
  walletLoading?: boolean;
  className?: string;
};

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    Math.round(n * 100) / 100
  );
}

async function startHotpayPayment(body: { kind: "match" | "topup"; amount_pln?: number }) {
  const res = await fetch("/api/wallet/hotpay/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!res.ok || !data.url) {
    throw new Error(typeof data.error === "string" ? data.error : "Nie udało się rozpocząć płatności HotPay");
  }
  return data.url;
}

export function HotpayPayButtons({
  enabled,
  balancePln,
  defaultMatchFeePln,
  walletLoading,
  className,
}: Props) {
  const [topupAmount, setTopupAmount] = useState("");
  const [busyKind, setBusyKind] = useState<"match" | "topup" | null>(null);

  const matchAmount = suggestPaymentAmountPln(balancePln, defaultMatchFeePln);
  const matchDisabled = !enabled || walletLoading || busyKind != null || matchAmount == null || matchAmount <= 0;

  async function payMatch() {
    if (matchDisabled || matchAmount == null) return;
    setBusyKind("match");
    try {
      const url = await startHotpayPayment({ kind: "match" });
      toast.message("Przekierowanie do HotPay…", { duration: 4000 });
      window.location.assign(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd płatności HotPay");
      setBusyKind(null);
    }
  }

  async function payTopup() {
    const amount = Number.parseFloat(topupAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0.01) {
      toast.error("Podaj poprawną kwotę doładowania");
      return;
    }
    if (amount > 10000) {
      toast.error("Maksymalna kwota to 10 000 PLN");
      return;
    }
    setBusyKind("topup");
    try {
      const url = await startHotpayPayment({ kind: "topup", amount_pln: amount });
      toast.message("Przekierowanie do HotPay…", { duration: 4000 });
      window.location.assign(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd płatności HotPay");
      setBusyKind(null);
    }
  }

  if (!enabled) {
    return (
      <div className={cn("rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5", className)}>
        <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Płatność online</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          HotPay nie jest jeszcze skonfigurowany. Skorzystaj z BLIK poniżej albo poczekaj na uruchomienie płatności online przez administratora.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          <CreditCard className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
            Płatność online (HotPay)
          </h3>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            Zapłać wpisowe lub doładuj saldo — po udanej płatności środki trafią automatycznie na portfel.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Zapłać za mecz</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {matchAmount != null ? formatPln(matchAmount) : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {balancePln != null && balancePln < 0
              ? "Kwota niedopłaty z portfela"
              : "Domyślne wpisowe z ustawień"}
          </p>
          <Button
            type="button"
            className="mt-3 w-full"
            variant="pitch"
            disabled={matchDisabled}
            onClick={() => void payMatch()}
          >
            {busyKind === "match" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapłać za mecz
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Doładuj saldo</p>
          <Label htmlFor="hotpay-topup-amount" className="sr-only">
            Kwota doładowania
          </Label>
          <Input
            id="hotpay-topup-amount"
            type="number"
            min={0.01}
            step={0.01}
            className="mt-2"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            placeholder="np. 50"
            disabled={busyKind != null || walletLoading}
          />
          <Button
            type="button"
            className="mt-3 w-full"
            variant="pitch"
            disabled={!enabled || walletLoading || busyKind != null}
            onClick={() => void payTopup()}
          >
            {busyKind === "topup" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Wallet className="mr-2 h-4 w-4" aria-hidden />
            )}
            Doładuj saldo
          </Button>
        </div>
      </div>
    </div>
  );
}
