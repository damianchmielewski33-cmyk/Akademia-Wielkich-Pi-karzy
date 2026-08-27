import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
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

/** Zawsze { ok: true } — bez enumeracji kont. */
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

  const row = (await db
    .prepare(
      `SELECT id, password_hash, email_verified, is_admin FROM users
       WHERE lower(trim(COALESCE(email, ''))) = ? AND COALESCE(realm, ?) = ?`
    )
    .get(email, REALMS.ACADEMY, realm)) as
    | { id: number; password_hash: string | null; email_verified: number | null; is_admin: number | null }
    | undefined;

  if (row?.password_hash && row.email_verified === 1) {
    const sent = await issueEmailAuthCode(db, row.id, email, "reset", { isAdmin: row.is_admin === 1 });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
