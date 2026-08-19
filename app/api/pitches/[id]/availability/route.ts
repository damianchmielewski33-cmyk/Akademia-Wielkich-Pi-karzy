import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAvailabilitySlots } from "@/lib/booking";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pitchId = Number(id);
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!Number.isInteger(pitchId) || pitchId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Nieprawidłowe parametry dostępności" }, { status: 400 });
  }

  const db = await getDb();
  const availability = await getAvailabilitySlots(db, pitchId, date);
  if (!availability) return NextResponse.json({ error: "Nie znaleziono boiska" }, { status: 404 });
  return NextResponse.json(availability);
}
