import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { ALL_PLAYERS } from "@/lib/constants";

export const runtime = "nodejs";

const bodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Wszystkie pola są wymagane." }, { status: 400 });
  }
  const { first_name, last_name, zawodnik } = parsed.data;

  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  const isAdmin = count === 0 ? 1 : 0;

  const taken = new Set(
    (db.prepare("SELECT player_alias FROM users").all() as { player_alias: string }[]).map((r) => r.player_alias)
  );
  const available = ALL_PLAYERS.filter((p) => !taken.has(p));
  if (!available.includes(zawodnik)) {
    return NextResponse.json(
      { error: "Ten piłkarz jest już zajęty lub nieprawidłowy." },
      { status: 400 }
    );
  }

  try {
    const r = db
      .prepare(
        "INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?, ?, ?, ?)"
      )
      .run(first_name, last_name, zawodnik, isAdmin);
    logActivity(Number(r.lastInsertRowid), "Utworzył konto");
  } catch {
    return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
