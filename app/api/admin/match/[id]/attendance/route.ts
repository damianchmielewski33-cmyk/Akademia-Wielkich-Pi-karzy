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
  const match = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = (await db
    .prepare("SELECT user_id, present FROM match_attendance WHERE match_id = ?")
    .all(mid)) as { user_id: number; present: number }[];

  const presentUserIds = rows.filter((r) => Number(r.present) === 1).map((r) => Number(r.user_id));
  return NextResponse.json({ present_user_ids: presentUserIds });
}

const postSchema = z.object({
  present_user_ids: z.array(z.coerce.number().int().positive()).max(60),
});

export async function POST(req: Request, context: RouteContext) {
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
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ids = Array.from(new Set(parsed.data.present_user_ids.map((x) => Number(x)))).filter((n) =>
    Number.isFinite(n)
  );

  // Zapis "stanem docelowym": czyścimy i zapisujemy tylko obecnych.
  await db.prepare("DELETE FROM match_attendance WHERE match_id = ?").run(mid);
  for (const uid of ids) {
    await db
      .prepare(
        `INSERT INTO match_attendance (match_id, user_id, present, marked_by_admin_id)
         VALUES (?, ?, 1, ?)`
      )
      .run(mid, uid, gate.session.userId);
  }

  logActivity(
    gate.session.userId,
    `Zaktualizował obecność na meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid} — obecnych: ${ids.length}`
  );

  return NextResponse.json({ ok: true, present_count: ids.length });
}
