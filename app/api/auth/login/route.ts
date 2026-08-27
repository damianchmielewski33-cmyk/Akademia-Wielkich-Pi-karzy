import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/pin";
import { parseRealm, REALMS } from "@/lib/realm";
import {
  isEmailPasswordAuthEnabled,
  normalizeEmail,
  userNeedsEmailAuthSetup,
  verifyPassword,
} from "@/lib/email-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  pin: z.string().trim().optional(),
  email: z.string().trim().optional(),
  password: z.string().optional(),
  remember_me: z.boolean().optional(),
  realm: z.enum([REALMS.ACADEMY, REALMS.PZU_CUP]).optional(),
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
  email: string | null;
  password_hash: string | null;
  email_verified: number | null;
};

function loginPayload(matched: LoginUserRow, token: string, needsEmailAuthSetup: boolean) {
  return {
    ok: true,
    token,
    pin_change_pending: matched.pin_hash_pending ? 1 : 0,
    needs_email_auth_setup: needsEmailAuthSetup ? 1 : 0,
    user: {
      id: matched.id,
      first_name: matched.first_name,
      last_name: matched.last_name,
      zawodnik: matched.player_alias,
      is_admin: matched.is_admin,
    },
  };
}

export async function POST(req: Request) {
  await connection();
  const rl = await checkRateLimitDistributed(rateLimitKey("login", req), RATE.login.limit, RATE.login.windowMs);
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
  const {
    first_name,
    last_name,
    pin,
    email: emailRaw,
    password,
    remember_me,
    realm: realmRaw,
  } = parsed.data;
  const rememberMe = remember_me === true;
  const realm = parseRealm(realmRaw, REALMS.ACADEMY);
  const db = await getDb();
  const emailAuthOn = await isEmailPasswordAuthEnabled(db, realm);

  const finish = async (matched: LoginUserRow) => {
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
    const needsEmailAuthSetup = userNeedsEmailAuthSetup(matched, emailAuthOn);
    return NextResponse.json(loginPayload(matched, token, needsEmailAuthSetup));
  };

  if (emailAuthOn && emailRaw && password) {
    const email = normalizeEmail(emailRaw);
    const matched = (await db
      .prepare(
        `SELECT id, first_name, last_name, player_alias, is_admin, pin_hash, pin_hash_pending, auth_version,
                email, password_hash, email_verified
         FROM users
         WHERE lower(trim(COALESCE(email, ''))) = ?
           AND COALESCE(realm, ?) = ?`
      )
      .get(email, REALMS.ACADEMY, realm)) as LoginUserRow | undefined;

    if (!matched?.password_hash || matched.email_verified !== 1) {
      return NextResponse.json({ error: "Nieprawidłowe dane logowania." }, { status: 401 });
    }
    const ok = await verifyPassword(password, matched.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Nieprawidłowe dane logowania." }, { status: 401 });
    }
    return finish(matched);
  }

  if (!first_name || !last_name || !pin) {
    return NextResponse.json(
      {
        error: emailAuthOn
          ? "Podaj e-mail i hasło albo — dla starego konta — imię, nazwisko i PIN."
          : "Wszystkie pola są wymagane.",
      },
      { status: 400 }
    );
  }

  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN musi mieć 4–6 cyfr." }, { status: 400 });
  }

  const users = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias, is_admin, pin_hash, pin_hash_pending, auth_version,
              email, password_hash, email_verified
       FROM users
       WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?)
         AND COALESCE(realm, ?) = ?`
    )
    .all(first_name, last_name, REALMS.ACADEMY, realm)) as LoginUserRow[];

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
  let matchedLegacy = false;
  for (const u of withPin) {
    const r = await verifyPin(pin, u.pin_hash);
    if (r.ok) {
      matched = u;
      matchedLegacy = r.legacy;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Nieprawidłowe dane logowania." }, { status: 401 });
  }

  if (
    emailAuthOn &&
    matched.email_verified === 1 &&
    matched.password_hash &&
    matched.is_admin !== 1
  ) {
    return NextResponse.json(
      { error: "To konto loguje się adresem e-mail i hasłem — nie PIN-em." },
      { status: 401 }
    );
  }

  if (matchedLegacy) {
    try {
      const newHash = await hashPin(pin);
      await db.prepare("UPDATE users SET pin_hash = ? WHERE id = ?").run(newHash, matched.id);
    } catch (e) {
      console.warn("[login] pin hash upgrade failed (legacy->pepper)", e);
    }
  }

  return finish(matched);
}
