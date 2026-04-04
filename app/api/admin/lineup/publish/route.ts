import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  match_id: z.coerce.number().int().positive(),
  published: z.boolean(),
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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
  const { match_id, published } = parsed.data;

  const db = getDb();
  const today = todayIso();

  const match = db
    .prepare(
      `SELECT id, match_date, match_time, location FROM matches
       WHERE id = ? AND played = 0 AND match_date >= ?`
    )
    .get(match_id, today) as { id: number; match_date: string; match_time: string; location: string } | undefined;

  if (!match) {
    return NextResponse.json({ error: "Mecz niedostępny" }, { status: 400 });
  }

  db.prepare("UPDATE matches SET lineup_public = ? WHERE id = ?").run(published ? 1 : 0, match_id);

  logActivity(
    gate.session.userId,
    published
      ? `Udostępniono składy na stronie głównej: mecz ${match.match_date} ${match.match_time}, id ${match_id}`
      : `Ukryto składy na stronie głównej: mecz ${match.match_date} ${match.match_time}, id ${match_id}`
  );

  return NextResponse.json({ status: "ok", lineup_public: published ? 1 : 0 });
}
