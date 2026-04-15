import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { hashPin, isValidPinFormat, isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin";
import { normalizePlayerAlias } from "@/lib/player-alias";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * „Zapomniałem PIN-u”: potwierdzenie tożsamości (imię, nazwisko, piłkarz) + nowy PIN ×2.
 * Zapisuje propozycję w pin_hash_pending; aktywny PIN bez zmian do czasu zatwierdzenia przez admina.
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
  const rl = checkRateLimit(rateLimitKey("forgot_pin", req), RATE.login.limit, RATE.login.windowMs);
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

  const canonical = normalizePlayerAlias(zawodnik);
  if (!canonical) {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const db = await getDb();
  const user = (await db
    .prepare(
      "SELECT id, pin_hash FROM users WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?) AND player_alias = ?"
    )
    .get(first_name, last_name, canonical)) as { id: number; pin_hash: string | null } | undefined;

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono konta dla podanych danych." }, { status: 404 });
  }
  if (!user.pin_hash) {
    return NextResponse.json(
      {
        error:
          "To konto nie ma jeszcze ustawionego PIN-u — zaloguj się imieniem i nazwiskiem na stronie logowania (zostaniesz przekierowany na ustawienie PIN-u) albo wejdź na stronę /ustaw-pin.",
      },
      { status: 400 }
    );
  }

  const pinHashPending = await hashPin(pin);
  await db
    .prepare(
      "UPDATE users SET pin_hash_pending = ?, pin_reset_requested = 1 WHERE id = ?"
    )
    .run(pinHashPending, user.id);
  await logActivity(user.id, "Zgłosił nowy PIN (oczekuje na zatwierdzenie przez administratora)");

  const sess = await getServerSession();
  if (sess && sess.userId === user.id) {
    await clearSessionCookie();
  }

  return NextResponse.json({ ok: true });
}
