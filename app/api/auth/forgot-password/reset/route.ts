import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { parseRealm, REALMS } from "@/lib/realm";
import {
  clearEmailAuthCode,
  hashPassword,
  isEmailAuthCodeValid,
  isEmailPasswordAuthEnabled,
  isValidPassword,
  normalizeEmail,
  WEAK_PASSWORD_MESSAGE,
} from "@/lib/email-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().trim(),
  code: z.string().trim().min(4).max(8),
  password: z.string().min(1),
  password_confirm: z.string().min(1),
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
    return NextResponse.json({ error: "Podaj e-mail, kod i nowe hasło." }, { status: 400 });
  }
  if (parsed.data.password !== parsed.data.password_confirm) {
    return NextResponse.json({ error: "Hasła muszą być takie same." }, { status: 400 });
  }
  if (!isValidPassword(parsed.data.password)) {
    return NextResponse.json({ error: WEAK_PASSWORD_MESSAGE }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const realm = parseRealm(parsed.data.realm, REALMS.ACADEMY);
  const db = await getDb();
  if (!(await isEmailPasswordAuthEnabled(db, realm))) {
    return NextResponse.json({ error: "Logowanie e-mailem jest wyłączone." }, { status: 400 });
  }

  const row = (await db
    .prepare(
      `SELECT id, password_hash, email_verified, email_auth_code_hash, email_auth_code_expires, is_admin
       FROM users
       WHERE lower(trim(COALESCE(email, ''))) = ? AND COALESCE(realm, ?) = ?`
    )
    .get(email, REALMS.ACADEMY, realm)) as
    | {
        id: number;
        password_hash: string | null;
        email_verified: number | null;
        email_auth_code_hash: string | null;
        email_auth_code_expires: number | null;
        is_admin: number | null;
      }
    | undefined;

  if (!row?.password_hash || row.email_verified !== 1) {
    return NextResponse.json({ error: "Nieprawidłowy lub wygasły kod." }, { status: 400 });
  }
  if (
    !isEmailAuthCodeValid(parsed.data.code, email, row.email_auth_code_hash, row.email_auth_code_expires, {
      isAdmin: row.is_admin === 1,
    })
  ) {
    return NextResponse.json({ error: "Nieprawidłowy lub wygasły kod." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .prepare("UPDATE users SET password_hash = ?, auth_version = auth_version + 1 WHERE id = ?")
    .run(passwordHash, row.id);
  await clearEmailAuthCode(db, row.id);
  await logActivity(row.id, "Zresetował hasło kodem z e-maila");

  return NextResponse.json({ ok: true });
}
