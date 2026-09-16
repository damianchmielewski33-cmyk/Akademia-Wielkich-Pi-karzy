import { describe, expect, it } from "vitest";
import {
  buildAndroidBankIntentHref,
  buildBankAppHref,
  canDeepLinkToBankApps,
  isInAppBrowserUserAgent,
  POLISH_BANK_APPS,
} from "@/lib/bank-payment-link";

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_WEBVIEW =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36";
const WHATSAPP_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 WhatsApp/2.24.20.0";
const AWP_APP = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 AWPAndroidApp/1.10.3 Chrome/128.0.0.0";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36";

describe("bank payment deep links", () => {
  it("nie używa wspólnego schematu blik ani twardego mBank jako jedynej opcji", () => {
    expect(POLISH_BANK_APPS.length).toBeGreaterThan(3);
    expect(POLISH_BANK_APPS.some((b) => b.id === "pko")).toBe(true);
    expect(POLISH_BANK_APPS.some((b) => b.id === "mbank")).toBe(true);
    const href = buildAndroidBankIntentHref("pl.pkobp.iko", "iko://", "https://awp.test/platnosci");
    expect(href).not.toContain("blik");
    expect(href).toContain("scheme=iko");
    expect(href).toContain("package=pl.pkobp.iko");
    expect(href).toContain("S.browser_fallback_url=");
    expect(href).toContain(encodeURIComponent("https://awp.test/platnosci"));
  });

  it("na Androidzie buduje intent konkretnego pakietu z fallbackiem do strony płatności", () => {
    const bank = POLISH_BANK_APPS.find((b) => b.id === "ing")!;
    const href = buildBankAppHref({
      bank,
      userAgent: CHROME_ANDROID,
      fallbackUrl: "https://awp.test/p",
    });
    expect(href).toBe(buildAndroidBankIntentHref("pl.ing.ingmobile", "ingbankmobile://", "https://awp.test/p"));
  });

  it("na iOS zwraca schemat wybranego banku, nie zawsze mbank://", () => {
    const pko = POLISH_BANK_APPS.find((b) => b.id === "pko")!;
    expect(
      buildBankAppHref({ bank: pko, userAgent: SAFARI_IOS, fallbackUrl: "https://awp.test/p" })
    ).toBe("iko://");
  });

  it("na desktopie nie buduje deep-linku", () => {
    const bank = POLISH_BANK_APPS[0]!;
    expect(buildBankAppHref({ bank, userAgent: DESKTOP, fallbackUrl: "https://awp.test/p" })).toBeNull();
  });

  it("wyłącza deep-link w WebView, WhatsApp i aplikacji AWP", () => {
    expect(isInAppBrowserUserAgent(ANDROID_WEBVIEW)).toBe(true);
    expect(isInAppBrowserUserAgent(WHATSAPP_ANDROID)).toBe(true);
    expect(isInAppBrowserUserAgent(AWP_APP)).toBe(true);
    expect(isInAppBrowserUserAgent(CHROME_ANDROID)).toBe(false);
    expect(canDeepLinkToBankApps(CHROME_ANDROID)).toBe(true);
    expect(canDeepLinkToBankApps(SAFARI_IOS)).toBe(true);
    expect(canDeepLinkToBankApps(ANDROID_WEBVIEW)).toBe(false);
    expect(canDeepLinkToBankApps(WHATSAPP_ANDROID)).toBe(false);
    expect(canDeepLinkToBankApps(AWP_APP)).toBe(false);
    expect(canDeepLinkToBankApps(DESKTOP)).toBe(false);
  });
});
