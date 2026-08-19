import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVenueWithPitches } from "@/lib/booking";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const venue = await getVenueWithPitches(db, id);
  if (!venue) return NextResponse.json({ error: "Nie znaleziono obiektu" }, { status: 404 });
  return NextResponse.json(venue);
}
