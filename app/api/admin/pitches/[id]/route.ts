import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  surface: z.string().trim().min(2).max(80).optional(),
  players: z.coerce.number().int().min(2).max(30).optional(),
  indoor: z.coerce.boolean().optional(),
  lighting: z.coerce.boolean().optional(),
  amenities: z.string().trim().max(500).optional(),
  base_price_pln: z.coerce.number().positive().max(10000).optional(),
  slot_minutes: z.coerce.number().int().min(30).max(180).optional(),
  opens_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closes_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  active: z.coerce.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe boisko" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane boiska" }, { status: 400 });

  const db = await getDb();
  await db
    .prepare(
      `UPDATE pitches
       SET name = COALESCE(?, name),
           surface = COALESCE(?, surface),
           players = COALESCE(?, players),
           indoor = COALESCE(?, indoor),
           lighting = COALESCE(?, lighting),
           amenities = COALESCE(?, amenities),
           base_price_pln = COALESCE(?, base_price_pln),
           slot_minutes = COALESCE(?, slot_minutes),
           active = COALESCE(?, active),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      parsed.data.name ?? null,
      parsed.data.surface ?? null,
      parsed.data.players ?? null,
      parsed.data.indoor == null ? null : parsed.data.indoor ? 1 : 0,
      parsed.data.lighting == null ? null : parsed.data.lighting ? 1 : 0,
      parsed.data.amenities ?? null,
      parsed.data.base_price_pln ?? null,
      parsed.data.slot_minutes ?? null,
      parsed.data.active == null ? null : parsed.data.active ? 1 : 0,
      id
    );

  if (parsed.data.opens_at && parsed.data.closes_at) {
    for (let weekday = 0; weekday <= 6; weekday++) {
      await db
        .prepare(
          `INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(pitch_id, weekday) DO UPDATE SET opens_at = excluded.opens_at, closes_at = excluded.closes_at`
        )
        .run(id, weekday, parsed.data.opens_at, parsed.data.closes_at);
    }
  }

  await logActivity(gate.session.userId, `Zaktualizował boisko rezerwacji #${id}`);
  return NextResponse.json({ ok: true });
}
