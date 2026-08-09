"use client";

import { useState } from "react";
import { toast } from "@/lib/app-toast";
import { createHotpayTopup } from "@/lib/hotpay-client";

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
      const url = await createHotpayTopup(amountPln);
      toast.info("Trwa przekierowanie do płatności…");
      window.setTimeout(() => window.location.assign(url), 400);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się rozpocząć płatności");
      setBusy(false);
    }
  }

  return { pay, busy };
}
