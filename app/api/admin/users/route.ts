import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { ALL_PLAYERS } from "@/lib/constants";

export const runtime = "nodejs";

const postSchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
  role: z.enum(["admin", "player"]),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id, first_name, last_name, player_alias AS zawodnik,
             CASE WHEN is_admin = 1 THEN 'admin' ELSE 'player' END AS role
      FROM users
      ORDER BY first_name
    `)
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Wszystkie pola są wymagane." }, { status: 400 });
  }
  const { first_name, last_name, zawodnik, role } = parsed.data;

  const db = getDb();
  const taken = new Set(
    (db.prepare("SELECT player_alias FROM users").all() as { player_alias: string }[]).map(
      (r) => r.player_alias
    )
  );
  const available = ALL_PLAYERS.filter((p) => !taken.has(p));
  if (!available.includes(zawodnik)) {
    return NextResponse.json(
      { error: "Ten piłkarz jest już zajęty lub nieprawidłowy." },
      { status: 400 }
    );
  }
  const isAdmin = role === "admin" ? 1 : 0;
  try {
    const r = db
      .prepare(
        "INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?, ?, ?, ?)"
      )
      .run(first_name, last_name, zawodnik, isAdmin);
    const userId = Number(r.lastInsertRowid);
    logActivity(
      gate.session.userId,
      `Utworzył konto użytkownika id ${userId}: ${first_name} ${last_name} (${zawodnik}), rola: ${role === "admin" ? "administrator" : "zawodnik"}`
    );
    return NextResponse.json(
      {
        id: userId,
        first_name,
        last_name,
        zawodnik,
        role,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
  }
}
