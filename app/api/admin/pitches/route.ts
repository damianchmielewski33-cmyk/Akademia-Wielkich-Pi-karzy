import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { addPitchPriceRule, listAdminPitches } from "@/lib/booking";

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

export async function GET(req: Request) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const venueIdRaw = new URL(req.url).searchParams.get("venue_id");
  const venueId = venueIdRaw ? Number(venueIdRaw) : undefined;
  const db = await getDb();
  const pitches = await listAdminPitches(db, Number.isInteger(venueId) ? venueId : undefined);
  return NextResponse.json({ pitches });
}

export async function POST(req: Request) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const parsed = pitchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane boiska" }, { status: 400 });

  const db = await getDb();
  const result = await db.transaction?.(async (tx) => {
    const inserted = await tx
      .prepare(
        `INSERT INTO pitches
          (venue_id, name, surface, players, indoor, lighting, amenities, base_price_pln, slot_minutes, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parsed.data.venue_id,
        parsed.data.name,
        parsed.data.surface,
        parsed.data.players,
        parsed.data.indoor ? 1 : 0,
        parsed.data.lighting === false ? 0 : 1,
        parsed.data.amenities || null,
        parsed.data.base_price_pln,
        parsed.data.slot_minutes,
        parsed.data.active === false ? 0 : 1
      );
    const pitchId = Number(inserted.lastInsertRowid);
    for (let weekday = 0; weekday <= 6; weekday++) {
      await tx
        .prepare(
          `INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(pitchId, weekday, parsed.data.opens_at, parsed.data.closes_at);
    }
    if (parsed.data.weekend_price_pln) {
      await addPitchPriceRule(tx, {
        pitchId,
        weekday: 0,
        pricePln: parsed.data.weekend_price_pln,
        label: "Weekend",
      });
      await addPitchPriceRule(tx, {
        pitchId,
        weekday: 6,
        pricePln: parsed.data.weekend_price_pln,
        label: "Weekend",
      });
    }
    if (parsed.data.peak_price_pln && parsed.data.peak_start && parsed.data.peak_end) {
      await addPitchPriceRule(tx, {
        pitchId,
        startTime: parsed.data.peak_start,
        endTime: parsed.data.peak_end,
        pricePln: parsed.data.peak_price_pln,
        label: "Szczyt",
      });
    }
    return { id: pitchId };
  });
  if (!result) return NextResponse.json({ error: "Baza nie obsługuje transakcji" }, { status: 500 });
  await logActivity(gate.session.userId, `Dodał boisko rezerwacji #${result.id}: ${parsed.data.name}`);
  return NextResponse.json(result);
}
