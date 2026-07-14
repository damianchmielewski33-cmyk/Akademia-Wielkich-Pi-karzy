"use client";

import { useMemo, useState } from "react";
import { Banknote, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildMobileBankAppHref,
  buildPaymentClipboardText,
  buildPaymentDetails,
  isMobileUserAgent,
} from "@/lib/bank-payment-link";

type Props = {
  blikPhoneDisplay: string;
  defaultMatchFeePln: number | null;
  balancePln: number | null;
  playerLabel: string;
  className?: string;
};

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function PayMatchButton({
  blikPhoneDisplay,
  defaultMatchFeePln,
  balancePln,
  playerLabel,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  const details = useMemo(
    () => buildPaymentDetails(blikPhoneDisplay, balancePln, defaultMatchFeePln, playerLabel),
    [blikPhoneDisplay, balancePln, defaultMatchFeePln, playerLabel]
  );

  async function handlePay() {
    if (busy) return;
    setBusy(true);
    try {
      const clipboardText = buildPaymentClipboardText(details);
      const copied = await copyText(clipboardText);
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const bankHref = buildMobileBankAppHref(ua);
      const mobile = isMobileUserAgent(ua);

      if (mobile && bankHref) {
        window.location.assign(bankHref);
        toast.success("Otwieranie aplikacji banku…", {
          description: copied
            ? "Dane płatności skopiowano do schowka. W banku wybierz: Przelew BLIK na telefon."
            : `Numer: ${details.blikPhoneDisplay}. W banku wybierz: Przelew BLIK na telefon.`,
          duration: 8000,
        });
        return;
      }

      if (copied) {
        toast.success("Dane płatności skopiowano", {
          description: `Przelej BLIK na telefon ${details.blikPhoneDisplay}${
            details.amountPln != null ? ` — ${formatPln(details.amountPln)}` : ""
          }.`,
          duration: 8000,
        });
      } else {
        toast.message("Przelew BLIK na telefon", {
          description: `Numer: ${details.blikPhoneDisplay}${
            details.amountPln != null ? ` · kwota: ${formatPln(details.amountPln)}` : ""
          }.`,
          duration: 8000,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-200/90 via-amber-300/95 to-yellow-400/90 p-4 shadow-lg shadow-amber-950/20 dark:border-amber-500/35 dark:from-amber-900/50 dark:via-amber-800/55 dark:to-yellow-700/45 dark:shadow-black/30 sm:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-950/75 dark:text-amber-100/80">
            Wpisowe za mecz
          </p>
          <p className="mt-1 text-sm font-medium text-amber-950/90 dark:text-amber-50">
            Przelew BLIK na telefon{" "}
            <span className="font-bold tabular-nums">{details.blikPhoneDisplay}</span>
          </p>
          {details.amountPln != null ? (
            <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-950 dark:text-amber-50">
              {formatPln(details.amountPln)}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-amber-950/80 dark:text-amber-100/85">
              Kwotę ustal z saldem portfela lub wpisowym meczu.
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="gold"
          disabled={busy}
          onClick={() => void handlePay()}
          className={cn(
            "h-auto min-h-14 w-full shrink-0 px-6 py-3.5 text-base font-bold shadow-lg shadow-amber-950/25 ring-2 ring-amber-500/40 hover:ring-amber-400/60 sm:w-auto sm:min-w-[15rem]",
            "bg-[var(--mundial-gold,#f5c518)] text-[var(--mundial-navy,#1a2d5a)] hover:bg-amber-200"
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Banknote className="h-5 w-5" aria-hidden />
          )}
          Zapłać za mecz
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-left text-xs leading-relaxed text-amber-950/75 dark:text-amber-100/80">
        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Na telefonie otworzy się aplikacja banku. Wybierz „Przelew BLIK na telefon”, wklej numer i potwierdź
        przelew.
      </p>
    </div>
  );
}
