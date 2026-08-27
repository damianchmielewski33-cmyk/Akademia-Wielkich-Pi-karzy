import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { parseRealm, REALMS } from "@/lib/realm";
import {
  isEmailPasswordAuthEnabled,
  issueEmailAuthCode,
  normalizeEmail,
} from "@/lib/email-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().trim(),
  realm: z.enum([REALMS.ACADEMY, REALMS.PZU_CUP]).optional(),
});

/**
 * Wysyłka kodu:
 * - z sesją i needsEmailAuthSetup → uzupełnienie maila/hasła po PIN-ie
 * - bez sesji → tylko konta z niezweryfikowanym mailem (dokonczenie rejestracji)
 */
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
    return NextResponse.json({ error: "Podaj adres e-mail." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const realm = parseRealm(parsed.data.realm, REALMS.ACADEMY);
  const db = await getDb();
  if (!(await isEmailPasswordAuthEnabled(db, realm))) {
    return NextResponse.json({ error: "Logowanie e-mailem jest wyłączone." }, { status: 400 });
  }

  const session = await getServerSession();
  let userId: number | undefined;
  let isAdmin = false;

  if (session) {
    if (!session.needsEmailAuthSetup) {
      return NextResponse.json(
        { error: "To konto ma już uzupełniony e-mail. Do resetu hasła użyj „Zapomniałem hasła”." },
        { status: 400 }
      );
    }
    const mine = (await db
      .prepare("SELECT id, email, realm, is_admin FROM users WHERE id = ?")
      .get(session.userId)) as
      | { id: number; email: string | null; realm: string | null; is_admin: number | null }
      | undefined;
    if (!mine) return NextResponse.json({ error: "Nie znaleziono konta." }, { status: 404 });
    const userRealm = parseRealm(mine.realm, REALMS.ACADEMY);
    const taken = (await db
      .prepare(
        `SELECT id FROM users WHERE lower(trim(COALESCE(email, ''))) = ? AND id != ? AND COALESCE(realm, ?) = ?`
      )
      .get(email, mine.id, REALMS.ACADEMY, userRealm)) as { id: number } | undefined;
    if (taken) {
      return NextResponse.json({ error: "Ten adres e-mail jest już zajęty." }, { status: 409 });
    }
    await db.prepare("UPDATE users SET email = ?, email_verified = 0 WHERE id = ?").run(email, mine.id);
    userId = mine.id;
    isAdmin = mine.is_admin === 1 || session.isAdmin;
  } else {
    const row = (await db
      .prepare(
        `SELECT id, email_verified, is_admin FROM users
         WHERE lower(trim(COALESCE(email, ''))) = ? AND COALESCE(realm, ?) = ?`
      )
      .get(email, REALMS.ACADEMY, realm)) as
      | { id: number; email_verified: number; is_admin: number | null }
      | undefined;
    if (!row || row.email_verified === 1) {
      return NextResponse.json({ ok: true });
    }
    userId = row.id;
    isAdmin = row.is_admin === 1;
  }

  const sent = await issueEmailAuthCode(db, userId, email, "verify", { isAdmin });
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
  return NextResponse.json({ ok: true });
}
