import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireBookingMarketplace } from "@/lib/booking-marketplace";
import { listVenueCards } from "@/lib/booking";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const marketplace = await requireBookingMarketplace();
  if (!marketplace.ok) return marketplace.response;
  const url = new URL(req.url);
  const indoorRaw = url.searchParams.get("indoor");
  const maxPriceRaw = url.searchParams.get("max_price");
  const db = await getDb();
  const venues = await listVenueCards(db, {
    city: url.searchParams.get("city"),
    query: url.searchParams.get("q"),
    surface: url.searchParams.get("surface"),
    indoor: indoorRaw === "1" ? true : indoorRaw === "0" ? false : null,
    maxPrice: maxPriceRaw ? Number(maxPriceRaw) : null,
    date: url.searchParams.get("date"),
    time: url.searchParams.get("time"),
  });
  return NextResponse.json({ venues });
}
