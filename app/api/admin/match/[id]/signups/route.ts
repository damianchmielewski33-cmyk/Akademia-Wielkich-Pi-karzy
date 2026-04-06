import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = await getDb();
  const exists = await db.prepare("SELECT 1 FROM matches WHERE id = ?").get(mid);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signups = await db
    .prepare(
      `SELECT ms.user_id AS user_id, ms.paid,
              u.first_name AS first_name, u.last_name AS last_name,
              u.player_alias AS zawodnik, u.profile_photo_path AS profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ?
       ORDER BY u.first_name, u.last_name`
    )
    .all(mid);

  return NextResponse.json({ signups });
}

const patchSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  paid: z.boolean(),
});

export async function PATCH(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signup = await db
    .prepare("SELECT id FROM match_signups WHERE match_id = ? AND user_id = ?")
    .get(mid, parsed.data.user_id) as { id: number } | undefined;
  if (!signup) {
    return NextResponse.json({ error: "Brak zapisu dla tego zawodnika" }, { status: 404 });
  }

  const paid = parsed.data.paid ? 1 : 0;
  await db.prepare("UPDATE match_signups SET paid = ? WHERE match_id = ? AND user_id = ?").run(
    paid,
    mid,
    parsed.data.user_id
  );

  const who = await db
    .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
    .get(parsed.data.user_id) as { first_name: string; last_name: string } | undefined;

  logActivity(
    gate.session.userId,
    `${paid ? "Oznaczył opłatę" : "Cofnął oznaczenie opłaty"} dla ${who?.first_name ?? "?"} ${who?.last_name ?? "?"} — mecz ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
  );

  return NextResponse.json({ status: "ok", paid });
}
