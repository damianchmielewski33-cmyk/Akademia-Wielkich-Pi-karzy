import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  sender_name: z.string().trim().min(2, "Podaj imię i nazwisko (min. 2 znaki).").max(120),
  sender_email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
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
      msg.sender_name?.[0] ?? msg.body?.[0] ?? msg.sender_email?.[0] ?? "Sprawdź wprowadzone dane.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const { sender_name, sender_email, body } = parsed.data;
  if (sender_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender_email)) {
    return NextResponse.json({ error: "Nieprawidłowy adres e-mail." }, { status: 400 });
  }

  const session = await getServerSession();
  const userId = session?.userId ?? null;

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO admin_messages (user_id, sender_name, sender_email, body, status)
       VALUES (?, ?, ?, ?, 'unread')`
    )
    .run(userId, sender_name, sender_email, body);

  await logActivity(userId, `Wiadomość do admina od ${sender_name}`);

  return NextResponse.json({ ok: true });
}
