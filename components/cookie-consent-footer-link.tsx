"use client";

import { useCookieConsent } from "@/components/adsense-provider";

/** Link w stopce — resetuje zgodę i pokazuje baner cookies. */
export function CookieConsentFooterLink() {
  const { resetConsent } = useCookieConsent();
  return (
    <button
      type="button"
      onClick={resetConsent}
      className="font-medium underline-offset-2 hover:underline"
    >
      Zmień zgodę cookies
    </button>
  );
}
