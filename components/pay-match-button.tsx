"use client";

import { useMemo, useState } from "react";
import { Banknote, Loader2, Smartphone } from "lucide-react";
import { toast } from "@/lib/app-toast";
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
  /** Gdy podane, ta kwota idzie do schowka zamiast sugerowanej z salda. */
  amountPln?: number | null;
  compact?: boolean;
  onAfterPay?: () => void | Promise<void>;
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
  amountPln,
  compact,
  onAfterPay,
}: Props) {
  const [busy, setBusy] = useState(false);

  const details = useMemo(() => {
    const base = buildPaymentDetails(blikPhoneDisplay, balancePln, defaultMatchFeePln, playerLabel);
    if (amountPln != null && Number.isFinite(amountPln) && amountPln > 0) {
      return { ...base, amountPln };
    }
    return base;
  }, [blikPhoneDisplay, balancePln, defaultMatchFeePln, playerLabel, amountPln]);

  async function handlePay() {
    if (busy) return;
    setBusy(true);
    try {
      const clipboardText = compact ? details.blikPhoneCopy : buildPaymentClipboardText(details);
      const copied = await copyText(clipboardText);
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const bankHref = buildMobileBankAppHref(ua);
      const mobile = isMobileUserAgent(ua);

      if (mobile && bankHref) {
        await onAfterPay?.();
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
      await onAfterPay?.();
    } finally {
      setBusy(false);
    }
  }

  const payButton = (
    <Button
      type="button"
      disabled={busy}
      onClick={() => void handlePay()}
      className={cn(
        compact
          ? "h-auto min-h-12 w-full flex-1 rounded-full font-bold"
          : cn(
              "h-auto min-h-14 w-full shrink-0 rounded-full px-6 py-3.5 text-base font-bold shadow-lg shadow-teal-950/20 ring-2 ring-[var(--mp-teal)]/30 hover:ring-[var(--mp-teal)]/50 sm:w-auto sm:min-w-[15rem]",
              "bg-[var(--mp-teal)] text-white hover:bg-[var(--mp-teal-dark)]"
            )
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : compact ? (
        <Smartphone className="h-4 w-4" aria-hidden />
      ) : (
        <Banknote className="h-5 w-5" aria-hidden />
      )}
      {compact ? "Zapłać przelewem na telefon" : "Zapłać za mecz"}
    </Button>
  );

  if (compact) {
    return <div className={cn("flex-1", className)}>{payButton}</div>;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-teal-50/80 p-4 shadow-lg shadow-teal-950/10 dark:border-teal-900/50 dark:from-teal-950/40 dark:via-zinc-950 dark:to-teal-950/30 dark:shadow-black/30 sm:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)] dark:text-teal-200">
            Wpisowe za mecz
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Przelew BLIK na telefon{" "}
            <span className="font-bold tabular-nums">{details.blikPhoneDisplay}</span>
          </p>
          {details.amountPln != null ? (
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--mp-teal-dark)] dark:text-teal-100">
              {formatPln(details.amountPln)}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              Kwotę ustal z saldem portfela lub wpisowym meczu.
            </p>
          )}
        </div>

        {payButton}
      </div>

      <p className="mt-3 flex items-start gap-2 text-left text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Na telefonie otworzy się aplikacja banku. Wybierz „Przelew BLIK na telefon”, wklej numer i potwierdź
        przelew.
      </p>
    </div>
  );
}
