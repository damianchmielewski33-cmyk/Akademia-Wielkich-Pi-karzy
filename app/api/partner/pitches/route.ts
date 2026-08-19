import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVenuePartner } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createPitchWithSchedule, listAdminPitches } from "@/lib/booking";
import { userOwnsVenue } from "@/lib/venue-partners";

export const runtime = "nodejs";

const pitchSchema = z.object({
  venue_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  surface: z.string().trim().min(2).max(80),
  players: z.coerce.number().int().min(2).max(30),
  indoor: z.coerce.boolean().optional(),
  lighting: z.coerce.boolean().optional(),
  amenities: z.string().trim().max(500).optional(),
  base_price_pln: z.coerce.number().positive().max(10000),
  slot_minutes: z.coerce.number().int().min(30).max(180),
  opens_at: z.string().regex(/^\d{2}:\d{2}$/),
  closes_at: z.string().regex(/^\d{2}:\d{2}$/),
  weekend_price_pln: z.coerce.number().positive().max(10000).optional(),
  peak_price_pln: z.coerce.number().positive().max(10000).optional(),
  peak_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  peak_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  active: z.coerce.boolean().optional(),
});

export async function GET() {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const pitches = await listAdminPitches(db, undefined, gate.session.userId);
  return NextResponse.json({ pitches });
}

export async function POST(req: Request) {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const parsed = pitchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane boiska" }, { status: 400 });

  const db = await getDb();
  if (!(await userOwnsVenue(db, gate.session.userId, parsed.data.venue_id))) {
    return NextResponse.json({ error: "To nie jest Twój obiekt" }, { status: 403 });
  }

  const result = await createPitchWithSchedule(db, {
    venueId: parsed.data.venue_id,
    name: parsed.data.name,
    surface: parsed.data.surface,
    players: parsed.data.players,
    indoor: parsed.data.indoor,
    lighting: parsed.data.lighting,
    amenities: parsed.data.amenities,
    basePricePln: parsed.data.base_price_pln,
    slotMinutes: parsed.data.slot_minutes,
    opensAt: parsed.data.opens_at,
    closesAt: parsed.data.closes_at,
    weekendPricePln: parsed.data.weekend_price_pln,
    peakPricePln: parsed.data.peak_price_pln,
    peakStart: parsed.data.peak_start,
    peakEnd: parsed.data.peak_end,
    active: parsed.data.active,
  });
  await logActivity(gate.session.userId, `Partner dodał boisko #${result.id}: ${parsed.data.name}`);
  return NextResponse.json(result);
}
