import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { parseRealm, REALMS } from "@/lib/realm";
import {
  clearEmailAuthCode,
  emailAuthCodesMatch,
  hashPassword,
  isEmailAuthCodeExpired,
  isEmailPasswordAuthEnabled,
  isValidPassword,
  normalizeEmail,
  WEAK_PASSWORD_MESSAGE,
} from "@/lib/email-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(1),
  password_confirm: z.string().min(1),
  code: z.string().trim().min(4).max(8),
});

export async function POST(req: Request) {
  await connection();
  const rl = await checkRateLimitDistributed(
    rateLimitKey("emailAuthCode", req),
    RATE.emailAuthCode.limit,
    RATE.emailAuthCode.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Zaloguj się, aby uzupełnić dane konta." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Podaj e-mail, hasło i kod z wiadomości." }, { status: 400 });
  }
  if (parsed.data.password !== parsed.data.password_confirm) {
    return NextResponse.json({ error: "Hasła muszą być takie same." }, { status: 400 });
  }
  if (!isValidPassword(parsed.data.password)) {
    return NextResponse.json({ error: WEAK_PASSWORD_MESSAGE }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const db = await getDb();
  const row = (await db
    .prepare(
      `SELECT id, email_auth_code_hash, email_auth_code_expires, realm FROM users WHERE id = ?`
    )
    .get(session.userId)) as
    | {
        id: number;
        email_auth_code_hash: string | null;
        email_auth_code_expires: number | null;
        realm: string | null;
      }
    | undefined;
  if (!row) return NextResponse.json({ error: "Nie znaleziono konta." }, { status: 404 });

  const realm = parseRealm(row.realm, REALMS.ACADEMY);
  if (!(await isEmailPasswordAuthEnabled(db, realm))) {
    return NextResponse.json({ error: "Logowanie e-mailem jest wyłączone." }, { status: 400 });
  }

  const taken = (await db
    .prepare(
      `SELECT id FROM users WHERE lower(trim(COALESCE(email, ''))) = ? AND id != ? AND COALESCE(realm, ?) = ?`
    )
    .get(email, row.id, REALMS.ACADEMY, realm)) as { id: number } | undefined;
  if (taken) {
    return NextResponse.json({ error: "Ten adres e-mail jest już zajęty." }, { status: 409 });
  }

  if (isEmailAuthCodeExpired(row.email_auth_code_expires) || !emailAuthCodesMatch(parsed.data.code, row.email_auth_code_hash)) {
    return NextResponse.json({ error: "Nieprawidłowy lub wygasły kod. Wyślij kod ponownie." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .prepare(
      `UPDATE users SET email = ?, password_hash = ?, email_verified = 1 WHERE id = ?`
    )
    .run(email, passwordHash, row.id);
  await clearEmailAuthCode(db, row.id);
  await logActivity(row.id, "Uzupełnił e-mail, hasło i kod uwierzytelniający");

  return NextResponse.json({ ok: true });
}
