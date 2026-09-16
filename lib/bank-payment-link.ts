import { blikPhoneToCopy } from "@/lib/app-settings";
import { MATCH_BLIK_PHONE_DISPLAY } from "@/lib/site";

export type BankPaymentDetails = {
  blikPhoneDisplay: string;
  blikPhoneCopy: string;
  amountPln: number | null;
  transferTitle: string;
};

export type PolishBankApp = {
  id: string;
  name: string;
  androidPackage: string;
  iosScheme: string;
};

/**
 * Popularne aplikacje BLIK. Każda ma własny pakiet / schemat —
 * nie używamy wspólnego `blik://`, bo przy wielu bankach Android pokazuje
 * konflikt handlerów, a przy braku aplikacji przeglądarka ląduje na
 * „strona niedostępna”.
 */
export const POLISH_BANK_APPS: PolishBankApp[] = [
  { id: "pko", name: "PKO BP (IKO)", androidPackage: "pl.pkobp.iko", iosScheme: "iko://" },
  { id: "mbank", name: "mBank", androidPackage: "pl.mbank", iosScheme: "mbank://" },
  { id: "pekao", name: "Pekao", androidPackage: "eu.eleader.mobilebanking.pekao", iosScheme: "pekao24://" },
  { id: "ing", name: "ING", androidPackage: "pl.ing.ingmobile", iosScheme: "ingbankmobile://" },
  { id: "santander", name: "Santander", androidPackage: "pl.santander.mobile", iosScheme: "santander://" },
  { id: "millennium", name: "Millennium", androidPackage: "com.finanteq.millennium", iosScheme: "millenet://" },
  { id: "alior", name: "Alior", androidPackage: "pl.aliorbank.aib", iosScheme: "aliorbank://" },
  { id: "ca", name: "Crédit Agricole", androidPackage: "com.creditagricole.mobileca", iosScheme: "camobile://" },
];

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

/** Numer BLIK do wyświetlenia — pusty wpis z ustawień nie zostawia pustego pola. */
export function resolveBlikPhoneDisplay(display: string | null | undefined): string {
  const trimmed = display?.trim() ?? "";
  return trimmed || MATCH_BLIK_PHONE_DISPLAY;
}

/** Cyfry numeru do schowka (np. 514924030) — to wkleja się w banku. */
export function resolveBlikPhoneCopy(display: string | null | undefined): string {
  return blikPhoneToCopy(resolveBlikPhoneDisplay(display));
}

export function buildPaymentDetails(
  blikPhoneDisplay: string,
  balancePln: number | null,
  defaultMatchFeePln: number | null,
  playerLabel: string
): BankPaymentDetails {
  const display = resolveBlikPhoneDisplay(blikPhoneDisplay);
  const blikPhoneCopy = resolveBlikPhoneCopy(display);
  const amountPln = suggestPaymentAmountPln(balancePln, defaultMatchFeePln);
  const transferTitle = `Wpisowe AWP — ${playerLabel}`.trim();

  return {
    blikPhoneDisplay: display,
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
 * WebView / przeglądarka wbudowana w komunikator nie obsługuje `intent://`
 * ani schematów banków — `location.assign` kończy się ERR_UNKNOWN_URL_SCHEME
 * („strona internetowa jest niedostępna”).
 */
export function isInAppBrowserUserAgent(userAgent: string): boolean {
  if (/AWPAndroidApp/i.test(userAgent)) return true;
  if (/; wv\)/i.test(userAgent)) return true;
  if (/WebView/i.test(userAgent)) return true;
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Messenger|Snapchat|Twitter|TikTok|Pinterest/i.test(
    userAgent
  );
}

/** Czy wolno pokazać deep-linki do banków (prawdziwa przeglądarka, gest użytkownika). */
export function canDeepLinkToBankApps(userAgent: string): boolean {
  if (!isMobileUserAgent(userAgent)) return false;
  if (isInAppBrowserUserAgent(userAgent)) return false;
  return true;
}

/**
 * Intent otwierający konkretny pakiet. Fallback to bieżąca strona płatności —
 * nigdy Play Store ani `blik://` (brak aplikacji / wiele handlerów = błąd strony).
 */
export function androidSchemeFromIos(iosScheme: string): string {
  return iosScheme.trim().replace(/:\/\/\s*$/, "").replace(/:\s*$/, "");
}

export function buildAndroidBankIntentHref(
  androidPackage: string,
  iosScheme: string,
  fallbackUrl: string
): string {
  const pkg = androidPackage.trim();
  const scheme = androidSchemeFromIos(iosScheme);
  const fallback = encodeURIComponent(fallbackUrl.trim());
  return `intent://#Intent;scheme=${scheme};package=${pkg};action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`;
}

export function buildBankAppHref(args: {
  bank: PolishBankApp;
  userAgent: string;
  fallbackUrl: string;
}): string | null {
  if (isAndroidUserAgent(args.userAgent)) {
    return buildAndroidBankIntentHref(args.bank.androidPackage, args.bank.iosScheme, args.fallbackUrl);
  }
  if (isIosUserAgent(args.userAgent)) {
    return args.bank.iosScheme;
  }
  return null;
}

/**
 * Otwiera schemat iOS bez `location.assign` — gdy aplikacji nie ma, strona płatności zostaje.
 * Na Androidzie używaj kliknięcia w `<a href="intent:…">` (gest użytkownika).
 */
export function tryOpenIosBankScheme(href: string): void {
  if (typeof document === "undefined" || !href) return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText = "display:none;width:0;height:0;border:0;position:absolute;left:0;top:0";
  iframe.src = href;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 2500);
}
