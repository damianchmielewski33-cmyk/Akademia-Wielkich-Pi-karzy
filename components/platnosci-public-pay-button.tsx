"use client";

import { useState } from "react";
import { PayButton } from "@/components/pay-button";
import { toast } from "@/lib/app-toast";

type Props = {
  token: string;
  userId: number;
  amountPln: number;
  className?: string;
};

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    Math.round(n * 100) / 100
  );
}

/**
 * Przycisk „Zapłać” na publicznym podsumowaniu — tworzy sesję HotPay i przekierowuje do operatora.
 */
export function PlatnosciPublicPayButton({ token, userId, amountPln, className }: Props) {
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/wallet/hotpay/public-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_id: userId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        amount_pln?: number;
        gross_amount_pln?: number;
        error?: unknown;
      };
      if (!res.ok || !data.url) {
        const msg =
          typeof data.error === "string" && data.error
            ? data.error
            : "Nie udało się rozpocząć płatności";
        throw new Error(msg);
      }
      const net = Number(data.amount_pln ?? amountPln);
      const gross = Number(data.gross_amount_pln ?? data.amount_pln ?? amountPln);
      toast.info("Trwa przekierowanie do płatności online…", {
        description:
          gross > net + 0.0001
            ? `Operator pobierze ${formatPln(gross)}, a składka wynosi ${formatPln(net)}.`
            : `Kwota do opłacenia: ${formatPln(net)}.`,
      });
      window.setTimeout(() => window.location.assign(data.url!), 400);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się rozpocząć płatności");
      setBusy(false);
    }
  }

  return (
    <PayButton
      variant="default"
      amountPln={amountPln}
      label="Zapłać online"
      busy={busy}
      onClick={() => void pay()}
      className={className}
    />
  );
}
