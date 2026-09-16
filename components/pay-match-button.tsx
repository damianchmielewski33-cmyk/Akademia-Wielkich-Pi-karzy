"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Loader2, Smartphone } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { ModalAlert } from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";
import {
  buildBankAppHref,
  buildPaymentDetails,
  canDeepLinkToBankApps,
  isIosUserAgent,
  isMobileUserAgent,
  POLISH_BANK_APPS,
  tryOpenIosBankScheme,
  type PolishBankApp,
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
  const value = text.trim();
  if (!value || typeof document === "undefined") return false;

  let syncOk = false;
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.opacity = "0.01";
    ta.style.border = "0";
    ta.style.padding = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    syncOk = document.execCommand("copy");
    document.body.removeChild(ta);
  } catch {
    /* clipboard API below */
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* keep sync result */
  }

  return syncOk;
}

function readUserAgent() {
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

function readFallbackUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ua, setUa] = useState("");

  useEffect(() => {
    setUa(navigator.userAgent);
  }, []);

  const details = useMemo(() => {
    const base = buildPaymentDetails(blikPhoneDisplay, balancePln, defaultMatchFeePln, playerLabel);
    if (amountPln != null && Number.isFinite(amountPln) && amountPln > 0) {
      return { ...base, amountPln };
    }
    return base;
  }, [blikPhoneDisplay, balancePln, defaultMatchFeePln, playerLabel, amountPln]);

  const showBankLinks = canDeepLinkToBankApps(ua);
  const ios = isIosUserAgent(ua);

  async function handlePay() {
    if (busy) return;
    setBusy(true);
    try {
      const clipboardText = details.blikPhoneCopy;
      const didCopy = await copyText(clipboardText);
      setCopied(didCopy);
      await onAfterPay?.();

      toast.success(didCopy ? `Skopiowano numer ${details.blikPhoneDisplay}` : "Przelew BLIK na telefon", {
        description: didCopy
          ? `Wklej ten numer w banku (Przelew BLIK na telefon)${
              details.amountPln != null ? ` · ${formatPln(details.amountPln)}` : ""
            }.`
          : `Skopiuj ręcznie: ${details.blikPhoneDisplay}${
              details.amountPln != null ? ` · ${formatPln(details.amountPln)}` : ""
            }.`,
        duration: 8000,
      });

      if (isMobileUserAgent(readUserAgent())) {
        setPickerOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function bankHref(bank: PolishBankApp) {
    return buildBankAppHref({ bank, userAgent: readUserAgent(), fallbackUrl: readFallbackUrl() });
  }

  function onIosBankClick(href: string) {
    tryOpenIosBankScheme(href);
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

  const picker = (
    <AppModal
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      size="sm"
      scrollable
      title="Przelew BLIK na telefon"
      description={`Numer ${details.blikPhoneDisplay} jest w schowku. Wklej go w banku.`}
      footer={
        <Button type="button" className="rounded-full font-bold" onClick={() => setPickerOpen(false)}>
          Otworzę bank sam
        </Button>
      }
    >
      <ModalAlert tone="info" title={copied ? "Numer skopiowany" : "Numer do przelewu"}>
        <p className="font-bold tabular-nums tracking-wide">{details.blikPhoneDisplay}</p>
        {details.amountPln != null ? (
          <p className="mt-1 font-semibold tabular-nums">{formatPln(details.amountPln)}</p>
        ) : null}
      </ModalAlert>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
        <li>Otwórz aplikację swojego banku.</li>
        <li>Wybierz „Przelew BLIK na telefon”.</li>
        <li>Wklej numer i potwierdź przelew.</li>
        <li>Opłacone pojawi się po potwierdzeniu admina, że pieniądze doszły.</li>
      </ol>

      {showBankLinks ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Otwórz aplikację</p>
          <ul className="grid grid-cols-2 gap-2">
            {POLISH_BANK_APPS.map((bank) => {
              const href = bankHref(bank);
              if (!href) return null;
              const className =
                "inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
              if (ios) {
                return (
                  <li key={bank.id}>
                    <button type="button" className={cn(className, "w-full")} onClick={() => onIosBankClick(href)}>
                      {bank.name}
                    </button>
                  </li>
                );
              }
              return (
                <li key={bank.id}>
                  <a href={href} className={cn(className, "w-full")} rel="noopener noreferrer">
                    {bank.name}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-zinc-500">
            Jeśli banku nie ma na liście albo aplikacja się nie otworzy — nic się nie stanie ze stroną. Otwórz bank
            ręcznie i wklej numer.
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Nie otwieramy banku automatycznie — na tym telefonie mogłoby to zamknąć stronę płatności. Numer masz
          skopiowany.
        </p>
      )}
    </AppModal>
  );

  if (compact) {
    return (
      <div className={cn("flex-1", className)}>
        {payButton}
        {picker}
      </div>
    );
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
        Skopiujemy numer BLIK. Otwórz aplikację banku, wybierz „Przelew BLIK na telefon” i wklej numer.
      </p>
      {picker}
    </div>
  );
}
