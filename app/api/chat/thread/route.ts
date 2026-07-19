import { NextResponse } from "next/server";
import { z } from "zod";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  backfillAdminMessageConversationKeys,
  conversationKeyForUser,
  displayNameFromParts,
  markConversationReadForUser,
  parseConversationKey,
  peerUserIdFromDmKey,
  userCanAccessConversation,
  type AdminMessageDirection,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { requireUser } from "@/lib/api-helpers";
import { contactAdminRecipientLabel } from "@/lib/contact-admin-recipients";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const querySchema = z.object({
  conversation_key: z.string().trim().min(1).max(200),
  mark_read: z
    .enum(["0", "1"])
    .optional()
    .transform((v) => v === "1"),
});

export async function GET(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (gate.session.isAdmin) {
    return NextResponse.json(
      { error: "Administrator korzysta z panelu wiadomości." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    conversation_key: url.searchParams.get("conversation_key") ?? undefined,
    mark_read: url.searchParams.get("mark_read") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Brak conversation_key" }, { status: 400 });
  }

  const { conversation_key, mark_read } = parsed.data;
  const me = gate.session.userId;
  if (!userCanAccessConversation(me, conversation_key)) {
    return NextResponse.json({ error: "Brak dostępu do rozmowy." }, { status: 403 });
  }

  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);
  const appSettings = await getAppSettings(db);

  if (mark_read) {
    await markConversationReadForUser(db, conversation_key, me);
  }

  const rows = (await db
    .prepare(
      `SELECT id, body, status, created_at, recipient_key,
              COALESCE(direction, 'inbound') AS direction, sender_name, attachment_url, user_id
       FROM admin_messages
       WHERE conversation_key = ?
       ORDER BY created_at ASC, id ASC
       LIMIT 300`
    )
    .all(conversation_key)) as {
    id: number;
    body: string;
    status: string;
    created_at: string;
    recipient_key: string | null;
    direction: AdminMessageDirection;
    sender_name: string;
    attachment_url: string | null;
    user_id: number | null;
  }[];

  const parsedKey = parseConversationKey(conversation_key);
  const isDm = parsedKey?.kind === "dm";

  const messages = rows.map((r) => {
    const mine = isDm ? r.user_id === me : r.direction === "inbound";
    return {
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
      mine,
      user_id: r.user_id,
    };
  });

  let title = "Organizator";
  let peer_user_id: number | null = null;
  if (isDm) {
    peer_user_id = peerUserIdFromDmKey(conversation_key, me);
    if (peer_user_id != null) {
      const u = (await db
        .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
        .get(peer_user_id)) as
        | { first_name: string; last_name: string; player_alias: string }
        | undefined;
      title = u
        ? displayNameFromParts(u.first_name, u.last_name) || u.player_alias
        : "Gracz";
    }
  }

  return NextResponse.json({
    conversation_key,
    kind: isDm ? "dm" : "organizer",
    title,
    peer_user_id,
    messages,
    self_user_key: conversationKeyForUser(me),
  });
}
