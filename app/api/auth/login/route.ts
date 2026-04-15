import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { isValidPinFormat, verifyPin } from "@/lib/pin";

export const runtime = "nodejs";

const bodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  pin: z.string().min(1).trim(),
  /** Zaznaczone „Nie wylogowuj mnie” — brak wymuszonego wylogowania po bezczynności. */
  remember_me: z.boolean().optional(),
});

type LoginUserRow = {
  id: number;
  first_name: string;
  last_name: string;
  player_alias: string;
  is_admin: number;
  pin_hash: string | null;
  pin_hash_pending: string | null;
  auth_version: number;
};

export async function POST(req: Request) {
  await connection();
  const rl = checkRateLimit(rateLimitKey("login", req), RATE.login.limit, RATE.login.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Walidacja nie powiodła się", details: parsed.error.flatten() }, { status: 400 });
  }
  const { first_name, last_name, pin, remember_me } = parsed.data;
  const rememberMe = remember_me === true;

  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN musi mieć 4–6 cyfr." }, { status: 400 });
  }

  const db = await getDb();
  const users = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias, is_admin, pin_hash, pin_hash_pending, auth_version
       FROM users WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?)`
    )
    .all(first_name, last_name)) as LoginUserRow[];

  if (users.length === 0) {
    return NextResponse.json({ error: "Nieprawidłowe dane logowania." }, { status: 401 });
  }

  const withPin = users.filter((u) => u.pin_hash);
  if (withPin.length === 0) {
    return NextResponse.json(
      {
        error:
          "To konto wymaga ustawienia PIN-u — po zalogowaniu zostaniesz przekierowany na stronę ustawiania PIN-u.",
        code: "NEEDS_INITIAL_PIN" as const,
      },
      { status: 403 }
    );
  }

  let matched: LoginUserRow | undefined;
  for (const u of withPin) {
    if (await verifyPin(pin, u.pin_hash)) {
      matched = u;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Nieprawidłowe dane logowania." }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: matched.id,
    isAdmin: matched.is_admin === 1,
    firstName: matched.first_name,
    lastName: matched.last_name,
    zawodnik: matched.player_alias,
    authVersion: matched.auth_version,
    rememberMe,
  });
  await setSessionCookie(token, { rememberMe });
  await logActivity(matched.id, "Zalogował się");

  return NextResponse.json({
    ok: true,
    pin_change_pending: matched.pin_hash_pending ? 1 : 0,
    user: {
      id: matched.id,
      first_name: matched.first_name,
      last_name: matched.last_name,
      zawodnik: matched.player_alias,
      is_admin: matched.is_admin,
    },
  });
}
