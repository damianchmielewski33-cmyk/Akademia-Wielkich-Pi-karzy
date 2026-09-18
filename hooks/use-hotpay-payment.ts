"use client";

import { useState } from "react";
import { toast } from "@/lib/app-toast";
import { createHotpayTopup } from "@/lib/hotpay-client";

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    Math.round(n * 100) / 100
  );
}

/**
 * Shared React hook for initiating a HotPay topup payment from any client component.
 *
 * Usage:
 *   const { pay, busy } = useHotpayPayment();
 *   // ...
 *   <Button disabled={busy} onClick={() => pay(amount)}>Opłać</Button>
 *
 * On success the hook automatically redirects the browser to the HotPay payment page.
 * On failure it shows a toast error and resets the busy state.
 */
export function useHotpayPayment() {
  const [busy, setBusy] = useState(false);

  async function pay(amountPln: number): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const payment = await createHotpayTopup(amountPln);
      const hasCommission = payment.gross_amount_pln > payment.amount_pln + 0.0001;
      toast.info("Trwa przekierowanie do płatności online…", {
        description: hasCommission
          ? `Operator pobierze ${formatPln(payment.gross_amount_pln)}, a na portfel trafi ${formatPln(payment.amount_pln)}.`
          : `Na portfel trafi ${formatPln(payment.amount_pln)}.`,
      });
      window.setTimeout(() => window.location.assign(payment.url), 500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się rozpocząć płatności");
      setBusy(false);
    }
  }

  return { pay, busy };
}
