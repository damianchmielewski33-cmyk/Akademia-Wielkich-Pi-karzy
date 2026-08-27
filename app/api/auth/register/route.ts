import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { normalizePlayerAlias } from "@/lib/player-alias";
import { isUniqueConstraintError } from "@/lib/sql-errors";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { hashPin, isValidPinFormat, isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin";
import { parseRealm, REALMS } from "@/lib/realm";
import {
  hashPassword,
  hashPlaceholderPin,
  isEmailPasswordAuthEnabled,
  isValidPassword,
  issueEmailAuthCode,
  normalizeEmail,
  WEAK_PASSWORD_MESSAGE,
} from "@/lib/email-auth";

export const runtime = "nodejs";

const pinBodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
  pin: z.string().min(1).trim(),
  pin_confirm: z.string().min(1).trim(),
  auto_login: z.boolean().optional(),
  realm: z.enum([REALMS.ACADEMY, REALMS.PZU_CUP]).optional(),
});

const emailBodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
  email: z.string().email().trim(),
  password: z.string().min(1),
  password_confirm: z.string().min(1),
  realm: z.enum([REALMS.ACADEMY, REALMS.PZU_CUP]).optional(),
});

export async function POST(req: Request) {
  await connection();
  const rl = await checkRateLimitDistributed(rateLimitKey("register", req), RATE.register.limit, RATE.register.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }

  const db = await getDb();
  const realmGuess = parseRealm(
    typeof json === "object" && json && "realm" in json && typeof (json as { realm?: unknown }).realm === "string"
      ? (json as { realm: string }).realm
      : undefined,
    REALMS.ACADEMY
  );
  const emailAuthOn = await isEmailPasswordAuthEnabled(db, realmGuess);

  if (emailAuthOn) {
    const parsed = emailBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Wszystkie pola są wymagane (w tym e-mail i hasło)." }, { status: 400 });
    }
    const { first_name, last_name, zawodnik, password, password_confirm, realm: realmRaw } = parsed.data;
    const email = normalizeEmail(parsed.data.email);
    const realm = parseRealm(realmRaw, REALMS.ACADEMY);

    if (password !== password_confirm) {
      return NextResponse.json({ error: "Hasła muszą być takie same." }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ error: WEAK_PASSWORD_MESSAGE }, { status: 400 });
    }

    const canonical = normalizePlayerAlias(zawodnik);
    if (!canonical) {
      return NextResponse.json(
        { error: "Nieprawidłowy pseudonim piłkarza (2–120 znaków)." },
        { status: 400 }
      );
    }

    const emailTaken = (await db
      .prepare(
        `SELECT id, email_verified FROM users
         WHERE lower(trim(COALESCE(email, ''))) = ? AND COALESCE(realm, ?) = ?`
      )
      .get(email, REALMS.ACADEMY, realm)) as { id: number; email_verified: number } | undefined;

    if (emailTaken && emailTaken.email_verified === 1) {
      return NextResponse.json({ error: "Ten adres e-mail jest już zajęty." }, { status: 409 });
    }

    const taken = new Set(
      (
        (await db
          .prepare("SELECT player_alias FROM users WHERE COALESCE(realm, ?) = ?")
          .all(REALMS.ACADEMY, realm)) as { player_alias: string }[]
      ).map((r) => r.player_alias)
    );

    const count = (
      (await db
        .prepare("SELECT COUNT(*) AS c FROM users WHERE COALESCE(realm, ?) = ?")
        .get(REALMS.ACADEMY, realm)) as { c: number } | undefined
    )?.c ?? 0;
    const isAdmin = realm === REALMS.ACADEMY && count === 0 ? 1 : 0;

    const passwordHash = await hashPassword(password);
    const pinHash = await hashPlaceholderPin();

    let userId: number;
    if (emailTaken && emailTaken.email_verified !== 1) {
      userId = emailTaken.id;
      const existingAlias = (
        (await db.prepare("SELECT player_alias FROM users WHERE id = ?").get(userId)) as
          | { player_alias: string }
          | undefined
      )?.player_alias;
      if (existingAlias !== canonical && taken.has(canonical)) {
        return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
      }
      try {
        await db
          .prepare(
            `UPDATE users SET first_name = ?, last_name = ?, player_alias = ?, password_hash = ?,
                    pin_hash = ?, email = ?, email_verified = 0, is_admin = ?
             WHERE id = ?`
          )
          .run(first_name, last_name, canonical, passwordHash, pinHash, email, isAdmin, userId);
      } catch (e) {
        if (isUniqueConstraintError(e)) {
          return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
        }
        console.error("[register] UPDATE pending failed", e);
        return NextResponse.json({ error: "Nie udało się utworzyć konta. Spróbuj ponownie później." }, { status: 500 });
      }
    } else {
      if (taken.has(canonical)) {
        return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
      }
      try {
        const r = await db
          .prepare(
            `INSERT INTO users (first_name, last_name, player_alias, is_admin, pin_hash, password_hash,
                                email, email_verified, auth_version, realm, is_test)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
          )
          .run(first_name, last_name, canonical, isAdmin, pinHash, passwordHash, email, realm, 0);
        userId = Number(r.lastInsertRowid);
      } catch (e) {
        if (isUniqueConstraintError(e)) {
          return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
        }
        console.error("[register] INSERT failed", e);
        return NextResponse.json(
          { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." },
          { status: 500 }
        );
      }
    }

    const sent = await issueEmailAuthCode(db, userId, email, "verify", { isAdmin: isAdmin === 1 });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 503 });
    }

    await logActivity(userId, "Zarejestrował konto — oczekuje na kod e-mail");

    return NextResponse.json(
      {
        ok: true,
        logged_in: false,
        needs_verification: true,
        email,
      },
      { status: 201 }
    );
  }

  const parsed = pinBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Wszystkie pola są wymagane." }, { status: 400 });
  }
  const { first_name, last_name, zawodnik, pin, pin_confirm, auto_login, realm: realmRaw } = parsed.data;
  const realm = parseRealm(realmRaw, REALMS.ACADEMY);

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
    return NextResponse.json(
      { error: "Nieprawidłowy pseudonim piłkarza (2–120 znaków)." },
      { status: 400 }
    );
  }

  const count = (
    (await db
      .prepare("SELECT COUNT(*) AS c FROM users WHERE COALESCE(realm, ?) = ?")
      .get(REALMS.ACADEMY, realm)) as { c: number } | undefined
  )?.c ?? 0;
  const isAdmin = realm === REALMS.ACADEMY && count === 0 ? 1 : 0;

  const taken = new Set(
    (
      (await db
        .prepare("SELECT player_alias FROM users WHERE COALESCE(realm, ?) = ?")
        .all(REALMS.ACADEMY, realm)) as { player_alias: string }[]
    ).map((r) => r.player_alias)
  );
  if (taken.has(canonical)) {
    return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
  }

  const pinHash = await hashPin(pin);
  let userId: number;
  try {
    const r = await db
      .prepare(
        `INSERT INTO users (first_name, last_name, player_alias, is_admin, pin_hash, auth_version, realm, is_test)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(first_name, last_name, canonical, isAdmin, pinHash, realm, 0);
    userId = Number(r.lastInsertRowid);
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
    }
    console.error("[register] INSERT failed", e);
    return NextResponse.json(
      { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." },
      { status: 500 }
    );
  }

  await logActivity(
    userId,
    auto_login ? "Zarejestrował konto i zalogował się" : "Zarejestrował konto"
  );

  if (auto_login) {
    try {
      const token = await createSessionToken({
        userId,
        isAdmin: isAdmin === 1,
        firstName: first_name,
        lastName: last_name,
        zawodnik: canonical,
        authVersion: 0,
        rememberMe: true,
      });
      await setSessionCookie(token, { rememberMe: true });
      return NextResponse.json(
        {
          ok: true,
          logged_in: true,
          user: {
            id: userId,
            first_name,
            last_name,
            zawodnik: canonical,
            is_admin: isAdmin,
          },
        },
        { status: 201 }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AUTH_SECRET")) {
        console.error("[register] sesja po utworzeniu konta — AUTH_SECRET:", msg);
        return NextResponse.json(
          {
            error:
              "Konto zostało utworzone, ale logowanie nie powiodło się (konfiguracja AUTH_SECRET na serwerze). Odśwież stronę i zaloguj się ręcznie lub skontaktuj się z administratorem.",
          },
          { status: 503 }
        );
      }
      console.error("[register] createSessionToken failed", e);
      return NextResponse.json({ error: "Nie udało się dokończyć logowania. Spróbuj zalogować się ręcznie." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, logged_in: false }, { status: 201 });
}
