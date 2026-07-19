import { NextResponse } from "next/server";
import { z } from "zod";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  backfillAdminMessageConversationKeys,
  conversationKeyForDm,
  conversationKeyForUser,
  displayNameFromParts,
  isAllowedChatAttachmentUrl,
  markConversationReadForUser,
  parseConversationKey,
  userCanAccessConversation,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { requireUser } from "@/lib/api-helpers";
import {
  CONTACT_ADMIN_RECIPIENT_KEYS,
  contactAdminRecipientLabel,
  isContactAdminRecipientKey,
} from "@/lib/contact-admin-recipients";
import { getDb, logActivity } from "@/lib/db";
import { REALMS } from "@/lib/realm";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    conversation_key: z.string().trim().min(1).max(200).optional(),
    peer_user_id: z.coerce.number().int().positive().optional(),
    recipient_key: z.enum(CONTACT_ADMIN_RECIPIENT_KEYS).optional(),
    body: z.string().trim().optional().default(""),
    attachment_url: z.string().trim().max(800).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.conversation_key && !data.peer_user_id) {
      // domyślnie wątek z organizatorem
    }
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
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (gate.session.isAdmin) {
    return NextResponse.json(
      { error: "Administrator korzysta z panelu wiadomości." },
      { status: 403 }
    );
  }

  const rl = checkRateLimit(
    rateLimitKey("chat_messages", req),
    RATE.contactAdmin.limit,
    RATE.contactAdmin.windowMs
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
    const flat = parsed.error.flatten();
    const first =
      flat.fieldErrors.body?.[0] ??
      flat.fieldErrors.attachment_url?.[0] ??
      flat.formErrors[0] ??
      "Sprawdź wprowadzone dane.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const me = gate.session.userId;
  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);

  const meRow = (await db
    .prepare("SELECT first_name, last_name, player_alias, email FROM users WHERE id = ?")
    .get(me)) as
    | { first_name: string; last_name: string; player_alias: string; email: string | null }
    | undefined;
  const senderName =
    displayNameFromParts(meRow?.first_name ?? "", meRow?.last_name ?? "") ||
    meRow?.player_alias ||
    "Gracz";
  const senderEmail = meRow?.email?.trim() || null;

  let conversationKey = parsed.data.conversation_key?.trim() ?? "";
  if (parsed.data.peer_user_id) {
    if (parsed.data.peer_user_id === me) {
      return NextResponse.json({ error: "Nie możesz napisać do siebie." }, { status: 400 });
    }
    const peer = (await db
      .prepare(
        `SELECT id FROM users
         WHERE id = ? AND COALESCE(realm, ?) = ? AND COALESCE(is_temporary, 0) = 0`
      )
      .get(parsed.data.peer_user_id, REALMS.ACADEMY, REALMS.ACADEMY)) as { id: number } | undefined;
    if (!peer) {
      return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 404 });
    }
    conversationKey = conversationKeyForDm(me, parsed.data.peer_user_id);
  }
  if (!conversationKey) {
    conversationKey = conversationKeyForUser(me);
  }

  if (!userCanAccessConversation(me, conversationKey)) {
    return NextResponse.json({ error: "Brak dostępu do rozmowy." }, { status: 403 });
  }

  const parsedKey = parseConversationKey(conversationKey);
  if (!parsedKey || parsedKey.kind === "guest") {
    return NextResponse.json({ error: "Nieprawidłowy klucz rozmowy." }, { status: 400 });
  }

  const text = parsed.data.body.trim();
  const attachment = parsed.data.attachment_url?.trim() || null;
  const isDm = parsedKey.kind === "dm";

  let recipientKey: string | null = null;
  if (!isDm) {
    const rk = parsed.data.recipient_key;
    if (rk && !isContactAdminRecipientKey(rk)) {
      return NextResponse.json({ error: "Nieprawidłowy odbiorca." }, { status: 400 });
    }
    recipientKey = rk ?? "damian";
  }

  const direction = isDm ? "inbound" : "inbound";

  const result = await db
    .prepare(
      `INSERT INTO admin_messages (
         user_id, sender_name, sender_email, recipient_key, body, status,
         direction, conversation_key, attachment_url
       ) VALUES (?, ?, ?, ?, ?, 'unread', ?, ?, ?)`
    )
    .run(
      me,
      senderName,
      senderEmail,
      recipientKey,
      text || "📷",
      direction,
      conversationKey,
      attachment
    );

  await markConversationReadForUser(db, conversationKey, me);
  await logActivity(me, isDm ? `DM do gracza (${conversationKey})` : `Wiadomość do admina (${recipientKey})`);

  const appSettings = await getAppSettings(db);
  const createdAtRow = (await db
    .prepare("SELECT created_at FROM admin_messages WHERE id = ?")
    .get(Number(result.lastInsertRowid))) as { created_at: string } | undefined;
  const createdAt = createdAtRow?.created_at ?? new Date().toISOString().slice(0, 19).replace("T", " ");

  return NextResponse.json({
    ok: true,
    conversation_key: conversationKey,
    message: {
      id: Number(result.lastInsertRowid),
      body: text,
      attachment_url: attachment,
      direction,
      status: "unread",
      sender_name: senderName,
      recipient_key: recipientKey,
      recipient_label: contactAdminRecipientLabel(recipientKey, appSettings),
      created_at: createdAt,
      created_at_display: formatActivityTimePl(createdAt),
      mine: true,
      user_id: me,
    },
  });
}
