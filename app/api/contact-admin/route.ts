import { connection, NextResponse } from "next/server";
import { z } from "zod";
import {
  conversationKeyForGuest,
  conversationKeyForUser,
  findRosterPlayerByFullName,
  isAllowedChatAttachmentUrl,
  normalizeContactName,
  organizerNamesFromSettings,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { getServerSession } from "@/lib/auth";
import { CONTACT_ADMIN_RECIPIENT_KEYS, isContactAdminRecipientKey } from "@/lib/contact-admin-recipients";
import { getDb, logActivity } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    sender_name: z.string().trim().min(2, "Podaj imię i nazwisko (min. 2 znaki).").max(120),
    recipient_key: z.enum(CONTACT_ADMIN_RECIPIENT_KEYS),
    body: z.string().trim().max(4000).optional().default(""),
    attachment_url: z.string().trim().max(800).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const text = data.body.trim();
    const att = data.attachment_url?.trim() || "";
    if (!text && !att) {
      ctx.addIssue({ code: "custom", message: "Napisz wiadomość lub dołącz grafikę.", path: ["body"] });
    }
    if (att && !isAllowedChatAttachmentUrl(att)) {
      ctx.addIssue({ code: "custom", message: "Nieprawidłowy załącznik.", path: ["attachment_url"] });
    }
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
    const flat = parsed.error.flatten();
    const first =
      flat.fieldErrors.sender_name?.[0] ??
      flat.fieldErrors.recipient_key?.[0] ??
      flat.fieldErrors.body?.[0] ??
      flat.fieldErrors.attachment_url?.[0] ??
      flat.formErrors[0] ??
      "Sprawdź wprowadzone dane.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const { sender_name, recipient_key, body, attachment_url } = parsed.data;
  if (!isContactAdminRecipientKey(recipient_key)) {
    return NextResponse.json({ error: "Nieprawidłowy odbiorca wiadomości." }, { status: 400 });
  }

  const session = await getServerSession();
  if (session?.isAdmin && !session.needsPinSetup && !session.pinChangePending) {
    return NextResponse.json(
      { error: "Administrator korzysta z panelu wiadomości, nie z czatu na stronie." },
      { status: 403 }
    );
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  const userId = session?.userId ?? null;

  let senderName = sender_name;
  let conversationKey: string;
  let linkedUserId: number | null = userId;

  if (userId) {
    const row = (await db
      .prepare("SELECT first_name, last_name, player_alias, email FROM users WHERE id = ?")
      .get(userId)) as
      | { first_name: string; last_name: string; player_alias: string; email?: string | null }
      | undefined;
    senderName =
      [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
      row?.player_alias ||
      sender_name;
    conversationKey = conversationKeyForUser(userId);
  } else {
    const roster = await findRosterPlayerByFullName(
      db,
      sender_name,
      organizerNamesFromSettings(appSettings)
    );
    if (!roster) {
      return NextResponse.json(
        {
          error:
            "Nie znaleziono takiej osoby na stronie. Wpisz imię i nazwisko z listy Piłkarze albo organizatora ze strony Kontakt (bez literówek).",
        },
        { status: 400 }
      );
    }
    senderName = roster.display_name;
    conversationKey = conversationKeyForGuest(normalizeContactName(roster.display_name));
    linkedUserId = null;
  }

  let senderEmail: string | null = null;
  if (userId) {
    const row = (await db.prepare("SELECT email FROM users WHERE id = ?").get(userId)) as
      | { email?: string | null }
      | undefined;
    const email = row?.email?.trim();
    senderEmail = email || null;
  }

  const text = body.trim();
  const attachment = attachment_url?.trim() || null;

  await db
    .prepare(
      `INSERT INTO admin_messages (
         user_id, sender_name, sender_email, recipient_key, body, status,
         direction, conversation_key, attachment_url
       ) VALUES (?, ?, ?, ?, ?, 'unread', 'inbound', ?, ?)`
    )
    .run(linkedUserId, senderName, senderEmail, recipient_key, text || "📷", conversationKey, attachment);

  await logActivity(userId, `Wiadomość do admina (${recipient_key}) od ${senderName}`);

  return NextResponse.json({ ok: true, conversation_key: conversationKey });
}
