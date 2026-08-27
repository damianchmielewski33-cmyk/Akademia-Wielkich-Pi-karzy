import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { hashPin, isValidPinFormat, isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin";
import { normalizePlayerAlias } from "@/lib/player-alias";
import { notifyAdminsByEmail } from "@/lib/admin-notify";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { parseRealm, REALMS } from "@/lib/realm";
import { isEmailPasswordAuthEnabled, userCanLoginWithPin } from "@/lib/email-auth";

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
  const rl = await checkRateLimitDistributed(rateLimitKey("forgot_pin", req), RATE.login.limit, RATE.login.windowMs);
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
      `SELECT id, pin_hash, email, password_hash, email_verified, is_admin, realm
       FROM users WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?) AND player_alias = ?`
    )
    .get(first_name, last_name, canonical)) as
    | {
        id: number;
        pin_hash: string | null;
        email: string | null;
        password_hash: string | null;
        email_verified: number | null;
        is_admin: number | null;
        realm: string | null;
      }
    | undefined;

  const genericIdentityError = () =>
    NextResponse.json(
      { error: "Nieprawidłowe dane. Sprawdź imię, nazwisko i pseudonim piłkarza." },
      { status: 401 }
    );

  if (!user) {
    return genericIdentityError();
  }
  const realm = parseRealm(user.realm, REALMS.ACADEMY);
  const emailAuthOn = await isEmailPasswordAuthEnabled(db, realm);
  if (
    !userCanLoginWithPin(
      {
        email: user.email,
        password_hash: user.password_hash,
        email_verified: user.email_verified,
        is_admin: user.is_admin,
      },
      emailAuthOn
    )
  ) {
    // Ten sam komunikat co przy złej tożsamości — bez wycieku stanu migracji.
    return genericIdentityError();
  }
  if (!user.pin_hash) {
    return genericIdentityError();
  }

  const pinHashPending = await hashPin(pin);
  await db
    .prepare(
      "UPDATE users SET pin_hash_pending = ?, pin_reset_requested = 1 WHERE id = ?"
    )
    .run(pinHashPending, user.id);
  await logActivity(user.id, "Zgłosił nowy PIN (oczekuje na zatwierdzenie przez administratora)");
  void notifyAdminsByEmail(
    "Prośba o zmianę PIN-u — Akademia",
    `${first_name} ${last_name} (${canonical}) zgłosił nowy PIN. Zatwierdź w panelu admina → Użytkownicy.`
  );

  const sess = await getServerSession();
  if (sess && sess.userId === user.id) {
    await clearSessionCookie();
  }

  return NextResponse.json({ ok: true });
}
