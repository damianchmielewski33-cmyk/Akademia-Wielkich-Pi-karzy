"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAppMessage } from "@/components/ui/app-message-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";
import { PayButton } from "@/components/pay-button";

type Props = {
  enabled: boolean;
  walletLoading?: boolean;
  className?: string;
};

export function HotpayPayButtons({
  enabled,
  walletLoading,
  className,
}: Props) {
  const [topupAmount, setTopupAmount] = useState("");
  const { showError, MessageModal } = useAppMessage();
  const { pay, busy } = useHotpayPayment();

  async function payTopup() {
    const amount = Number.parseFloat(topupAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0.01) {
      showError("Podaj poprawną kwotę doładowania (min. 0,01 PLN)", "Doładowanie");
      return;
    }
    if (amount > 10000) {
      showError("Maksymalna kwota doładowania to 10 000 PLN", "Doładowanie");
      return;
    }
    await pay(amount);
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className={cn("rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          <Wallet className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Doładuj saldo online</h3>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            Ureguluj niedopłatę lub doładuj portfel online. Opłatę za konkretny mecz (za siebie lub innych) znajdziesz w sekcji „Opłać mecz (koszyk)”.
          </p>
        </div>
      </div>

      <div className="mt-4">
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
            disabled={busy || walletLoading}
          />
          <PayButton
            variant="default"
            label="Doładuj saldo"
            busy={busy}
            disabled={!enabled || walletLoading}
            fullWidth
            className="mt-3"
            onClick={() => void payTopup()}
          />
        </div>
      </div>
      {MessageModal}
    </div>
  );
}
