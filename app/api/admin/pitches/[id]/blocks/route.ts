import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { addPitchBlock } from "@/lib/booking";

export const runtime = "nodejs";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe boisko" }, { status: 400 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowa blokada" }, { status: 400 });

  const db = await getDb();
  const blockId = await addPitchBlock(db, {
    pitchId: id,
    date: parsed.data.date,
    startTime: parsed.data.start_time,
    endTime: parsed.data.end_time,
    reason: parsed.data.reason,
  });
  await logActivity(gate.session.userId, `Dodał blokadę boiska #${id} na ${parsed.data.date}`);
  return NextResponse.json({ id: blockId });
}
