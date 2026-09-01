import { NextResponse } from "next/server";

export const BOOKING_MARKETPLACE_DISABLED_MESSAGE =
  "Rezerwacja boisk jest chwilowo wyłączona. Działa akademia dla grupy znajomych.";

export async function isBookingMarketplaceEnabled(): Promise<boolean> {
  return true;
}

export async function requireBookingMarketplace(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  return { ok: true as const };
}

export async function redirectIfBookingMarketplaceDisabled() {
  /* V2-only — no redirect */
}
