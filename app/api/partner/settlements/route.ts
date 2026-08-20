import { NextResponse } from "next/server";
import { requireVenuePartner } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { getPartnerSettlement } from "@/lib/venue-settlements";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const data = await getPartnerSettlement(db, gate.session.userId);
  return NextResponse.json(data);
}
