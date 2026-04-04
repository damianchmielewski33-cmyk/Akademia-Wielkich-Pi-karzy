import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
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
  const { date, time, location, max_slots } = parsed.data;
  const db = getDb();
  db.prepare(
    `INSERT INTO matches (match_date, match_time, location, max_slots, signed_up, played)
     VALUES (?, ?, ?, ?, 0, 0)`
  ).run(date, time, location, max_slots);
  return NextResponse.json({ status: "ok" });
}
