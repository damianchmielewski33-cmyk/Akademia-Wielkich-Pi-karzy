import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { resolveCanonicalPlayerAlias } from "@/lib/player-alias";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { hashPin, isValidPinFormat, isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin";

export const runtime = "nodejs";

/**
 * Pierwsze logowanie po wdrożeniu PIN-u: weryfikacja tożsamości imię + nazwisko + piłkarz (jak przy starej rejestracji),
 * ustawienie PIN-u i natychmiastowe zalogowanie.
 */
const bodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
  pin: z.string().min(1).trim(),
  pin_confirm: z.string().min(1).trim(),
});

export async function POST(req: Request) {
  await connection();
  const rl = checkRateLimit(rateLimitKey("set_initial_pin", req), RATE.register.limit, RATE.register.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

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
  const { first_name, last_name, zawodnik, pin, pin_confirm } = parsed.data;

  if (pin !== pin_confirm) {
    return NextResponse.json({ error: "PIN-y muszą być takie same." }, { status: 400 });
  }
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN musi mieć 4–6 cyfr." }, { status: 400 });
  }
  if (isWeakPin(pin)) {
    return NextResponse.json({ error: WEAK_PIN_MESSAGE }, { status: 400 });
  }

  const canonical = resolveCanonicalPlayerAlias(zawodnik);
  if (!canonical) {
    return NextResponse.json({ error: "Nieprawidłowy wybór piłkarza." }, { status: 400 });
  }

  const db = await getDb();
  const user = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias, is_admin, pin_hash, auth_version
       FROM users WHERE first_name = ? AND last_name = ? AND player_alias = ?`
    )
    .get(first_name, last_name, canonical)) as
    | {
        id: number;
        first_name: string;
        last_name: string;
        player_alias: string;
        is_admin: number;
        pin_hash: string | null;
        auth_version: number;
      }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono konta dla podanych danych." }, { status: 401 });
  }

  if (user.pin_hash) {
    return NextResponse.json(
      { error: "PIN jest już ustawiony — zaloguj się, podając imię, nazwisko i PIN." },
      { status: 409 }
    );
  }

  const pinHash = await hashPin(pin);
  await db.prepare("UPDATE users SET pin_hash = ? WHERE id = ?").run(pinHash, user.id);

  const token = await createSessionToken({
    userId: user.id,
    isAdmin: user.is_admin === 1,
    firstName: user.first_name,
    lastName: user.last_name,
    zawodnik: user.player_alias,
    authVersion: user.auth_version,
  });
  await setSessionCookie(token);
  await logActivity(user.id, "Ustawił PIN i zalogował się (pierwsze logowanie po zmianie polityki)");

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      zawodnik: user.player_alias,
      is_admin: user.is_admin,
    },
  });
}
