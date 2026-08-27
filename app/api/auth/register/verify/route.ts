import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { parseRealm, REALMS } from "@/lib/realm";
import {
  clearEmailAuthCode,
  emailAuthCodesMatch,
  isEmailAuthCodeExpired,
  isEmailPasswordAuthEnabled,
  normalizeEmail,
} from "@/lib/email-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().trim(),
  code: z.string().trim().min(4).max(8),
  remember_me: z.boolean().optional(),
  realm: z.enum([REALMS.ACADEMY, REALMS.PZU_CUP]).optional(),
});

export async function POST(req: Request) {
  await connection();
  const rl = await checkRateLimitDistributed(
    rateLimitKey("emailAuthCode", req),
    RATE.emailAuthCode.limit,
    RATE.emailAuthCode.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Podaj e-mail i kod z wiadomości." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const realm = parseRealm(parsed.data.realm, REALMS.ACADEMY);
  const rememberMe = parsed.data.remember_me === true;
  const db = await getDb();
  if (!(await isEmailPasswordAuthEnabled(db, realm))) {
    return NextResponse.json({ error: "Logowanie e-mailem jest wyłączone." }, { status: 400 });
  }

  const row = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias, is_admin, auth_version,
              email_verified, email_auth_code_hash, email_auth_code_expires, password_hash
       FROM users
       WHERE lower(trim(COALESCE(email, ''))) = ? AND COALESCE(realm, ?) = ?`
    )
    .get(email, REALMS.ACADEMY, realm)) as
    | {
        id: number;
        first_name: string;
        last_name: string;
        player_alias: string;
        is_admin: number;
        auth_version: number;
        email_verified: number;
        email_auth_code_hash: string | null;
        email_auth_code_expires: number | null;
        password_hash: string | null;
      }
    | undefined;

  if (!row?.password_hash) {
    return NextResponse.json({ error: "Nieprawidłowy kod lub e-mail." }, { status: 401 });
  }
  if (row.email_verified === 1) {
    return NextResponse.json({ error: "To konto jest już potwierdzone — zaloguj się hasłem." }, { status: 400 });
  }
  if (isEmailAuthCodeExpired(row.email_auth_code_expires) || !emailAuthCodesMatch(parsed.data.code, row.email_auth_code_hash)) {
    return NextResponse.json({ error: "Nieprawidłowy lub wygasły kod." }, { status: 401 });
  }

  await db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(row.id);
  await clearEmailAuthCode(db, row.id);
  await logActivity(row.id, "Potwierdził adres e-mail i dokończył rejestrację");

  const token = await createSessionToken({
    userId: row.id,
    isAdmin: row.is_admin === 1,
    firstName: row.first_name,
    lastName: row.last_name,
    zawodnik: row.player_alias,
    authVersion: row.auth_version,
    rememberMe,
  });
  await setSessionCookie(token, { rememberMe });

  return NextResponse.json({
    ok: true,
    logged_in: true,
    token,
    user: {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      zawodnik: row.player_alias,
      is_admin: row.is_admin,
    },
  });
}
