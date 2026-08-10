"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAppMessage } from "@/components/ui/app-message-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, adminFieldClass, adminInnerPanelClass } from "@/components/admin-ui";
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
      showError("Podaj poprawną kwotę (min. 0,01 PLN)", "Płatność");
      return;
    }
    if (amount > 10000) {
      showError("Maksymalna kwota płatności to 10 000 PLN", "Płatność");
      return;
    }
    await pay(amount);
  }

  if (!enabled) {
    return null;
  }

  return (
    <AdminCard
      className={className}
      title="Zapłać kartą lub Blikiem"
      description="Ureguluj niedopłatę lub wpłać środki online. Opłatę za konkretny mecz znajdziesz w sekcji „Opłać mecz (koszyk)”."
      headerExtra={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
          <Wallet className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
        </div>
      }
    >
      <div className={cn(adminInnerPanelClass, "space-y-3")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">Kwota płatności</p>
        <Label htmlFor="hotpay-topup-amount" className="sr-only">
          Kwota płatności
        </Label>
        <Input
          id="hotpay-topup-amount"
          type="number"
          min={0.01}
          step={0.01}
          className={adminFieldClass}
          value={topupAmount}
          onChange={(e) => setTopupAmount(e.target.value)}
          placeholder="np. 50"
          disabled={busy || walletLoading}
        />
        <PayButton
          variant="hero"
          label="Zapłać kartą lub Blikiem"
          busy={busy}
          disabled={!enabled || walletLoading}
          fullWidth
          onClick={() => void payTopup()}
        />
      </div>
      {MessageModal}
    </AdminCard>
  );
}
