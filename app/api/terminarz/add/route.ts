import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity, type MatchRow } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { getApiRealm } from "@/lib/request-realm";
import { notifySubscribersAboutNewMatch } from "@/lib/match-notifications";

export const runtime = "nodejs";

const bodySchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  max_slots: z.coerce.number().int().min(1),
  fee_pln: z.union([z.number().nonnegative(), z.null()]).optional(),
  gate_pin: z
    .string()
    .trim()
    .regex(/^[0-9]{4,6}$/, "PIN do bramy musi mieć 4–6 cyfr"),
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
  const { date, time, location, max_slots, gate_pin, fee_pln } = parsed.data;
  const db = await getDb();
  const realm = getApiRealm(req);
  const fee = fee_pln === undefined ? null : fee_pln;

  const existing = (await db
    .prepare(
      `SELECT id FROM matches
       WHERE realm = ? AND match_date = ? AND match_time = ? AND TRIM(location) = TRIM(?)
         AND COALESCE(cancelled, 0) = 0
       LIMIT 1`
    )
    .get(realm, date, time, location)) as { id: number } | undefined;

  if (existing) {
    return NextResponse.json({ status: "ok", id: existing.id, duplicate: true });
  }

  const ins = db.prepare(
    `INSERT INTO matches (match_date, match_time, location, max_slots, signed_up, played, fee_pln, gate_pin, realm)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`
  );
  const r = await ins.run(date, time, location, max_slots, fee, gate_pin, realm);
  const newId = Number(r.lastInsertRowid);
  await logActivity(
    gate.session.userId,
    `Dodał mecz do terminarza id ${newId}: ${date} ${time} (${location}), max. ${max_slots} miejsc${fee != null ? `, wynajem ${fee} zł` : ""}`
  );
  const matchRow = await db.prepare("SELECT * FROM matches WHERE id = ?").get(newId) as MatchRow | undefined;
  if (matchRow) {
    try {
      /** Serverless kończy proces zaraz po odpowiedzi — bez await maile często w ogóle nie wychodzą. */
      await notifySubscribersAboutNewMatch(matchRow);
    } catch (e) {
      console.error("[terminarz/add] notifySubscribersAboutNewMatch:", e);
    }
  }
  return NextResponse.json({ status: "ok", id: newId });
}
