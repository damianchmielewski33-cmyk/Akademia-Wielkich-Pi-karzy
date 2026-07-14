import { blikPhoneToCopy } from "@/lib/app-settings";

export type BankPaymentDetails = {
  blikPhoneDisplay: string;
  blikPhoneCopy: string;
  amountPln: number | null;
  transferTitle: string;
};

/** Kwota do wpłaty: niedopłata z portfela lub domyślne wpisowe z ustawień. */
export function suggestPaymentAmountPln(
  balancePln: number | null,
  defaultMatchFeePln: number | null
): number | null {
  if (balancePln != null && Number.isFinite(balancePln) && balancePln < 0) {
    return Math.round(Math.abs(balancePln) * 100) / 100;
  }
  if (defaultMatchFeePln != null && Number.isFinite(defaultMatchFeePln) && defaultMatchFeePln > 0) {
    return defaultMatchFeePln;
  }
  return null;
}

export function buildPaymentDetails(
  blikPhoneDisplay: string,
  balancePln: number | null,
  defaultMatchFeePln: number | null,
  playerLabel: string
): BankPaymentDetails {
  const blikPhoneCopy = blikPhoneToCopy(blikPhoneDisplay);
  const amountPln = suggestPaymentAmountPln(balancePln, defaultMatchFeePln);
  const transferTitle = `Wpisowe AWP — ${playerLabel}`.trim();

  return {
    blikPhoneDisplay,
    blikPhoneCopy,
    amountPln,
    transferTitle,
  };
}

export function buildPaymentClipboardText(details: BankPaymentDetails): string {
  const lines = [
    "Przelew BLIK na telefon — Akademia Wielkich Piłkarzy",
    `Numer telefonu: ${details.blikPhoneDisplay}`,
  ];
  if (details.amountPln != null) {
    lines.push(`Kwota: ${details.amountPln.toFixed(2).replace(".", ",")} PLN`);
  }
  lines.push(`Tytuł: ${details.transferTitle}`);
  return lines.join("\n");
}

export function isMobileUserAgent(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

export function isIosUserAgent(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * Próba otwarcia aplikacji bankowej (Android intent / iOS URL scheme).
 * Nie ma publicznego API BLIK P2P — otwieramy popularne aplikacje banków w Polsce.
 */
export function buildMobileBankAppHref(userAgent: string): string | null {
  if (isAndroidUserAgent(userAgent)) {
    const fallback = encodeURIComponent("https://play.google.com/store/search?q=bank&c=apps");
    return `intent://blik#Intent;scheme=blik;package=pl.mbank;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`;
  }
  if (isIosUserAgent(userAgent)) {
    return "mbank://";
  }
  return null;
}
