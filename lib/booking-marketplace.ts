import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export const BOOKING_MARKETPLACE_DISABLED_MESSAGE =
  "Rezerwacja boisk jest chwilowo wyłączona. Działa akademia dla grupy znajomych.";

export async function isBookingMarketplaceEnabled(): Promise<boolean> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return settings.booking_marketplace_enabled === true;
}

export async function requireBookingMarketplace() {
  if (await isBookingMarketplaceEnabled()) return { ok: true as const };
  return {
    ok: false as const,
    response: NextResponse.json({ error: BOOKING_MARKETPLACE_DISABLED_MESSAGE }, { status: 404 }),
  };
}

export async function redirectIfBookingMarketplaceDisabled() {
  if (await isBookingMarketplaceEnabled()) return;
  redirect("/");
}
