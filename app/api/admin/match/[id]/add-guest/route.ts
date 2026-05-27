import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  player_alias: z.string().min(1).max(100),
});

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

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

  const db = await getDb();

  // Sprawdzić czy mecz istnieje
  const match = await db
    .prepare("SELECT id, match_date, match_time, location, max_slots, signed_up FROM matches WHERE id = ?")
    .get(mid) as { id: number; match_date: string; match_time: string; location: string; max_slots: number; signed_up: number } | undefined;

  if (!match) {
    return NextResponse.json({ error: "Mecz nie został znaleziony" }, { status: 404 });
  }

  // Sprawdzić czy jest miejsce
  if (match.signed_up >= match.max_slots) {
    return NextResponse.json({ error: "Brak wolnych miejsc na ten mecz" }, { status: 400 });
  }

  // Sprawdzić czy taki pseudonim już istnieje
  const existingAlias = await db
    .prepare("SELECT id FROM users WHERE player_alias = ?")
    .get(parsed.data.player_alias);

  if (existingAlias) {
    return NextResponse.json({ error: "Pseudonim już istnieje w systemie" }, { status: 400 });
  }

  // Utworzyć tymczasowego gracza
  const createUser = db.prepare(
    `INSERT INTO users (first_name, last_name, player_alias, is_admin, is_temporary, temporary_guest_match_id)
     VALUES (?, ?, ?, 0, 1, ?)`
  );
  const userResult = await createUser.run(
    parsed.data.first_name,
    parsed.data.last_name,
    parsed.data.player_alias,
    mid
  );
  const userId = Number(userResult.lastInsertRowid);

  // Dodać zapis na mecz
  const signup = db.prepare(
    `INSERT INTO match_signups (user_id, match_id, paid, commitment)
     VALUES (?, ?, 0, 1)`
  );
  await signup.run(userId, mid);

  // Zaktualizować liczbę zapisów na mecz
  await db.prepare("UPDATE matches SET signed_up = signed_up + 1 WHERE id = ?").run(mid);

  // Zalogować akcję
  await logActivity(
    gate.session.userId,
    `Dodał gościnnego piłkarza ${parsed.data.first_name} ${parsed.data.last_name} (${parsed.data.player_alias}) na mecz id ${mid} (${match.match_date} ${match.match_time}, ${match.location})`
  );

  return NextResponse.json({
    ok: true,
    user_id: userId,
    message: "Gościnny piłkarz został dodany"
  });
}

