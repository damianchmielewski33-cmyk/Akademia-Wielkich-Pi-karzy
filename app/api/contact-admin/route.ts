import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { CONTACT_ADMIN_RECIPIENT_KEYS, isContactAdminRecipientKey } from "@/lib/contact-admin-recipients";

export const runtime = "nodejs";

const bodySchema = z.object({
  sender_name: z.string().trim().min(2, "Podaj imię i nazwisko (min. 2 znaki).").max(120),
  recipient_key: z.enum(CONTACT_ADMIN_RECIPIENT_KEYS),
  body: z.string().trim().min(10, "Wiadomość musi mieć co najmniej 10 znaków.").max(4000),
});

export async function POST(req: Request) {
  await connection();
  const rl = checkRateLimit(rateLimitKey("contact_admin", req), RATE.contactAdmin.limit, RATE.contactAdmin.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      msg.sender_name?.[0] ?? msg.recipient_key?.[0] ?? msg.body?.[0] ?? "Sprawdź wprowadzone dane.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const { sender_name, recipient_key, body } = parsed.data;
  if (!isContactAdminRecipientKey(recipient_key)) {
    return NextResponse.json({ error: "Nieprawidłowy odbiorca wiadomości." }, { status: 400 });
  }

  const session = await getServerSession();
  const userId = session?.userId ?? null;

  let senderEmail: string | null = null;
  if (userId) {
    const db = await getDb();
    const row = (await db.prepare("SELECT email FROM users WHERE id = ?").get(userId)) as
      | { email?: string | null }
      | undefined;
    const email = row?.email?.trim();
    senderEmail = email || null;
  }

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO admin_messages (user_id, sender_name, sender_email, recipient_key, body, status)
       VALUES (?, ?, ?, ?, ?, 'unread')`
    )
    .run(userId, sender_name, senderEmail, recipient_key, body);

  await logActivity(userId, `Wiadomość do admina (${recipient_key}) od ${sender_name}`);

  return NextResponse.json({ ok: true });
}
