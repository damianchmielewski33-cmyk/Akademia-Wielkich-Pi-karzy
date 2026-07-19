import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  backfillAdminMessageConversationKeys,
  conversationKeyForGuest,
  conversationKeyForUser,
  findRosterPlayerByFullName,
  markConversationReadForUser,
  normalizeContactName,
  organizerNamesFromSettings,
  type AdminMessageDirection,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { getServerSession } from "@/lib/auth";
import { contactAdminRecipientLabel } from "@/lib/contact-admin-recipients";
import { getDb } from "@/lib/db";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const querySchema = z.object({
  sender_name: z.string().trim().min(2).max(120).optional(),
  mark_read: z
    .enum(["0", "1"])
    .optional()
    .transform((v) => v === "1"),
});

export async function GET(req: Request) {
  await connection();
  const rl = checkRateLimit(
    rateLimitKey("contact_admin_thread", req),
    RATE.contactAdmin.limit * 4,
    RATE.contactAdmin.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const session = await getServerSession();
  if (session?.isAdmin && !session.needsPinSetup && !session.pinChangePending) {
    return NextResponse.json(
      { error: "Administrator korzysta z panelu wiadomości." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    sender_name: url.searchParams.get("sender_name") ?? undefined,
    mark_read: url.searchParams.get("mark_read") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe parametry." }, { status: 400 });
  }

  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);
  const appSettings = await getAppSettings(db);

  let conversationKey: string | null = null;
  let senderName: string | null = null;

  if (session?.userId) {
    conversationKey = conversationKeyForUser(session.userId);
    const row = (await db
      .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
      .get(session.userId)) as
      | { first_name: string; last_name: string; player_alias: string }
      | undefined;
    senderName =
      [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() || row?.player_alias || null;
  } else {
    const name = parsed.data.sender_name?.trim() ?? "";
    if (name.length < 2) {
      return NextResponse.json({ messages: [], conversation_key: null, needs_name: true });
    }
    const roster = await findRosterPlayerByFullName(
      db,
      name,
      organizerNamesFromSettings(appSettings)
    );
    if (!roster) {
      return NextResponse.json(
        {
          error:
            "Nie znaleziono takiej osoby na stronie. Wpisz imię i nazwisko z listy Piłkarze albo organizatora ze strony Kontakt (bez literówek).",
          messages: [],
          conversation_key: null,
        },
        { status: 400 }
      );
    }
    senderName = roster.display_name;
    conversationKey = conversationKeyForGuest(normalizeContactName(roster.display_name));
  }

  if (parsed.data.mark_read && conversationKey) {
    await markConversationReadForUser(db, conversationKey, session?.userId);
  }
  const rows = (await db
    .prepare(
      `SELECT id, body, status, created_at, recipient_key,
              COALESCE(direction, 'inbound') AS direction, sender_name, attachment_url
       FROM admin_messages
       WHERE conversation_key = ?
       ORDER BY created_at ASC, id ASC
       LIMIT 300`
    )
    .all(conversationKey)) as {
    id: number;
    body: string;
    status: string;
    created_at: string;
    recipient_key: string | null;
    direction: AdminMessageDirection;
    sender_name: string;
    attachment_url: string | null;
  }[];

  const messages = rows.map((r) => ({
    id: r.id,
    body: r.body === "📷" && r.attachment_url ? "" : r.body,
    attachment_url: r.attachment_url,
    direction: r.direction,
    status: r.status,
    sender_name: r.sender_name,
    recipient_key: r.recipient_key,
    recipient_label: contactAdminRecipientLabel(r.recipient_key, appSettings),
    created_at: r.created_at,
    created_at_display: formatActivityTimePl(r.created_at),
    mine: r.direction === "inbound",
  }));

  const unread_replies = messages.filter((m) => m.direction === "outbound" && m.status === "unread").length;

  return NextResponse.json({
    conversation_key: conversationKey,
    sender_name: senderName,
    messages,
    unread_replies,
    needs_name: false,
  });
}
