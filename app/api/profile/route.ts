import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { requireUser } from "@/lib/api-helpers";
import { getProfileDashboard, getAvailablePlayerAliases } from "@/lib/profile-data";
import { resolveCanonicalPlayerAlias } from "@/lib/player-alias";
import { isUniqueConstraintError } from "@/lib/sql-errors";

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
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const session = gate.session;
  const data = await getProfileDashboard(session.userId);
  if (!data) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const session = gate.session;

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

  const db = await getDb();
  const row = (await db
    .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
    .get(session.userId)) as
    | { first_name: string; last_name: string; player_alias: string }
    | undefined;
  if (!row) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });

  const nextFirst = parsed.data.first_name ?? row.first_name;
  const nextLast = parsed.data.last_name ?? row.last_name;
  let nextAlias = parsed.data.zawodnik ?? row.player_alias;

  if (parsed.data.zawodnik !== undefined) {
    const canonical = resolveCanonicalPlayerAlias(parsed.data.zawodnik);
    if (!canonical) {
      return NextResponse.json({ error: "Nieprawidłowy wybór piłkarza." }, { status: 400 });
    }
    const available = new Set(await getAvailablePlayerAliases(session.userId));
    if (!available.has(canonical)) {
      return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
    }
    nextAlias = canonical;
  } else {
    nextAlias = row.player_alias;
  }

  try {
    await db.prepare("UPDATE users SET first_name = ?, last_name = ?, player_alias = ? WHERE id = ?").run(
      nextFirst,
      nextLast,
      nextAlias,
      session.userId
    );
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
    }
    console.error("[profile] UPDATE failed", e);
    return NextResponse.json(
      { error: "Nie udało się zapisać profilu. Spróbuj ponownie później." },
      { status: 500 }
    );
  }

  await logActivity(
    session.userId,
    `Zaktualizował profil (imię/nazwisko/awatar z listy): ${nextFirst} ${nextLast} (${nextAlias})`
  );

  const verRow = (await db
    .prepare("SELECT auth_version FROM users WHERE id = ?")
    .get(session.userId)) as { auth_version: number } | undefined;
  const authVersion = verRow?.auth_version ?? session.authVersion;

  const token = await createSessionToken({
    userId: session.userId,
    isAdmin: session.isAdmin,
    firstName: nextFirst,
    lastName: nextLast,
    zawodnik: nextAlias,
    authVersion,
    rememberMe: session.rememberMe,
  });
  await setSessionCookie(token);

  const data = await getProfileDashboard(session.userId);
  return NextResponse.json({ ok: true, ...data });
}
