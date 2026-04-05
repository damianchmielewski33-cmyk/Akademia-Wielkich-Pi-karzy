import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  match_id: z.coerce.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  max_slots: z.coerce.number().int().min(1),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const db = getDb();
  db.prepare(
    "UPDATE matches SET match_date = ?, match_time = ?, location = ?, max_slots = ? WHERE id = ?"
  ).run(d.date, d.time, d.location, d.max_slots, d.match_id);
  logActivity(
    gate.session.userId,
    `Edytował mecz w terminarzu id ${d.match_id}: ${d.date} ${d.time} (${d.location}), max. ${d.max_slots} miejsc`
  );
  return NextResponse.json({ status: "ok" });
}
