import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVenuePartner } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { addPitchPriceRule } from "@/lib/booking";
import { userOwnsPitch } from "@/lib/venue-partners";

export const runtime = "nodejs";

const schema = z.object({
  weekday: z.coerce.number().int().min(0).max(6).nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  price_pln: z.coerce.number().positive().max(10000),
  label: z.string().trim().max(80).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe boisko" }, { status: 400 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowa reguła cennika" }, { status: 400 });

  const db = await getDb();
  if (!(await userOwnsPitch(db, gate.session.userId, id))) {
    return NextResponse.json({ error: "To nie jest Twoje boisko" }, { status: 403 });
  }
  const ruleId = await addPitchPriceRule(db, {
    pitchId: id,
    weekday: parsed.data.weekday ?? null,
    startTime: parsed.data.start_time ?? null,
    endTime: parsed.data.end_time ?? null,
    pricePln: parsed.data.price_pln,
    label: parsed.data.label,
  });
  await logActivity(gate.session.userId, `Partner dodał cennik boiska #${id}`);
  return NextResponse.json({ id: ruleId });
}
