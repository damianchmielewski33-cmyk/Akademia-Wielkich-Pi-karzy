import { NextResponse } from "next/server";
import { requireVenuePartner } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { listVenueCards } from "@/lib/booking";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const venues = await listVenueCards(db, {
    includeUnpublished: true,
    ownerUserId: gate.session.userId,
  });
  return NextResponse.json({ ok: true, venues });
}
