import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createVenuePayout, getAdminSettlementOverview } from "@/lib/venue-settlements";

export const runtime = "nodejs";

const createSchema = z.object({
  venue_id: z.coerce.number().int().positive(),
  note: z.string().trim().max(400).optional(),
});

export async function GET() {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const db = await getDb();
  return NextResponse.json(await getAdminSettlementOverview(db));
}

export async function POST(req: Request) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane wypłaty" }, { status: 400 });

  const db = await getDb();
  const result = await createVenuePayout(db, {
    venueId: parsed.data.venue_id,
    adminUserId: gate.session.userId,
    note: parsed.data.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await logActivity(
    gate.session.userId,
    `Zamknął wypłatę #${result.payout.id} dla obiektu #${parsed.data.venue_id}: ${result.payout.owner_payout_pln.toFixed(2)} zł`
  );
  return NextResponse.json({ payout: result.payout });
}
