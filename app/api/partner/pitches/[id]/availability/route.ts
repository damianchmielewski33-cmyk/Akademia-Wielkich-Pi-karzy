import { NextResponse } from "next/server";
import { requireVenuePartner } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { getAvailabilitySlots } from "@/lib/booking";
import { userOwnsPitch } from "@/lib/venue-partners";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;

  const pitchId = Number((await params).id);
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!Number.isInteger(pitchId) || pitchId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Nieprawidłowe parametry dostępności" }, { status: 400 });
  }

  const db = await getDb();
  if (!(await userOwnsPitch(db, gate.session.userId, pitchId))) {
    return NextResponse.json({ error: "To nie jest Twoje boisko" }, { status: 403 });
  }

  const availability = await getAvailabilitySlots(db, pitchId, date, { allowUnpublished: true });
  if (!availability) return NextResponse.json({ error: "Nie znaleziono boiska" }, { status: 404 });
  return NextResponse.json(availability);
}
