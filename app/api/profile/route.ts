import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { getServerSession, createSessionToken, setSessionCookie } from "@/lib/auth";
import { ALL_PLAYERS } from "@/lib/constants";
import { getProfileDashboard, getAvailablePlayerAliases } from "@/lib/profile-data";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    first_name: z.string().min(1).trim().optional(),
    last_name: z.string().min(1).trim().optional(),
    zawodnik: z.string().min(1).trim().optional(),
  })
  .refine((d) => d.first_name !== undefined || d.last_name !== undefined || d.zawodnik !== undefined, {
    message: "Brak pól do aktualizacji.",
  });

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
  const data = getProfileDashboard(session.userId);
  if (!data) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
    .get(session.userId) as
    | { first_name: string; last_name: string; player_alias: string }
    | undefined;
  if (!row) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });

  const nextFirst = parsed.data.first_name ?? row.first_name;
  const nextLast = parsed.data.last_name ?? row.last_name;
  let nextAlias = parsed.data.zawodnik ?? row.player_alias;

  if (parsed.data.zawodnik !== undefined) {
    if (!ALL_PLAYERS.includes(nextAlias)) {
      return NextResponse.json({ error: "Nieprawidłowy wybór piłkarza." }, { status: 400 });
    }
    const available = new Set(getAvailablePlayerAliases(session.userId));
    if (!available.has(nextAlias)) {
      return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
    }
  } else {
    nextAlias = row.player_alias;
  }

  try {
    db.prepare("UPDATE users SET first_name = ?, last_name = ?, player_alias = ? WHERE id = ?").run(
      nextFirst,
      nextLast,
      nextAlias,
      session.userId
    );
  } catch {
    return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
  }

  logActivity(
    session.userId,
    `Zaktualizował profil (imię/nazwisko/awatar z listy): ${nextFirst} ${nextLast} (${nextAlias})`
  );

  const token = await createSessionToken({
    userId: session.userId,
    isAdmin: session.isAdmin,
    firstName: nextFirst,
    lastName: nextLast,
    zawodnik: nextAlias,
  });
  await setSessionCookie(token);

  const data = getProfileDashboard(session.userId);
  return NextResponse.json({ ok: true, ...data });
}
